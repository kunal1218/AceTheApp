import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PortalPage.css";
import { loadItems } from "../utils/semesters";
import { getCourseSyllabus, getWorkspaceSyllabus, getCalendarEvents, importCalendarIcs } from "../api";
import idleSprite from "../assets/characters/mainChar/IDLE.png";
import walkSprite from "../assets/characters/mainChar/WALK.png";

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
const HUD_SAFE_PADDING = 24;
const MAP_IDLE_FRAMES = 7;
const MAP_WALK_FRAMES = 8;
const MAP_WALK_FPS = 10;
const MAP_IDLE_FPS = 6;

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
  const distance = (cols - 1) + (rows - 1);
  if ((distance % 2) !== ((count - 1) % 2) && distance <= count - 2) {
    if (cols <= rows) {
      cols += 1;
    } else {
      rows += 1;
    }
  }
  return { cols, rows };
};

const generatePath = (count, cols, rows, seedBase, forbidden) => {
  const start = { x: 0, y: rows - 1 };
  const end = { x: cols - 1, y: 0 };
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];

  const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  if (count <= 1) return [start];

  const shuffle = (items, rng) => {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  const buildPath = (rng) => {
    const path = [start];
    const visited = new Set([`${start.x},${start.y}`]);
    let expansions = 0;
    const maxExpansions = cols * rows * 40;

    const walk = (current) => {
      if (path.length === count) {
        return current.x === end.x && current.y === end.y;
      }
      if (expansions > maxExpansions) return false;
      expansions += 1;
      const remaining = count - path.length;
      const orderedDirs = shuffle(directions, rng);
      for (const dir of orderedDirs) {
        const next = { x: current.x + dir.dx, y: current.y + dir.dy };
        const key = `${next.x},${next.y}`;
        if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) continue;
        if (forbidden.has(key)) continue;
        if (visited.has(key)) continue;
        if (manhattan(next, end) > remaining - 1) continue;
        visited.add(key);
        path.push(next);
        if (walk(next)) return true;
        path.pop();
        visited.delete(key);
      }
      return false;
    };

    return walk(start) ? path : null;
  };

  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const rng = seededRandom(hashString(`${seedBase}-${attempt}`));
    const path = buildPath(rng);
    if (path) return path;
  }

  const fallbackRng = seededRandom(hashString(`${seedBase}-fallback`));
  return buildPath(fallbackRng) || [start];
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

const normalizeSyllabusRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && row.type !== "syllabus-json")
    .map((row) => {
      let dateValue = row.date;
      if (!dateValue && row.rawText) {
        try {
          const parsed = JSON.parse(row.rawText);
          if (parsed?.date) dateValue = parsed.date;
        } catch {
          // ignore parse errors
        }
      }
      const date =
        typeof dateValue === "string"
          ? dateValue
          : dateValue instanceof Date
            ? dateValue.toISOString().slice(0, 10)
            : dateValue
              ? new Date(dateValue).toISOString().slice(0, 10)
              : "";
      return {
        id: row.id,
        title: row.title || "Lesson",
        date,
        type: row.type || "lesson",
        description: row.description || "",
        courseId: row.courseId || "",
      };
    });
};

const normalizeTitleKey = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeCalendarEvents = (events) => {
  if (!Array.isArray(events)) return [];
  const mapped = events
    .map((event) => {
      const dueAt = event?.dueAt || event?.date;
      if (!dueAt) return null;
      const date = new Date(dueAt);
      if (Number.isNaN(date.getTime())) return null;
      return {
        id: event.id || event.sourceId || `${event.title}-${date.toISOString()}`,
        title: event.title || "Assignment",
        date: date.toISOString().slice(0, 10),
        courseId: event.courseId || "",
        description: event.description || "",
      };
    })
    .filter(Boolean);
  const seen = new Set();
  return mapped.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
};

const filterAssignmentsForPortal = (events, portal) => {
  if (!portal || !events.length) return [];
  if (portal.courseId) {
    const direct = events.filter((event) => event.courseId === portal.courseId);
    if (direct.length) return direct;
  }
  const portalKey = normalizeTitleKey(portal.title || "");
  if (!portalKey) return [];
  return events.filter((event) => {
    const titleKey = normalizeTitleKey(event.title || "");
    const descKey = normalizeTitleKey(event.description || "");
    return titleKey.includes(portalKey) || descKey.includes(portalKey);
  });
};

export default function PortalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const hudRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [hudSize, setHudSize] = useState({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSelected, setHasSelected] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [walkProgress, setWalkProgress] = useState(0);
  const [idleFrame, setIdleFrame] = useState(0);
  const [facing, setFacing] = useState("right");
  const [dbLessons, setDbLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enterMessage, setEnterMessage] = useState("");
  const [isResolvingLecture, setIsResolvingLecture] = useState(false);
  const [icsModalOpen, setIcsModalOpen] = useState(false);
  const [icsFile, setIcsFile] = useState(null);
  const [icsStatus, setIcsStatus] = useState("");
  const [icsLoading, setIcsLoading] = useState(false);
  const hydratedIdRef = useRef(null);
  const walkStateRef = useRef({
    active: false,
    startTime: 0,
    duration: 0,
    fromIndex: null,
    toIndex: null,
  });
  const idleStartRef = useRef(performance.now());
  const icsInputRef = useRef(null);

  const portal = useMemo(() => {
    const items = loadItems();
    return items.find((item) => item.id === id) || null;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const hydrateLessons = async () => {
      if (!portal) return;
      if (hydratedIdRef.current === portal.id) return;
      hydratedIdRef.current = portal.id;
      if (dbLessons.length) return;
      try {
        let rows = [];
        if (portal.courseId) {
          const res = await getCourseSyllabus(portal.courseId);
          rows = res?.data?.syllabus || res?.syllabus || res?.items || res || [];
        }
        if ((!rows || rows.length === 0) && portal.title) {
          const resByWorkspace = await getWorkspaceSyllabus(portal.title);
          const items = resByWorkspace?.items || resByWorkspace?.data || resByWorkspace || [];
          rows = Array.isArray(items) ? items : [];
        }
        if (!cancelled) {
          const normalizedRows = normalizeSyllabusRows(rows);
          const fallbackLessons = normalizeLessons(portal);
          if (!normalizedRows.length) {
            return;
          }
          if (fallbackLessons.length && normalizedRows.length < fallbackLessons.length) {
            return;
          }
          setDbLessons(normalizedRows);
        }
      } catch (err) {
        console.warn("[PortalPage] Failed to hydrate syllabus items", err);
      }
    };
    hydrateLessons();
    return () => {
      cancelled = true;
    };
  }, [portal]);

  useEffect(() => {
    let cancelled = false;
    const hydrateAssignments = async () => {
      if (!portal) {
        if (!cancelled) setAssignments([]);
        return;
      }
      try {
        const events = await getCalendarEvents();
        const normalized = normalizeCalendarEvents(events);
        const filtered = filterAssignmentsForPortal(normalized, portal);
        if (!cancelled) setAssignments(filtered);
      } catch (err) {
        if (!cancelled) setAssignments([]);
        console.warn("[PortalPage] Failed to load assignments", err);
      }
    };
    hydrateAssignments();
    return () => {
      cancelled = true;
    };
  }, [portal]);

  const lessons = useMemo(() => {
    if (dbLessons.length) return dbLessons;
    const extracted = normalizeLessons(portal);
    if (extracted.length) return extracted;
    const placeholderCount = portal?.type === "semester" ? 10 : 6;
    return Array.from({ length: placeholderCount }, (_, index) => ({
      title: `Lesson ${index + 1}`,
      date: "",
    }));
  }, [portal, dbLessons]);
  const baseNodes = useMemo(() => {
    const lessonNodes = lessons.map((lesson, index) => ({
      type: "lesson",
      lessonIndex: index,
      title: lesson.title || `Lesson ${index + 1}`,
      topicId: lesson.id,
      date: lesson.date || "",
    }));
    const assignmentNodes = assignments.map((assignment, index) => ({
      type: "assignment",
      assignmentIndex: index,
      title: assignment.title || "Assignment",
      date: assignment.date || "",
      description: assignment.description || "",
    }));
    const sortable = [...lessonNodes, ...assignmentNodes].map((node, index) => {
      const parsed = node.date ? Date.parse(node.date) : Number.NaN;
      return {
        ...node,
        sortKey: Number.isNaN(parsed) ? null : parsed,
        order: index,
      };
    });
    const sorted = sortable
      .sort((a, b) => {
        const aHas = a.sortKey !== null;
        const bHas = b.sortKey !== null;
        if (aHas && bHas) {
          if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
          if (a.type !== b.type) return a.type === "lesson" ? -1 : 1;
          return a.order - b.order;
        }
        if (aHas) return -1;
        if (bHas) return 1;
        return a.order - b.order;
      })
      .map(({ sortKey, order, ...rest }) => rest);

    if (!lessonNodes.length) return sorted;
    if (lessonNodes.length === 1) {
      const only = lessonNodes[0];
      const remainder = sorted.filter(
        (node) => !(node.type === "lesson" && node.lessonIndex === only.lessonIndex)
      );
      return [only, ...remainder];
    }

    const firstLesson = lessonNodes[0];
    const lastLesson = lessonNodes[lessonNodes.length - 1];
    const middle = sorted.filter((node) => {
      if (node.type !== "lesson") return true;
      return node.lessonIndex !== firstLesson.lessonIndex && node.lessonIndex !== lastLesson.lessonIndex;
    });
    return [firstLesson, ...middle, lastLesson];
  }, [lessons, assignments]);

  const nodeMeta = useMemo(() => {
    const nodeCount = baseNodes.length;
    const specialCount = Math.min(SPECIAL_NODE_COUNT, Math.max(nodeCount - 1, 0));
    if (!specialCount) return baseNodes;
    const insertAfter = new Set();
    const stride = nodeCount / (specialCount + 1);
    for (let i = 1; i <= specialCount; i += 1) {
      let idx = Math.round(stride * i);
      idx = clamp(idx, 1, nodeCount - 1);
      while (insertAfter.has(idx) && idx < nodeCount - 1) idx += 1;
      while (insertAfter.has(idx) && idx > 1) idx -= 1;
      insertAfter.add(idx);
    }
    let filled = insertAfter.size;
    for (let idx = 1; idx < nodeCount && filled < specialCount; idx += 1) {
      if (!insertAfter.has(idx)) {
        insertAfter.add(idx);
        filled += 1;
      }
    }
    const nodes = [];
    baseNodes.forEach((node, index) => {
      nodes.push(node);
      if (insertAfter.has(index + 1)) {
        nodes.push({ type: "special", lessonIndex: null, title: "Special Level" });
      }
    });
    return nodes;
  }, [baseNodes]);

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
    const forbidden = new Set();
    return generatePath(nodeMeta.length, cols, rows, seedBase, forbidden);
  }, [portal, nodeMeta.length, cols, rows]);

  const layout = useMemo(() => {
    const edgeGapX = Math.max(PLAYER_WIDTH * 0.8, POINT_SIZE * 3, MIN_EDGE_PADDING);
    const edgeGapY = Math.max(PLAYER_HEIGHT * 0.25, POINT_SIZE * 2, MIN_EDGE_PADDING);
    const safeWidth = Math.max(hudSize.width, HUD_SAFE_WIDTH);
    const minX = Math.min(edgeGapX, mapSize.width / 2);
    const safeRight = Math.max(mapSize.width - safeWidth - HUD_SAFE_PADDING, minX);
    const maxX = Math.max(Math.min(mapSize.width - edgeGapX, safeRight), minX);
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
  }, [mapSize, hudSize, path, cols, rows]);
  const activeNode = nodeMeta[activeIndex];
  const activeLessonTitle = activeNode?.type === "lesson"
    ? activeNode.title || `Lesson ${activeIndex + 1}`
    : activeNode?.type === "assignment"
      ? `Assignment: ${activeNode.title || "Assignment"}`
      : "Special Level";
  const handleEnter = async () => {
    if (!activeNode || activeNode.type !== "lesson") return;
    if (isResolvingLecture) return;
    setIsResolvingLecture(true);
    setEnterMessage("Loading lecture...");
    const lessonIndex = typeof activeNode.lessonIndex === "number" ? activeNode.lessonIndex : null;
    const lesson = lessonIndex !== null ? lessons[lessonIndex] : null;
    let resolvedCourseId = portal?.courseId || "";
    let resolvedTopicId = activeNode.topicId || lesson?.id || "";
    if (!resolvedCourseId || !resolvedTopicId) {
      let rows = [];
      try {
        if (resolvedCourseId) {
          const res = await getCourseSyllabus(resolvedCourseId);
          rows = res?.data?.syllabus || res?.syllabus || res?.items || res || [];
        } else if (portal?.title) {
          const res = await getWorkspaceSyllabus(portal.title);
          rows = res?.items || res?.data || res || [];
        }
      } catch (err) {
        console.warn("[PortalPage] Failed to resolve syllabus rows", err);
      }
      const normalizedRows = normalizeSyllabusRows(rows);
      if (normalizedRows.length) {
        setDbLessons(normalizedRows);
      }
      if (!resolvedCourseId) {
        resolvedCourseId = normalizedRows[0]?.courseId || "";
      }
      if (!resolvedTopicId) {
        const targetTitle = lesson?.title || activeNode.title || "";
        const titleKey = normalizeTitleKey(targetTitle);
        const dateKey = lesson?.date ? lesson.date.slice(0, 10) : "";
        let match = normalizedRows.find(
          (row) => normalizeTitleKey(row.title) === titleKey
        );
        if (!match && dateKey) {
          match = normalizedRows.find((row) => row.date?.slice(0, 10) === dateKey);
        }
        resolvedTopicId = match?.id || "";
      }
    }
    setIsResolvingLecture(false);
    if (!resolvedCourseId || !resolvedTopicId) {
      setEnterMessage("Lecture not available for this node yet.");
      return;
    }
    setEnterMessage("");
    navigate(`/lecture/${resolvedCourseId}/${resolvedTopicId}`, {
      state: {
        lessonTitle: activeNode.title,
        portalId: portal.id,
      },
    });
  };

  const handleImportIcs = async () => {
    if (!icsFile) return;
    setIcsLoading(true);
    setIcsStatus("");
    try {
      const result = await importCalendarIcs(icsFile);
      const events = await getCalendarEvents();
      const normalized = normalizeCalendarEvents(events);
      const filtered = filterAssignmentsForPortal(normalized, portal);
      setAssignments(filtered);
      const imported = result?.imported ?? 0;
      const updated = result?.updated ?? 0;
      setIcsStatus(`Imported ${imported} new events, updated ${updated} existing events.`);
      setIcsFile(null);
    } catch (err) {
      setIcsStatus(err.message || "Failed to import ICS file");
    } finally {
      setIcsLoading(false);
    }
  };

  const closeIcsModal = () => {
    setIcsModalOpen(false);
    setIcsFile(null);
    setIcsStatus("");
  };

  const handleIcsDrop = (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) {
      setIcsFile(dropped);
      setIcsStatus("");
    }
  };
  useLayoutEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (walkStateRef.current.active || isWalking) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleEnter();
        return;
      }
      const key = event.key.toLowerCase();
      const dir =
        key === "a" || key === "arrowleft" ? "left"
          : key === "d" || key === "arrowright" ? "right"
            : key === "w" || key === "arrowup" ? "up"
              : key === "s" || key === "arrowdown" ? "down"
                : null;
      if (!dir) return;
      if (!path.length) return;
      event.preventDefault();
      const currentIndex = selectedIndex;
      const currentCell = path[currentIndex] || path[0];
      const neighbors = [];
      if (currentIndex > 0) neighbors.push(currentIndex - 1);
      if (currentIndex < path.length - 1) neighbors.push(currentIndex + 1);
      const nextIndex = neighbors.find((index) => {
        const cell = path[index];
        if (!cell || !currentCell) return false;
        const dx = cell.x - currentCell.x;
        const dy = cell.y - currentCell.y;
        if (dir === "left") return dx === -1;
        if (dir === "right") return dx === 1;
        if (dir === "up") return dy === -1;
        if (dir === "down") return dy === 1;
        return false;
      });
      if (nextIndex == null) return;
      const frameDuration = 1000 / MAP_WALK_FPS;
      const walkDuration = MAP_WALK_FRAMES * frameDuration;
      const dx = (path[nextIndex]?.x ?? 0) - (currentCell?.x ?? 0);
      if (dx !== 0) {
        setFacing(dx > 0 ? "right" : "left");
      }
      walkStateRef.current = {
        active: true,
        startTime: performance.now(),
        duration: walkDuration,
        fromIndex: currentIndex,
        toIndex: nextIndex,
      };
      setWalkProgress(0);
      setIsWalking(true);
      setWalkFrame(0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [path, selectedIndex, isWalking, handleEnter]);

  useEffect(() => {
    if (!isWalking) return undefined;
    let rafId;
    const frameDuration = 1000 / MAP_WALK_FPS;
    const step = (now) => {
      const walkState = walkStateRef.current;
      if (!walkState.active) return;
      const elapsed = now - walkState.startTime;
      const nextFrame = Math.min(
        MAP_WALK_FRAMES - 1,
        Math.floor(elapsed / frameDuration) % MAP_WALK_FRAMES
      );
      setWalkFrame(nextFrame);
      const progress = walkState.duration > 0 ? Math.min(elapsed / walkState.duration, 1) : 1;
      setWalkProgress(progress);
      if (progress >= 1) {
        const targetIndex = walkState.toIndex;
        walkStateRef.current = {
          active: false,
          startTime: 0,
          duration: 0,
          fromIndex: null,
          toIndex: null,
        };
        setIsWalking(false);
        setWalkFrame(0);
        setWalkProgress(0);
        if (targetIndex !== null && targetIndex !== undefined) {
          setSelectedIndex(targetIndex);
          setActiveIndex(targetIndex);
          setHasSelected(true);
        }
        return;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isWalking]);

  useEffect(() => {
    if (isWalking) {
      idleStartRef.current = performance.now();
      setIdleFrame(0);
      return undefined;
    }
    let rafId;
    const frameDuration = 1000 / MAP_IDLE_FPS;
    const step = (now) => {
      const elapsed = now - idleStartRef.current;
      const nextFrame = Math.floor(elapsed / frameDuration) % MAP_IDLE_FRAMES;
      setIdleFrame(nextFrame);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isWalking]);

  useEffect(() => {
    if (enterMessage) setEnterMessage("");
  }, [activeIndex]);

  const activePoint = layout.points[selectedIndex] || layout.points[0];
  const walkFromIndex = walkStateRef.current.fromIndex;
  const walkToIndex = walkStateRef.current.toIndex;
  const walkFromPoint = walkFromIndex !== null ? layout.points[walkFromIndex] : null;
  const walkToPoint = walkToIndex !== null ? layout.points[walkToIndex] : null;
  const displayPoint = isWalking && walkFromPoint && walkToPoint
    ? {
      x: walkFromPoint.x + (walkToPoint.x - walkFromPoint.x) * walkProgress,
      y: walkFromPoint.y + (walkToPoint.y - walkFromPoint.y) * walkProgress,
    }
    : activePoint;
  const playerOffset = hasSelected ? 0 : PLAYER_START_OFFSET;
  const playerSprite = isWalking ? walkSprite : idleSprite;
  const playerFrames = isWalking ? MAP_WALK_FRAMES : MAP_IDLE_FRAMES;
  const playerFrame = isWalking ? walkFrame : idleFrame;
  const playerStyle = displayPoint
    ? {
      left: clamp(displayPoint.x - PLAYER_WIDTH / 2, 0, mapSize.width - PLAYER_WIDTH),
      top: clamp(
        displayPoint.y - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET + playerOffset,
        0,
        mapSize.height - PLAYER_HEIGHT
      ),
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      backgroundImage: `url(${playerSprite})`,
      backgroundPosition: `-${playerFrame * PLAYER_FRAME_WIDTH * PLAYER_SCALE}px 0px`,
      backgroundSize: `${PLAYER_FRAME_WIDTH * playerFrames * PLAYER_SCALE}px ${PLAYER_HEIGHT}px`,
      transform: facing === "left" ? "scaleX(-1)" : "scaleX(1)",
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
          <div className="portal-map__hint">hit enter to enter level</div>
          {enterMessage && <div className="portal-map__hint">{enterMessage}</div>}
          <div className="portal-map__actions">
            <button
              type="button"
              className="ace-btn ghost portal-map__sync"
              onClick={() => {
                setIcsModalOpen(true);
                setIcsStatus("");
                setIcsFile(null);
              }}
            >
              Sync homework assignments
            </button>
          </div>
        </div>
      </div>
      {layout.bridges.map((bridge) => (
        <div key={bridge.key} className="portal-bridge" style={bridge} />
      ))}
      {layout.points.map((point, index) => {
        const isSpecial = nodeMeta[index]?.type === "special";
        const isAssignment = nodeMeta[index]?.type === "assignment";
        const label = nodeMeta[index]?.type === "lesson"
          ? nodeMeta[index]?.title || `Lesson ${index + 1}`
          : isAssignment
            ? `Assignment: ${nodeMeta[index]?.title || "Assignment"}`
            : "Special Level";
        return (
          <button
            key={`node-${index}`}
            type="button"
            className={`portal-node${index === selectedIndex ? " portal-node--active" : ""}${isSpecial ? " portal-node--special" : ""}${isAssignment ? " portal-node--assignment" : ""}`}
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
            {isAssignment && <span className="portal-node__badge portal-node__badge--assignment">A</span>}
          </button>
        );
      })}
      {playerStyle && <div className="portal-player" style={playerStyle} />}
      {icsModalOpen && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal" role="dialog" aria-modal="true" aria-label="Sync with Canvas">
            <p className="portal-modal__eyebrow">Sync with Canvas</p>
            <h2>Import your Canvas / ICS calendar</h2>
            <p className="portal-modal__muted">
              In Canvas, open your calendar, click "Calendar Feed / Live Feed", download the .ics file,
              then drop it here.
            </p>
            <div
              className="portal-modal__drop"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleIcsDrop}
              onClick={() => icsInputRef.current?.click()}
            >
              <input
                ref={icsInputRef}
                type="file"
                accept=".ics,text/calendar"
                onChange={(event) => {
                  setIcsFile(event.target.files?.[0] || null);
                  setIcsStatus("");
                }}
              />
              {icsFile ? (
                <p><strong>{icsFile.name}</strong></p>
              ) : (
                <p className="portal-modal__muted">Click to browse or drag an .ics file here</p>
              )}
            </div>
            {icsStatus && <p className="portal-modal__muted portal-modal__status">{icsStatus}</p>}
            <div className="portal-modal__actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={closeIcsModal}
                disabled={icsLoading}
              >
                Cancel
              </button>
              <button
                className="ace-btn"
                type="button"
                onClick={handleImportIcs}
                disabled={!icsFile || icsLoading}
              >
                {icsLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
