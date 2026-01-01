import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./PortalPage.css";
import { loadItems } from "../utils/semesters";
import idleSprite from "../assets/characters/mainChar/IDLE.png";

const PLAYER_FRAME_WIDTH = 96;
const PLAYER_FRAME_HEIGHT = 84;
const PLAYER_SCALE = 2.6;
const PLAYER_WIDTH = PLAYER_FRAME_WIDTH * PLAYER_SCALE;
const PLAYER_HEIGHT = PLAYER_FRAME_HEIGHT * PLAYER_SCALE;
const PLAYER_FOOT_PADDING = 22;
const PLAYER_FOOT_OFFSET = PLAYER_FOOT_PADDING * PLAYER_SCALE;

const POINT_SIZE = 20;
const BRIDGE_THICKNESS = 8;
const PLAYER_START_OFFSET = 18;
const MIN_EDGE_PADDING = 24;
const SPECIAL_NODE_COUNT = 4;
const HUD_SAFE_WIDTH = 320;
const HUD_SAFE_HEIGHT = 140;
const HUD_SAFE_PADDING = 24;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const seededRandom = (seed) => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const computeGrid = (count) => {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  let cols = Math.max(3, Math.ceil(Math.sqrt(count)));
  let rows = Math.max(3, Math.ceil(count / cols));
  while ((cols - 1) + (rows - 1) > count - 1) {
    if (cols >= rows && cols > 2) {
      cols -= 1;
    } else if (rows > 2) {
      rows -= 1;
    } else {
      break;
    }
  }
  return { cols, rows };
};

const generatePath = (count, cols, rows, rng, forbidden) => {
  const start = { x: 0, y: rows - 1 };
  const end = { x: cols - 1, y: 0 };
  const path = [start];
  const visited = new Set([`${start.x},${start.y}`]);
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];

  const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  let current = start;
  for (let step = 0; step < count - 1; step += 1) {
    const remaining = count - 1 - step;
    let candidates = directions
      .map((dir) => ({
        x: current.x + dir.dx,
        y: current.y + dir.dy,
      }))
      .filter((pos) => pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows)
      .filter((pos) => manhattan(pos, end) <= remaining - 1)
      .filter((pos) => !forbidden.has(`${pos.x},${pos.y}`));

    if (candidates.length === 0) {
      candidates = directions
        .map((dir) => ({
          x: current.x + dir.dx,
          y: current.y + dir.dy,
        }))
        .filter((pos) => pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows)
        .filter((pos) => !forbidden.has(`${pos.x},${pos.y}`));
    }

    const weighted = candidates.map((pos) => {
      const key = `${pos.x},${pos.y}`;
      const distDelta = manhattan(current, end) - manhattan(pos, end);
      let weight = visited.has(key) ? 1 : 3;
      if (distDelta > 0) weight += 2;
      if (distDelta === 0) weight += 1;
      return { pos, weight };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * totalWeight;
    let chosen = weighted[0]?.pos ?? current;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        chosen = entry.pos;
        break;
      }
    }

    current = chosen;
    path.push(current);
    visited.add(`${current.x},${current.y}`);
  }

  return path;
};

const normalizeLessons = (portal) => {
  const lessons = [];
  if (portal && Array.isArray(portal.syllabus)) {
    portal.syllabus.forEach((upload) => {
      const schedule = upload?.syllabusJson?.schedule_entries;
      if (!Array.isArray(schedule)) return;
      schedule.forEach((entry) => {
        if (!entry) return;
        lessons.push({
          title: entry.title || "Lesson",
          date: entry.date || "",
        });
      });
    });
  }
  const filtered = lessons.filter((lesson) => lesson.title && typeof lesson.title === "string");
  const deduped = [];
  const seen = new Set();
  filtered.forEach((lesson) => {
    const key = `${lesson.date}|${lesson.title}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(lesson);
  });
  deduped.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return deduped;
};

export default function PortalPage() {
  const { id } = useParams();
  const containerRef = useRef(null);
  const hudRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [hudSize, setHudSize] = useState({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSelected, setHasSelected] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const portal = useMemo(() => {
    const items = loadItems();
    return items.find((item) => item.id === id) || null;
  }, [id]);

  const lessons = useMemo(() => {
    const extracted = normalizeLessons(portal);
    if (extracted.length) return extracted;
    const placeholderCount = portal?.type === "semester" ? 10 : 6;
    return Array.from({ length: placeholderCount }, (_, index) => ({
      title: `Lesson ${index + 1}`,
      date: "",
    }));
  }, [portal]);
  const nodeMeta = useMemo(() => {
    const lessonCount = lessons.length;
    const specialCount = Math.min(SPECIAL_NODE_COUNT, Math.max(lessonCount - 1, 0));
    if (!specialCount) {
      return lessons.map((lesson, index) => ({ type: "lesson", lessonIndex: index, title: lesson.title }));
    }
    const insertAfter = new Set();
    const stride = lessonCount / (specialCount + 1);
    for (let i = 1; i <= specialCount; i += 1) {
      let idx = Math.round(stride * i);
      idx = clamp(idx, 1, lessonCount - 1);
      while (insertAfter.has(idx) && idx < lessonCount - 1) idx += 1;
      while (insertAfter.has(idx) && idx > 1) idx -= 1;
      insertAfter.add(idx);
    }
    let filled = insertAfter.size;
    for (let idx = 1; idx < lessonCount && filled < specialCount; idx += 1) {
      if (!insertAfter.has(idx)) {
        insertAfter.add(idx);
        filled += 1;
      }
    }
    const nodes = [];
    lessons.forEach((lesson, index) => {
      nodes.push({ type: "lesson", lessonIndex: index, title: lesson.title });
      if (insertAfter.has(index + 1)) {
        nodes.push({ type: "special", lessonIndex: null, title: "Special Level" });
      }
    });
    return nodes;
  }, [lessons]);

  useLayoutEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMapSize({ width: rect.width, height: rect.height });
      const hudRect = hudRef.current?.getBoundingClientRect();
      if (hudRect) {
        setHudSize({ width: hudRect.width, height: hudRect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const { cols, rows } = useMemo(() => computeGrid(nodeMeta.length), [nodeMeta.length]);

  const path = useMemo(() => {
    const seedBase = portal ? `${portal.id}-${portal.title}-${nodeMeta.length}` : `${nodeMeta.length}`;
    const rng = seededRandom(hashString(seedBase));
    const forbidden = new Set([`${cols - 1},${rows - 1}`]);
    return generatePath(nodeMeta.length, cols, rows, rng, forbidden);
  }, [portal, nodeMeta.length, cols, rows]);

  const layout = useMemo(() => {
    const edgeGapX = Math.max(PLAYER_WIDTH * 0.8, POINT_SIZE * 3, MIN_EDGE_PADDING);
    const edgeGapY = Math.max(PLAYER_HEIGHT * 0.25, POINT_SIZE * 2, MIN_EDGE_PADDING);
    const safeWidth = Math.max(hudSize.width, HUD_SAFE_WIDTH);
    const safeHeight = Math.max(hudSize.height, HUD_SAFE_HEIGHT);
    const minX = Math.min(edgeGapX, mapSize.width / 2);
    const safeRight = Math.max(mapSize.width - safeWidth - HUD_SAFE_PADDING, minX);
    const maxX = Math.max(Math.min(mapSize.width - edgeGapX, safeRight), minX);
    const minY = Math.min(edgeGapY, mapSize.height / 2);
    const safeBottom = Math.max(mapSize.height - safeHeight - HUD_SAFE_PADDING, minY);
    const maxY = Math.max(Math.min(mapSize.height - edgeGapY, safeBottom), minY);
    const usableWidth = Math.max(maxX - minX, 0);
    const usableHeight = Math.max(maxY - minY, 0);
    const colStep = cols > 1 ? usableWidth / (cols - 1) : 0;
    const rowStep = rows > 1 ? usableHeight / (rows - 1) : 0;
    const points = path.map((point) => ({
      x: clamp(minX + point.x * colStep, minX, maxX),
      y: clamp(minY + point.y * rowStep, minY, maxY),
    }));

    const bridges = points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      const horizontal = Math.abs(point.y - next.y) < 1;
      if (horizontal) {
        const left = Math.min(point.x, next.x);
        const width = Math.abs(point.x - next.x);
        return {
          key: `bridge-${index}`,
          left,
          top: point.y - BRIDGE_THICKNESS / 2,
          width,
          height: BRIDGE_THICKNESS,
        };
      }
      const top = Math.min(point.y, next.y);
      const height = Math.abs(point.y - next.y);
      return {
        key: `bridge-${index}`,
        left: point.x - BRIDGE_THICKNESS / 2,
        top,
        width: BRIDGE_THICKNESS,
        height,
      };
    });

    return { points, bridges };
  }, [mapSize, hudSize, path, cols, rows]);
  const activeNode = nodeMeta[activeIndex];
  const activeLessonTitle = activeNode?.type === "lesson"
    ? activeNode.title || `Lesson ${activeIndex + 1}`
    : "Special Level";
  useLayoutEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const dir =
        key === "a" || key === "arrowleft" ? "left"
          : key === "d" || key === "arrowright" ? "right"
            : key === "w" || key === "arrowup" ? "up"
              : key === "s" || key === "arrowdown" ? "down"
                : null;
      if (!dir) return;
      if (!layout.points.length) return;
      event.preventDefault();
      const currentIndex = selectedIndex;
      const currentPoint = layout.points[currentIndex] || layout.points[0];
      let bestIndex = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      layout.points.forEach((point, index) => {
        if (index === currentIndex) return;
        const dx = point.x - currentPoint.x;
        const dy = point.y - currentPoint.y;
        if (dir === "left" && dx >= 0) return;
        if (dir === "right" && dx <= 0) return;
        if (dir === "up" && dy >= 0) return;
        if (dir === "down" && dy <= 0) return;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      if (bestIndex === null) return;
      setSelectedIndex(bestIndex);
      setActiveIndex(bestIndex);
      setHasSelected(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [layout.points, selectedIndex]);

  const activePoint = layout.points[selectedIndex] || layout.points[0];
  const playerOffset = hasSelected ? 0 : PLAYER_START_OFFSET;
  const playerStyle = activePoint
    ? {
      left: clamp(activePoint.x - PLAYER_WIDTH / 2, 0, mapSize.width - PLAYER_WIDTH),
      top: clamp(
        activePoint.y - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET + playerOffset,
        0,
        mapSize.height - PLAYER_HEIGHT
      ),
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      backgroundImage: `url(${idleSprite})`,
      backgroundPosition: "0px 0px",
      backgroundSize: `${PLAYER_FRAME_WIDTH * 7 * PLAYER_SCALE}px ${PLAYER_HEIGHT}px`,
    }
    : null;

  return (
    <div className="portal-map" ref={containerRef}>
      <div className="portal-map__hud" ref={hudRef}>
        <div className="portal-map__card">
          <h1>{portal?.title || "World Map"}</h1>
          <div className="portal-map__meta">
            <span>{activeLessonTitle}</span>
          </div>
        </div>
        <button className="portal-start" type="button">
          Start Lesson
        </button>
      </div>
      {layout.bridges.map((bridge) => (
        <div key={bridge.key} className="portal-bridge" style={bridge} />
      ))}
      {layout.points.map((point, index) => {
        const isSpecial = nodeMeta[index]?.type === "special";
        const label = nodeMeta[index]?.type === "lesson"
          ? nodeMeta[index]?.title || `Lesson ${index + 1}`
          : "Special Level";
        return (
          <button
            key={`node-${index}`}
            type="button"
            className={`portal-node${index === selectedIndex ? " portal-node--active" : ""}${isSpecial ? " portal-node--special" : ""}`}
            style={{ left: point.x - POINT_SIZE / 2, top: point.y - POINT_SIZE / 2 }}
            onClick={() => {
              setSelectedIndex(index);
              setHasSelected(true);
              setActiveIndex(index);
            }}
            aria-label={label}
          >
            <span className="portal-node__pulse" />
            {isSpecial && <span className="portal-node__badge">S</span>}
          </button>
        );
      })}
      {playerStyle && <div className="portal-player" style={playerStyle} />}
    </div>
  );
}
