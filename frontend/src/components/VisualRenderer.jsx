import React, { useEffect, useMemo, useRef, useState } from "react";
import { isValidSvg } from "../utils/whiteboardManager";
import { renderVisualToSvg } from "../utils/visualSvg";

const normalizeSchedule = (schedule) => {
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((entry) => ({
      line: Number(entry?.line),
      visual: entry?.visual || null,
      order: Number(entry?.order) || 0
    }))
    .filter((entry) => Number.isFinite(entry.line) && entry.visual)
    .sort((a, b) => a.line - b.line || a.order - b.order);
};

const findActiveVisual = (sortedSchedule, currentLine) => {
  if (!sortedSchedule.length) return null;
  const targetLine = Number(currentLine);
  if (!Number.isFinite(targetLine)) return null;
  let low = 0;
  let high = sortedSchedule.length - 1;
  let bestIndex = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midLine = sortedSchedule[mid].line;
    if (midLine <= targetLine) {
      bestIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return bestIndex >= 0 ? sortedSchedule[bestIndex].visual : null;
};

export default function VisualRenderer({ currentLine, visualSchedule }) {
  const sortedSchedule = useMemo(() => normalizeSchedule(visualSchedule), [visualSchedule]);
  const activeVisual = useMemo(
    () => findActiveVisual(sortedSchedule, currentLine),
    [sortedSchedule, currentLine]
  );

  const [activeSvg, setActiveSvg] = useState("");
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeVisual === activeRef.current) return;
    activeRef.current = activeVisual;
    if (!activeVisual) {
      setActiveSvg("");
      return;
    }
    const svg = renderVisualToSvg(activeVisual);
    if (isValidSvg(svg)) {
      setActiveSvg(svg.trim());
    } else {
      setActiveSvg("");
    }
  }, [activeVisual]);

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
