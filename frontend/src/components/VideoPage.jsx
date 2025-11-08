import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VideoPage.css";
import {
  appendCourseStop,
  fetchCourseChain,
  getCollegeById,
  getLessonVideo,
  NEXT_STOP_STORAGE_KEY,
  START_COLLEGE_ID,
} from "../utils/coursePath";

export default function VideoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const courseIdFromState = location.state?.courseId;
  const [lesson, setLesson] = useState(() => {
    if (!courseIdFromState) return null;
    const college = getCollegeById(courseIdFromState);
    return college ? { college, video: getLessonVideo(courseIdFromState) } : null;
  });
  const [loading, setLoading] = useState(!lesson);

  useEffect(() => {
    if (lesson) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const chain = await fetchCourseChain();
      const lastId = chain?.[chain.length - 1] || START_COLLEGE_ID;
      const college = getCollegeById(lastId);
      if (!cancelled) {
        setLesson(college ? { college, video: getLessonVideo(lastId) } : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  const handleDone = async () => {
    if (lesson?.college?.id) {
      await appendCourseStop(lesson.college.id);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(NEXT_STOP_STORAGE_KEY);
      }
    }
    navigate("/assignments");
  };

  if (loading || !lesson) {
    return (
      <div className="video-page-bg">
        <div className="video-page-content">
          <p className="video-loading">Loading your course video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-page-bg">
      <div className="video-page-content">
        <div className="video-heading">
          <div>
            <p className="eyebrow">Lesson location</p>
            <h2 className="video-page-title">{lesson.college.name}</h2>
            <p className="video-page-subtitle">{lesson.college.location}</p>
          </div>
          <div className="video-badge">Ace Counseling</div>
        </div>
        <div className="video-and-next-row">
          <div className="video-wrapper">
            <iframe
              className="video-page-iframe"
              src={lesson.video.url}
              title={lesson.video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
        <p className="video-description">{lesson.video.description}</p>
        <div className="video-actions">
          <button className="outline-btn" onClick={() => navigate("/")}>
            Back to map
          </button>
          <button className="primary-btn" onClick={handleDone}>
            Done →
          </button>
        </div>
      </div>
    </div>
  );
}
