import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAssignmentAnswers, saveAssignmentAnswers } from "../api";
import "./VideoPage.css";

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [loading, setLoading] = useState(true);

  // Load from API on mount
  useEffect(() => {
    getAssignmentAnswers()
      .then(data => {
        // If data is an array, convert to object
        if (Array.isArray(data)) {
          setAnswers({
            q1: data[0] || "",
            q2: data[1] || "",
            q3: data[2] || "",
            q4: data[3] || ""
          });
        } else {
          setAnswers(data || { q1: "", q2: "", q3: "", q4: "" });
        }
      })
      .catch(() => setAnswers({ q1: "", q2: "", q3: "", q4: "" }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleNext = async () => {
    try {
      await saveAssignmentAnswers(answers);
      navigate("/video");
    } catch (e) {
      alert("Failed to save answers. Please try again.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="video-page-bg">
      <div className="video-page-content">
        <h2 className="video-page-title">Assignments & Questions</h2>
        <form style={{ textAlign: "left", fontSize: "1.1rem", marginBottom: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <label>
              1. What is the main topic of the video?
              <br />
              <input
                type="text"
                name="q1"
                value={answers.q1 || ""}
                onChange={handleChange}
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 6, border: "1px solid #bbb" }}
                placeholder="Type your answer here"
              />
            </label>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>
              2. What is the correct answer?
              <br />
              <select
                name="q2"
                value={answers.q2 || ""}
                onChange={handleChange}
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 6, border: "1px solid #bbb" }}
              >
                <option value="">Select an option</option>
                <option value="A">A. The video is about college admissions</option>
                <option value="B">B. The video is about cooking</option>
                <option value="C">C. The video is about traveling</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>
              3. List two things you learned from the video:
              <br />
              <textarea
                name="q3"
                value={answers.q3 || ""}
                onChange={handleChange}
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 6, border: "1px solid #bbb", minHeight: 60 }}
                placeholder="Type your answer here"
              />
            </label>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>
              4. How could you apply this information in real life?
              <br />
              <select
                name="q4"
                value={answers.q4 || ""}
                onChange={handleChange}
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 6, border: "1px solid #bbb" }}
              >
                <option value="">Select an option</option>
                <option value="A">A. Use it for my college applications</option>
                <option value="B">B. Share it with friends</option>
                <option value="C">C. Ignore it</option>
              </select>
            </label>
          </div>
        </form>
        <button
          className="next-btn"
          onClick={handleNext}
        >
          Next College &rarr;
        </button>
      </div>
    </div>
  );
}