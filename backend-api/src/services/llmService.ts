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

const safeOps: WhiteboardOp[] = [
  { op: "rect", x: 24, y: 20, w: 120, h: 50, label: "idea" },
  { op: "arrow", from: [144, 45], to: [200, 45], label: "link" }
];

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log("[llmService]", ...args);
};

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

const isGeneralLectureContent = (value: unknown): value is GeneralLectureContent => {
  if (!value || typeof value !== "object") return false;
  const record = value as GeneralLectureContent;
  if (!Array.isArray(record.chunks)) return false;
  if (!record.confusionMode || typeof record.confusionMode.summary !== "string") return false;
  for (const chunk of record.chunks) {
    if (!chunk || typeof chunk.chunkTitle !== "string" || typeof chunk.narration !== "string") {
      return false;
    }
    if (chunk.boardOps && !isWhiteboardOps(chunk.boardOps)) return false;
  }
  if (record.confusionMode.boardOps && !isWhiteboardOps(record.confusionMode.boardOps)) return false;
  if (record.topQuestions && !record.topQuestions.every((q) => typeof q === "string")) return false;
  return true;
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
  return {
    chunks: [
      {
        chunkTitle: "Core Intuition",
        narration: `Today we are covering ${topicName}. ${cleanContext ? `We will frame it around ${cleanContext}. ` : ""}We start with a plain-language definition and a simple example.`,
        boardOps: safeOps
      },
      {
        chunkTitle: "Why It Matters",
        narration: `${levelLine} We end by connecting the concept to why it matters in practice.`,
        boardOps: [{ op: "text", x: 22, y: 90, text: "key intuition" }]
      }
    ],
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
    const { result, repaired } = await runGeminiJsonWithRepair<GeneralLectureContent>({
      model: GEMINI_MODEL,
      systemInstruction:
        "You generate structured lecture content as strict JSON for a teaching assistant.",
      repairSystemInstruction,
      prompt,
      repairPrompt: (rawText) => buildGeneralLectureRepairPrompt(rawText),
      validate: isGeneralLectureContent,
      temperature: 0.2,
      maxOutputTokens: 4096
    });
    if (result) {
      devLog(repaired ? "Gemini gen repair success" : "Gemini gen success");
      return { ...result, source: "gemini" };
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
