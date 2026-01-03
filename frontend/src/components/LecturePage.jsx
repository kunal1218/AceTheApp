import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./LecturePage.css";
import { generateLecture, getCourseSyllabus } from "../api";

const extractLecture = (response) => response?.data ?? response;

const findLessonTitle = (rows, topicId) => {
  if (!Array.isArray(rows)) return "";
  const match = rows.find((row) => row?.id === topicId);
  return match?.title || "";
};

export default function LecturePage() {
  const { courseId, topicId } = useParams();
  const location = useLocation();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessonTitle, setLessonTitle] = useState(location.state?.lessonTitle || "");
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
          setLecture(extractLecture(res));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load lecture.");
          setLecture(null);
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

  const transcript = useMemo(() => {
    if (!lecture?.chunks) return [];
    return lecture.chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      generalText: chunk.generalText,
      tieInText: chunk.tieInText,
    }));
  }, [lecture]);

  return (
    <div className="lecture-page">
      <div className="lecture-page__header">
        <div className="lecture-page__title">
          {lessonTitle || "Lecture Transcript"}
        </div>
      </div>
      <div className="lecture-page__panel">
        {loading && <div className="lecture-page__status">Loading lecture...</div>}
        {!loading && error && <div className="lecture-page__status lecture-page__status--error">{error}</div>}
        {!loading && !error && lecture && (
          <div className="lecture-page__scroll">
            <div className="lecture-page__section-title">Transcript</div>
            {transcript.map((chunk, index) => (
              <div key={chunk.id} className="lecture-chunk">
                <div className="lecture-chunk__index">Part {index + 1}</div>
                <p className="lecture-chunk__text">{chunk.generalText}</p>
                {chunk.tieInText && (
                  <p className="lecture-chunk__text lecture-chunk__text--tie">
                    Course tie-in: {chunk.tieInText}
                  </p>
                )}
              </div>
            ))}
            {lecture?.confusionMode?.summary && (
              <div className="lecture-chunk lecture-chunk--summary">
                <p className="lecture-chunk__label">If you get stuck:</p>
                <p className="lecture-chunk__text">{lecture.confusionMode.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
