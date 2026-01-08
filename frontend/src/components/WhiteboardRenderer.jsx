import React, { useEffect, useMemo, useRef, useState } from "react";
import { isValidSvg } from "../utils/whiteboardManager";

const normalizePlan = (plan) => {
  if (!Array.isArray(plan)) return [];
  return plan
    .map((entry) => ({
      line: Number(entry?.line),
      figure_id: typeof entry?.figure_id === "string" ? entry.figure_id : "",
    }))
    .filter((entry) => Number.isFinite(entry.line) && entry.figure_id)
    .sort((a, b) => a.line - b.line);
};

const findActiveFigureId = (sortedPlan, currentLine) => {
  if (!sortedPlan.length) return "";
  const targetLine = Number(currentLine);
  if (!Number.isFinite(targetLine)) return "";
  let low = 0;
  let high = sortedPlan.length - 1;
  let bestIndex = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midLine = sortedPlan[mid].line;
    if (midLine <= targetLine) {
      bestIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return bestIndex >= 0 ? sortedPlan[bestIndex].figure_id : "";
};

export default function WhiteboardRenderer({ currentLine, whiteboardPlan, figureCache }) {
  const sortedPlan = useMemo(() => normalizePlan(whiteboardPlan), [whiteboardPlan]);
  const activeFigureId = useMemo(
    () => findActiveFigureId(sortedPlan, currentLine),
    [sortedPlan, currentLine]
  );

  const [activeSvg, setActiveSvg] = useState("");
  const activeRef = useRef("");

  useEffect(() => {
    if (activeFigureId === activeRef.current) return;
    activeRef.current = activeFigureId;
    if (!activeFigureId) {
      setActiveSvg("");
      return;
    }
    const svg = figureCache?.[activeFigureId]?.svg;
    if (isValidSvg(svg)) {
      setActiveSvg(svg.trim());
    } else {
      setActiveSvg("");
    }
  }, [activeFigureId, figureCache]);

  if (!activeSvg) return null;

  return (
    <div className="lecture-whiteboard" aria-hidden>
      <div
        className="lecture-whiteboard__svg"
        dangerouslySetInnerHTML={{ __html: activeSvg }}
      />
    </div>
  );
}
