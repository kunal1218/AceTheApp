import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./LecturePage.css";
import { generateLecture, getCourseSyllabus } from "../api";
import aceIdle0 from "../assets/characters/Ace/Idle/HeroKnight_Idle_0.png";
import aceIdle1 from "../assets/characters/Ace/Idle/HeroKnight_Idle_1.png";
import aceIdle2 from "../assets/characters/Ace/Idle/HeroKnight_Idle_2.png";
import aceIdle3 from "../assets/characters/Ace/Idle/HeroKnight_Idle_3.png";
import aceIdle4 from "../assets/characters/Ace/Idle/HeroKnight_Idle_4.png";
import aceIdle5 from "../assets/characters/Ace/Idle/HeroKnight_Idle_5.png";
import aceIdle6 from "../assets/characters/Ace/Idle/HeroKnight_Idle_6.png";
import aceIdle7 from "../assets/characters/Ace/Idle/HeroKnight_Idle_7.png";

const extractResponse = (response) => ({
  data: response?.data ?? response,
  meta: response?.meta ?? null,
});

const findLessonTitle = (rows, topicId) => {
  if (!Array.isArray(rows)) return "";
  const match = rows.find((row) => row?.id === topicId);
  return match?.title || "";
};

const ACE_IDLE_FRAMES = [
  aceIdle0,
  aceIdle1,
  aceIdle2,
  aceIdle3,
  aceIdle4,
  aceIdle5,
  aceIdle6,
  aceIdle7,
];
const ACE_IDLE_FPS = 8;

const splitDialogueLines = (text) => {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const lines = [];
  let buffer = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1] || "";
    buffer += char;
    if (char === "." || char === "!" || char === "*" || char === "?") {
      const nextIsBreak = next === "" || next === " ";
      if (nextIsBreak) {
        const trimmed = buffer.trim();
        if (trimmed) lines.push(trimmed);
        buffer = "";
        while (normalized[i + 1] === " ") {
          i += 1;
        }
      }
    }
  }
  const tail = buffer.trim();
  if (tail) lines.push(tail);
  return lines;
};

export default function LecturePage() {
  const { courseId, topicId } = useParams();
  const location = useLocation();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessonTitle, setLessonTitle] = useState(location.state?.lessonTitle || "");
  const [meta, setMeta] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [aceFrame, setAceFrame] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const loadLecture = async () => {
      if (!courseId || !topicId) {
        setError("Missing course or lecture.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await generateLecture({ courseId, topicId, level: "intro" });
        if (!cancelled) {
          const extracted = extractResponse(res);
          setLecture(extracted.data);
          setMeta(extracted.meta);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load lecture.");
          setLecture(null);
          setMeta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadLecture();
    return () => {
      cancelled = true;
    };
  }, [courseId, topicId]);

  useEffect(() => {
    let rafId;
    const frameDuration = 1000 / ACE_IDLE_FPS;
    let lastFrame = performance.now();
    const step = (now) => {
      if (now - lastFrame >= frameDuration) {
        lastFrame = now;
        setAceFrame((prev) => (prev + 1) % ACE_IDLE_FRAMES.length);
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrateTitle = async () => {
      if (lessonTitle || !courseId || !topicId) return;
      try {
        const res = await getCourseSyllabus(courseId);
        const rows = res?.data?.syllabus || res?.syllabus || res?.items || res || [];
        const title = findLessonTitle(rows, topicId);
        if (!cancelled && title) setLessonTitle(title);
      } catch (err) {
        console.warn("[LecturePage] Failed to load lesson title", err);
      }
    };
    hydrateTitle();
    return () => {
      cancelled = true;
    };
  }, [courseId, topicId, lessonTitle]);

  const fullTranscriptText = useMemo(() => {
    if (!lecture?.chunks) return "";
    return lecture.chunks
      .map((chunk) => chunk.narration || chunk.generalText || "")
      .filter(Boolean)
      .join(" ");
  }, [lecture]);

  const dialogueLines = useMemo(
    () => splitDialogueLines(fullTranscriptText),
    [fullTranscriptText]
  );

  useEffect(() => {
    setLineIndex(0);
  }, [fullTranscriptText]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "x") {
        setShowTranscript((prev) => !prev);
        return;
      }
      if (key === " " || event.code === "Space") {
        event.preventDefault();
        setLineIndex((prev) => {
          const next = prev + 1;
          if (next >= dialogueLines.length) return prev;
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogueLines.length]);

  const currentLine = useMemo(() => {
    if (loading) return "Loading transcript...";
    if (error) return error;
    if (!dialogueLines.length) return "Transcript unavailable.";
    return dialogueLines[lineIndex] || "";
  }, [loading, error, dialogueLines, lineIndex]);

  return (
    <div className="lecture-page">
      <div className="lecture-stage">
        <img
          src={ACE_IDLE_FRAMES[aceFrame]}
          alt="Ace"
          className="lecture-ace"
        />
      </div>
      <div className="lecture-dialogue">
        <div className="lecture-dialogue__title">
          {lessonTitle || "Lecture"}
        </div>
        <p className="lecture-dialogue__text">{currentLine}</p>
      </div>
      {showTranscript && (
        <div className="lecture-transcript">
          <div className="lecture-transcript__title">Full Transcript</div>
          <pre className="lecture-transcript__text">{fullTranscriptText}</pre>
        </div>
      )}
    </div>
  );
}
