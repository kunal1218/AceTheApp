import express from "express";
import multer from "multer";
import { parseSyllabusFromBuffer } from "../geminiClient.js";
import prisma from "../prisma.js";

const router = express.Router();
const upload = multer();

function validateSyllabusShape(syllabus) {
  const errors = [];

  if (typeof syllabus !== "object" || syllabus === null) {
    errors.push("Syllabus must be an object.");
  }

  if (syllabus.grading_breakdown && !Array.isArray(syllabus.grading_breakdown)) {
    errors.push("grading_breakdown must be an array.");
  }

  if (syllabus.major_assignments && !Array.isArray(syllabus.major_assignments)) {
    errors.push("major_assignments must be an array.");
  }

  if (!Array.isArray(syllabus.schedule_entries)) {
    errors.push("schedule_entries must be an array.");
  } else {
    for (const entry of syllabus.schedule_entries) {
      if (typeof entry !== "object" || entry === null) {
        errors.push("schedule_entries entries must be objects.");
        break;
      }
      if (typeof entry.title !== "string") {
        errors.push("schedule_entries entry is missing a string 'title'.");
        break;
      }
      if (typeof entry.type !== "string") {
        errors.push("schedule_entries entry is missing a string 'type'.");
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, errors: [] };
}

router.post("/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);

    const validation = validateSyllabusShape(syllabus);
    if (!validation.ok) {
      console.error("[/api/syllabi/parse] validation failed:", validation.errors);
      return res.status(400).json({ error: "Invalid syllabus structure", details: validation.errors });
    }

    const created = await prisma.syllabus.create({
      data: {
        courseCode: syllabus.course_code ?? null,
        courseTitle: syllabus.course_title ?? null,
        term: syllabus.term ?? null,
        instructorName: syllabus.instructor_name ?? null,
        instructorEmail: syllabus.instructor_email ?? null,
        meetingTimes: syllabus.meeting_times ?? null,
        location: syllabus.location ?? null,
        officeHours: syllabus.office_hours ?? null,
        description: syllabus.description ?? null,
        gradingBreakdown: syllabus.grading_breakdown ?? [],
        majorAssignments: syllabus.major_assignments ?? [],
        policies: syllabus.policies ?? null,
        rawJson: syllabus,
        scheduleEntries: {
          create: (syllabus.schedule_entries ?? []).map((entry) => {
            let parsedDate = null;
            if (entry.date) {
              const d = new Date(entry.date);
              if (!isNaN(d.getTime())) parsedDate = d;
            }
            return {
              date: parsedDate,
              rawDate: entry.date ?? null,
              title: entry.title,
              type: entry.type,
              details: entry.details ?? null
            };
          })
        }
      }
    });

    return res.json({
      syllabusId: created.id,
      syllabus
    });
  } catch (err) {
    console.error("[/api/syllabi/parse] failed:", err);
    return res.status(500).json({ error: "Failed to parse syllabus" });
  }
});

router.get("/:id/calendar", async (req, res) => {
  try {
    const { id } = req.params;
    const syllabus = await prisma.syllabus.findUnique({
      where: { id },
      include: { scheduleEntries: true }
    });
    if (!syllabus) {
      return res.status(404).json({ error: "Syllabus not found" });
    }
    const events = (syllabus.scheduleEntries || [])
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date - b.date;
      })
      .map((entry) => ({
        id: entry.id,
        date: entry.date ? entry.date.toISOString().slice(0, 10) : null,
        title: entry.title,
        type: entry.type,
        details: entry.details || null
      }));

    return res.json({
      course_code: syllabus.courseCode,
      course_title: syllabus.courseTitle,
      term: syllabus.term,
      events
    });
  } catch (err) {
    console.error("[/api/syllabi/:id/calendar] failed:", err);
    return res.status(500).json({ error: "Failed to load calendar" });
  }
});

// Usage (frontend):
// POST /api/syllabi/parse with multipart/form-data, field "file" = PDF/DOCX.
//   Response: { syllabusId: "...", syllabus: { ...parsed JSON... } }
// GET /api/syllabi/:id/calendar
//   Response: { course_code, course_title, term, events: [{ id, date, title, type, details }] }

export default router;
