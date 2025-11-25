// Canonical syllabus parsing API using Gemini. Legacy JS backend has been removed.
import { Router, type Express } from "express";
import multer from "multer";
import { parseSyllabusFromBuffer } from "../gemini/syllabusParser";

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

    return res.json({ syllabus });
  } catch (err) {
    console.error("[/api/syllabi/parse] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to parse syllabus";
    return res.status(500).json({ error: "Failed to parse syllabus", details: message });
  }
});

export default router;
