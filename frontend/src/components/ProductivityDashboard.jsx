import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProductivityDashboard.css";
import { CARD_COLORS, addSemester, loadItems, saveItems } from "../utils/semesters";
import { uploadSyllabusFile, deleteCourse } from "../api";
import idleSprite from "../assets/characters/mainChar/IDLE.png";
import walkSprite from "../assets/characters/mainChar/WALK.png";
import runSprite from "../assets/characters/mainChar/RUN.png";
import jumpSprite from "../assets/characters/mainChar/JUMP.png";
import oracleSheet from "../assets/characters/Oracle/SPRITE_SHEET.png";
import oraclePortrait from "../assets/characters/Oracle/SPRITE_PORTRAIT.png";

const PLAYER_FRAME_WIDTH = 96;
const PLAYER_FRAME_HEIGHT = 84;
const PLAYER_SCALE = 3.2;
const PLAYER_WIDTH = PLAYER_FRAME_WIDTH * PLAYER_SCALE;
const PLAYER_HEIGHT = PLAYER_FRAME_HEIGHT * PLAYER_SCALE;
const PLAYER_FOOT_PADDING = 22;
const PLAYER_FOOT_OFFSET = PLAYER_FOOT_PADDING * PLAYER_SCALE;
const PLAYER_WALK_SPEED = 220;
const PLAYER_RUN_SPEED = 360;
const RUN_TRIGGER_MS = 600;
const RUN_RAMP_MS = 250;
const JUMP_DURATION_MS = 650;
const JUMP_HEIGHT = 90;

const ORACLE_FRAME_WIDTH = 32;
const ORACLE_FRAME_HEIGHT = 32;
const ORACLE_SHEET_COLUMNS = 10;
const ORACLE_SHEET_ROWS = 11;
const ORACLE_SCALE = 6;
const ORACLE_WIDTH = ORACLE_FRAME_WIDTH * ORACLE_SCALE;
const ORACLE_HEIGHT = ORACLE_FRAME_HEIGHT * ORACLE_SCALE;
const ORACLE_GROUND_OFFSET = 30;
const ORACLE_INTERACT_DISTANCE = 120;
const ORACLE_IDLE_FRAMES = 6;
const ORACLE_IDLE_FPS = 6;

const PORTAL_WIDTH = 72;
const PORTAL_HEIGHT = 96;
const PORTAL_SPACING = 140;
const PORTAL_GROUND_OFFSET = 6;

const PLAYER_SPRITES = {
  idle: { src: idleSprite, frames: 7, fps: 6 },
  walk: { src: walkSprite, frames: 8, fps: 10 },
  run: { src: runSprite, frames: 8, fps: 12 },
  jump: { src: jumpSprite, frames: 5, fps: 10 },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getItemTimestamp = (item) => {
  if (item?.createdAt) {
    const parsed = Date.parse(item.createdAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const asNumber = Number(item?.id);
  return Number.isNaN(asNumber) ? 0 : asNumber;
};

export default function ProductivityDashboard() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [semesterComposerOpen, setSemesterComposerOpen] = useState(false);
  const [semesterName, setSemesterName] = useState("");
  const [semesterColor, setSemesterColor] = useState(CARD_COLORS[0]);
  const [semesterUploads, setSemesterUploads] = useState([]);
  const [semesterError, setSemesterError] = useState("");
  const [items, setItems] = useState(loadItems());
  const [uploadFlash, setUploadFlash] = useState(false);
  const [semesterIsUploading, setSemesterIsUploading] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [portalDeleteMode, setPortalDeleteMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [arena, setArena] = useState({ width: 0, height: 0, groundY: 0 });
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [, setAnimationTick] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const playerRef = useRef(player);
  const heldKeys = useRef(new Set());
  const lastTick = useRef(performance.now());
  const animationRef = useRef({
    name: "idle",
    frame: 0,
    lastFrameTime: performance.now(),
  });
  const jumpRef = useRef({
    active: false,
    startTime: 0,
  });
  const runHold = useRef({ start: null, direction: 0 });
  const oracleAnimRef = useRef({
    frame: 0,
    lastFrameTime: performance.now(),
  });
  const facingRef = useRef("right");
  const initialPlacementRef = useRef(false);
  const semesterFileInputRef = useRef(null);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  useLayoutEffect(() => {
    const updateBounds = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const minGroundY = Math.max(PLAYER_HEIGHT - PLAYER_FOOT_OFFSET, ORACLE_HEIGHT);
      const groundY = clamp(rect.height * 0.65, minGroundY, rect.height - 24);
      setArena({ width: rect.width, height: rect.height, groundY });
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  useEffect(() => {
    if (!arena.width || !arena.height) return;
    const playerY = arena.groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
    const startX = clamp(arena.width * 0.25, 0, arena.width - PLAYER_WIDTH);
    const nextX = initialPlacementRef.current
      ? clamp(playerRef.current.x, 0, arena.width - PLAYER_WIDTH)
      : startX;
    const nextPlayer = { x: nextX, y: playerY };
    initialPlacementRef.current = true;
    playerRef.current = nextPlayer;
    setPlayer(nextPlayer);
  }, [arena]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }
      const key = event.key.toLowerCase();
      if (event.code === "Space" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        if (!jumpRef.current.active) {
          const jumpStart = performance.now();
          jumpRef.current = { active: true, startTime: jumpStart };
          animationRef.current = { name: "jump", frame: 0, lastFrameTime: jumpStart };
          setAnimationTick((prev) => prev + 1);
        }
        return;
      }
      if (key === "w" || key === "arrowup") {
        if (!jumpRef.current.active) {
          const jumpStart = performance.now();
          jumpRef.current = { active: true, startTime: jumpStart };
          animationRef.current = { name: "jump", frame: 0, lastFrameTime: jumpStart };
          setAnimationTick((prev) => prev + 1);
        }
        return;
      }
      if (key === "a" || key === "arrowleft" || key === "d" || key === "arrowright") {
        heldKeys.current.add(key);
      }
      if (key === "escape") {
        setOracleOpen(false);
        setPortalDeleteMode(false);
        setPendingDelete(null);
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      heldKeys.current.delete(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId;
    const tick = (now) => {
      const dt = Math.min((now - lastTick.current) / 1000, 0.05);
      lastTick.current = now;
      if (arena.width > 0) {
        const movingLeft = heldKeys.current.has("a") || heldKeys.current.has("arrowleft");
        const movingRight = heldKeys.current.has("d") || heldKeys.current.has("arrowright");
        const moveX = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
        let nextX = playerRef.current.x;
        let runRamp = 0;
        if (moveX !== 0) {
          if (runHold.current.start === null || runHold.current.direction !== moveX) {
            runHold.current = { start: now, direction: moveX };
          }
          const runHeldMs = runHold.current.start ? now - runHold.current.start : 0;
          runRamp = runHeldMs > RUN_TRIGGER_MS
            ? Math.min((runHeldMs - RUN_TRIGGER_MS) / RUN_RAMP_MS, 1)
            : 0;
          const speed = PLAYER_WALK_SPEED + runRamp * (PLAYER_RUN_SPEED - PLAYER_WALK_SPEED);
          nextX += moveX * speed * dt;
          facingRef.current = moveX < 0 ? "left" : "right";
        } else {
          runHold.current = { start: null, direction: 0 };
        }
        nextX = clamp(nextX, 0, arena.width - PLAYER_WIDTH);
        const playerY = arena.groundY - PLAYER_HEIGHT + PLAYER_FOOT_OFFSET;
        let nextPlayerY = playerY;
        const jump = jumpRef.current;
        if (jump.active) {
          const jumpElapsed = now - jump.startTime;
          if (jumpElapsed >= JUMP_DURATION_MS) {
            jump.active = false;
            jump.startTime = 0;
          } else {
            const t = jumpElapsed / JUMP_DURATION_MS;
            const jumpOffset = 4 * t * (1 - t) * JUMP_HEIGHT;
            nextPlayerY = playerY - jumpOffset;
          }
        }
        const nextPlayer = { x: nextX, y: nextPlayerY };
        if (
          Math.abs(nextPlayer.x - playerRef.current.x) > 0.1
          || Math.abs(nextPlayer.y - playerRef.current.y) > 0.1
        ) {
          playerRef.current = nextPlayer;
          setPlayer(nextPlayer);
        }
        const nextAnimation = jumpRef.current.active
          ? "jump"
          : (moveX !== 0 ? (runRamp > 0 ? "run" : "walk") : "idle");
        const anim = animationRef.current;
        if (anim.name !== nextAnimation) {
          anim.name = nextAnimation;
          anim.frame = 0;
          anim.lastFrameTime = now;
        }
        const sprite = PLAYER_SPRITES[anim.name];
        const frameDuration = 1000 / sprite.fps;
        if (now - anim.lastFrameTime >= frameDuration) {
          const framesToAdvance = Math.floor((now - anim.lastFrameTime) / frameDuration);
          anim.frame = (anim.frame + framesToAdvance) % sprite.frames;
          anim.lastFrameTime += framesToAdvance * frameDuration;
          setAnimationTick((prev) => prev + 1);
        }
        const oracleAnim = oracleAnimRef.current;
        const oracleFrameDuration = 1000 / ORACLE_IDLE_FPS;
        if (now - oracleAnim.lastFrameTime >= oracleFrameDuration) {
          const framesToAdvance = Math.floor((now - oracleAnim.lastFrameTime) / oracleFrameDuration);
          oracleAnim.frame = (oracleAnim.frame + framesToAdvance) % ORACLE_IDLE_FRAMES;
          oracleAnim.lastFrameTime += framesToAdvance * oracleFrameDuration;
          setAnimationTick((prev) => prev + 1);
        }
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [arena]);

  const handleDone = () => {
    if (!idea.trim()) return;
    const description = idea.trim();
    const mission = {
      id: Date.now().toString(),
      title: description,
      type: "task",
      color: selectedColor,
      revealed: true,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [mission, ...prev]);
    setComposerOpen(false);
    setIdea("");
    setSelectedColor(CARD_COLORS[0]);
  };

  const triggerUploadFlash = () => {
    setUploadFlash(true);
    setTimeout(() => setUploadFlash(false), 600);
  };

  const handleSemesterFiles = (files) => {
    const pdfs = Array.from(files).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfs.length === 0) {
      triggerUploadFlash();
      return;
    }
    const list = pdfs.map((file) => ({
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: file.name,
      file,
    }));
    setSemesterUploads((prev) => [...prev, ...list]);
  };

  const handleSemesterDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      handleSemesterFiles(event.dataTransfer.files);
    }
  };

  const triggerSemesterFileDialog = () => {
    semesterFileInputRef.current?.click();
  };

  const resetSemesterComposer = () => {
    setSemesterComposerOpen(false);
    setSemesterName("");
    setSemesterColor(CARD_COLORS[0]);
    setSemesterUploads([]);
    setSemesterError("");
  };

  const handleSemesterSubmit = async () => {
    if (!semesterName.trim()) {
      setSemesterError("Please name your semester");
      return;
    }
    if (semesterUploads.length === 0) {
      setSemesterError("Please upload at least one syllabus");
      return;
    }
    try {
      setSemesterIsUploading(true);
      const parsedUploads = [];
      const calendarEvents = [];
      let courseId = null;
      for (const u of semesterUploads) {
        const { syllabusId, syllabus, courseId: returnedCourseId } = await uploadSyllabusFile(u.file, {
          courseId,
          courseName: semesterName.trim(),
          workspaceName: semesterName.trim(),
        });
        if (!courseId && returnedCourseId) {
          courseId = returnedCourseId;
        }
        parsedUploads.push({
          id: u.id,
          name: u.name,
          syllabusId,
          syllabusJson: syllabus,
        });
        const lessons = Array.isArray(syllabus?.schedule_entries) ? syllabus.schedule_entries : [];
        const datedLessons = lessons.filter((entry) => entry?.date);
        calendarEvents.push(
          ...datedLessons.map((entry) => ({
            id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
            date: entry.date,
            title: entry.title || "Lesson",
            source: "syllabus",
            syllabusId,
            syllabusName: u.name,
            color: semesterColor,
          }))
        );
      }
      addSemester({
        title: semesterName.trim(),
        color: semesterColor,
        syllabus: parsedUploads,
        deadlines: [],
        courseId,
        calendarEvents,
      });
      setItems(loadItems());
      resetSemesterComposer();
    } catch (err) {
      setSemesterError(err.message || "Failed to parse syllabus");
    } finally {
      setSemesterIsUploading(false);
    }
  };

  const removePortal = async (item) => {
    if (item.type === "semester" && item.courseId) {
      try {
        await deleteCourse(item.courseId);
      } catch (err) {
        console.warn("[Dashboard] Failed to delete course from backend", err);
      }
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  const portalItems = useMemo(() => {
    return [...items].sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
  }, [items]);

  const portalPositions = useMemo(() => {
    if (!arena.width) return [];
    const centerX = arena.width / 2;
    const baseY = arena.groundY - PORTAL_HEIGHT + PORTAL_GROUND_OFFSET;
    return portalItems.map((item, index) => {
      const step = Math.floor(index / 2) + 1;
      const direction = index % 2 === 0 ? -1 : 1;
      const x = clamp(
        centerX + direction * step * PORTAL_SPACING - PORTAL_WIDTH / 2,
        0,
        arena.width - PORTAL_WIDTH
      );
      return { item, x, y: baseY };
    });
  }, [portalItems, arena]);

  const playerCenterX = player.x + PLAYER_WIDTH / 2;
  const oracleX = arena.width / 2 - ORACLE_WIDTH / 2;
  const oracleY = arena.groundY - ORACLE_HEIGHT + ORACLE_GROUND_OFFSET;
  const oracleCenterX = oracleX + ORACLE_WIDTH / 2;
  const playerNearOracle = Math.abs(playerCenterX - oracleCenterX) <= ORACLE_INTERACT_DISTANCE;
  const oracleFacingLeft = playerCenterX < oracleCenterX;
  const oracleFrameIndex = oracleAnimRef.current.frame;

  const oracleStyle = {
    left: oracleX,
    top: oracleY,
    width: ORACLE_WIDTH,
    height: ORACLE_HEIGHT,
    backgroundImage: `url(${oracleSheet})`,
    backgroundSize: `${ORACLE_FRAME_WIDTH * ORACLE_SCALE * ORACLE_SHEET_COLUMNS}px ${ORACLE_FRAME_HEIGHT * ORACLE_SCALE * ORACLE_SHEET_ROWS}px`,
    backgroundPosition: `-${oracleFrameIndex * ORACLE_FRAME_WIDTH * ORACLE_SCALE}px 0px`,
  };

  const playerSprite = PLAYER_SPRITES[animationRef.current.name];
  const playerFrameIndex = animationRef.current.frame;
  const playerSheetWidth = PLAYER_FRAME_WIDTH * playerSprite.frames * PLAYER_SCALE;
  const playerStyle = {
    left: player.x,
    top: player.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundImage: `url(${playerSprite.src})`,
    backgroundPosition: `-${playerFrameIndex * PLAYER_WIDTH}px 0px`,
    backgroundSize: `${playerSheetWidth}px ${PLAYER_HEIGHT}px`,
  };
  const playerClassName = `pd-player${facingRef.current === "left" ? " pd-player--left" : ""}`;

  const handleOracleClick = () => {
    if (!playerNearOracle) return;
    setPortalDeleteMode(false);
    setOracleOpen(true);
  };

  const handlePortalClick = (item) => {
    if (portalDeleteMode) {
      setPendingDelete(item);
      return;
    }
    navigate(`/portal/${item.id}`);
  };

  return (
    <div className="pd-root">
      <div className="pd-room" ref={containerRef}>
        {portalPositions.map(({ item, x, y }) => (
          <button
            key={item.id}
            type="button"
            className={`pd-portal${portalDeleteMode ? " pd-portal--delete" : ""}`}
            style={{ left: x, top: y, "--portal-glow": item.color }}
            onClick={() => handlePortalClick(item)}
            aria-label={`Portal: ${item.title}`}
            title={item.title}
          />
        ))}
        <button
          type="button"
          className={`pd-oracle${oracleFacingLeft ? " pd-oracle--left" : ""}${playerNearOracle ? " pd-oracle--ready" : ""}`}
          style={oracleStyle}
          onClick={handleOracleClick}
          aria-label="Oracle"
        />
        <div className={playerClassName} style={playerStyle} />
        {oracleOpen && (
          <div className="pd-oracle-dialogue" role="dialog" aria-live="polite">
            <div className="pd-oracle-dialogue__portrait">
              <img className="pd-oracle-dialogue__portrait-img" src={oraclePortrait} alt="Oracle" />
            </div>
            <div className="pd-oracle-dialogue__options">
              <button
                type="button"
                className="pd-oracle-option"
                onClick={() => {
                  setOracleOpen(false);
                  setPortalDeleteMode(false);
                  setSemesterComposerOpen(true);
                }}
              >
                Appraise a syllabus
              </button>
              <button
                type="button"
                className="pd-oracle-option"
                onClick={() => {
                  setOracleOpen(false);
                  setPortalDeleteMode(false);
                  setComposerOpen(true);
                }}
              >
                Begin a personal project
              </button>
              <button
                type="button"
                className="pd-oracle-option"
                onClick={() => {
                  setOracleOpen(false);
                  setPortalDeleteMode(true);
                }}
              >
                Delete a portal
              </button>
            </div>
          </div>
        )}
        {portalDeleteMode && !pendingDelete && (
          <div className="pd-oracle-hint">Select a portal to delete.</div>
        )}
      </div>

      {pendingDelete && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal">
            <p className="eyebrow">Delete portal</p>
            <h2>Delete "{pendingDelete.title}"?</h2>
            <p>This portal will be removed from the oracle chamber.</p>
            <div className="pd-modal-actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={() => {
                  setPendingDelete(null);
                  setPortalDeleteMode(false);
                }}
              >
                Cancel
              </button>
              <button
                className="ace-btn"
                type="button"
                onClick={async () => {
                  await removePortal(pendingDelete);
                  setPendingDelete(null);
                  setPortalDeleteMode(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal">
            <p className="eyebrow">New task</p>
            <h2>What are we building?</h2>
            <p>
              Give Ace a short description of the skill, challenge, or project you want to start. We&apos;ll handle the
              rest.
            </p>
            <textarea
              placeholder="Example: Build a full-stack personal finance tracker with React and MongoDB..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <div className="pd-color-row">
              <p className="eyebrow">Card color</p>
              <div className="pd-color-swatches">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`pd-color-swatch${selectedColor === c ? " is-selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setSelectedColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div className="pd-modal-actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setIdea("");
                  setSelectedColor(CARD_COLORS[0]);
                }}
              >
                Cancel
              </button>
              <button className="ace-btn" type="button" onClick={handleDone} disabled={!idea.trim()}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {semesterComposerOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal" style={{ maxWidth: 720 }}>
            <label className="pd-field">
              <span>Semester name</span>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="Spring 2025"
              />
            </label>
            <div className="pd-color-row">
              <p className="eyebrow">Card color</p>
              <div className="pd-color-swatches">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`pd-color-swatch${semesterColor === c ? " is-selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setSemesterColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div
              className={`pd-upload-box${uploadFlash ? " pd-upload-box--error" : ""}`}
              role="button"
              tabIndex={0}
              onClick={triggerSemesterFileDialog}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerSemesterFileDialog();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleSemesterDrop}
            >
              <input
                ref={semesterFileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                onChange={(e) => handleSemesterFiles(e.target.files)}
              />
              <p>
                {semesterUploads.length > 0
                  ? semesterUploads.map((u) => u.name).join(", ")
                  : "Drop PDF syllabuses here (local only for now)"}
              </p>
            </div>
            {semesterError && <div className="pd-error">{semesterError}</div>}
            <div className="pd-modal-actions">
              <button className="ace-btn ghost" type="button" onClick={resetSemesterComposer}>
                Cancel
              </button>
              <button
                className="ace-btn"
                type="button"
                disabled={!semesterName.trim() || semesterUploads.length === 0 || semesterIsUploading}
                onClick={handleSemesterSubmit}
              >
                {semesterIsUploading ? "Uploading..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
