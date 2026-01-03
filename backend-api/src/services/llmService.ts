import type {
  GeneralLectureContent,
  LectureLevel,
  LectureQuestionAnswer,
  WhiteboardOp
} from "../types/lecture";
import {
  buildGeneralLecturePrompt,
  buildGeneralLectureRepairPrompt,
  buildQuestionPrompt,
  buildQuestionRepairPrompt,
  buildTieInPrompt,
  buildTieInRepairPrompt
} from "../lecture/lecturePrompts";
import { runGeminiJsonWithRepair } from "../gemini/jsonRepair";

type GenerateLectureInput = {
  topicName: string;
  topicContext: string;
  level: LectureLevel;
  styleVersion: string;
};

type GenerateTieInInput = {
  courseName: string;
  topicName: string;
  topicContext: string;
  topicOrdering: string;
  chunkCount: number;
  tieInVersion: string;
};

type QuestionInput = {
  courseName: string;
  topicName: string;
  topicContext: string;
  question: string;
  generalChunks: GeneralLectureContent["chunks"];
  tieIns: string[];
};

const GEMINI_MODEL = "gemini-2.0-flash";
const LLM_MODE = (process.env.LLM_MODE || "stub").toLowerCase();
export const GENERAL_LECTURE_GUARDS = {
  minChunks: 8,
  minWordsPerChunk: 120,
  minTotalWords: 1200
};

const safeOps: WhiteboardOp[] = [
  { op: "rect", x: 24, y: 20, w: 120, h: 50, label: "idea" },
  { op: "arrow", from: [144, 45], to: [200, 45], label: "link" }
];

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log("[llmService]", ...args);
};

const shouldLogFailures = () =>
  process.env.NODE_ENV !== "production" &&
  (process.env.LLM_LOG_RAW === "1" || process.env.LLM_LOG_FAILURES === "1");

const truncateRaw = (value: string, maxLength: number = 1200) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const countWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const isWhiteboardOp = (value: unknown): value is WhiteboardOp => {
  if (!value || typeof value !== "object") return false;
  const op = (value as { op?: string }).op;
  if (!op) return false;
  if (op === "rect") {
    const v = value as { x: number; y: number; w: number; h: number };
    return [v.x, v.y, v.w, v.h].every((n) => typeof n === "number");
  }
  if (op === "circle") {
    const v = value as { x: number; y: number; r: number };
    return [v.x, v.y, v.r].every((n) => typeof n === "number");
  }
  if (op === "arrow") {
    const v = value as { from: [number, number]; to: [number, number] };
    return Array.isArray(v.from) && Array.isArray(v.to) && v.from.length === 2 && v.to.length === 2;
  }
  if (op === "text") {
    const v = value as { x: number; y: number; text: string };
    return typeof v.x === "number" && typeof v.y === "number" && typeof v.text === "string";
  }
  if (op === "erase") {
    return true;
  }
  return false;
};

const isWhiteboardOps = (value: unknown): value is WhiteboardOp[] =>
  Array.isArray(value) && value.every(isWhiteboardOp);

export const validateGeneralLectureContent = (
  value: unknown
): { ok: boolean; errors: string[]; payload?: GeneralLectureContent } => {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["payload is not an object"] };
  }
  const record = value as Record<string, unknown>;
  if ("data" in record) {
    errors.push("payload wrapped in data");
  }
  if ("topQuestions" in record) {
    errors.push("topQuestions not allowed in general lecture");
  }
  const allowedRootKeys = new Set(["chunks", "confusionMode", "topQuestions"]);
  Object.keys(record).forEach((key) => {
    if (!allowedRootKeys.has(key)) {
      errors.push(`unexpected root key: ${key}`);
    }
  });
  if (!Array.isArray(record.chunks)) {
    errors.push("chunks must be an array");
  }
  const chunks = Array.isArray(record.chunks) ? record.chunks : [];
  if (chunks.length < GENERAL_LECTURE_GUARDS.minChunks) {
    errors.push(`chunk count too small: ${chunks.length}`);
  }
  let totalWords = 0;
  chunks.forEach((chunk, index) => {
    if (!chunk || typeof chunk !== "object") {
      errors.push(`chunk ${index + 1} is not an object`);
      return;
    }
    const chunkRecord = chunk as Record<string, unknown>;
    const allowedChunkKeys = new Set(["chunkTitle", "narration", "boardOps"]);
    Object.keys(chunkRecord).forEach((key) => {
      if (!allowedChunkKeys.has(key)) {
        errors.push(`chunk ${index + 1} has unexpected key: ${key}`);
      }
    });
    const chunkTitle = chunkRecord.chunkTitle;
    const narration = chunkRecord.narration;
    if (typeof chunkTitle !== "string" || chunkTitle.trim().length === 0) {
      errors.push(`chunk ${index + 1} missing chunkTitle`);
    }
    if (typeof narration !== "string" || narration.trim().length === 0) {
      errors.push(`chunk ${index + 1} missing narration`);
    } else {
      const words = countWords(narration);
      totalWords += words;
      if (words < GENERAL_LECTURE_GUARDS.minWordsPerChunk) {
        errors.push(`chunk ${index + 1} narration too short (${words} words)`);
      }
    }
    if (chunkRecord.boardOps && !isWhiteboardOps(chunkRecord.boardOps)) {
      errors.push(`chunk ${index + 1} has invalid boardOps`);
    }
  });
  if (totalWords < GENERAL_LECTURE_GUARDS.minTotalWords) {
    errors.push(`total narration too short (${totalWords} words)`);
  }
  const confusionMode = record.confusionMode as Record<string, unknown> | undefined;
  if (!confusionMode || typeof confusionMode.summary !== "string") {
    errors.push("confusionMode.summary is required");
  }
  if (confusionMode?.boardOps && !isWhiteboardOps(confusionMode.boardOps)) {
    errors.push("confusionMode.boardOps invalid");
  }
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, errors: [], payload: record as GeneralLectureContent };
};

const isTieInPayload = (value: unknown): value is { tieIns: string[] } => {
  if (!value || typeof value !== "object") return false;
  const record = value as { tieIns?: unknown };
  return Array.isArray(record.tieIns) && record.tieIns.every((item) => typeof item === "string");
};

const isQuestionPayload = (value: unknown): value is LectureQuestionAnswer => {
  if (!value || typeof value !== "object") return false;
  const record = value as LectureQuestionAnswer;
  if (typeof record.answer !== "string") return false;
  if (record.boardOps && !isWhiteboardOps(record.boardOps)) return false;
  return true;
};

const normalizeStubContext = (topicName: string, topicContext: string) => {
  const parts = topicContext
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const filtered = parts.filter((part) => !/^\d+$/.test(part) && part.toLowerCase() !== "lesson");
  const topicKey = topicName.toLowerCase().trim();
  const withoutTopic = filtered.filter((part) => part.toLowerCase() !== topicKey);
  const unique = withoutTopic.filter((part, index) => withoutTopic.indexOf(part) === index);
  return unique.length ? unique.join(", ") : "";
};

const buildStubLecture = (input: GenerateLectureInput): GeneralLectureContent => {
  const { topicName, topicContext, level } = input;
  const cleanContext = normalizeStubContext(topicName, topicContext);
  const levelLine =
    level === "intro"
      ? "We will keep it lightweight and focus on the big picture."
      : level === "exam"
        ? "We will highlight the patterns that show up on exams."
        : "We will go deeper into the mechanics behind the idea.";
  const titles = [
    "Core Intuition",
    "Key Definitions",
    "Mechanics",
    "Worked Example",
    "Common Pitfalls",
    "Why It Matters",
    "Connections",
    "Wrap Up"
  ];
  const buildNarration = (index: number) => {
    const baseSentences = [
      `${topicName} is the focus of this part, and we will keep a steady, conversational pace as we unpack it.`,
      cleanContext
        ? `To stay grounded, we frame the idea around ${cleanContext} and connect it back to real intuition.`
        : `We anchor the explanation in intuition before introducing any mechanics or jargon.`,
      "Notice how each step builds on the previous one, so the logic feels continuous instead of fragmented.",
      "We highlight the motivation, then walk through the mechanism in plain language, and end with a practical implication.",
      "If something feels abstract, pause and restate the core idea in simpler terms before moving forward.",
      levelLine
    ];
    let narration = "";
    let cursor = 0;
    while (countWords(narration) < GENERAL_LECTURE_GUARDS.minWordsPerChunk) {
      narration += `${baseSentences[cursor % baseSentences.length]} `;
      cursor += 1;
    }
    return narration.trim();
  };
  const chunks = Array.from({ length: GENERAL_LECTURE_GUARDS.minChunks }, (_, index) => ({
    chunkTitle: titles[index] || `Part ${index + 1}`,
    narration: buildNarration(index),
    boardOps: index === 0 ? safeOps : undefined
  }));
  return {
    chunks,
    confusionMode: {
      summary: `${topicName} centers on one core idea. Focus on that before the details.`,
      boardOps: [{ op: "text", x: 18, y: 20, text: "one core idea" }]
    },
    source: "stub"
  };
};

export const llmService = {
  async generateLecture(input: GenerateLectureInput): Promise<GeneralLectureContent> {
    if (LLM_MODE !== "gemini") {
      return buildStubLecture(input);
    }
    const prompt = buildGeneralLecturePrompt(
      input.topicContext,
      input.level,
      input.styleVersion
    );
    const repairSystemInstruction =
      "You receive malformed or partially incorrect JSON-like text for a lecture payload. " +
      "Repair it into valid JSON that matches the schema in the prompt. " +
      "Return JSON only with no markdown or extra text.";
    let validationErrors: string[] = [];
    const validate = (value: unknown): value is GeneralLectureContent => {
      const outcome = validateGeneralLectureContent(value);
      validationErrors = outcome.errors;
      return outcome.ok;
    };
    const { result, repaired, raw } = await runGeminiJsonWithRepair<GeneralLectureContent>({
      model: GEMINI_MODEL,
      systemInstruction:
        "You generate structured lecture content as strict JSON for a teaching assistant.",
      repairSystemInstruction,
      prompt,
      repairPrompt: (rawText) => buildGeneralLectureRepairPrompt(rawText),
      validate,
      temperature: 0.2,
      maxOutputTokens: 4096
    });
    if (result) {
      devLog(repaired ? "Gemini gen repair success" : "Gemini gen success");
      return { ...result, source: "gemini" };
    }
    if (validationErrors.length) {
      devLog("Gemini gen validation failed", { errors: validationErrors });
    }
    if (shouldLogFailures()) {
      console.log("[llmService] Gemini gen failed raw:", truncateRaw(raw));
    }
    devLog("fallback to stub");
    return { ...buildStubLecture(input), source: "stub_fallback" };
  },

  async generateTieIns(input: GenerateTieInInput): Promise<string[]> {
    if (LLM_MODE !== "gemini") {
      const { courseName, topicName, topicContext, topicOrdering, chunkCount } = input;
      const cleanContext = normalizeStubContext(topicName, topicContext);
      return Array.from({ length: chunkCount }, () =>
        `In ${courseName}, ${topicName} connects to ${topicOrdering}.${cleanContext ? ` We will frame it around ${cleanContext}.` : ""}`
      );
    }
    const prompt = buildTieInPrompt(input.courseName, input.topicContext, input.topicOrdering);
    const repairSystemInstruction =
      "You receive malformed JSON-like text for tie-in strings. " +
      "Repair it into valid JSON that matches the schema in the prompt. " +
      "Return JSON only with no markdown or extra text.";
    const { result, repaired } = await runGeminiJsonWithRepair<{ tieIns: string[] }>({
      model: GEMINI_MODEL,
      systemInstruction: "You generate short, course-specific tie-ins as strict JSON.",
      repairSystemInstruction,
      prompt,
      repairPrompt: (rawText) => buildTieInRepairPrompt(rawText),
      validate: isTieInPayload,
      temperature: 0.2,
      maxOutputTokens: 512
    });
    if (result) {
      devLog(repaired ? "Gemini tie-in repair success" : "Gemini tie-in success");
      return result.tieIns;
    }
    devLog("fallback to stub tie-ins");
    const { courseName, topicName, topicContext, topicOrdering, chunkCount } = input;
    const cleanContext = normalizeStubContext(topicName, topicContext);
    return Array.from({ length: chunkCount }, () =>
      `In ${courseName}, ${topicName} connects to ${topicOrdering}.${cleanContext ? ` We will frame it around ${cleanContext}.` : ""}`
    );
  },

  async answerQuestion(input: QuestionInput): Promise<LectureQuestionAnswer> {
    if (LLM_MODE !== "gemini") {
      const { question, topicName, topicContext } = input;
      return {
        answer: `Short answer on ${topicName}: ${topicContext}. ${question.trim().slice(0, 120)}.`,
        boardOps: [{ op: "text", x: 16, y: 20, text: "short answer" }]
      };
    }
    const prompt = buildQuestionPrompt(input.courseName, input.topicContext, input.question);
    const repairSystemInstruction =
      "You receive malformed JSON-like text for a short answer payload. " +
      "Repair it into valid JSON that matches the schema in the prompt. " +
      "Return JSON only with no markdown or extra text.";
    const { result, repaired } = await runGeminiJsonWithRepair<LectureQuestionAnswer>({
      model: GEMINI_MODEL,
      systemInstruction: "You answer learner questions as strict JSON.",
      repairSystemInstruction,
      prompt,
      repairPrompt: (rawText) => buildQuestionRepairPrompt(rawText),
      validate: isQuestionPayload,
      temperature: 0.2,
      maxOutputTokens: 512
    });
    if (result) {
      devLog(repaired ? "Gemini Q&A repair success" : "Gemini Q&A success");
      return result;
    }
    devLog("fallback to stub Q&A");
    const { question, topicName, topicContext } = input;
    return {
      answer: `Short answer on ${topicName}: ${topicContext}. ${question.trim().slice(0, 120)}.`,
      boardOps: [{ op: "text", x: 16, y: 20, text: "short answer" }]
    };
  }
};
