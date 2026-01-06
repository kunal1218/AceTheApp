// Canonical syllabus parsing API using Gemini. Legacy JS backend has been removed.
import { Router, type Express } from "express";
import multer from "multer";
import crypto from "crypto";
import { parseSyllabusFromBuffer } from "../gemini/syllabusParser";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer();

const normalizeCourseName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const buildOfficialCourseName = (syllabus: any) => {
  const code = typeof syllabus?.course_code === "string" ? syllabus.course_code.trim() : "";
  const title = typeof syllabus?.course_title === "string" ? syllabus.course_title.trim() : "";
  if (code && title) {
    const normalizedTitle = normalizeCourseName(title);
    const normalizedCode = normalizeCourseName(code);
    if (normalizedTitle.includes(normalizedCode)) {
      return title;
    }
    return `${code} ${title}`;
  }
  return title || code || "";
};

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
    if (message.includes("Missing GOOGLE_API_KEY")) {
      return res.status(503).json({ error: "Syllabus parser not configured", details: message });
    }
    return res.status(500).json({ error: message, details: message });
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

    // Non-admin users: enforce max of 3 syllabus submissions (distinct courses)
    if (req.user?.role !== "ADMIN") {
      const courseCount = await prisma.course.count({ where: { userId: req.user!.id } });
      if (courseCount >= 3 && !courseIdRaw) {
        return res.status(403).json({ error: "Syllabus upload limit reached for this account." });
      }
    }

    const buffer = file.buffer;
    const mimeType = file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);
    const syllabusId = crypto.randomUUID();
    const syllabusWithWorkspace = { ...syllabus, "workspace-name": workspaceName };
    const officialCourseName = buildOfficialCourseName(syllabusWithWorkspace);

    let courseId = courseIdRaw || null;

    let courseRecord = null;
    let previousCourseName = "";

    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, userId: req.user!.id }
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found for this user" });
      }
      courseRecord = course;
      previousCourseName = course.name;
    } else {
      const candidateNames = [courseNameRaw, workspaceName].filter(Boolean);
      let existing = null;
      if (candidateNames.length) {
        existing = await prisma.course.findFirst({
          where: {
            userId: req.user!.id,
            name: { in: candidateNames }
          }
        });
      }
      if (existing) {
        courseId = existing.id;
        courseRecord = existing;
        previousCourseName = existing.name;
      } else {
        const name = officialCourseName || courseNameRaw || workspaceName || "Untitled Course";
        // Reuse an existing course with the same name for this user if present
        const existingByName = await prisma.course.findFirst({
          where: { name, userId: req.user!.id }
        });
        if (existingByName) {
          courseId = existingByName.id;
          courseRecord = existingByName;
          previousCourseName = existingByName.name;
        } else {
          const newCourse = await prisma.course.create({
            data: {
              name,
              userId: req.user!.id
            }
          });
          courseId = newCourse.id;
          courseRecord = newCourse;
          previousCourseName = newCourse.name;
        }
      }
    }

    if (courseRecord && officialCourseName) {
      if (normalizeCourseName(courseRecord.name) !== normalizeCourseName(officialCourseName)) {
        const updated = await prisma.course.update({
          where: { id: courseRecord.id },
          data: { name: officialCourseName }
        });
        courseRecord = updated;
      }
    }

    if (courseRecord) {
      const matchNames = Array.from(new Set(
        [courseNameRaw, workspaceName, previousCourseName, officialCourseName]
          .filter(Boolean)
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      ));
      if (matchNames.length) {
        await prisma.calendarEvent.updateMany({
          where: {
            userId: req.user!.id,
            courseId: null,
            courseName: { in: matchNames }
          },
          data: {
            courseId: courseRecord.id,
            courseName: courseRecord.name
          }
        });
      }
      await prisma.calendarEvent.updateMany({
        where: {
          userId: req.user!.id,
          courseId: courseRecord.id,
          courseName: { not: courseRecord.name }
        },
        data: { courseName: courseRecord.name }
      });
    }

    const entries = Array.isArray(syllabus.schedule_entries) ? syllabus.schedule_entries : [];
    const filteredEntries = entries.filter((entry) => entry && (entry.title || entry.date));

    const payload = filteredEntries.map((entry) => {
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

    const toInsert = payload.length ? [...payload, aggregatedRow] : [aggregatedRow];
    const created = await prisma.syllabusItem.createMany({ data: toInsert });

    return res.json({ courseId, syllabusId, syllabus: syllabusWithWorkspace, createdCount: created.count });
  } catch (err) {
    console.error("[/api/syllabi/parse-and-store] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to parse and store syllabus";
    if (message.includes("Missing GOOGLE_API_KEY")) {
      return res.status(503).json({ error: "Syllabus parser not configured", details: message });
    }
    return res.status(500).json({ error: message, details: message });
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
