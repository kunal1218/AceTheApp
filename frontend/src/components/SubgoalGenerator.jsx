import React, { useState } from "react";
import { generateSubgoals } from "../api";
import "./SubgoalGenerator.css";

export default function SubgoalGenerator() {
  const [goal, setGoal] = useState("");
  const [subgoals, setSubgoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await generateSubgoals(goal);
      setSubgoals(result.subgoals || []);
    } catch (err) {
      setError("Error generating subgoals.");
    }
    setLoading(false);
  };

  return (
    <div className="subgoal-container">
      <h1 className="welcome-text">Welcome!</h1>

      <form className="goal-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Enter your goal..."
          className="goal-input"
          required
        />
        <button type="submit" className="generate-btn" disabled={loading || !goal}>
          {loading ? "Generating..." : "Generate Subgoals"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="subgoal-grid">
        {subgoals.map((sg, i) => (
          <div
            key={i}
            className={`subgoal-card effort-${sg.effort?.toLowerCase()}`}
          >
            <span className="points">{sg.points}</span>
            <p className="subgoal-text">{sg.subgoal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
