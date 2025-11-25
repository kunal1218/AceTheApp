import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Syllabus } from "../types/syllabus";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * We only care about:
 * - course_code
 * - course_title
 * - grading_breakdown (assignment weights)
 * - schedule_entries with date + lesson title
 *
 * Everything else in the Syllabus type will be filled in as null/[] defaults.
 */
const SYLLABUS_MINIMAL_SCHEMA_TEXT = `
Type MinimalSyllabus = {
  course_code: string | null;
  course_title: string | null;
  grading_breakdown: {
    component: string;          // e.g. "Exams", "Projects", "Homework"
    weight_percent: number | null; // number from 0 to 100 if explicitly given
  }[];
  schedule_entries: {
    date: string | null;        // class date in YYYY-MM-DD if possible, otherwise null
    title: string;              // short lesson or lecture title, e.g. "Arrays and pointers"
  }[];
};

/*
Rules:
- Extract only what is explicitly present in the syllabus.
- If a field is missing, set it to null. Arrays should be [] when missing.
- grading_breakdown:
  - Include only components that clearly correspond to grade categories (exams, projects, homework, quizzes, etc.).
  - If a percentage weight is explicitly given, use it as weight_percent.
  - If the weight is not clearly given, set weight_percent to null.
- schedule_entries:
  - Include only entries that clearly correspond to lessons/lectures with specific dates.
  - Use YYYY-MM-DD format for dates if possible; otherwise use null.
  - Keep titles short (one line).
  - Do NOT include full paragraph descriptions or reading lists in the title.
- Do NOT include policies, long descriptions, or other extra text.
- Return ONLY one JSON object matching the MinimalSyllabus shape.
- Do NOT include markdown, code fences, comments, or any natural-language explanation.
*/
`;

// The minimal shape we ask Gemini to produce.
type MinimalSyllabusCore = {
  course_code: string | null;
  course_title: string | null;
  grading_breakdown: {
    component: string;
    weight_percent: number | null;
  }[];
  schedule_entries: {
    date: string | null;
    title: string;
  }[];
};

// Small cleanup for things like ```json fences / trailing commas.
function sanitizeGeminiJSON(str: string): string {
  let cleaned = str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  return cleaned;
}

function basicValidateMinimal(parsed: any): parsed is MinimalSyllabusCore {
  if (typeof parsed !== "object" || parsed === null) return false;

  if (!("grading_breakdown" in parsed) || !Array.isArray(parsed.grading_breakdown)) {
    return false;
  }
  if (!("schedule_entries" in parsed) || !Array.isArray(parsed.schedule_entries)) {
    return false;
  }

  // Light checks on inner items
  for (const gb of parsed.grading_breakdown) {
    if (typeof gb !== "object" || gb === null) return false;
    if (typeof gb.component !== "string") return false;
    if (gb.weight_percent !== null && typeof gb.weight_percent !== "number") return false;
  }

  for (const se of parsed.schedule_entries) {
    if (typeof se !== "object" || se === null) return false;
    if (typeof se.title !== "string") return false;
    if (se.date !== null && typeof se.date !== "string") return false;
  }

  return true;
}

export async function parseSyllabusFromBuffer(
  buffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<Syllabus> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a parser that extracts minimal structured data from a university course syllabus. " +
      "Only return the course code, course title, grading components with weights, and dated lesson titles " +
      "according to the provided MinimalSyllabus schema."
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: SYLLABUS_MINIMAL_SCHEMA_TEXT },
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

  let minimal: MinimalSyllabusCore;
  try {
    minimal = JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] JSON.parse failed (raw):", raw);
    console.error("[parseSyllabusFromBuffer] JSON.parse failed (cleaned):", cleaned);
    throw new Error("Gemini returned invalid JSON for minimal syllabus.");
  }

  if (!basicValidateMinimal(minimal)) {
    console.error("[parseSyllabusFromBuffer] Parsed minimal syllabus failed validation:", minimal);
    throw new Error("Parsed minimal syllabus did not match expected shape.");
  }

  // Convert the minimal result into the full Syllabus type expected by the rest of the app.
  const fullSyllabus: Syllabus = {
    course_code: minimal.course_code,
    course_title: minimal.course_title,
    term: null,
    instructor_name: null,
    instructor_email: null,
    meeting_times: null,
    location: null,
    office_hours: null,
    description: null,
    grading_breakdown: minimal.grading_breakdown,
    major_assignments: [], // we don't ask for them anymore
    policies: {
      late_work: null,
      attendance: null,
      academic_integrity: null
    },
    schedule_entries: minimal.schedule_entries.map((entry) => ({
      date: entry.date,
      title: entry.title,
      type: "lesson", // everything we extract here is a lesson/lecture
      details: null
    }))
  };

  return fullSyllabus;
}