import { Router } from "express";
import type { Prisma } from "@prisma/client";
import type {
  LectureLevel,
  LecturePackage,
  GeneralLectureContent,
  WhiteboardPlan
} from "../types/lecture";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { llmService } from "../services/llmService";
import { generateVisuals } from "../services/visuals";
import {
  STYLE_VERSION,
  TIE_IN_VERSION,
  VISUALS_VERSION,
  WHITEBOARD_VERSION,
  buildGeneralCacheKey,
  buildTieInCacheKey,
  getTopicContextFromSyllabusItem,
  hashKey,
  normalizeTopic
} from "../services/lectureCache";
import { GENERAL_PROMPT_FINGERPRINT } from "../lecture/lecturePrompts";
import { validateGeneralLectureContent } from "../services/llmService";

const router = Router();

const LEVELS: LectureLevel[] = ["intro", "exam", "deep"];
const LLM_MODE = (
  process.env.LLM_MODE ||
  (process.env.GOOGLE_API_KEY ? "gemini" : "stub")
).toLowerCase();

const parseLevel = (value: unknown): LectureLevel => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "beginner") return "intro";
    if (LEVELS.includes(normalized as LectureLevel)) {
      return normalized as LectureLevel;
    }
  }
  return "intro";
};

const getTopicOrdering = (topics: { id: string; title: string }[], topicId: string) => {
  const index = topics.findIndex((topic) => topic.id === topicId);
  if (index === -1) return "ordering unknown";
  return `Lesson ${index + 1} of ${topics.length}`;
};

const splitTranscriptLines = (text: string) => {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
};

const buildWhiteboardInputs = (chunks: { chunkTitle: string; narration: string }[]) => {
  const transcriptLines: string[] = [];
  const actionSlots: Array<{ line: number; intent: string }> = [];

  chunks.forEach((chunk, index) => {
    const lines = splitTranscriptLines(chunk.narration || "");
    if (!lines.length) return;
    const lineNumber = transcriptLines.length + 1;
    const firstLine = lines[0] || "";
    const intentBase = chunk.chunkTitle?.trim() || `chunk_${index + 1}`;
    const intent = firstLine ? `${intentBase}: ${firstLine}` : intentBase;
    actionSlots.push({ line: lineNumber, intent });
    transcriptLines.push(...lines);
  });

  return { transcriptLines, actionSlots };
};

const extractCodeSnippets = (text: string) => {
  const snippets = new Set<string>();
  const inlineRegex = /`([^`]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(text)) !== null) {
    const snippet = match[1].trim();
    if (snippet) snippets.add(snippet);
  }
  const codeLike = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[;{}=]/.test(sentence));
  codeLike.forEach((snippet) => snippets.add(snippet));
  return Array.from(snippets);
};

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log("[lecture]", ...args);
};

const isStubSource = (payload?: GeneralLectureContent | null) =>
  payload?.source === "stub" || payload?.source === "stub_fallback";

const stripDiagnostics = (lecture: GeneralLectureContent): GeneralLectureContent => {
  const { diagnostics, ...rest } = lecture;
  return rest;
};

if (process.env.NODE_ENV !== "production") {
  console.log("[lecture] startup", {
    styleVersion: STYLE_VERSION,
    tieInVersion: TIE_IN_VERSION,
    promptFingerprint: GENERAL_PROMPT_FINGERPRINT
  });
}

router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
    // topicId refers to SyllabusItem.id
    const topicId = typeof req.body?.topicId === "string" ? req.body.topicId.trim() : "";
    const level = parseLevel(req.body?.level);
    const isDev = process.env.NODE_ENV !== "production";
    const forceRefreshHeader = req.header("x-lecture-force-refresh");
    const forceRefreshQuery = typeof req.query?.forceRefresh === "string" ? req.query.forceRefresh : "";
    const forceRefresh = isDev && (forceRefreshHeader === "1" || forceRefreshQuery === "1");

    if (!courseId || !topicId) {
      return res.status(400).json({ error: "courseId and topicId are required" });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.user!.id) {
      return res.status(404).json({ error: "Course not found" });
    }

    const topicItem = await prisma.syllabusItem.findFirst({
      where: { id: topicId, courseId }
    });
    if (!topicItem) {
      return res.status(404).json({ error: "Topic not found for course" });
    }

    const syllabusItems = await prisma.syllabusItem.findMany({
      where: { courseId },
      orderBy: { date: "asc" },
      select: { id: true, title: true }
    });
    const topicName = topicItem.title || "Untitled Topic";
    const topicOrdering = getTopicOrdering(syllabusItems, topicId);
    const topicContext = getTopicContextFromSyllabusItem(topicItem);
    const normalizedTopic =
      normalizeTopic(topicContext) || normalizeTopic(topicName) || "untitled topic";
    const topicContextHash = hashKey(normalizedTopic);

    devLog("generate", { courseId, topicId, level, forceRefresh });

    // General cache: reusable across users/courses. Never store tie-ins here.
    const generalCacheKey = buildGeneralCacheKey(normalizedTopic, level);
    let generalCache = forceRefresh
      ? null
      : await prisma.lectureGeneralCache.findUnique({
          where: { cacheKey: generalCacheKey }
        });
    let generalLecture: GeneralLectureContent | null = null;
    let generalCacheStatus: "hit" | "miss" | "bypassed" = generalCache ? "hit" : "miss";
    if (forceRefresh) generalCacheStatus = "bypassed";
    if (generalCache && LLM_MODE === "gemini") {
      const cachedPayload = generalCache.payload as GeneralLectureContent | null;
      const cachedSource = typeof cachedPayload?.source === "string" ? cachedPayload.source : "";
      if (cachedSource === "stub" || cachedSource === "stub_fallback") {
        devLog("general cache stub payload ignored", { generalCacheKey, cachedSource });
        generalCache = null;
        generalCacheStatus = "miss";
      }
    }
    if (generalCache) {
      const validation = validateGeneralLectureContent(generalCache.payload as GeneralLectureContent);
      if (!validation.ok) {
        devLog("general cache INVALID, regenerating", { errors: validation.errors });
        generalCache = null;
        generalCacheStatus = "miss";
      } else {
        devLog("general cache HIT", { generalCacheKey });
        generalLecture = validation.payload!;
      }
    }
    if (!generalCache || !generalLecture) {
      devLog("general cache MISS", { generalCacheKey });
      generalLecture = await llmService.generateLecture({
        topicName,
        topicContext,
        level,
        styleVersion: STYLE_VERSION
      });
      if (LLM_MODE === "gemini" && isStubSource(generalLecture)) {
        const userCacheFallback = await prisma.lectureUserCache.findUnique({
          where: {
            userId_courseId_topicId_level: {
              userId: req.user!.id,
              courseId,
              topicId,
              level
            }
          }
        });
        if (userCacheFallback?.payload) {
          const cachedLecture = userCacheFallback.payload as LecturePackage;
          if (cachedLecture.visualsVersion !== VISUALS_VERSION) {
            const refreshedVisuals = await Promise.all(
              cachedLecture.chunks.map(async (chunk) => {
                const codeSnippets = extractCodeSnippets(chunk.narration || "");
                return generateVisuals(chunk.narration || "", codeSnippets);
              })
            );
            cachedLecture.chunks = cachedLecture.chunks.map((chunk, index) => ({
              ...chunk,
              visuals: refreshedVisuals[index]
            }));
            cachedLecture.visualsVersion = VISUALS_VERSION;
            await prisma.lectureUserCache.update({
              where: {
                userId_courseId_topicId_level: {
                  userId: req.user!.id,
                  courseId,
                  topicId,
                  level
                }
              },
              data: {
                payload: cachedLecture as unknown as Prisma.InputJsonValue
              }
            });
          }
          devLog("stub lecture ignored, serving user cache", {
            generalCacheKey,
            userCacheKey: userCacheFallback.generalCacheKey
          });
          return res.json({
            data: cachedLecture,
            meta: {
              generalCache: "user_cache",
              tieInCache: "user_cache",
              styleVersionUsed: STYLE_VERSION,
              tieInVersionUsed: TIE_IN_VERSION,
              promptFingerprint: GENERAL_PROMPT_FINGERPRINT
            }
          });
        }
        devLog("stub lecture not cached", { generalCacheKey });
      } else {
        const cachePayload = stripDiagnostics(generalLecture);
        generalCache = await prisma.lectureGeneralCache.upsert({
          where: { cacheKey: generalCacheKey },
          create: {
            cacheKey: generalCacheKey,
            topicName,
            normalizedTopic,
            level,
            styleVersion: STYLE_VERSION,
            payload: cachePayload
          },
          update: {
            topicName,
            normalizedTopic,
            level,
            styleVersion: STYLE_VERSION,
            payload: cachePayload
          }
        });
      }
    }
    if (!generalLecture) {
      throw new Error("General lecture generation failed");
    }

    // Tie-in cache: course-specific only. No general text stored here.
    const tieInCacheKey = buildTieInCacheKey(courseId, topicContextHash);
    let tieInCache = forceRefresh
      ? null
      : await prisma.lectureTieInCache.findUnique({
          where: { cacheKey: tieInCacheKey }
        });
    let tieIns: string[];
    let tieInCacheStatus: "hit" | "miss" | "bypassed" = tieInCache ? "hit" : "miss";
    if (forceRefresh) tieInCacheStatus = "bypassed";
    if (tieInCache) {
      devLog("tie-in cache HIT", { tieInCacheKey });
      tieIns = tieInCache.tieInChunks as string[];
    } else {
      devLog("tie-in cache MISS", { tieInCacheKey });
      tieIns = await llmService.generateTieIns({
        courseName: course.name,
        topicName,
        topicContext,
        topicOrdering,
        chunkCount: generalLecture.chunks.length,
        tieInVersion: TIE_IN_VERSION
      });
      tieInCache = await prisma.lectureTieInCache.upsert({
        where: { cacheKey: tieInCacheKey },
        create: {
          cacheKey: tieInCacheKey,
          courseId,
          topicId,
          notesVersion: topicContextHash,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        },
        update: {
          courseId,
          topicId,
          notesVersion: topicContextHash,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        }
      });
    }

    devLog("cache status", {
      general: {
        key: generalCacheKey,
        topicContextHash,
        level,
        styleVersion: STYLE_VERSION,
        status: generalCacheStatus
      },
      tieIn: {
        key: tieInCacheKey,
        courseId,
        topicContextHash,
        tieInVersion: TIE_IN_VERSION,
        status: tieInCacheStatus
      }
    });

    const chunks = generalLecture.chunks.map((chunk) => ({
      chunkTitle: chunk.chunkTitle,
      narration: chunk.narration,
      boardOps: chunk.boardOps
    }));

    const validationSummary = validateGeneralLectureContent(generalLecture);
    if (!validationSummary.ok) {
      devLog("general lecture failed validation after generation", {
        errors: validationSummary.errors
      });
    }

    const mergedTieIns = tieIns.length ? tieIns.slice(0, chunks.length) : [];
    const lecturePackage: LecturePackage = {
      topicId,
      level,
      chunks,
      tieIns: mergedTieIns.length ? mergedTieIns : undefined,
      topQuestions: generalLecture.topQuestions,
      confusionMode: generalLecture.confusionMode
    };

    let whiteboard: WhiteboardPlan | null = null;
    const existingUserCache = await prisma.lectureUserCache.findUnique({
      where: {
        userId_courseId_topicId_level: {
          userId: req.user!.id,
          courseId,
          topicId,
          level
        }
      }
    });
    const cachedPayload = existingUserCache?.payload as LecturePackage | null;
    const cachedChunks = cachedPayload?.chunks || [];
    const cachedVisualsVersion = cachedPayload?.visualsVersion;
    const visualsResults = await Promise.all(
      chunks.map(async (chunk, index) => {
        const cachedVisuals = cachedChunks[index]?.visuals;
        if (cachedVisuals && cachedVisualsVersion === VISUALS_VERSION) {
          return cachedVisuals;
        }
        const codeSnippets = extractCodeSnippets(chunk.narration || "");
        return generateVisuals(chunk.narration || "", codeSnippets);
      })
    );
    const chunksWithVisuals = chunks.map((chunk, index) => ({
      ...chunk,
      visuals: visualsResults[index]
    }));
    lecturePackage.chunks = chunksWithVisuals;
    lecturePackage.visualsVersion = VISUALS_VERSION;

    const visualsSummary = {
      chunks: chunksWithVisuals.length,
      withVisuals: chunksWithVisuals.filter((chunk) => !!chunk.visuals).length,
      needsClarification: chunksWithVisuals.filter(
        (chunk) => !!(chunk.visuals as { needs_clarification?: unknown })?.needs_clarification
      ).length
    };
    devLog("visuals summary", visualsSummary);
    const cachedWhiteboard = (existingUserCache?.payload as LecturePackage | null)?.whiteboard;
    if (
      cachedWhiteboard?.whiteboard?.length &&
      cachedWhiteboard.version === WHITEBOARD_VERSION
    ) {
      whiteboard = cachedWhiteboard;
    } else {
      const { transcriptLines, actionSlots } = buildWhiteboardInputs(chunks);
      if (transcriptLines.length && actionSlots.length) {
        whiteboard = await llmService.generateWhiteboardPlan({
          transcriptLines,
          actionSlots,
          figureCache: []
        });
      }
    }
    if (whiteboard?.whiteboard?.length) {
      lecturePackage.whiteboard = {
        ...whiteboard,
        version: WHITEBOARD_VERSION
      };
    }

    const lecturePayload = lecturePackage as unknown as Prisma.InputJsonValue;

    // LectureUserCache is for per-user playback only; do not use it to generate or validate content.
    const shouldPersistUserCache = !(LLM_MODE === "gemini" && isStubSource(generalLecture));
    if (shouldPersistUserCache) {
      await prisma.lectureUserCache.upsert({
        where: {
          userId_courseId_topicId_level: {
            userId: req.user!.id,
            courseId,
            topicId,
            level
          }
        },
        create: {
          userId: req.user!.id,
          courseId,
          topicId,
          level,
          generalCacheKey,
          tieInCacheKey,
          payload: lecturePayload
        },
        update: {
          generalCacheKey,
          tieInCacheKey,
          payload: lecturePayload
        }
      });
    } else {
      devLog("skipping user cache for stub lecture", { generalCacheKey });
    }

    const meta: Record<string, unknown> = {
      generalCache: generalCacheStatus,
      tieInCache: tieInCacheStatus,
      styleVersionUsed: STYLE_VERSION,
      tieInVersionUsed: TIE_IN_VERSION,
      promptFingerprint: GENERAL_PROMPT_FINGERPRINT,
      visualsVersion: VISUALS_VERSION,
      visualsSummary
    };
    if (process.env.NODE_ENV !== "production") {
      meta.validation = validationSummary.checks;
    }
    const call1AnswerText = generalLecture.diagnostics?.call1AnswerText;
    if (call1AnswerText) {
      meta.debug = { call1AnswerText };
    }

    return res.json({ data: lecturePackage, meta });
  } catch (err) {
    console.error("[/lecture/generate] failed:", err);
    return res.status(500).json({ error: "Failed to generate lecture" });
  }
});

router.post("/question", async (req, res) => {
  try {
    const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
    // topicId refers to SyllabusItem.id
    const topicId = typeof req.body?.topicId === "string" ? req.body.topicId.trim() : "";
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const isDev = process.env.NODE_ENV !== "production";
    const forceRefreshHeader = req.header("x-lecture-force-refresh");
    const forceRefreshQuery = typeof req.query?.forceRefresh === "string" ? req.query.forceRefresh : "";
    const forceRefresh = isDev && (forceRefreshHeader === "1" || forceRefreshQuery === "1");

    if (!courseId || !topicId || !question) {
      return res.status(400).json({ error: "courseId, topicId, and question are required" });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.user!.id) {
      return res.status(404).json({ error: "Course not found" });
    }

    const topicItem = await prisma.syllabusItem.findFirst({
      where: { id: topicId, courseId }
    });
    if (!topicItem) {
      return res.status(404).json({ error: "Topic not found for course" });
    }

    const syllabusItems = await prisma.syllabusItem.findMany({
      where: { courseId },
      orderBy: { date: "asc" },
      select: { id: true, title: true }
    });
    const topicName = topicItem.title || "Untitled Topic";
    const topicOrdering = getTopicOrdering(syllabusItems, topicId);
    const topicContext = getTopicContextFromSyllabusItem(topicItem);
    const normalizedTopic =
      normalizeTopic(topicContext) || normalizeTopic(topicName) || "untitled topic";
    const topicContextHash = hashKey(normalizedTopic);

    devLog("question", { courseId, topicId, forceRefresh });

    const latestUserCache = await prisma.lectureUserCache.findFirst({
      where: { userId: req.user!.id, courseId, topicId },
      orderBy: { updatedAt: "desc" }
    });
    const level = latestUserCache?.level ? parseLevel(latestUserCache.level) : "intro";

    const generalCacheKey = buildGeneralCacheKey(normalizedTopic, level);
    let generalCache = forceRefresh
      ? null
      : await prisma.lectureGeneralCache.findUnique({
          where: { cacheKey: generalCacheKey }
        });
    let generalLecture: GeneralLectureContent | null = null;
    let generalCacheStatus: "hit" | "miss" | "bypassed" = generalCache ? "hit" : "miss";
    if (forceRefresh) generalCacheStatus = "bypassed";
    if (generalCache && LLM_MODE === "gemini") {
      const cachedPayload = generalCache.payload as GeneralLectureContent | null;
      const cachedSource = typeof cachedPayload?.source === "string" ? cachedPayload.source : "";
      if (cachedSource === "stub" || cachedSource === "stub_fallback") {
        devLog("general cache stub payload ignored", { generalCacheKey, cachedSource });
        generalCache = null;
        generalCacheStatus = "miss";
      }
    }
    if (generalCache) {
      const validation = validateGeneralLectureContent(generalCache.payload as GeneralLectureContent);
      if (!validation.ok) {
        devLog("general cache INVALID, regenerating", { errors: validation.errors });
        generalCache = null;
        generalCacheStatus = "miss";
      } else {
        devLog("general cache HIT", { generalCacheKey });
        generalLecture = validation.payload!;
      }
    }
    if (!generalCache || !generalLecture) {
      devLog("general cache MISS", { generalCacheKey });
      generalLecture = await llmService.generateLecture({
        topicName,
        topicContext,
        level,
        styleVersion: STYLE_VERSION
      });
      if (LLM_MODE === "gemini" && isStubSource(generalLecture)) {
        devLog("stub lecture not cached", { generalCacheKey });
      } else {
        const cachePayload = stripDiagnostics(generalLecture);
        generalCache = await prisma.lectureGeneralCache.upsert({
          where: { cacheKey: generalCacheKey },
          create: {
            cacheKey: generalCacheKey,
            topicName,
            normalizedTopic,
            level,
            styleVersion: STYLE_VERSION,
            payload: cachePayload
          },
          update: {
            topicName,
            normalizedTopic,
            level,
            styleVersion: STYLE_VERSION,
            payload: cachePayload
          }
        });
      }
    }
    if (!generalLecture) {
      throw new Error("General lecture generation failed");
    }

    const tieInCacheKey = buildTieInCacheKey(courseId, topicContextHash);
    let tieInCache = forceRefresh
      ? null
      : await prisma.lectureTieInCache.findUnique({
          where: { cacheKey: tieInCacheKey }
        });
    let tieIns: string[];
    let tieInCacheStatus: "hit" | "miss" | "bypassed" = tieInCache ? "hit" : "miss";
    if (forceRefresh) tieInCacheStatus = "bypassed";
    if (tieInCache) {
      devLog("tie-in cache HIT", { tieInCacheKey });
      tieIns = tieInCache.tieInChunks as string[];
    } else {
      devLog("tie-in cache MISS", { tieInCacheKey });
      tieIns = await llmService.generateTieIns({
        courseName: course.name,
        topicName,
        topicContext,
        topicOrdering,
        chunkCount: generalLecture.chunks.length,
        tieInVersion: TIE_IN_VERSION
      });
      tieInCache = await prisma.lectureTieInCache.upsert({
        where: { cacheKey: tieInCacheKey },
        create: {
          cacheKey: tieInCacheKey,
          courseId,
          topicId,
          notesVersion: topicContextHash,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        },
        update: {
          courseId,
          topicId,
          notesVersion: topicContextHash,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        }
      });
    }

    const answer = await llmService.answerQuestion({
      courseName: course.name,
      topicName,
      topicContext,
      question,
      generalChunks: generalLecture.chunks,
      tieIns
    });

    devLog("cache status", {
      general: {
        key: generalCacheKey,
        topicContextHash,
        level,
        styleVersion: STYLE_VERSION,
        status: generalCacheStatus
      },
      tieIn: {
        key: tieInCacheKey,
        courseId,
        topicContextHash,
        tieInVersion: TIE_IN_VERSION,
        status: tieInCacheStatus
      }
    });

    return res.json({
      data: answer,
      meta: {
        generalCache: generalCacheStatus,
        tieInCache: tieInCacheStatus,
        styleVersionUsed: STYLE_VERSION,
        tieInVersionUsed: TIE_IN_VERSION
      }
    });
  } catch (err) {
    console.error("[/lecture/question] failed:", err);
    return res.status(500).json({ error: "Failed to answer question" });
  }
});

export default router;
