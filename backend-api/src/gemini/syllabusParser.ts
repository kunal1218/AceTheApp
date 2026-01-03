import { getGenAI } from "./client";
import { sanitizeGeminiJSON } from "./jsonRepair";
import type { Syllabus } from "../types/syllabus";

/**
 * We only care about:
 * - course_code
 * - course_title
 * - schedule_entries with date + lesson title
 */
const SYLLABUS_MINIMAL_SCHEMA_TEXT = `
Type MinimalSyllabus = {
  course_code: string | null;
  course_title: string | null;
  schedule_entries: {
    date: string | null;        // class date in YYYY-MM-DD if possible, otherwise null
    title: string;              // short lesson or lecture title, e.g. "Arrays and pointers"
  }[];
};

/*
Rules:
- Extract only what is explicitly present in the syllabus.
- If a field is missing, set it to null. Arrays should be [] when missing.
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
  schedule_entries: {
    date: string | null;
    title: string;
  }[];
};

// Small cleanup for things like ```json fences / trailing commas.

function basicValidateMinimal(parsed: any): parsed is MinimalSyllabusCore {
  if (typeof parsed !== "object" || parsed === null) return false;

  if (!("schedule_entries" in parsed) || !Array.isArray(parsed.schedule_entries)) {
    return false;
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
  const schedule: MinimalSyllabusCore["schedule_entries"] = [];

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
  if (!schedule.length) return null;

  return {
    course_code: null,
    course_title: null,
    schedule_entries: schedule,
  };
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const pad2 = (value: number) => value.toString().padStart(2, "0");

const normalizeDate = (year: number | null, month: number, day: number): string | null => {
  if (!year) return null;
  const safeYear = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(safeYear, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  const normalized = `${safeYear}-${pad2(month)}-${pad2(day)}`;
  return normalized;
};

const parseDateFromLine = (line: string): { raw: string; normalized: string | null } | null => {
  const isoMatch = line.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return { raw: isoMatch[0], normalized: normalizeDate(year, month, day) };
  }

  const slashMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = slashMatch[3] ? Number(slashMatch[3]) : null;
    return { raw: slashMatch[0], normalized: normalizeDate(year, month, day) };
  }

  const monthMatch = line.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{2,4}))?\b/i);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const month = MONTHS[monthName] ?? null;
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] ? Number(monthMatch[3]) : null;
    if (month) {
      return { raw: monthMatch[0], normalized: normalizeDate(year, month, day) };
    }
  }

  return null;
};

const extractScheduleEntriesFromText = (
  text: string
): MinimalSyllabusCore["schedule_entries"] => {
  const schedule: MinimalSyllabusCore["schedule_entries"] = [];
  if (!text) return schedule;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const line of lines) {
    const match = parseDateFromLine(line);
    if (!match) continue;
    const title = line
      .replace(match.raw, "")
      .replace(/^[\s:–-]+|[\s:–-]+$/g, "")
      .trim();
    const safeTitle = title || "Class Session";
    if (safeTitle.toLowerCase() === "date") continue;
    const key = `${match.normalized || match.raw}|${safeTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    schedule.push({ date: match.normalized, title: safeTitle });
    if (schedule.length >= 200) break;
  }
  return schedule;
};

const looksLikePdf = (buffer: Buffer, mimeType: string) =>
  mimeType.toLowerCase().includes("pdf") || buffer.slice(0, 4).toString() === "%PDF";

const parseMinimalFromBuffer = async (
  buffer: Buffer,
  mimeType: string
): Promise<MinimalSyllabusCore> => {
  let text = "";
  if (looksLikePdf(buffer, mimeType)) {
    try {
      const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text?: string }>;
      const data = await pdfParse(buffer);
      text = data.text ?? "";
    } catch (err) {
      console.warn("[parseSyllabusFromBuffer] Local PDF parse failed:", err);
      text = "";
    }
  } else {
    text = buffer.toString("utf8");
  }

  return {
    course_code: null,
    course_title: null,
    schedule_entries: extractScheduleEntriesFromText(text),
  };
};

async function callMinimalModel(buffer: Buffer, mimeType: string) {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a parser that extracts minimal structured data from a university course syllabus. " +
      "Only return the course code, course title, and dated lesson titles according to the provided MinimalSyllabus schema."
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
      maxOutputTokens: 768,
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
  const fixerModel = getGenAI().getGenerativeModel({
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
  let raw = "";
  try {
    raw = await callMinimalModel(buffer, mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[parseSyllabusFromBuffer] Gemini failed, falling back to local parse:", message);
    const localMinimal = await parseMinimalFromBuffer(buffer, mimeType);
    const fallbackSyllabus: Syllabus = {
      course_code: localMinimal.course_code,
      course_title: localMinimal.course_title,
      term: null,
      instructor_name: null,
      instructor_email: null,
      meeting_times: null,
      location: null,
      office_hours: null,
      description: null,
      grading_breakdown: [],
      major_assignments: [],
      policies: {
        late_work: null,
        attendance: null,
        academic_integrity: null
      },
      schedule_entries: localMinimal.schedule_entries.map((entry) => ({
        date: entry.date,
        title: entry.title,
        type: "lesson",
        details: null
      }))
    };
    return fallbackSyllabus;
  }
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
    grading_breakdown: [],
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
