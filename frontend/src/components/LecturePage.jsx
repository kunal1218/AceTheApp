import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./LecturePage.css";
import { askLectureQuestion, generateLecture, getCourseSyllabus } from "../api";
import WhiteboardRenderer from "./WhiteboardRenderer";
import {
  applyWhiteboardPlan,
  loadWhiteboardCache,
  parseWhiteboardResponse,
  saveWhiteboardCache,
} from "../utils/whiteboardManager";
import aceIdle0 from "../assets/characters/Ace/Idle/HeroKnight_Idle_0.png";
import aceIdle1 from "../assets/characters/Ace/Idle/HeroKnight_Idle_1.png";
import aceIdle2 from "../assets/characters/Ace/Idle/HeroKnight_Idle_2.png";
import aceIdle3 from "../assets/characters/Ace/Idle/HeroKnight_Idle_3.png";
import aceIdle4 from "../assets/characters/Ace/Idle/HeroKnight_Idle_4.png";
import aceIdle5 from "../assets/characters/Ace/Idle/HeroKnight_Idle_5.png";
import aceIdle6 from "../assets/characters/Ace/Idle/HeroKnight_Idle_6.png";
import aceIdle7 from "../assets/characters/Ace/Idle/HeroKnight_Idle_7.png";
import aceHead from "../assets/characters/Ace/KnightHead.png";

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
    if (char === "." || char === "!" || char === "?") {
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
  const [whiteboardPlan, setWhiteboardPlan] = useState([]);
  const [whiteboardCache, setWhiteboardCache] = useState(() => loadWhiteboardCache());
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [answerLines, setAnswerLines] = useState([]);
  const [answerIndex, setAnswerIndex] = useState(0);
  const resumeIndexRef = useRef(0);
  const intervalRef = useRef({ intervalIndex: 0, askedInInterval: false });
  const promptSeedRef = useRef(0);
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
    if (!lecture) {
      setWhiteboardPlan([]);
      return;
    }
    const rawWhiteboard =
      lecture.whiteboard ||
      lecture.whiteboardPlan ||
      meta?.whiteboard ||
      meta?.whiteboardPlan ||
      meta?.whiteboardResponse ||
      null;
    const entries = parseWhiteboardResponse(rawWhiteboard);
    if (!entries) {
      setWhiteboardPlan([]);
      return;
    }
    setWhiteboardCache((prev) => {
      const { plan, cache } = applyWhiteboardPlan(entries, prev);
      setWhiteboardPlan(plan);
      saveWhiteboardCache(cache);
      return cache;
    });
  }, [lecture, meta]);

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

  const lectureLines = useMemo(() => {
    if (!lecture?.chunks) return [];
    const lines = [];
    lecture.chunks.forEach((chunk, chunkIndex) => {
      const chunkText = chunk.narration || chunk.generalText || "";
      const chunkLines = splitDialogueLines(chunkText);
      chunkLines.forEach((line, lineIndexInChunk) => {
        lines.push({
          text: line,
          chunkIndex,
          isLastLine: lineIndexInChunk === chunkLines.length - 1,
        });
      });
    });
    return lines;
  }, [lecture]);

  const currentTranscriptLine = useMemo(() => {
    if (!lectureLines.length) return 0;
    return lineIndex + 1;
  }, [lineIndex, lectureLines.length]);

  const whiteboardActive = useMemo(() => {
    if (!whiteboardPlan.length || !currentTranscriptLine) return false;
    const lines = whiteboardPlan
      .map((entry) => Number(entry?.line))
      .filter((line) => Number.isFinite(line));
    if (!lines.length) return false;
    const firstLine = Math.min(...lines);
    return currentTranscriptLine >= firstLine;
  }, [whiteboardPlan, currentTranscriptLine]);

  useEffect(() => {
    setLineIndex(0);
    intervalRef.current = { intervalIndex: 0, askedInInterval: false };
  }, [lectureLines.length]);

  useEffect(() => {
    if (!lectureLines.length) return;
    const currentChunk = lectureLines[lineIndex]?.chunkIndex ?? 0;
    const intervalIndex = Math.floor(currentChunk / 3);
    if (intervalIndex !== intervalRef.current.intervalIndex) {
      intervalRef.current.intervalIndex = intervalIndex;
      intervalRef.current.askedInInterval = false;
    }
  }, [lineIndex, lectureLines]);

  const openQuestionInput = (prompt) => {
    resumeIndexRef.current = lineIndex;
    intervalRef.current.askedInInterval = true;
    setInputPrompt(prompt);
    setInputValue("");
    promptSeedRef.current += 1;
    setIsInputOpen(true);
  };

  const buildResumeLine = () =>
    `Anyway, back to ${lessonTitle || "the lesson"}.`;

  const handleQuestionSubmit = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !courseId || !topicId) return;
    setIsInputOpen(false);
    setIsLoadingAnswer(true);
    const resumeLine = buildResumeLine();
    try {
      const res = await askLectureQuestion({ courseId, topicId, question: trimmed });
      const answerText = res?.data?.answer || res?.answer || "";
      const lines = splitDialogueLines(answerText);
      const merged = lines.length ? [...lines, resumeLine] : ["Hmm... I need a moment to think.", resumeLine];
      setAnswerLines(merged);
      setAnswerIndex(0);
    } catch (err) {
      setAnswerLines(["Hmm... I couldn't get an answer just now.", resumeLine]);
      setAnswerIndex(0);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const advanceAnswer = () => {
    if (!answerLines.length) return;
    if (answerIndex < answerLines.length - 1) {
      setAnswerIndex((prev) => prev + 1);
      return;
    }
    setAnswerLines([]);
    setAnswerIndex(0);
    const resumeIndex = resumeIndexRef.current;
    const nextIndex = Math.min(resumeIndex + 1, Math.max(lectureLines.length - 1, 0));
    setLineIndex(nextIndex);
  };

  const goBack = () => {
    if (answerLines.length) {
      setAnswerIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    setLineIndex((prev) => Math.max(0, prev - 1));
  };

  const goForward = () => {
    if (answerLines.length) {
      advanceAnswer();
      return;
    }
    const current = lectureLines[lineIndex];
    if (
      current?.isLastLine &&
      (current.chunkIndex + 1) % 3 === 0 &&
      !intervalRef.current.askedInInterval
    ) {
      openQuestionInput(
        "Please, try to restate everything I've said till now as simply as you can."
      );
      return;
    }
    const next = Math.min(lineIndex + 1, Math.max(lectureLines.length - 1, 0));
    if (next !== lineIndex) {
      setLineIndex(next);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return;
      if (isInputOpen) return;
      const key = event.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        event.preventDefault();
        goBack();
        return;
      }
      if (key === "d" || key === "arrowright") {
        event.preventDefault();
        goForward();
        return;
      }
      if (key === "x") {
        if (isLoadingAnswer) return;
        setShowTranscript((prev) => !prev);
        return;
      }
      if (isLoadingAnswer) return;
      if (key === " " || event.code === "Space") {
        event.preventDefault();
        goForward();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    answerLines.length,
    answerIndex,
    isInputOpen,
    isLoadingAnswer,
    lectureLines,
    lineIndex
  ]);

  const currentLine = useMemo(() => {
    if (isLoadingAnswer) return "Hmm...";
    if (answerLines.length) return answerLines[answerIndex] || "";
    if (loading) return "Loading transcript...";
    if (error) return error;
    if (!lectureLines.length) return "Transcript unavailable.";
    return lectureLines[lineIndex]?.text || "";
  }, [isLoadingAnswer, answerLines, answerIndex, loading, error, lectureLines, lineIndex]);

  return (
    <div className="lecture-page">
      <button
        type="button"
        className="lecture-hand"
        onClick={() => openQuestionInput("Yes, what is your question?")}
      >
        Raise Hand
      </button>
      <div className="lecture-stage">
        <WhiteboardRenderer
          currentLine={currentTranscriptLine}
          whiteboardPlan={whiteboardPlan}
          figureCache={whiteboardCache}
        />
        <img
          src={ACE_IDLE_FRAMES[aceFrame]}
          alt="Ace"
          className={`lecture-ace${whiteboardActive ? " lecture-ace--side" : ""}`}
        />
      </div>
      {!isInputOpen && (
        <div className="lecture-dialogue">
          <div className="lecture-dialogue__portrait">
            <img className="lecture-dialogue__portrait-img" src={aceHead} alt="Ace" />
          </div>
          <div className="lecture-dialogue__text">{currentLine}</div>
        </div>
      )}
      {isInputOpen && (
        <form
          className="lecture-question"
          onSubmit={(event) => {
            event.preventDefault();
            handleQuestionSubmit();
          }}
        >
          <div className="lecture-question__prompt">{inputPrompt}</div>
          <input
            key={`question-input-${promptSeedRef.current}`}
            className="lecture-question__input"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Type your question..."
          />
          <div className="lecture-question__actions">
            <button
              type="button"
              className="lecture-question__cancel"
              onClick={() => {
                setIsInputOpen(false);
                setInputValue("");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="lecture-question__submit">
              Ask
            </button>
          </div>
        </form>
      )}
      {showTranscript && (
        <div className="lecture-transcript">
          <div className="lecture-transcript__title">Full Transcript</div>
          <pre className="lecture-transcript__text">{fullTranscriptText}</pre>
        </div>
      )}
    </div>
  );
}
