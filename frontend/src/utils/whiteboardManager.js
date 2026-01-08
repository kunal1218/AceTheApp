const CACHE_KEY = "ace-whiteboard-figures-v1";

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export const isValidSvg = (svg) => {
  if (typeof svg !== "string") return false;
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg")) return false;
  if (!trimmed.includes('width="800"') || !trimmed.includes('height="450"')) {
    return false;
  }
  return trimmed.endsWith("</svg>");
};

export const loadWhiteboardCache = () => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

export const saveWhiteboardCache = (cache) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache write failures
  }
};

export const parseWhiteboardResponse = (raw) => {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed?.whiteboard) ? parsed.whiteboard : null;
    } catch {
      return null;
    }
  }
  if (isObject(raw) && Array.isArray(raw.whiteboard)) {
    return raw.whiteboard;
  }
  return null;
};

export const applyWhiteboardPlan = (entries, existingCache = {}) => {
  if (!Array.isArray(entries)) {
    return { plan: [], cache: existingCache };
  }
  const nextCache = { ...existingCache };
  const plan = [];

  entries.forEach((entry) => {
    if (!isObject(entry)) return;
    const line = Number(entry.line);
    if (!Number.isFinite(line)) return;
    const figureId = typeof entry.figure_id === "string" ? entry.figure_id.trim() : "";
    if (!figureId) return;
    const tags = Array.isArray(entry.tags)
      ? entry.tags.filter((tag) => typeof tag === "string")
      : [];
    const conceptContext =
      typeof entry.concept_context === "string" ? entry.concept_context : "";
    const useCached = entry.use_cached === true;
    const svg = typeof entry.svg === "string" ? entry.svg.trim() : null;

    if (useCached) {
      if (nextCache[figureId]) {
        nextCache[figureId] = {
          ...nextCache[figureId],
          tags: tags.length ? tags : nextCache[figureId].tags,
          concept_context: conceptContext || nextCache[figureId].concept_context
        };
      }
    } else if (svg && isValidSvg(svg)) {
      nextCache[figureId] = {
        figure_id: figureId,
        tags,
        concept_context: conceptContext,
        svg
      };
    }

    plan.push({ line, figure_id: figureId });
  });

  return { plan, cache: nextCache };
};
