import { Router } from "express";
import type { LectureLevel, LecturePackage, GeneralLectureContent } from "../types/lecture";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { llmService } from "../services/llmService";
import {
  STYLE_VERSION,
  TIE_IN_VERSION,
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

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log("[lecture]", ...args);
};

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

    // LectureUserCache is for per-user playback only; do not use it to generate or validate content.
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
        payload: lecturePackage
      },
      update: {
        generalCacheKey,
        tieInCacheKey,
        payload: lecturePackage
      }
    });

    const meta: Record<string, unknown> = {
      generalCache: generalCacheStatus,
      tieInCache: tieInCacheStatus,
      styleVersionUsed: STYLE_VERSION,
      tieInVersionUsed: TIE_IN_VERSION,
      promptFingerprint: GENERAL_PROMPT_FINGERPRINT
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
