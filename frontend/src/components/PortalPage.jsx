import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const generatePath = (count, cols, rows, rng) => {
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
      .filter((pos) => manhattan(pos, end) <= remaining - 1);

    if (candidates.length === 0) {
      candidates = directions
        .map((dir) => ({
          x: current.x + dir.dx,
          y: current.y + dir.dy,
        }))
        .filter((pos) => pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows);
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
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
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

  useLayoutEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMapSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const { cols, rows } = useMemo(() => computeGrid(lessons.length), [lessons.length]);

  const path = useMemo(() => {
    const seedBase = portal ? `${portal.id}-${portal.title}-${lessons.length}` : `${lessons.length}`;
    const rng = seededRandom(hashString(seedBase));
    return generatePath(lessons.length, cols, rows, rng);
  }, [portal, lessons.length, cols, rows]);

  const layout = useMemo(() => {
    const edgeGapX = Math.max(PLAYER_WIDTH * 0.6, POINT_SIZE * 2, MIN_EDGE_PADDING);
    const edgeGapY = Math.max(PLAYER_HEIGHT * 0.25, POINT_SIZE * 2, MIN_EDGE_PADDING);
    const minX = Math.min(edgeGapX, mapSize.width / 2);
    const maxX = Math.max(mapSize.width - edgeGapX, minX);
    const minY = Math.min(edgeGapY, mapSize.height / 2);
    const maxY = Math.max(mapSize.height - edgeGapY, minY);
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
  }, [mapSize, path, cols, rows]);
  const specialIndices = useMemo(() => {
    const count = lessons.length;
    const total = Math.min(4, Math.max(count - 2, 0));
    const indices = new Set();
    if (!total) return indices;
    const stride = (count - 1) / (total + 1);
    for (let i = 1; i <= total; i += 1) {
      let idx = Math.round(stride * i);
      idx = clamp(idx, 1, count - 2);
      while (indices.has(idx) && idx < count - 2) idx += 1;
      while (indices.has(idx) && idx > 1) idx -= 1;
      indices.add(idx);
    }
    return indices;
  }, [lessons.length]);

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

  const popup = layout.points[activeIndex]
    ? {
      left: layout.points[activeIndex].x,
      top: layout.points[activeIndex].y,
    }
    : null;

  return (
    <div className="portal-map" ref={containerRef}>
      <div className="portal-map__hud">
        <div className="portal-map__card">
          <span className="eyebrow">Course Map</span>
          <h1>{portal?.title || "World Map"}</h1>
          <div className="portal-map__meta">
            <span>{lessons.length} Lessons</span>
            <span>{specialIndices.size} Special Nodes</span>
          </div>
        </div>
        <button className="portal-back" type="button" onClick={() => navigate("/dashboard/main")}>
          Back to Oracle
        </button>
      </div>
      {layout.bridges.map((bridge) => (
        <div key={bridge.key} className="portal-bridge" style={bridge} />
      ))}
      {layout.points.map((point, index) => {
        const isSpecial = specialIndices.has(index);
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
            aria-label={lessons[index]?.title || `Lesson ${index + 1}`}
          >
            <span className="portal-node__pulse" />
          </button>
        );
      })}
      {playerStyle && <div className="portal-player" style={playerStyle} />}
      {popup && (
        <div
          className="portal-popup"
          style={{ left: popup.left, top: popup.top - POINT_SIZE - 16 }}
        >
          {lessons[activeIndex]?.title || `Lesson ${activeIndex + 1}`}
        </div>
      )}
    </div>
  );
}
