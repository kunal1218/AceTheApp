import { createHash } from "crypto";
import { EXAMPLE_LECTURE_PACKAGE } from "./exampleLecturePackage";

const GENERAL_SCHEMA_EXAMPLE = {
  chunks: EXAMPLE_LECTURE_PACKAGE.chunks.map((chunk) => ({
    chunkTitle: chunk.chunkTitle,
    narration: chunk.narration,
    boardOps: chunk.boardOps
  })),
  confusionMode: EXAMPLE_LECTURE_PACKAGE.confusionMode
};

export const GENERAL_LECTURE_SCHEMA_HINT = JSON.stringify(GENERAL_SCHEMA_EXAMPLE, null, 2);

export const TIE_IN_SCHEMA_HINT = JSON.stringify(
  { tieIns: ["Short tie-in sentence."] },
  null,
  2
);

export const QUESTION_SCHEMA_HINT = JSON.stringify(
  {
    answer: "Short, calm answer.",
    boardOps: [{ op: "text", x: 12, y: 18, text: "key idea" }]
  },
  null,
  2
);

export const buildGeneralLecturePrompt = (
  topicContext: string,
  level: string,
  styleVersion: string
) => `
Explain "${topicContext}" clearly and concretely for a ${level} learner (style ${styleVersion}).
Cover what it is, why it matters, common misconceptions, edge cases, and include exactly one worked example explained step-by-step.
Plain text only.
`;

export function buildGeneralLectureCall1Prompt(
  topicContext: string,
  level: string,
  styleVersion: string
) {
  return [
    `Explain "${topicContext}" clearly and concretely for a ${level} learner (style ${styleVersion}).`,
    `Cover what it is, why it matters, common misconceptions, edge cases, and include exactly one worked example explained step-by-step.`,
    `Plain text only.`
  ].join("\n");
}

export function buildGeneralLectureCall2TeacherRewritePrompt(call1AnswerText: string) {
  return [
    `Rewrite the text below so it sounds like a teacher speaking to a class.`,
    `Do not add or remove facts or examples, keep the same order, and keep exactly one worked example with no headings or "Part 1/Part 2" labels.`,
    `Plain text only.`,
    ``,
    `Text to rewrite:`,
    `<<<BEGIN_TEXT`,
    call1AnswerText,
    `END_TEXT>>>`
  ].join("\n");
}

export function buildGeneralLectureCall3JsonizePrompt(
  teacherText: string,
  schemaHint: string
) {
  return [
    `Convert the text below into JSON with fields: { chunks: [{ chunkTitle, narration }], confusionMode: { summary } }.`,
    `Use 1 to 3 chunks by splitting naturally and do not add facts or examples.`,
    `Return JSON only.`,
    ``,
    `Schema (must match exactly):`,
    `${schemaHint}`,
    ``,
    `Text to convert:`,
    `<<<BEGIN_TEXT`,
    teacherText,
    `END_TEXT>>>`
  ].join("\n");
}

export function buildLecturePackageJsonRepairPrompt(
  badJson: string,
  failureReasons: string,
  schemaHint: string
) {
  return [
    `You are repairing a JSON object to satisfy a schema and validation rules.`,
    ``,
    `Rules:`,
    `- Return ONLY valid JSON. No markdown. No commentary.`,
    `- Do NOT add new technical claims or new examples.`,
    `- Do NOT add tie-ins, course references, assignments, professors, or dates.`,
    `- Do NOT include topQuestions.`,
    `- Ensure there are 5 to 10 chunks.`,
    `- Ensure whiteboardOps appear in ONLY ONE chunk, and only for the worked example.`,
    ``,
    `Schema (must match exactly):`,
    `${schemaHint}`,
    ``,
    `Validation failures to fix:`,
    `${failureReasons}`,
    ``,
    `Bad JSON to repair:`,
    `<<<BEGIN_BAD_JSON`,
    badJson,
    `END_BAD_JSON>>>`,
    ``,
    `Return ONLY the repaired JSON object.`
  ].join("\n");
}

const GENERAL_PROMPT_SAMPLE = [
  buildGeneralLectureCall1Prompt("SAMPLE_TOPIC_CONTEXT", "intro", "vX"),
  buildGeneralLectureCall2TeacherRewritePrompt("SAMPLE_ANSWER_TEXT")
].join("\n\n");

export const GENERAL_PROMPT_FINGERPRINT = createHash("sha256")
  .update(GENERAL_PROMPT_SAMPLE)
  .digest("hex")
  .slice(0, 8);

export const buildGeneralLectureRepairPrompt = (
  rawText: string,
  schemaHint: string = GENERAL_LECTURE_SCHEMA_HINT,
  failureReasons: string[] = []
) => `
You receive malformed or partially incorrect JSON-like text for a lecture payload.
Repair it into valid JSON that matches this schema example.
Rewrite narrations to follow the narrative arc, remove repetition, add concrete anchors per chunk,
use smooth transitions, avoid meta/report framing or banned filler phrases,
and ensure each chunk adds exactly one new idea with forward motion.
Return JSON only. No markdown, no explanations.

${failureReasons.length ? `Validation failures:\n- ${failureReasons.join("\n- ")}\n` : ""}

Schema example:
${schemaHint}

Malformed input:
${rawText}
`;

export const buildTieInPrompt = (
  courseName: string,
  topicContext: string,
  topicOrdering: string
) => `
You are Ace. Write short, course-specific tie-ins.
Course: "${courseName}"
Topic context: "${topicContext}"
Ordering context: "${topicOrdering}"

Rules:
- 1-2 sentences max per chunk.
- Do NOT introduce new concepts.
- Reference course context lightly.
- Return JSON only.

Return STRICT JSON:
${TIE_IN_SCHEMA_HINT}
`;

export const buildTieInRepairPrompt = (
  rawText: string,
  schemaHint: string = TIE_IN_SCHEMA_HINT
) => `
You receive malformed JSON-like text for tie-in strings.
Repair it into valid JSON that matches this schema.
Return JSON only. No markdown, no explanations.

Schema:
${schemaHint}

Malformed input:
${rawText}
`;

export const buildQuestionPrompt = (
  courseName: string,
  topicContext: string,
  question: string
) => `
You are Ace. Answer the learner's question briefly and calmly.
Course: "${courseName}"
Topic context: "${topicContext}"
Question: "${question}"

Rules:
- Keep it short (3-5 sentences).
- If a simple diagram helps, return 1-3 whiteboard ops only.
- Do NOT re-teach the entire lecture.
- Return JSON only.

Return STRICT JSON:
${QUESTION_SCHEMA_HINT}
`;

export const buildQuestionRepairPrompt = (
  rawText: string,
  schemaHint: string = QUESTION_SCHEMA_HINT
) => `
You receive malformed JSON-like text for a short answer payload.
Repair it into valid JSON matching this schema.
Return JSON only. No markdown, no explanations.

Schema:
${schemaHint}

Malformed input:
${rawText}
`;
