import type {
  NeedsClarification,
  Visual,
  VisualType,
  VisualsResult
} from "../types/lecture";
import { runGeminiJsonWithRepair } from "../gemini/jsonRepair";
import {
  BASE_VISUAL_PROMPT,
  buildVisualsPrompt,
  buildVisualsRepairPrompt
} from "../lecture/lecturePrompts";

const GEMINI_MODEL = "gemini-2.0-flash";
const LLM_MODE = (
  process.env.LLM_MODE ||
  (process.env.GOOGLE_API_KEY ? "gemini" : "stub")
).toLowerCase();

const ALLOWED_TYPES: VisualType[] = [
  "memory_diagram",
  "table",
  "flowchart",
  "timeline",
  "graph",
  "code_trace"
];

const EXAMPLE_PHRASES = [
  "for example",
  "consider",
  "suppose",
  "let's say",
  "let us say"
];

const PITFALL_PHRASES = ["watch out", "common mistake", "misconception"];

const MECHANISM_KEYWORDS = [
  "pointer",
  "pointers",
  "dereference",
  "index",
  "indexing",
  "stack",
  "heap",
  "offset",
  "address",
  "arithmetic",
  "iterate",
  "step by step"
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const splitSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const extractInlineCode = (text: string) => {
  const snippets: string[] = [];
  const regex = /`([^`]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const snippet = match[1].trim();
    if (snippet) snippets.push(snippet);
  }
  return snippets;
};

const extractBracketSequences = (text: string) => {
  const regex = /\[[0-9,\s]+\]/g;
  return text.match(regex) || [];
};

const uniquePreserveOrder = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    if (!item || seen.has(item)) return;
    seen.add(item);
    result.push(item);
  });
  return result;
};

export const extractVisualAnchors = (
  transcriptChunk: string,
  codeSnippets: string[]
) => {
  const sentences = splitSentences(transcriptChunk);
  const anchors: string[] = [];
  let exampleCount = 0;

  sentences.forEach((sentence) => {
    const lower = sentence.toLowerCase();
    const hasExamplePhrase = EXAMPLE_PHRASES.some((phrase) => lower.includes(phrase));
    const hasPitfall = PITFALL_PHRASES.some((phrase) => lower.includes(phrase));
    const hasMechanism = MECHANISM_KEYWORDS.some((phrase) => lower.includes(phrase));
    const hasBracket = extractBracketSequences(sentence).length > 0;
    const hasInlineCode = extractInlineCode(sentence).length > 0;

    if (hasExamplePhrase || hasBracket || hasInlineCode) {
      anchors.push(sentence);
      exampleCount += 1;
    }
    if (hasPitfall || hasMechanism) {
      anchors.push(sentence);
    }
  });

  codeSnippets.forEach((snippet) => {
    if (snippet && transcriptChunk.includes(snippet)) {
      anchors.push(snippet);
      exampleCount += 1;
    }
  });

  return {
    anchors: uniquePreserveOrder(anchors),
    exampleCount
  };
};

export const detectDomains = (
  transcriptChunk: string,
  codeSnippets: string[]
): { domains: { id: string; score: number }[]; selected: string[] } => {
  const text = `${transcriptChunk}\n${codeSnippets.join("\n")}`.toLowerCase();
  const keywordSets: Record<string, string[]> = {
    cs_arch: [
      "pointer",
      "pointers",
      "array",
      "arrays",
      "dereference",
      "malloc",
      "free",
      "stack",
      "heap",
      "sizeof",
      "alignment",
      "endianness",
      "address",
      "memory"
    ],
    math: [],
    chem_bio: []
  };

  const domains = Object.entries(keywordSets).map(([id, keywords]) => {
    if (!keywords.length) return { id, score: 0 };
    const hits = keywords.filter((keyword) => text.includes(keyword)).length;
    const score = Math.min(1, hits / 3);
    return { id, score };
  });

  const selected = domains
    .filter((domain) => domain.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((domain) => domain.id);

  return { domains, selected };
};

const allowedAddressTokens = (text: string) => {
  const tokens = new Set<string>();
  const hexMatches = text.match(/0x[0-9a-fA-F]+/g) || [];
  hexMatches.forEach((match) => tokens.add(match));
  const addrMatches = text.match(/\baddress\s*[:=]?\s*(\d+)\b/gi) || [];
  addrMatches.forEach((match) => {
    const parts = match.match(/\d+/g) || [];
    parts.forEach((part) => tokens.add(part));
  });
  const indexMatches = text.match(/\b\w+\[\d+\]/g) || [];
  indexMatches.forEach((match) => tokens.add(match));
  return tokens;
};

const sanitizeMemoryDiagram = (
  visual: Visual,
  transcriptChunk: string,
  codeSnippets: string[]
): Visual => {
  const content = isObject(visual.content) ? visual.content : {};
  const allowedTokens = allowedAddressTokens(
    `${transcriptChunk}\n${codeSnippets.join("\n")}`
  );
  const variables = Array.isArray(content.variables) ? content.variables : [];
  const arrays = variables.filter(
    (variable): variable is Record<string, unknown> =>
      isObject(variable) && variable.kind === "array"
  );
  const arrayName = typeof arrays[0]?.name === "string" ? arrays[0].name : undefined;

  const nextVariables = variables.map((variable) => {
    if (!isObject(variable)) return variable;
    const next = { ...variable };
    if (
      typeof next.base_address === "string" &&
      !allowedTokens.has(next.base_address)
    ) {
      delete next.base_address;
    }
    if (Array.isArray(next.cells)) {
      next.cells = next.cells.map((cell) => {
        if (!isObject(cell)) return cell;
        const nextCell = { ...cell };
        if (
          typeof nextCell.address === "string" &&
          !allowedTokens.has(nextCell.address)
        ) {
          delete nextCell.address;
        }
        return nextCell;
      });
    }
    if (next.kind === "pointer") {
      if (
        typeof next.points_to === "string" &&
        !allowedTokens.has(next.points_to)
      ) {
        if (arrayName) {
          next.points_to = `${arrayName}[0]`;
        } else {
          delete next.points_to;
        }
      }
    }
    return next;
  });

  const nextArrows = Array.isArray(content.arrows)
    ? content.arrows.map((arrow) => {
        if (!isObject(arrow)) return arrow;
        const nextArrow = { ...arrow };
        if (
          typeof nextArrow.to_address === "string" &&
          !allowedTokens.has(nextArrow.to_address)
        ) {
          if (arrayName) {
            nextArrow.to_address = `${arrayName}[0]`;
          } else {
            delete nextArrow.to_address;
          }
        }
        return nextArrow;
      })
    : content.arrows;

  return {
    ...visual,
    content: {
      ...content,
      variables: nextVariables,
      arrows: nextArrows
    }
  };
};

const normalizeVisualOutput = (
  value: VisualsResult,
  transcriptChunk: string,
  codeSnippets: string[]
): VisualsResult => {
  if (Array.isArray(value)) {
    return value.map((visual) =>
      visual.type === "memory_diagram"
        ? sanitizeMemoryDiagram(visual, transcriptChunk, codeSnippets)
        : visual
    );
  }
  return value;
};

const countCaptionSentences = (caption: string) =>
  splitSentences(caption).length;

const hasArrayPointerPhrase = (text: string) =>
  /array\s+points\s+to\s+pointer/i.test(text);

const validateArrayCells = (variables: unknown[]) => {
  const errors: string[] = [];
  variables.forEach((variable) => {
    if (!isObject(variable)) return;
    if (variable.kind !== "array") return;
    const cells = Array.isArray(variable.cells) ? variable.cells : [];
    if (!cells.length) return;
    const indices = cells
      .map((cell) => (isObject(cell) ? Number(cell.index) : NaN))
      .filter((index) => Number.isFinite(index))
      .sort((a, b) => a - b);
    if (!indices.length) {
      errors.push("array cells missing indices");
      return;
    }
    indices.forEach((index, position) => {
      if (index !== position) {
        errors.push("array cells must be contiguous indices 0..n-1");
      }
    });
  });
  return errors;
};

const validatePointerArrows = (variables: unknown[], arrows: unknown[]) => {
  const errors: string[] = [];
  const pointerNames = new Set(
    variables
      .filter(
        (variable): variable is Record<string, unknown> =>
          isObject(variable) && variable.kind === "pointer"
      )
      .map((variable) => String(variable.name))
  );
  const arrayNames = new Set(
    variables
      .filter(
        (variable): variable is Record<string, unknown> =>
          isObject(variable) && variable.kind === "array"
      )
      .map((variable) => String(variable.name))
  );
  if (!pointerNames.size) return errors;
  if (!Array.isArray(arrows) || !arrows.length) {
    errors.push("pointer arrows missing");
    return errors;
  }
  arrows.forEach((arrow) => {
    if (!isObject(arrow)) return;
    const from = String(arrow.from || "").trim();
    if (arrayNames.has(from)) {
      errors.push("array points to pointer or arrow from array");
    }
    if (!pointerNames.has(from)) {
      errors.push("arrow must originate from pointer variable");
    }
    if (!arrow.to_address) {
      errors.push("pointer arrow missing to_address");
    }
  });
  return errors;
};

export const validateVisualOutput = (
  value: unknown,
  transcriptChunk: string,
  anchors: string[],
  exampleCount: number
): { ok: boolean; errors: string[]; normalized: VisualsResult | null } => {
  const errors: string[] = [];

  if (isObject(value) && isObject(value.needs_clarification)) {
    const payload = value as NeedsClarification;
    const questions = payload.needs_clarification.questions || [];
    if (!payload.needs_clarification.reason) {
      errors.push("needs_clarification reason missing");
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      errors.push("needs_clarification questions missing");
    }
    return { ok: errors.length === 0, errors, normalized: payload };
  }

  if (!Array.isArray(value)) {
    return { ok: false, errors: ["output must be an array of visuals"], normalized: null };
  }

  const visuals = value as Visual[];
  if (visuals.length < 2 || visuals.length > 6) {
    errors.push("visual count must be 2-6");
  }
  if (visuals.length < exampleCount) {
    errors.push("visual count must be >= number of examples");
  }

  const ids = new Set<string>();
  const anchorCoverage = new Set<string>();

  visuals.forEach((visual) => {
    if (!visual || !visual.id) {
      errors.push("visual id missing");
      return;
    }
    if (ids.has(visual.id)) {
      errors.push("visual id must be unique");
    }
    ids.add(visual.id);

    if (!ALLOWED_TYPES.includes(visual.type)) {
      errors.push("visual type not allowed");
    }
    if (!visual.anchor_quote || !transcriptChunk.includes(visual.anchor_quote)) {
      errors.push("anchor_quote must be exact substring of transcriptChunk");
    } else {
      anchorCoverage.add(visual.anchor_quote);
    }
    if (!visual.title) {
      errors.push("visual title missing");
    }
    if (!visual.caption) {
      errors.push("visual caption missing");
    } else if (countCaptionSentences(visual.caption) > 2) {
      errors.push("visual caption must be 1-2 sentences");
    }

    if (hasArrayPointerPhrase(visual.title) || hasArrayPointerPhrase(visual.caption)) {
      errors.push("array points to pointer phrasing detected");
    }

    if (visual.type === "memory_diagram") {
      const content = isObject(visual.content) ? visual.content : {};
      const variables = Array.isArray(content.variables) ? content.variables : [];
      const arrows = Array.isArray(content.arrows) ? content.arrows : [];
      errors.push(...validateArrayCells(variables));
      errors.push(...validatePointerArrows(variables, arrows));
    }
  });

  if (anchors.length) {
    anchors.forEach((anchor) => {
      if (!anchorCoverage.has(anchor)) {
        errors.push("anchor missing visual coverage");
      }
    });
  }

  return { ok: errors.length === 0, errors, normalized: visuals };
};

export const isVisualsPayload = (value: unknown): value is VisualsResult => {
  if (Array.isArray(value)) return true;
  if (isObject(value) && isObject(value.needs_clarification)) {
    const questions = (value.needs_clarification as { questions?: unknown }).questions;
    return Array.isArray(questions);
  }
  return false;
};

export const generateVisuals = async (
  transcriptChunk: string,
  codeSnippets: string[]
): Promise<VisualsResult> => {
  if (LLM_MODE !== "gemini") {
    return {
      needs_clarification: {
        reason: "llm_disabled",
        questions: ["Enable LLM_MODE=gemini to generate visuals."]
      }
    };
  }

  const cleanTranscript = transcriptChunk.trim();
  const cleanSnippets = codeSnippets.map((snippet) => snippet.trim()).filter(Boolean);
  const { anchors, exampleCount } = extractVisualAnchors(cleanTranscript, cleanSnippets);
  const { selected } = detectDomains(cleanTranscript, cleanSnippets);
  const anchorLimit = 6;
  const selectedAnchors = anchors.slice(0, anchorLimit);
  const boundedExampleCount = Math.min(exampleCount, anchorLimit);

  let lastErrors: string[] = [];
  let normalizedResult: VisualsResult | null = null;

  const validate = (value: unknown): value is VisualsResult => {
    const normalized = normalizeVisualOutput(
      value as VisualsResult,
      cleanTranscript,
      cleanSnippets
    );
    const result = validateVisualOutput(
      normalized,
      cleanTranscript,
      selectedAnchors,
      boundedExampleCount
    );
    lastErrors = result.errors;
    normalizedResult = result.ok ? normalized : null;
    return result.ok;
  };

  const prompt = buildVisualsPrompt({
    transcriptChunk: cleanTranscript,
    codeSnippets: cleanSnippets,
    anchors: selectedAnchors,
    exampleCount: boundedExampleCount,
    selectedDomains: selected
  });

  const repairSystemInstruction =
    "You receive malformed JSON for transcript-anchored visuals. " +
    "Repair it to satisfy the BASE VISUAL CONTRACT. Return JSON only.";

  const { result } = await runGeminiJsonWithRepair<VisualsResult>({
    model: GEMINI_MODEL,
    systemInstruction: BASE_VISUAL_PROMPT,
    repairSystemInstruction,
    prompt,
    repairPrompt: (rawText) =>
      buildVisualsRepairPrompt({
        rawText,
        transcriptChunk: cleanTranscript,
        codeSnippets: cleanSnippets,
        anchors: selectedAnchors,
        errors: lastErrors
      }),
    validate,
    temperature: 0.2,
    maxOutputTokens: 2048
  });

  if (normalizedResult) {
    return normalizedResult;
  }

  if (result) {
    return result;
  }

  return {
    needs_clarification: {
      reason: "visual_generation_failed",
      questions: [
        "Which specific example or mechanism should be visualized first?",
        "Are there any concrete values or code lines that must appear in a diagram?"
      ]
    }
  };
};
