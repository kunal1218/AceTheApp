import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SurveyPage.css";
import { getSurveyAnswers, saveSurveyAnswers, getToken } from "../api";

const QUESTIONS = [
  "How likely are you to thrive in a highly competitive academic environment?",
  "How likely are you to enjoy small, discussion-based classes?",
  "How likely are you to be self-directed in your learning?",
  "How likely are you to want a strong sense of campus community?",
  "How likely are you to prefer a politically active student body?",
  "How likely are you to want to attend college in a major city?",
  "How likely are you to live on campus for all four years?",
  "How likely are you to participate actively in extracurricular clubs or student organizations?",
  "How likely are you to prioritize job placement or salary after graduation?",
  "How likely are you to feel most comfortable at a college with a diverse range of identities and perspectives?"
];

const OPTIONS = [
  "Very Unlikely",
  "Unlikely",
  "Neutral",
  "Likely",
  "Very Likely"
];

const LOCAL_STORAGE_KEY = "guestSurveyAnswers";

export default function SurveyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [recap, setRecap] = useState(false);

  // Load answers from backend if logged in, else from localStorage
  useEffect(() => {
    if (getToken()) {
      getSurveyAnswers()
        .then((data) => {
          if (Array.isArray(data) && data.length === QUESTIONS.length) {
            setAnswers(data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length === QUESTIONS.length) {
            setAnswers(parsed);
          }
        } catch {}
      }
      setLoading(false);
    }
  }, []);

  // If ?recap=1 is in the URL OR answers are complete, show recap immediately
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const complete = Array.isArray(answers) && answers.length === QUESTIONS.length && answers.every(a => a !== null);
    if (complete && (params.get("recap") === "1" || params.has("recap"))) {
      setRecap(true);
    } else if (complete && params.get("recap") !== "0") {
      // Auto-show recap when complete unless explicitly suppressed
      setRecap(true);
    }
  }, [location.search, answers]);

  // Save answers to backend if logged in, else to localStorage
  const handleNext = async () => {
    if (selected === null) return;
    const updated = [...answers];
    updated[current] = selected;
    setAnswers(updated);

    if (!getToken()) {
      // Save to localStorage for guests
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setSelected(null);
      if (current < QUESTIONS.length - 1) {
        setCurrent(current + 1);
      } else {
        setRecap(true);
      }
      return;
    }

    try {
      await saveSurveyAnswers(updated);
    } catch (err) {
      alert("Failed to save survey answers. Please try again.");
    }
    setSelected(null);
    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else {
      setRecap(true);
    }
  };

  // When user confirms, prompt to create account if not logged in
  const handleConfirm = () => {
    // If logged in and answers are complete, go to counseling hub (US map)
    if (getToken()) {
      navigate("/", { replace: true });
    } else {
      navigate("/create-account");
    }
  };

  const answeredCount = answers.filter(a => a !== null).length;
  const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);

  useEffect(() => {
    const existing = answers[current];
    setSelected(existing !== null ? existing : null);
  }, [current, answers]);

  if (loading) {
    return (
      <section className="survey-shell">
        <div className="survey-panel">
          <div className="survey-card">Loading...</div>
        </div>
      </section>
    );
  }

  if (recap) {
    return (
      <section className="survey-shell">
        <div className="survey-panel">
          <div className="survey-info">
            <p className="eyebrow">Ace counseling intake</p>
            <h1>Review & refine your preferences</h1>
            <p>
              Tap any answer below to adjust it. Once you confirm, Ace locks these signals into your
              counseling workspace so the roadmap stays personalized.
            </p>
            <div className="survey-stats">
              <div>
                <span>{answeredCount}</span>
                <p>Answers saved</p>
              </div>
              <div>
                <span>{QUESTIONS.length}</span>
                <p>Total questions</p>
              </div>
            </div>
          </div>
          <div className="survey-card recap">
            <div className="survey-card-header">
              <h2>Recap</h2>
              <p>Adjust directly in-line—Ace saves changes instantly.</p>
            </div>
            <div className="survey-recap-list">
              {QUESTIONS.map((q, idx) => (
                <div className="survey-recap-item" key={q}>
                  <div>
                    <p className="survey-question-small">{q}</p>
                    <span className="survey-answer-chip">
                      {answers[idx] !== null ? OPTIONS[answers[idx]] : "No answer"}
                    </span>
                  </div>
                  <select
                    value={answers[idx] !== null ? answers[idx] : ""}
                    onChange={async (e) => {
                      const updated = [...answers];
                      updated[idx] = Number(e.target.value);
                      setAnswers(updated);
                      if (!getToken()) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
                        return;
                      }
                      await saveSurveyAnswers(updated);
                    }}
                    className="survey-dropdown"
                  >
                    <option value="" disabled>
                      Change answer...
                    </option>
                    {OPTIONS.map((option, optionIdx) => (
                      <option key={option} value={optionIdx}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button className="primary-btn" onClick={handleConfirm}>
              Confirm & continue →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="survey-shell">
      <div className="survey-panel">
        <div className="survey-info">
          <p className="eyebrow">Ace counseling intake</p>
          <h1>Let’s align Ace with how you like to learn</h1>
          <p>
            Answer a quick set of prompts so Ace can tailor your counseling path, recommend the right
            support, and surface colleges that match your workflow.
          </p>
          <div className="survey-progress">
            <div className="survey-progress-top">
              <span>
                Question {current + 1} / {QUESTIONS.length}
              </span>
              <span>{progressPercent}% complete</span>
            </div>
            <div className="survey-progress-track">
              <div
                className="survey-progress-thumb"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="survey-card">
          <p className="survey-step-label">Prompt {current + 1}</p>
          <h2 className="survey-question-main">{QUESTIONS[current]}</h2>
          <div className="survey-options-grid">
            {OPTIONS.map((option, idx) => (
              <button
                key={option}
                onClick={() => setSelected(idx)}
                className={`survey-option${selected === idx ? " is-selected" : ""}`}
              >
                <span>{option}</span>
              </button>
            ))}
          </div>
          <div className="survey-actions">
            <button className="outline-btn" onClick={() => navigate("/")}>
              Exit
            </button>
            <button className="primary-btn" disabled={selected === null} onClick={handleNext}>
              {current === QUESTIONS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
