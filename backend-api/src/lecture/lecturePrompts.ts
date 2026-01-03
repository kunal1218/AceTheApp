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
- Generate 8-12 chunks.
- Each chunk must contain a substantial narration transcript (at least ~120 words per chunk).
- The narration should sound like continuous teaching, with explanations, transitions, and emphasis.
- Do NOT use placeholder phrases like "Today we will cover..." without following with real explanation.

2) Chunk structure
Each chunk MUST include:
- chunkTitle: a short descriptive title
- narration: the full spoken explanation (this is the most important field)
- boardOps: OPTIONAL, only when illustrating a concrete example or spatial relationship

3) Whiteboard rules
- Only include boardOps when you are explicitly walking through an example or visual situation.
- Do NOT include decorative or redundant drawings.
- Use ONLY simple, structured commands (boxes, arrows, text labels).
- If no visual aid is genuinely helpful, omit boardOps entirely for that chunk.

4) Content rules
- Do NOT mention any specific courses, professors, exams, assignments, deadlines, or institutions.
- Do NOT include course-specific tie-ins.
- Focus on intuition first, then mechanics, then implications.
- Use analogies sparingly but clearly.
- Avoid bullet lists inside narration; write in paragraph form.

5) Confusion mode
- confusionMode.summary must restate ONE core idea of the entire lecture in plain language.
- It must introduce NO new concepts.
- It should feel like something said to a confused student to re-anchor them.

6) Output rules
- Return STRICT JSON only.
- No markdown, no commentary, no explanations outside JSON.
- Use EXACT field names as defined in the schema.
- Do NOT include topQuestions or any question lists.

Return JSON matching this schema exactly:
${GENERAL_LECTURE_SCHEMA_HINT}
`;

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
  schemaHint: string = GENERAL_LECTURE_SCHEMA_HINT
) => `
You receive malformed or partially incorrect JSON-like text for a lecture payload.
Repair it into valid JSON that matches this schema example.
Return JSON only. No markdown, no explanations.

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
