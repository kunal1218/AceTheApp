import React, { useState } from "react";
import { generateSubgoals } from "../api";

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
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 24, background: "#f9f9f9", borderRadius: 12 }}>
      <h2>Project Subgoal Generator</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="Enter your project goal..."
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
          required
        />
        <button type="submit" disabled={loading || !goal}>
          {loading ? "Generating..." : "Generate Subgoals"}
        </button>
      </form>
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      {subgoals.length > 0 && (
        <ul style={{ marginTop: 24 }}>
          {subgoals.map((sg, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              <strong>{sg.subgoal}</strong> — Effort: {sg.effort}, Points: {sg.points}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
