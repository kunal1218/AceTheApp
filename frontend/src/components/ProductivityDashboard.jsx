import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import "./ProductivityDashboard.css";

export default function ProductivityDashboard() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const navigate = useNavigate();

  const handleDone = () => {
    if (!idea.trim()) return;
    const description = idea.trim();
    setComposerOpen(false);
    setIdea("");
    navigate("/ace-onboarding", { state: { idea: description } });
  };

  return (
    <div className="pd-root">
      <div className="pd-shell">
        <header className="pd-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Dashboard</h1>
            <p>
              Spin up a new skill sprint with Ace or jump into counseling when you need deeper support.
            </p>
          </div>
          <button className="ace-btn ghost" onClick={() => navigate("/survey")}>
            Go to Counseling
          </button>
        </header>

        <div className="pd-board">
          <button className="pd-card" onClick={() => setComposerOpen(true)}>
            <span className="pd-plus">+</span>
            <div>
              <h3>Learn something new</h3>
              <p>
                Describe the project or skill you want to pursue. Ace will break it into missions and daily tasks.
              </p>
            </div>
          </button>
        </div>
      </div>

      {composerOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal">
            <p className="eyebrow">New mission</p>
            <h2>What are we building?</h2>
            <p>
              Give Ace a short description of the skill, challenge, or project you want to start. We&apos;ll handle the rest.
            </p>
            <textarea
              placeholder="Example: Build a full-stack personal finance tracker with React and MongoDB..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <div className="pd-modal-actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setIdea("");
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
    </div>
  );
}
