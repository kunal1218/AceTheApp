// Canonical syllabus parsing API using Gemini. Legacy JS backend has been removed.
import { Router, type Express } from "express";
import multer from "multer";
import crypto from "crypto";
import { parseSyllabusFromBuffer } from "../gemini/syllabusParser";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer();

router.post("/parse", upload.single("file"), async (req, res) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = file.buffer;
    const mimeType = file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);
    const syllabusId = crypto.randomUUID();

    return res.json({ syllabusId, syllabus });
  } catch (err) {
    console.error("[/api/syllabi/parse] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to parse syllabus";
    return res.status(500).json({ error: "Failed to parse syllabus", details: message });
  }
});

router.post("/parse-and-store", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const courseIdRaw = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
    const courseNameRaw = typeof req.body?.courseName === "string" ? req.body.courseName.trim() : "";

    const buffer = file.buffer;
    const mimeType = file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);
    const syllabusId = crypto.randomUUID();

    let courseId = courseIdRaw || null;

    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, userId: req.user!.id }
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found for this user" });
      }
    } else {
      const name = courseNameRaw || "Untitled Course";
      const newCourse = await prisma.course.create({
        data: {
          name,
          userId: req.user!.id
        }
      });
      courseId = newCourse.id;
    }

    const entries = Array.isArray(syllabus.schedule_entries) ? syllabus.schedule_entries : [];
    const payload = entries.map((entry) => {
      const dt = entry.date ? new Date(entry.date) : null;
      const dateValue = dt && !Number.isNaN(dt.getTime()) ? dt : null;
      return {
        courseId: courseId!,
        title: entry.title || "Lesson",
        description: entry.details ?? null,
        type: entry.type ?? "lesson",
        date: dateValue,
        rawText: JSON.stringify(entry)
      };
    });

    let created = { count: 0 };
    if (payload.length) {
      created = await prisma.syllabusItem.createMany({ data: payload });
    }

    return res.json({ courseId, syllabusId, syllabus, createdCount: created.count });
  } catch (err) {
    console.error("[/api/syllabi/parse-and-store] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to parse and store syllabus";
    return res.status(500).json({ error: "Failed to parse and store syllabus", details: message });
  }
});

export default router;
