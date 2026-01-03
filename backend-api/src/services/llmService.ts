import type {
  GeneralLectureContent,
  LectureLevel,
  LectureQuestionAnswer,
  WhiteboardOp
} from "../types/lecture";
import {
  GENERAL_LECTURE_SCHEMA_HINT,
  buildGeneralLectureAnswerToLectureJsonPrompt,
  buildGeneralLectureNaturalAnswerPrompt,
  buildLecturePackageJsonRepairPrompt,
  buildQuestionPrompt,
  buildQuestionRepairPrompt,
  buildTieInPrompt,
  buildTieInRepairPrompt
} from "../lecture/lecturePrompts";
import { getGenAI } from "../gemini/client";
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
  minTotalWords: 1200,
  maxRepeatedSentenceRatio: 0.2,
  maxSentenceRepeatChunks: 3,
  minSentenceWords: 6,
  maxChunks: 10
};

const safeOps: WhiteboardOp[] = [
  { op: "rect", x: 24, y: 20, w: 120, h: 50, label: "idea" },
  { op: "arrow", from: [144, 45], to: [200, 45], label: "link" }
];

const BANNED_FILLER_PHRASES = [
  "part 1 focuses on",
  "part one focuses on",
  "for part",
  "with that foundation in place",
  "we keep the explanation grounded",
  "we start with intuition and only add mechanics",
  "this connects directly to how you would reason",
  "another detail uses value",
  "we ground the explanation",
  "we start with intuition",
  "we end by stating",
  "we will keep it lightweight",
  "notice how each step builds",
  "conversational pace",
  "anchor the explanation",
  "we highlight the motivation",
  "walk through in plain language",
  "focus on the big picture"
];

const BANNED_FILLER_PATTERNS = [
  /\bpart\s+\d+\s+focuses on\b/i,
  /\bfor part\s+\d+\b/i
];

const OPENING_SIMILARITY_THRESHOLD = 0.82;

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

type LectureValidationChecks = {
  chunkCountOk: boolean;
  wordCountOk: boolean;
  totalWordsOk: boolean;
  anchorsOk: boolean;
  repetitionOk: boolean;
  openingVarietyOk: boolean;
  numericNoiseOk: boolean;
  groundingOk: boolean;
  boardOpsOk: boolean;
  bannedPhrasesOk: boolean;
  structureOk: boolean;
  draftWordCount?: number;
  convertPass?: "ok" | "repaired" | "stub_fallback";
};

const normalizeSentence = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitSentences = (value: string) =>
  value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const hasAnchorInNarration = (narration: string, boardOps?: WhiteboardOp[]) => {
  const text = narration.toLowerCase();
  const hasConcreteExample =
    /\b(example|suppose|for instance|imagine)\b/.test(text) && /\d/.test(text);
  const hasStepByStep =
    /(step\s*1|step one|first,|firstly)[\s\S]*?(step\s*2|step two|second,|secondly)/i.test(
      narration
    );
  const hasPseudocode =
    /\bif\b[\s\S]*?\b(then|else|return)\b/i.test(narration) ||
    /\bfor\b[\s\S]*?\b(in|to|do)\b/i.test(narration) ||
    /\bwhile\b[\s\S]*?\b(do|return)\b/i.test(narration);
  const hasMisconception =
    /\b(common misconception|common mistake|people often think|many assume|incorrectly assume|misunderstanding|but actually|however, the correct)\b/i.test(
      narration
    );
  const hasWorkedExample =
    !!boardOps && /\b(worked example|example|walkthrough|case study|demo)\b/i.test(narration);
  return {
    ok: hasConcreteExample || hasStepByStep || hasPseudocode || hasMisconception || hasWorkedExample,
    hasWorkedExample
  };
};

const analyzeRepetition = (
  chunks: Array<{ narration: string }>
): {
  repeatedRatio: number;
  maxChunkAppearances: number;
  repeatedSentence?: string;
  totalSentences: number;
} => {
  const sentenceMap = new Map<
    string,
    { count: number; chunkIndexes: Set<number> }
  >();
  let totalSentences = 0;

  chunks.forEach((chunk, index) => {
    const sentences = splitSentences(chunk.narration);
    const seenInChunk = new Set<string>();
    sentences.forEach((sentence) => {
      const normalized = normalizeSentence(sentence);
      if (!normalized) return;
      const wordCount = normalized.split(" ").length;
      if (wordCount < GENERAL_LECTURE_GUARDS.minSentenceWords) return;
      if (seenInChunk.has(normalized)) return;
      seenInChunk.add(normalized);
      totalSentences += 1;
      const entry = sentenceMap.get(normalized) ?? {
        count: 0,
        chunkIndexes: new Set<number>()
      };
      entry.count += 1;
      entry.chunkIndexes.add(index);
      sentenceMap.set(normalized, entry);
    });
  });

  let repeatedCount = 0;
  let maxChunkAppearances = 0;
  let repeatedSentence: string | undefined;

  sentenceMap.forEach((entry, sentence) => {
    const chunkAppearances = entry.chunkIndexes.size;
    if (chunkAppearances > 1) {
      repeatedCount += entry.count;
    }
    if (chunkAppearances > maxChunkAppearances) {
      maxChunkAppearances = chunkAppearances;
      repeatedSentence = sentence;
    }
  });

  const repeatedRatio = totalSentences ? repeatedCount / totalSentences : 0;
  return { repeatedRatio, maxChunkAppearances, repeatedSentence, totalSentences };
};

const extractOpening = (narration: string, sentenceCount: number = 2) => {
  const sentences = splitSentences(narration);
  return sentences.slice(0, sentenceCount).join(" ");
};

const jaccardSimilarity = (a: string, b: string) => {
  const tokensA = new Set(normalizeSentence(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeSentence(b).split(" ").filter(Boolean));
  if (!tokensA.size || !tokensB.size) return 0;
  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection += 1;
  });
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const analyzeOpeningSimilarity = (
  narrations: Array<{ narration: string }>
): { maxSimilarity: number; pair?: [number, number] } => {
  let maxSimilarity = 0;
  let pair: [number, number] | undefined;
  for (let i = 0; i < narrations.length; i += 1) {
    const openingA = extractOpening(narrations[i].narration);
    for (let j = i + 1; j < narrations.length; j += 1) {
      const openingB = extractOpening(narrations[j].narration);
      const similarity = jaccardSimilarity(openingA, openingB);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        pair = [i, j];
      }
    }
  }
  return { maxSimilarity, pair };
};

const countNumbers = (value: string) => (value.match(/\b\d+(\.\d+)?\b/g) || []).length;

const hasGroundedSubstance = (narration: string, numberCount: number) => {
  const lower = narration.toLowerCase();
  const hasDefinition =
    /\bis\b/.test(lower) && /\b(not|specifically|in contrast|rather than)\b/.test(lower);
  const hasMeans = /\bmeans\b/.test(lower);
  const hasCausal = /\b(because|therefore|which means|so that)\b/.test(lower);
  const hasRule = /\b(rule|step|algorithm|compute|calculate)\b/.test(lower);
  const hasConditional = /\bif\b[\s\S]*?\bthen\b/i.test(narration);
  const hasExample = /\b(example|suppose|for instance|imagine)\b/.test(lower);
  const hasNumericExample =
    numberCount > 0 && (hasRule || hasCausal || hasExample || hasConditional);
  return (
    hasDefinition ||
    hasMeans ||
    hasCausal ||
    hasRule ||
    hasConditional ||
    hasNumericExample
  );
};

export const validateGeneralLectureContent = (
  value: unknown
): {
  ok: boolean;
  errors: string[];
  checks: LectureValidationChecks;
  payload?: GeneralLectureContent;
} => {
  const errors: string[] = [];
  const checks: LectureValidationChecks = {
    chunkCountOk: true,
    wordCountOk: true,
    totalWordsOk: true,
    anchorsOk: true,
    repetitionOk: true,
    openingVarietyOk: true,
    numericNoiseOk: true,
    groundingOk: true,
    boardOpsOk: true,
    bannedPhrasesOk: true,
    structureOk: true
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      errors: ["payload is not an object"],
      checks: { ...checks, structureOk: false }
    };
  }
  const record = value as Record<string, unknown>;
  if ("data" in record) {
    errors.push("payload wrapped in data");
    checks.structureOk = false;
  }
  if ("topQuestions" in record) {
    errors.push("topQuestions not allowed in general lecture");
    checks.structureOk = false;
  }
  const allowedRootKeys = new Set([
    "chunks",
    "confusionMode",
    "topQuestions",
    "source",
    "diagnostics"
  ]);
  Object.keys(record).forEach((key) => {
    if (!allowedRootKeys.has(key)) {
      errors.push(`unexpected root key: ${key}`);
      checks.structureOk = false;
    }
  });
  if (!Array.isArray(record.chunks)) {
    errors.push("chunks must be an array");
    checks.structureOk = false;
  }
  if ("diagnostics" in record && record.diagnostics !== undefined) {
    const diagnostics = record.diagnostics;
    if (typeof diagnostics !== "object" || diagnostics === null) {
      errors.push("diagnostics must be an object");
      checks.structureOk = false;
    } else {
      const diagRecord = diagnostics as Record<string, unknown>;
      if (typeof diagRecord.draftWordCount === "number") {
        checks.draftWordCount = diagRecord.draftWordCount;
      }
      if (
        diagRecord.convertPass === "ok" ||
        diagRecord.convertPass === "repaired" ||
        diagRecord.convertPass === "stub_fallback"
      ) {
        checks.convertPass = diagRecord.convertPass;
      }
    }
  }
  const chunks = Array.isArray(record.chunks) ? record.chunks : [];
  if (chunks.length < GENERAL_LECTURE_GUARDS.minChunks) {
    errors.push(`chunk count too small: ${chunks.length}`);
    checks.chunkCountOk = false;
  }
  if (chunks.length > GENERAL_LECTURE_GUARDS.maxChunks) {
    errors.push(`chunk count too large: ${chunks.length}`);
    checks.chunkCountOk = false;
  }
  let totalWords = 0;
  const narrations: Array<{ narration: string }> = [];
  let boardOpsCount = 0;
  chunks.forEach((chunk, index) => {
    if (!chunk || typeof chunk !== "object") {
      errors.push(`chunk ${index + 1} is not an object`);
      checks.structureOk = false;
      return;
    }
    const chunkRecord = chunk as Record<string, unknown>;
    const allowedChunkKeys = new Set(["chunkTitle", "narration", "boardOps"]);
    Object.keys(chunkRecord).forEach((key) => {
      if (!allowedChunkKeys.has(key)) {
        errors.push(`chunk ${index + 1} has unexpected key: ${key}`);
        checks.structureOk = false;
      }
    });
    const chunkTitle = chunkRecord.chunkTitle;
    const narration = chunkRecord.narration;
    if (typeof chunkTitle !== "string" || chunkTitle.trim().length === 0) {
      errors.push(`chunk ${index + 1} missing chunkTitle`);
      checks.structureOk = false;
    }
    if (typeof narration !== "string" || narration.trim().length === 0) {
      errors.push(`chunk ${index + 1} missing narration`);
      checks.structureOk = false;
    } else {
      narrations.push({ narration });
      const words = countWords(narration);
      totalWords += words;
      if (words < GENERAL_LECTURE_GUARDS.minWordsPerChunk) {
        errors.push(`chunk ${index + 1} narration too short (${words} words)`);
        checks.wordCountOk = false;
      }
      const lower = narration.toLowerCase();
      const bannedPhrase = BANNED_FILLER_PHRASES.find((phrase) => lower.includes(phrase));
      if (bannedPhrase) {
        errors.push(`chunk ${index + 1} uses banned filler phrase: "${bannedPhrase}"`);
        checks.bannedPhrasesOk = false;
      }
      const bannedPattern = BANNED_FILLER_PATTERNS.find((pattern) => pattern.test(narration));
      if (bannedPattern) {
        errors.push(`chunk ${index + 1} uses banned scaffold pattern`);
        checks.bannedPhrasesOk = false;
      }
      const numberCount = countNumbers(narration);
      const hasMechanismMarker =
        /\b(rule|step|algorithm|compute|calculate|because|therefore|which means|so that|means|if\b|then\b|example|suppose|for instance|imagine)\b/i.test(
          narration
        );
      if (numberCount > 0 && !hasMechanismMarker) {
        errors.push(`chunk ${index + 1} uses numbers without explaining a mechanism`);
        checks.numericNoiseOk = false;
      }
      if (!hasGroundedSubstance(narration, numberCount)) {
        errors.push(`chunk ${index + 1} lacks grounded, checkable substance`);
        checks.groundingOk = false;
      }
      const anchorCheck = hasAnchorInNarration(narration, chunkRecord.boardOps as WhiteboardOp[]);
      if (!anchorCheck.ok) {
        errors.push(`chunk ${index + 1} missing concrete anchor`);
        checks.anchorsOk = false;
      }
      const isExampleTitle =
        typeof chunkTitle === "string" && /\bexample\b/i.test(chunkTitle);
      if (chunkRecord.boardOps) {
        boardOpsCount += 1;
      }
      if (chunkRecord.boardOps && !isWhiteboardOps(chunkRecord.boardOps)) {
        errors.push(`chunk ${index + 1} has invalid boardOps`);
        checks.boardOpsOk = false;
      } else if (chunkRecord.boardOps && !anchorCheck.hasWorkedExample) {
        errors.push(`chunk ${index + 1} uses boardOps without a worked example narration`);
        checks.boardOpsOk = false;
      } else if (chunkRecord.boardOps && !isExampleTitle) {
        errors.push(`chunk ${index + 1} uses boardOps without Example in title`);
        checks.boardOpsOk = false;
      }
    }
  });
  if (boardOpsCount > 2) {
    errors.push(`too many boardOps chunks (${boardOpsCount})`);
    checks.boardOpsOk = false;
  }
  if (totalWords < GENERAL_LECTURE_GUARDS.minTotalWords) {
    errors.push(`total narration too short (${totalWords} words)`);
    checks.totalWordsOk = false;
  }
  if (narrations.length) {
    const repetition = analyzeRepetition(narrations);
    if (repetition.repeatedRatio > GENERAL_LECTURE_GUARDS.maxRepeatedSentenceRatio) {
      errors.push(
        `repetition too high (${Math.round(repetition.repeatedRatio * 100)}% repeated sentences)`
      );
      checks.repetitionOk = false;
    }
    if (repetition.maxChunkAppearances >= GENERAL_LECTURE_GUARDS.maxSentenceRepeatChunks) {
      errors.push(
        `sentence repeated across ${repetition.maxChunkAppearances} chunks: "${repetition.repeatedSentence}"`
      );
      checks.repetitionOk = false;
    }
    const openingSimilarity = analyzeOpeningSimilarity(narrations);
    if (openingSimilarity.maxSimilarity > OPENING_SIMILARITY_THRESHOLD) {
      const pair = openingSimilarity.pair;
      errors.push(
        `chunk openings too similar (chunks ${pair ? `${pair[0] + 1} & ${pair[1] + 1}` : "multiple"})`
      );
      checks.openingVarietyOk = false;
    }
  }
  const confusionMode = record.confusionMode as Record<string, unknown> | undefined;
  if (!confusionMode || typeof confusionMode.summary !== "string") {
    errors.push("confusionMode.summary is required");
    checks.structureOk = false;
  }
  if (confusionMode?.boardOps && !isWhiteboardOps(confusionMode.boardOps)) {
    errors.push("confusionMode.boardOps invalid");
    checks.boardOpsOk = false;
  }
  if (errors.length) {
    return { ok: false, errors, checks };
  }
  return { ok: true, errors: [], checks, payload: record as GeneralLectureContent };
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
      ? "We move from definition to mechanism, then to implications."
      : level === "exam"
        ? "We prioritize the exact patterns that show up under time pressure."
        : "We go deeper into why the mechanism behaves the way it does.";

  const chunkSpecs = [
    { title: "Definition and Motivation", anchor: "misconception" },
    { title: "Core Mental Model", anchor: "example" },
    { title: "Key Terms and Components", anchor: "pseudocode" },
    { title: "How It Works", anchor: "steps" },
    { title: "Simple Example", anchor: "example" },
    { title: "Worked Example", anchor: "example", boardOps: safeOps },
    { title: "Common Pitfalls", anchor: "misconception" },
    { title: "Practical Implications", anchor: "example" }
  ];

  const padNarration = (sentences: string[], index: number) => {
    let narration = sentences.join(" ");
    let counter = 0;
    while (countWords(narration) < GENERAL_LECTURE_GUARDS.minWordsPerChunk) {
      const offset = (index + 3) * 7 + counter;
      narration += ` For example, if i = ${offset} and size = 4, then addr = base + i * size, which means the offset scales with i.`;
      counter += 1;
    }
    return narration.trim();
  };

  const buildTransition = (index: number) => {
    const transitions = [
      `Let’s begin with a plain-language definition of ${topicName} and why it exists.`,
      "With the definition in place, we can build the core mental picture.",
      "That picture needs a few precise terms, so we name the key parts.",
      "Now we can walk through the mechanism step by step.",
      "To make it concrete, try a small example.",
      "Now we expand into a fuller worked example.",
      "That example exposes common pitfalls, so we address them directly.",
      "With pitfalls cleared, we can see the practical implications."
    ];
    return transitions[index] || "Now we can move to the next idea without restarting.";
  };

  const buildNarration = (index: number, spec: (typeof chunkSpecs)[number]) => {
    const intro = buildTransition(index);
    const contextLine = cleanContext
      ? `We connect ${spec.title.toLowerCase()} to ${cleanContext} so the idea stays concrete.`
      : `We connect ${spec.title.toLowerCase()} to a simple scenario so the idea stays tangible.`;
    const anchorLines: string[] = [];
    if (spec.anchor === "example") {
      const base = 1000 + index * 64;
      const valueA = 3 + index;
      const valueB = 7 + index * 2;
      anchorLines.push(
        `Worked example: suppose an array starts at address ${base} and holds values ${valueA}, ${valueB}, and ${valueB + 5}.`,
        `If the element size is 4 bytes, the next cell is at ${base + 4}, then ${base + 8}, and so on.`,
        `That concrete address arithmetic makes ${topicName} feel tangible instead of abstract.`
      );
    }
    if (spec.anchor === "steps") {
      anchorLines.push(
        "Step 1: identify the base reference and the units the pointer moves in.",
        "Step 2: apply the increment explicitly, tracking the resulting address or index.",
        "Step 3: map that new address back to the value you intend to access.",
        "The steps make the mechanics explicit and prevent hidden jumps in logic."
      );
    }
    if (spec.anchor === "pseudocode") {
      anchorLines.push(
        "Pseudocode: if i < n then addr = base + i * size; value = mem[addr]; return value.",
        "The short snippet shows the exact order of operations without extra syntax."
      );
    }
    if (spec.anchor === "misconception") {
      anchorLines.push(
        `Common misconception: people often think ${topicName} means the variable itself moves in memory.`,
        "But actually the address changes while the underlying array stays fixed, which is why the offset calculation matters."
      );
    }
    const close = `${levelLine} For ${spec.title.toLowerCase()}, that matters when you read or write real code involving ${topicName}.`;
    return padNarration([intro, contextLine, ...anchorLines, close], index);
  };

  const chunks = chunkSpecs.map((spec, index) => ({
    chunkTitle: spec.title,
    narration: buildNarration(index, spec),
    boardOps: spec.boardOps
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
    const call1Prompt = buildGeneralLectureNaturalAnswerPrompt(
      input.topicContext,
      input.level,
      input.styleVersion
    );
    const call1Model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: "You answer questions clearly and precisely in plain text."
    });
    const call1Response = await call1Model.generateContent({
      contents: [{ role: "user", parts: [{ text: call1Prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 3072
      }
    });
    const call1Text = call1Response.response.text().trim();
    const draftWordCount = countWords(call1Text);
    const call2Prompt = buildGeneralLectureAnswerToLectureJsonPrompt(
      call1Text,
      GENERAL_LECTURE_SCHEMA_HINT
    );
    const repairSystemInstruction =
      "You receive malformed or partially incorrect JSON-like text for a lecture payload. " +
      "Repair it into valid JSON that matches the schema in the prompt. " +
      "Return JSON only with no markdown or extra text.";
    let validationErrors: string[] = [];
    let validationChecks: LectureValidationChecks | undefined;
    const validate = (value: unknown): value is GeneralLectureContent => {
      const outcome = validateGeneralLectureContent(value);
      validationErrors = outcome.errors;
      validationChecks = outcome.checks;
      return outcome.ok;
    };
    const { result, repaired, raw } = await runGeminiJsonWithRepair<GeneralLectureContent>({
      model: GEMINI_MODEL,
      systemInstruction:
        "You convert structured lecture content into strict JSON for a teaching assistant.",
      repairSystemInstruction,
      prompt: call2Prompt,
      repairPrompt: (rawText) =>
        buildLecturePackageJsonRepairPrompt(
          rawText,
          validationErrors.length ? validationErrors.join("\n") : "Validation failed",
          GENERAL_LECTURE_SCHEMA_HINT
        ),
      validate,
      temperature: 0.2,
      maxOutputTokens: 4096
    });
    if (result) {
      const convertPass = repaired ? "repaired" : "ok";
      if (process.env.NODE_ENV !== "production") {
        result.diagnostics = { draftWordCount, convertPass };
      }
      devLog(repaired ? "Gemini gen repair success" : "Gemini gen success");
      return { ...result, source: "gemini" };
    }
    if (validationErrors.length) {
      devLog("Gemini gen validation failed", {
        errors: validationErrors,
        checks: validationChecks
      });
    }
    if (shouldLogFailures()) {
      console.log("[llmService] Gemini gen failed raw:", truncateRaw(raw));
    }
    devLog("fallback to stub");
    const fallback = { ...buildStubLecture(input), source: "stub_fallback" };
    if (process.env.NODE_ENV !== "production") {
      fallback.diagnostics = { draftWordCount, convertPass: "stub_fallback" };
    }
    return fallback;
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
