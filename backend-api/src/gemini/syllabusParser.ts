import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Syllabus } from "../types/syllabus";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const SYLLABUS_SCHEMA_TEXT = `
Type Syllabus = {
  course_code: string | null;
  course_title: string | null;
  term: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  meeting_times: string | null;
  location: string | null;
  office_hours: string | null;
  description: string | null;
  grading_breakdown: { component: string; weight_percent: number | null }[];
  major_assignments: string[];
  policies: {
    late_work: string | null;
    attendance: string | null;
    academic_integrity: string | null;
  };
  schedule_entries: {
    date: string | null; // ISO YYYY-MM-DD if possible
    title: string; // e.g. "Lesson 3: Pointers" or "Homework 1 due"
    type: "lesson" | "assignment" | "exam" | "other";
    details: string | null;
  }[];
};

Rules:
- Extract only what is explicitly present in the syllabus.
- If a field is missing, set it to null. Arrays should be [] when missing.
- If a date is present, format it as YYYY-MM-DD if at all possible.
- If you can’t confidently find a date, set date to null rather than guessing.
- Use schedule_entries for weekly lesson plans, important class meetings, and major assignment or exam dates.
- Do not invent or hallucinate information.
- Return ONLY one JSON object matching the Syllabus shape. No markdown or extra text.
`;

/**
 * Gemini sometimes wraps JSON in ```json ... ``` fences or similar.
 * Strip those and return a clean JSON string.
 */
function sanitizeGeminiJSON(str: string): string {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function basicValidate(parsed: any): parsed is Syllabus {
  if (typeof parsed !== "object" || parsed === null) return false;
  if (!Array.isArray(parsed.grading_breakdown)) return false;
  if (!Array.isArray(parsed.major_assignments)) return false;
  if (!Array.isArray(parsed.schedule_entries)) return false;
  return true;
}

export async function parseSyllabusFromBuffer(
  buffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<Syllabus> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a parser that extracts structured data from a university course syllabus. " +
      "Use the Syllabus schema and rules below and return only JSON."
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: SYLLABUS_SCHEMA_TEXT },
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024
    }
  });

  const raw = result.response.text().trim();
  const cleaned = sanitizeGeminiJSON(raw);

  let parsed: Syllabus;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] Invalid JSON from Gemini:", raw);
    throw new Error("Gemini returned invalid JSON for syllabus.");
  }

  if (!basicValidate(parsed)) {
    throw new Error("Parsed syllabus did not match expected shape.");
  }

  return parsed;
}