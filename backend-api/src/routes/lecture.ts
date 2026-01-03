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
  hashKey,
  normalizeTopic
} from "../services/lectureCache";

const router = Router();

const LEVELS: LectureLevel[] = ["intro", "exam", "deep"];

const parseLevel = (value: unknown): LectureLevel => {
  if (typeof value === "string" && LEVELS.includes(value as LectureLevel)) {
    return value as LectureLevel;
  }
  return "intro";
};

const getTopicOrdering = (topics: { id: string; title: string }[], topicId: string) => {
  const index = topics.findIndex((topic) => topic.id === topicId);
  if (index === -1) return "ordering unknown";
  return `Lesson ${index + 1} of ${topics.length}`;
};

const getNotesVersion = (topics: { id: string; title: string; updatedAt: Date }[]) => {
  if (!topics.length) return "notes-empty";
  const payload = topics
    .map((topic) => `${topic.id}|${topic.updatedAt.toISOString()}|${topic.title}`)
    .join("|");
  return hashKey(payload);
};

const getTopicName = (
  topics: { id: string; title: string }[],
  topicId: string
) => topics.find((topic) => topic.id === topicId)?.title || topicId;

router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
    const topicId = typeof req.body?.topicId === "string" ? req.body.topicId.trim() : "";
    const level = parseLevel(req.body?.level);

    if (!courseId || !topicId) {
      return res.status(400).json({ error: "courseId and topicId are required" });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: req.user!.id },
      include: { syllabusItems: { orderBy: { date: "asc" } } }
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const topics = course.syllabusItems
      .filter((item) => item.type !== "syllabus-json")
      .map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    const topicName = getTopicName(topics, topicId);
    const normalizedTopic = normalizeTopic(topicName);
    const notesVersion = getNotesVersion(topics);
    const topicOrdering = getTopicOrdering(topics, topicId);

    // General cache: reusable across users/courses. Never store tie-ins here.
    const generalCacheKey = buildGeneralCacheKey(normalizedTopic, level);
    let generalCache = await prisma.lectureGeneralCache.findUnique({
      where: { cacheKey: generalCacheKey }
    });
    let generalLecture: GeneralLectureContent;
    if (generalCache) {
      generalLecture = generalCache.payload as GeneralLectureContent;
    } else {
      generalLecture = await llmService.generateLecture({
        topicName,
        level,
        styleVersion: STYLE_VERSION
      });
      generalCache = await prisma.lectureGeneralCache.create({
        data: {
          cacheKey: generalCacheKey,
          topicName,
          normalizedTopic,
          level,
          styleVersion: STYLE_VERSION,
          payload: generalLecture
        }
      });
    }

    // Tie-in cache: course-specific only. No general text stored here.
    const tieInCacheKey = buildTieInCacheKey(courseId, topicId, notesVersion);
    let tieInCache = await prisma.lectureTieInCache.findUnique({
      where: { cacheKey: tieInCacheKey }
    });
    let tieIns: string[];
    if (tieInCache) {
      tieIns = tieInCache.tieInChunks as string[];
    } else {
      tieIns = await llmService.generateTieIns({
        courseName: course.name,
        topicName,
        topicOrdering,
        chunkCount: generalLecture.chunks.length,
        tieInVersion: TIE_IN_VERSION
      });
      tieInCache = await prisma.lectureTieInCache.create({
        data: {
          cacheKey: tieInCacheKey,
          courseId,
          topicId,
          notesVersion,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        }
      });
    }

    const chunks = generalLecture.chunks.map((chunk, index) => ({
      generalText: chunk.generalText,
      tieInText: tieIns[index],
      boardOps: chunk.boardOps
    }));

    const lecturePackage: LecturePackage = {
      topicId,
      level,
      chunks,
      topQuestions: generalLecture.topQuestions,
      confusionMode: generalLecture.confusionMode
    };

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

    return res.json({ data: lecturePackage });
  } catch (err) {
    console.error("[/lecture/generate] failed:", err);
    return res.status(500).json({ error: "Failed to generate lecture" });
  }
});

router.post("/question", async (req, res) => {
  try {
    const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
    const topicId = typeof req.body?.topicId === "string" ? req.body.topicId.trim() : "";
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";

    if (!courseId || !topicId || !question) {
      return res.status(400).json({ error: "courseId, topicId, and question are required" });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: req.user!.id },
      include: { syllabusItems: { orderBy: { date: "asc" } } }
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const topics = course.syllabusItems
      .filter((item) => item.type !== "syllabus-json")
      .map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    const topicName = getTopicName(topics, topicId);
    const normalizedTopic = normalizeTopic(topicName);
    const notesVersion = getNotesVersion(topics);
    const topicOrdering = getTopicOrdering(topics, topicId);

    const latestUserCache = await prisma.lectureUserCache.findFirst({
      where: { userId: req.user!.id, courseId, topicId },
      orderBy: { updatedAt: "desc" }
    });
    const level = latestUserCache?.level ? parseLevel(latestUserCache.level) : "intro";

    const generalCacheKey = buildGeneralCacheKey(normalizedTopic, level);
    let generalCache = await prisma.lectureGeneralCache.findUnique({
      where: { cacheKey: generalCacheKey }
    });
    let generalLecture: GeneralLectureContent;
    if (generalCache) {
      generalLecture = generalCache.payload as GeneralLectureContent;
    } else {
      generalLecture = await llmService.generateLecture({
        topicName,
        level,
        styleVersion: STYLE_VERSION
      });
      generalCache = await prisma.lectureGeneralCache.create({
        data: {
          cacheKey: generalCacheKey,
          topicName,
          normalizedTopic,
          level,
          styleVersion: STYLE_VERSION,
          payload: generalLecture
        }
      });
    }

    const tieInCacheKey = buildTieInCacheKey(courseId, topicId, notesVersion);
    let tieInCache = await prisma.lectureTieInCache.findUnique({
      where: { cacheKey: tieInCacheKey }
    });
    let tieIns: string[];
    if (tieInCache) {
      tieIns = tieInCache.tieInChunks as string[];
    } else {
      tieIns = await llmService.generateTieIns({
        courseName: course.name,
        topicName,
        topicOrdering,
        chunkCount: generalLecture.chunks.length,
        tieInVersion: TIE_IN_VERSION
      });
      tieInCache = await prisma.lectureTieInCache.create({
        data: {
          cacheKey: tieInCacheKey,
          courseId,
          topicId,
          notesVersion,
          tieInVersion: TIE_IN_VERSION,
          tieInChunks: tieIns
        }
      });
    }

    const answer = await llmService.answerQuestion({
      courseName: course.name,
      topicName,
      question,
      generalChunks: generalLecture.chunks,
      tieIns
    });

    return res.json({ data: answer });
  } catch (err) {
    console.error("[/lecture/question] failed:", err);
    return res.status(500).json({ error: "Failed to answer question" });
  }
});

export default router;
