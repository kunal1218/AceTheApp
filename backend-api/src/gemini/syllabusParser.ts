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
  - Include only entries that clearly correspond to lessons/lectures or exams with specific dates.
  - Use YYYY-MM-DD format for dates if possible; otherwise use null.
  - Keep titles short (one line).
  - Do NOT include full paragraph descriptions or reading lists in the title.
- Do NOT include policies, long descriptions, or other extra text.
- Return ONLY one JSON object matching the MinimalSyllabus shape.
- Do NOT wrap the object in an array.
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

// Best-effort salvage when both primary and fixer parses fail.
function recoverMinimalFromText(rawText: string): MinimalSyllabusCore | null {
  const grading: MinimalSyllabusCore["grading_breakdown"] = [];
  const schedule: MinimalSyllabusCore["schedule_entries"] = [];

  // Extract grading components with weights
  const gradingRegex = /"component"\s*:\s*"([^"]+)"[\s\S]*?"weight_percent"\s*:\s*([\d.]+)/g;
  const seenGrade = new Set<string>();
  let gMatch;
  while ((gMatch = gradingRegex.exec(rawText)) !== null) {
    const component = gMatch[1].trim();
    const weight = Number.parseFloat(gMatch[2]);
    const key = `${component}|${weight}`;
    if (seenGrade.has(key)) continue;
    seenGrade.add(key);
    grading.push({
      component,
      weight_percent: Number.isFinite(weight) ? weight : null,
    });
  }

  // Extract date/title pairs in order
  const dateTitleRegex = /"date"\s*:\s*"([^"]+)"[\s\S]*?"title"\s*:\s*"([^"]+)"/g;
  const seenLesson = new Set<string>();
  let dtMatch;
  while ((dtMatch = dateTitleRegex.exec(rawText)) !== null) {
    const date = dtMatch[1].trim();
    const title = dtMatch[2].trim();
    if (!title) continue;
    const key = `${date}|${title}`;
    if (seenLesson.has(key)) continue;
    seenLesson.add(key);
    schedule.push({ date: date || null, title });
  }

  // If nothing was recovered, return null so caller can fall back further
  if (!grading.length && !schedule.length) return null;

  return {
    course_code: null,
    course_title: null,
    grading_breakdown: grading,
    schedule_entries: schedule,
  };
}

async function callMinimalModel(buffer: Buffer, mimeType: string) {
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
      maxOutputTokens: 640,
      responseMimeType: "application/json"
    }
  });

  return result.response.text().trim();
}

/**
 * Fallback: if the first JSON is mangled, ask Gemini again to "repair" it
 * into valid MinimalSyllabus JSON.
 */
async function fixMalformedMinimalSyllabusJSON(badText: string): Promise<string> {
  const fixerModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You receive malformed or partially incorrect JSON-like text that is supposed to represent " +
      "a MinimalSyllabus object. Your job is ONLY to repair it into valid JSON that matches the " +
      "MinimalSyllabus schema given in the prompt. Do not add explanations, comments, or markdown. " +
      "Return exactly one JSON object, not an array.",
  });

  const result = await fixerModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              SYLLABUS_MINIMAL_SCHEMA_TEXT +
              "\n\nHere is the malformed MinimalSyllabus JSON-like text. Fix it so it becomes valid JSON " +
              "for a single MinimalSyllabus object, following the schema exactly.\n\n" +
              badText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  });

  return result.response.text().trim();
}

export async function parseSyllabusFromBuffer(
  buffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<Syllabus> {
  console.log("[parseSyllabusFromBuffer] Calling Gemini minimal prompt…");
  const raw = await callMinimalModel(buffer, mimeType);
  console.log("[parseSyllabusFromBuffer] Got raw minimal response from Gemini.");
  let cleaned = sanitizeGeminiJSON(raw);

  let minimal: MinimalSyllabusCore | undefined;

  // First attempt to parse + validate the minimal JSON
  try {
    minimal = JSON.parse(cleaned);
  } catch (err) {
    console.error("[parseSyllabusFromBuffer] First JSON.parse failed (raw):", raw);
    console.error("[parseSyllabusFromBuffer] First JSON.parse failed (cleaned):", cleaned);
  }

  if (!minimal || !basicValidateMinimal(minimal)) {
    console.warn(
      "[parseSyllabusFromBuffer] Minimal parse/validation failed, calling fixer (second prompt)…"
    );

    // SECOND PROMPT: runs whenever first attempt fails
    const fixedRaw = await fixMalformedMinimalSyllabusJSON(cleaned);
    const fixedCleaned = sanitizeGeminiJSON(fixedRaw);

    try {
      minimal = JSON.parse(fixedCleaned);
      console.log("[parseSyllabusFromBuffer] Fallback parse succeeded.");
    } catch (err) {
      console.error("[parseSyllabusFromBuffer] Fallback JSON.parse failed (raw):", fixedRaw);
      console.error("[parseSyllabusFromBuffer] Fallback JSON.parse failed (cleaned):", fixedCleaned);
      minimal = undefined;
    }

    if (!minimal || !basicValidateMinimal(minimal)) {
      console.warn("[parseSyllabusFromBuffer] Repaired minimal syllabus failed validation. Trying heuristic salvage.");
      const salvaged = recoverMinimalFromText(fixedCleaned) || recoverMinimalFromText(raw);
      if (salvaged && basicValidateMinimal(salvaged)) {
        console.warn("[parseSyllabusFromBuffer] Salvage succeeded using heuristic extraction.");
        minimal = salvaged;
      } else {
        console.warn(
          "[parseSyllabusFromBuffer] Salvage failed. Using safe empty MinimalSyllabusCore fallback."
        );
        minimal = {
          course_code: null,
          course_title: null,
          grading_breakdown: [],
          schedule_entries: [],
        };
      }
    }
  }

  // At this point we KNOW minimal is defined; help TS see that.
  const safeMinimal: MinimalSyllabusCore = minimal!;

  const fullSyllabus: Syllabus = {
    course_code: safeMinimal.course_code,
    course_title: safeMinimal.course_title,
    term: null,
    instructor_name: null,
    instructor_email: null,
    meeting_times: null,
    location: null,
    office_hours: null,
    description: null,
    grading_breakdown: safeMinimal.grading_breakdown,
    major_assignments: [],
    policies: {
      late_work: null,
      attendance: null,
      academic_integrity: null
    },
    schedule_entries: safeMinimal.schedule_entries.map((entry) => ({
      date: entry.date,
      title: entry.title,
      type: "lesson",
      details: null
    }))
  };

  return fullSyllabus;
}
