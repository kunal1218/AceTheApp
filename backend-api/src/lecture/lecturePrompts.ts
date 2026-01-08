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

export const WHITEBOARD_SCHEMA_HINT = JSON.stringify(
  {
    whiteboard: [
      {
        line: 1,
        use_cached: false,
        figure_id: "example_figure",
        tags: ["example", "diagram"],
        concept_context: "Clarifies the concept at this line with a simple diagram.",
        svg: "<svg width=\"800\" height=\"450\" viewBox=\"0 0 800 450\"></svg>"
      }
    ]
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
    `Explain "${topicContext}" clearly and concretely for a ${level} learner (style ${styleVersion}), in as few words as possible, but fully; use 1-7 short paragraphs and do not truncate required parts.`,
    `Cover what it is, why it matters, common misconceptions, edge cases, and include exactly one worked example explained step-by-step.`,
    `Plain text only.`
  ].join("\n");
}

export function buildGeneralLectureCall2TeacherRewritePrompt(call1AnswerText: string) {
  return [
    `Rewrite the text below so it sounds like a teacher explaining the material out loud in one continuous lecture.`,
    ``,
    `Important constraints:`,
    `- Do NOT add, remove, or change any facts, claims, or examples.`,
    `- Keep the same overall order of ideas, paragraph breaks, and keep EXACTLY one worked example.`,
    `- Do NOT introduce headings, section titles, bullet lists, or numbered lists.`,
    `- Do NOT speak or imply headers such as "What They Are", "Why They Matter", or similar.`,
    `- End with a complete, logical final sentence (do not cut off mid-thought).`,
    `- End the lecture with this exact sentence: "Well that's the lesson class, ask me questions if you have any!"`,
    `- Do NOT use textbook-style formatting or pauses that sound like reading slides.`,
    ``,
    `Lecture style guidance:`,
    `- The output should feel like uninterrupted speech, not notes.`,
    `- Ideas should transition naturally using conversational phrases a teacher would actually say.`,
    `- Related ideas should be blended into paragraphs rather than separated into labeled sections.`,
    `- Avoid abrupt topic resets; let each idea flow into the next.`,
    ``,
    `Formatting rules:`,
    `- Plain text only.`,
    `- No markdown, no bolding, no italics.`,
    `- No "Part 1", "Section", or similar structural markers.`,
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

export const VISUAL_SCHEMA_HINT = JSON.stringify(
  [
    {
      id: "V1",
      type: "memory_diagram",
      anchor_quote: "exact quote from transcript that motivated this visual",
      title: "Short title",
      caption: "1-2 sentences",
      content: {}
    }
  ],
  null,
  2
);

export const BASE_VISUAL_PROMPT = `
TASK: Generate transcript-anchored visuals as strict JSON.

Transcript anchoring (hard requirement)
- Each visual must include anchor_quote: an exact substring from transcriptChunk (copy/paste exact).
- If you cannot find an exact quote to justify the visual, DO NOT create it.

What must get visuals
- Any concrete example present in transcriptChunk (numbers, arrays, strings, code, step-by-step walkthroughs).
- Any mechanism explanation (pointer arithmetic, dereference, indexing, stack vs heap, etc.).
- Any pitfall/misconception called out.

What must NOT get visuals
- Purely abstract statements with no example/mechanism.
- Decorations/mascots/clipart (ban characters, memes, random icons).

Allowed visual types ONLY
- "memory_diagram" | "table" | "flowchart" | "timeline" | "graph" | "code_trace"
Reject/never output any other type.

Correctness constraints (critical)
Array rules:
- Arrays must render as contiguous cells with indices 0..n-1
- If values are known from transcript/code, include them in cells.
- If addresses are shown, they must increase consistently by element_size (e.g., int +4).
Pointer rules:
- Pointer is a variable box containing an address.
- Arrow direction is ALWAYS: pointer -> pointed-to memory cell.
- If showing &arr[0], arrow must land on index 0 cell.
Array vs pointer rule:
- NEVER produce "array points to pointer."
- If explaining array decay, label explicitly:
  - "arr (array object)"
  - "arr in expression -> &arr[0]"

Quantity rules
- Produce 2-6 visuals per transcript chunk.
- NEVER fewer than the number of concrete examples detected in the chunk.
- Prefer multiple small visuals over one big concept visual.

Clarity rules
- Each visual must include:
  - title (short)
  - caption (1-2 sentences explaining exactly what it shows)

No guessing
- If addresses/element sizes/values are required to satisfy a rule but are not derivable from transcriptChunk/codeSnippets, do not invent them.
- Instead return needs_clarification with specific questions.

JSON OUTPUT SCHEMA (must match exactly)
Return an array of objects:
[
  {
    "id": "V1",
    "type": "memory_diagram",
    "anchor_quote": "exact quote from transcript that motivated this visual",
    "title": "Short title",
    "caption": "1-2 sentences",
    "content": {}
  }
]

TYPE-SPECIFIC content FIELDS
1) memory_diagram content:
{
  "variables": [
    {
      "name": "arr",
      "kind": "array",
      "elem_type": "int",
      "base_address": "0x1000",
      "cells": [
        {"index": 0, "address": "0x1000", "value": 0},
        {"index": 1, "address": "0x1004", "value": 1}
      ]
    },
    {
      "name": "p",
      "kind": "pointer",
      "points_to": "0x1000"
    }
  ],
  "arrows": [
    {"from": "p", "to_address": "0x1000", "label": "p points to arr[0]"}
  ]
}

2) code_trace content:
{
  "code": ["...","..."],
  "steps": [
    {"line": 1, "state": "brief state"},
    {"line": 2, "state": "brief state"}
  ]
}

3) table content:
{
  "headers": ["col1","col2"],
  "rows": [["a","b"],["c","d"]]
}

4) flowchart content:
{
  "nodes": [{"id":"n1","text":"..."},{"id":"n2","text":"..."}],
  "edges": [{"from":"n1","to":"n2","label":"..."}]
}

5) timeline content:
{
  "events": [{"t":"Step 1","text":"..."},{"t":"Step 2","text":"..."}]
}

6) graph content:
{
  "nodes": [{"id":"a","label":"..."},{"id":"b","label":"..."}],
  "edges": [{"from":"a","to":"b","label":"..."}]
}

NEEDS_CLARIFICATION (if required)
If you cannot produce correct visuals without guessing, return:
{
  "needs_clarification": {
    "reason": "short reason",
    "questions": ["specific question 1", "specific question 2"]
  }
}
Do NOT output partial visuals if correctness rules would be violated.
`;

export const DOMAIN_ADDON_PROMPTS: Record<string, string> = {
  cs_arch: `
DOMAIN ADDON: cs_arch (Computer Architecture / Systems / C pointers & memory)
- Prefer "memory_diagram" and "code_trace" for pointers, arrays, dereference, pointer arithmetic, stack vs heap, malloc/free.
- If transcript mentions "sizeof": generate a "table" comparing sizeof(array) vs sizeof(pointer) and explain decay in caption (anchored).
- If transcript mentions "stack" or "heap": generate a memory_diagram with two regions labeled stack/heap and show variable lifetime notes in caption.
- If transcript mentions "alignment" or "endianness": prefer a table or memory_diagram that shows byte ordering/alignment (ONLY if transcript gives enough info; otherwise needs_clarification).
- NEVER draw array -> pointer arrows; pointer arrows only pointer -> cell.
`,
  math: ``,
  chem_bio: ``
};

export const buildVisualsPrompt = ({
  transcriptChunk,
  codeSnippets,
  anchors,
  exampleCount,
  selectedDomains
}: {
  transcriptChunk: string;
  codeSnippets: string[];
  anchors: string[];
  exampleCount: number;
  selectedDomains: string[];
}) => {
  const addonText = selectedDomains
    .map((domain) => DOMAIN_ADDON_PROMPTS[domain])
    .filter(Boolean)
    .join("\n");
  const anchorLines = anchors.length
    ? `You must produce at least one visual for each of the following anchors:\n${anchors
        .map((anchor) => `- "${anchor}"`)
        .join("\n")}`
    : "No anchors were detected. Do NOT invent visuals without an exact quote.";
  const snippetLines = codeSnippets.length
    ? codeSnippets.map((snippet) => `- ${snippet}`).join("\n")
    : "- (none)";
  return [
    BASE_VISUAL_PROMPT.trim(),
    addonText.trim(),
    `Concrete examples detected: ${exampleCount}`,
    anchorLines,
    `transcriptChunk:`,
    `<<<BEGIN_TRANSCRIPT`,
    transcriptChunk,
    `END_TRANSCRIPT>>>`,
    `codeSnippets:`,
    snippetLines
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const buildVisualsRepairPrompt = ({
  rawText,
  transcriptChunk,
  codeSnippets,
  anchors,
  errors
}: {
  rawText: string;
  transcriptChunk: string;
  codeSnippets: string[];
  anchors: string[];
  errors: string[];
}) => `
You are repairing a JSON response to satisfy the BASE VISUAL CONTRACT.
Return ONLY valid JSON. No markdown, no commentary.

Errors to fix:
${errors.map((error) => `- ${error}`).join("\n")}

Anchors (must use exact substrings from transcriptChunk):
${anchors.map((anchor) => `- "${anchor}"`).join("\n")}

Transcript:
<<<BEGIN_TRANSCRIPT
${transcriptChunk}
END_TRANSCRIPT>>>

Code snippets:
${codeSnippets.map((snippet) => `- ${snippet}`).join("\n") || "- (none)"}

Malformed input:
<<<BEGIN_BAD_JSON
${rawText}
END_BAD_JSON>>>
`;

export const buildWhiteboardSvgPrompt = (
  transcriptLines: string[],
  actionSlots: Array<{ line: number; intent: string }>,
  figureCache: Array<{
    figure_id: string;
    tags: string[];
    concept_context: string;
    svg?: string;
  }>
) => `
You will receive JSON inputs for transcript_lines, action_slots, and figure_cache.
Read them as JSON and return ONLY valid JSON matching the required schema.

Rules:
- Output exactly one entry per action_slots item, in the same order.
- Do not add, remove, or reorder slots.
- Preserve the slot line numbers.
- If a cached figure fits the slot intent and nearby transcript meaning, reuse it:
  use_cached=true, figure_id=cached id, svg=null.
- If none fit, create a new figure:
  use_cached=false, unique snake_case figure_id, and svg must be a complete standalone SVG string.
- Include tags (3-8 keywords) and a 1-2 sentence concept_context for every entry.
- If the intent implies a relationship or flow, include arrows to show it.

SVG constraints:
- width="800" height="450" viewBox="0 0 800 450"
- Only elements: svg, rect, line, path, circle, text, polygon.
- No scripts, no external assets, no animation.
- Black stroke, white fill, readable text (font-size >= 18).

Schema (must match exactly):
${WHITEBOARD_SCHEMA_HINT}

Inputs:
transcript_lines=${JSON.stringify(transcriptLines)}
action_slots=${JSON.stringify(actionSlots)}
figure_cache=${JSON.stringify(figureCache)}
`;

export const buildWhiteboardRepairPrompt = (
  rawText: string,
  schemaHint: string = WHITEBOARD_SCHEMA_HINT
) => `
You receive malformed JSON-like text for whiteboard SVG planning.
Repair it into valid JSON matching this schema and rules.
Return JSON only. No markdown, no explanations.

Schema:
${schemaHint}

Malformed input:
${rawText}
`;
