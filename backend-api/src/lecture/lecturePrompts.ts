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
You are Ace, a calm, structured teaching assistant generating a FULL spoken lecture transcript.

Topic context (general, course-agnostic):
"${topicContext}"

Level: "${level}"
Style version: "${styleVersion}"

GOAL:
Produce a high-quality, reusable lecture that could be read aloud verbatim. This is NOT an outline, NOT notes, and NOT a summary. It must feel like a real instructor explaining the topic from start to finish.

HARD REQUIREMENTS (must all be satisfied):
1) Length & depth
- Generate 5-10 chunks.
- Each chunk must contain a substantial narration transcript (at least ~120 words per chunk).
- The narration should sound like continuous teaching, with explanations, transitions, and emphasis.
- Do NOT use placeholder phrases like "Today we will cover..." without following with real explanation.

2) Narrative arc (topic-agnostic template)
Follow this universal structure IN ORDER. Adapt it to the topic without skipping required roles:
- Chunk 1: Plain-English definition + why the topic exists (motivation)
- Chunk 2: Core mental model / intuition (one central picture)
- Chunk 3: Key terms & components (minimal necessary vocabulary)
- Chunk 4: How it works step-by-step (the mechanism/process)
- Chunk 5: Simple example (small, concrete, fully explained)
- Chunk 6: Worked example (more detailed walkthrough; use boardOps here)
- Chunk 7: Common pitfalls / misconceptions + corrections
- Chunk 8: Practical implications (how you use it; why it matters)
- Chunk 9 (optional): Edge case / boundary scenario
- Chunk 10 (optional): Recap + "if you remember one thing" summary

3) Chunk structure & transitions
Each chunk MUST include:
- chunkTitle: a short descriptive title
- narration: the full spoken explanation (this is the most important field)
- boardOps: OPTIONAL, only when illustrating a concrete example or spatial relationship
- Each chunk MUST begin with a 1-2 sentence transition referencing the previous chunk.
- Write as if speaking to a student; do not describe your plan or structure.
- Do not reuse the same sentence structure or teaching meta across chunks.
- Do not restate how you are teaching or why you are teaching that way.
- Each chunk must introduce EXACTLY ONE new idea not explained before.
- After the brief transition (1 sentence max), move forward by explaining something new.
- Do NOT restart from definitions or re-anchor unless it is the optional recap chunk.
- Do NOT reuse the same opening scaffold (avoid template openings).

4) Novelty & anchors (ANTI-REPETITION)
- Each chunk must introduce NEW concrete content (no paraphrasing or recycling sentences).
- Every chunk narration MUST include at least ONE anchor item:
  * a concrete example with specific values (numbers, variable names, addresses)
  * a step-by-step walkthrough (e.g., "Step 1... Step 2...") in paragraph form
  * a short pseudocode snippet embedded as plain text
  * a common misconception + correction
  * a worked example that uses whiteboardOps to illustrate it

5) Whiteboard rules
- Only include boardOps in chunks that are explicitly "Worked Example" (or "Example") and narrate the example.
- Do NOT include decorative or redundant drawings.
- Use ONLY simple, structured commands (boxes, arrows, text labels).
- If no visual aid is genuinely helpful, omit boardOps entirely for that chunk.

6) Content discipline
- Do NOT mention any specific courses, professors, exams, assignments, deadlines, or institutions.
- Do NOT include course-specific tie-ins or any tieInText/tieIns fields.
- Focus on intuition first, then mechanics, then implications.
- Use analogies sparingly and only when they illuminate the core idea.
- Use concrete details only when needed to explain; avoid random numbers or facts.
- Avoid bullet lists inside narration; write in smooth paragraphs.
- Explain the concept itself, not how it feels to explain it.
- Do not talk about pacing, grounding, intuition, or clarity unless tied to a concrete concept.

7) Ban meta/report framing
- Do NOT use or paraphrase phrases like:
  "Part 1 focuses on...", "For part X...", "we ground the explanation...",
  "we start with intuition and only add mechanics...", "we end by stating...",
  "with that foundation in place...", "we keep the explanation grounded...",
  "this connects directly to how you would reason...", "another detail uses value...",
  "we will keep it lightweight", "notice how each step builds",
  "conversational pace", "anchor the explanation", "we highlight the motivation",
  "walk through in plain language", "focus on the big picture".

8) Confusion mode
- confusionMode.summary must restate ONE core idea of the entire lecture in plain language.
- It must introduce NO new concepts.
- It should feel like something said to a confused student to re-anchor them.

9) Output rules
- Return STRICT JSON only.
- No markdown, no commentary, no explanations outside JSON.
- Use EXACT field names as defined in the schema.
- Do NOT include topQuestions or any question lists.

Return JSON matching this schema exactly:
${GENERAL_LECTURE_SCHEMA_HINT}
`;

export function buildGeneralLectureCall1Prompt(
  topicContext: string,
  level: string,
  styleVersion: string
) {
  return [
    `Topic: ${topicContext}`,
    `Level: ${level}`,
    `Style version: ${styleVersion}`,
    ``,
    `Explain the topic clearly and concretely.`,
    `Cover: what it is, why it matters, common misconceptions, and edge cases (if applicable).`,
    `Include exactly one worked example explained step-by-step.`,
    ``,
    `Plain text only. No JSON. No markdown.`
  ].join("\n");
}

export function buildGeneralLectureCall2TeacherRewritePrompt(call1AnswerText: string) {
  return [
    `Rewrite the text below so it sounds like a teacher speaking to a class.`,
    `Do not add any new facts, claims, or examples.`,
    `Do not remove any important content.`,
    `Keep the same ordering of ideas as the original.`,
    `Keep exactly one worked example (do not add more).`,
    `Plain text only. No JSON. No markdown. No headings or "Part 1/Part 2".`,
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
    `Convert the text below into STRICT JSON matching the schema.`,
    `Return ONLY valid JSON (no markdown, no commentary).`,
    `Do not add new facts or new examples. Preserve meaning.`,
    `Create 5 to 10 chunks.`,
    `Each chunk must include: chunkTitle, narration.`,
    `Chunk titles must be short and content-grounded (no "Part X").`,
    `Do NOT include topQuestions.`,
    `Do NOT include any course references or tie-ins.`,
    ``,
    `Whiteboard rules:`,
    `- Add whiteboardOps ONLY for the chunk that contains the single worked example.`,
    `- No other chunk may contain whiteboardOps.`,
    ``,
    `Schema (must match exactly):`,
    `${schemaHint}`,
    ``,
    `Text to convert:`,
    `<<<BEGIN_TEXT`,
    teacherText,
    `END_TEXT>>>`,
    ``,
    `Return ONLY the JSON object.`
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

const GENERAL_PROMPT_SAMPLE = buildGeneralLecturePrompt(
  "SAMPLE_TOPIC_CONTEXT",
  "intro",
  "vX"
);

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
