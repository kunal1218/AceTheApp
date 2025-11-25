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
- Return ONLY one JSON object matching the Syllabus shape.
- Do NOT include markdown, code fences, comments, or natural-language explanation.
`;

// Small cleanup for things like ```json fences / trailing commas
function sanitizeGeminiJSON(str: string): string {
  let cleaned = str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return cleaned;
}

function basicValidate(parsed: any): parsed is Syllabus {
  if (typeof parsed !== "object" || parsed === null) return false;
  if (!Array.isArray(parsed.grading_breakdown)) return false;
  if (!Array.isArray(parsed.major_assignments)) return false;
  if (!Array.isArray(parsed.schedule_entries)) return false;
  return true;
}

async function callSyllabusModel(buffer: Buffer, mimeType: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a parser that extracts structured data from a university course syllabus. " +
      "Use the Syllabus schema and rules below and return only valid JSON."
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
              mimeType,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      // If the SDK / backend supports it, this strongly encourages strict JSON.
      responseMimeType: "application/json",
    },
  });

  return result.response.text().trim();
}

/**
 * Fallback: if the first JSON is mangled, ask Gemini again to "fix" it.
 */
async function fixMalformedSyllabusJSON(badText: string): Promise<string> {
  const fixerModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You receive malformed or partially incorrect JSON-like text that is supposed to represent " +
      "a Syllabus object. Your job is ONLY to repair it into valid JSON that matches the Syllabus " +
      "schema given in the prompt. Do not add explanations, comments, or markdown. Return exactly " +
      "one JSON object.",
  });

  const result = await fixerModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              SYLLABUS_SCHEMA_TEXT +
              "\n\nHere is the malformed syllabus JSON-like text. Fix it so it becomes valid JSON " +
              "for a single Syllabus object, following the schema exactly.\n\n" +
              badText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  return result.response.text().trim();
}

export async function parseSyllabusFromBuffer(
  buffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<Syllabus> {
  // First attempt: direct extraction
  const raw = await callSyllabusModel(buffer, mimeType);
  let cleaned = sanitizeGeminiJSON(raw);

  let parsed: Syllabus | undefined;

  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] First JSON.parse failed (raw):", raw);
    console.error("[parseSyllabusFromBuffer] First JSON.parse failed (cleaned):", cleaned);
  }

  // If first parse worked and passes basic shape, we’re done.
  if (parsed && basicValidate(parsed)) {
    return parsed;
  }

  // Fallback: ask Gemini explicitly to fix the malformed JSON.
  const fixedRaw = await fixMalformedSyllabusJSON(raw);
  const fixedCleaned = sanitizeGeminiJSON(fixedRaw);

  try {
    parsed = JSON.parse(fixedCleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] Fallback JSON.parse failed (raw):", fixedRaw);
    console.error("[parseSyllabusFromBuffer] Fallback JSON.parse failed (cleaned):", fixedCleaned);
    throw new Error("Gemini returned invalid JSON for syllabus, even after repair attempt.");
  }

  if (!basicValidate(parsed)) {
    console.error("[parseSyllabusFromBuffer] Parsed syllabus failed basic validation:", parsed);
    throw new Error("Parsed syllabus did not match expected shape.");
  }

  return parsed;
}