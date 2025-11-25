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
    const workspaceName = typeof req.body?.workspaceName === "string" ? req.body.workspaceName.trim() : "";

    if (!workspaceName) {
      return res.status(400).json({ error: "workspaceName is required" });
    }

    const buffer = file.buffer;
    const mimeType = file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);
    const syllabusId = crypto.randomUUID();
    const syllabusWithWorkspace = { ...syllabus, "workspace-name": workspaceName };

    let courseId = courseIdRaw || null;

    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, userId: req.user!.id }
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found for this user" });
      }
    } else {
      const name = courseNameRaw || workspaceName || "Untitled Course";
      // Reuse an existing course with the same name for this user if present
      const existing = await prisma.course.findFirst({
        where: { name, userId: req.user!.id }
      });
      if (existing) {
        courseId = existing.id;
      } else {
        const newCourse = await prisma.course.create({
          data: {
            name,
            userId: req.user!.id
          }
        });
        courseId = newCourse.id;
      }
    }

    const entries = Array.isArray(syllabus.schedule_entries) ? syllabus.schedule_entries : [];
    const payload = entries.map((entry) => {
      const dt = entry.date ? new Date(entry.date) : null;
      const dateValue = dt && !Number.isNaN(dt.getTime()) ? dt : null;
      const entryWithWorkspace = { ...entry, "workspace-name": workspaceName };
      return {
        courseId: courseId!,
        title: entry.title || "Lesson",
        description: workspaceName, // tag workspace name for easy lookup
        type: entry.type ?? "lesson",
        date: dateValue,
        rawText: JSON.stringify(entryWithWorkspace)
      };
    });

    // Also store one aggregated row with the full syllabus (includes workspace-name)
    const aggregatedRow = {
      courseId: courseId!,
      title: "Syllabus JSON",
      description: workspaceName,
      type: "syllabus-json",
      date: null,
      rawText: JSON.stringify(syllabusWithWorkspace)
    };

    let created = { count: 0 };
    const toInsert = payload.length ? [...payload, aggregatedRow] : [aggregatedRow];
    created = await prisma.syllabusItem.createMany({ data: toInsert });

    return res.json({ courseId, syllabusId, syllabus: syllabusWithWorkspace, createdCount: created.count });
  } catch (err) {
    console.error("[/api/syllabi/parse-and-store] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to parse and store syllabus";
    return res.status(500).json({ error: "Failed to parse and store syllabus", details: message });
  }
});

router.get("/by-workspace", requireAuth, async (req, res) => {
  try {
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const items = await prisma.syllabusItem.findMany({
      where: {
        description: name,
        course: { userId: req.user!.id }
      },
      orderBy: { date: "asc" }
    });
    return res.json({ items });
  } catch (err) {
    console.error("[/api/syllabi/by-workspace] failed:", err);
    return res.status(500).json({ error: "Failed to fetch syllabus items" });
  }
});

// Delete a course (and cascading syllabus items) for the current user without requiring subscription
router.delete("/course/:courseId", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const existing = await prisma.course.findFirst({
      where: { id: courseId, userId: req.user!.id }
    });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }
    await prisma.course.delete({ where: { id: courseId } });
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[/api/syllabi/course/:courseId] failed:", err);
    return res.status(500).json({ error: "Failed to delete course" });
  }
});

export default router;
