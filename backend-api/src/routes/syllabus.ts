// Canonical syllabus parsing API using Gemini. Legacy JS backend has been removed.
import { Router } from "express";
import multer from "multer";
import { parseSyllabusFromBuffer } from "../gemini/syllabusParser";

const router = Router();
const upload = multer();

router.post("/parse", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = req.file.buffer;
    const mimeType = req.file.mimetype || "application/pdf";
    const syllabus = await parseSyllabusFromBuffer(buffer, mimeType);

    return res.json({ syllabus });
  } catch (err) {
    console.error("[/api/syllabi/parse] failed:", err);
    return res.status(500).json({ error: "Failed to parse syllabus" });
  }
});

export default router;
