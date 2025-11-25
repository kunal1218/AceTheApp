import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Syllabus } from "../types/syllabus";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// NOTE: we are intentionally NOT asking for schedule_entries here.
// We'll set schedule_entries = [] in code for now.
const SYLLABUS_SCHEMA_TEXT = `
Type SyllabusCore = {
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
};

Rules:
- Extract only what is explicitly present in the syllabus.
- If a field is missing, set it to null. Arrays should be [] when missing.
- Do not invent or hallucinate information.
- Return ONLY one JSON object matching the SyllabusCore shape.
- Do NOT include markdown, code fences, comments, or natural-language explanation.
`;

function sanitizeGeminiJSON(str: string): string {
  let cleaned = str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1"); // trailing commas
  return cleaned;
}

type SyllabusCore = Omit<Syllabus, "schedule_entries">;

function basicValidateCore(parsed: any): parsed is SyllabusCore {
  if (typeof parsed !== "object" || parsed === null) return false;
  if (!Array.isArray(parsed.grading_breakdown)) return false;
  if (!Array.isArray(parsed.major_assignments)) return false;
  if (typeof parsed.policies !== "object" || parsed.policies === null) return false;
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
      "Use the SyllabusCore schema and rules below and return only valid JSON."
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
      maxOutputTokens: 512,
      responseMimeType: "application/json"
    }
  });

  const raw = result.response.text().trim();
  const cleaned = sanitizeGeminiJSON(raw);

  let parsedCore: SyllabusCore;
  try {
    parsedCore = JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] JSON.parse failed (raw):", raw);
    console.error("[parseSyllabusFromBuffer] JSON.parse failed (cleaned):", cleaned);
    throw new Error("Gemini returned invalid JSON for syllabus core.");
  }

  if (!basicValidateCore(parsedCore)) {
    console.error("[parseSyllabusFromBuffer] Parsed core failed validation:", parsedCore);
    throw new Error("Parsed syllabus core did not match expected shape.");
  }

  // For now, don't try to auto-generate schedule_entries; leave empty.
  const fullSyllabus: Syllabus = {
    ...parsedCore,
    schedule_entries: []
  };

  return fullSyllabus;
}