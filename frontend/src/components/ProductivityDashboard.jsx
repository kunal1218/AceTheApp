import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import "./ProductivityDashboard.css";

const FIRST_PAGE_CAP = 14; // reserve one slot for the + tile on first page
const TASKS_PER_PAGE = 19;

export default function ProductivityDashboard() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [page, setPage] = useState(0);
  const [skills, setSkills] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("pdSkills");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  const dragPreviewRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("pdSkills", JSON.stringify(skills));
  }, [skills]);

  const handleDone = () => {
    if (!idea.trim()) return;
    const description = idea.trim();
    const mission = {
      id: Date.now(),
      title: description,
    };
    setSkills(prev => [mission, ...prev]);
    setComposerOpen(false);
    setIdea("");
    setPage(0);
  };

  const openMission = (mission) => {
    navigate("/ace-onboarding", { state: { idea: mission.title } });
  };

  const handleDelete = (id) => {
    setSkills(prev => prev.filter(skill => skill.id !== id));
    setDraggingId(null);
  };

  const confirmDelete = (id) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;
    if (window.confirm(`Delete "${skill.title}"?`)) {
      handleDelete(id);
    }
  };

  const totalPages = useMemo(() => {
    if (skills.length <= FIRST_PAGE_CAP) return 1;
    const remaining = skills.length - FIRST_PAGE_CAP;
    return 1 + Math.ceil(remaining / TASKS_PER_PAGE);
  }, [skills]);

  const pageSkills = useMemo(() => {
    if (page === 0) {
      return skills.slice(0, FIRST_PAGE_CAP);
    }
    const start = FIRST_PAGE_CAP + (page - 1) * TASKS_PER_PAGE;
    return skills.slice(start, start + TASKS_PER_PAGE);
  }, [skills, page]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "ArrowLeft") {
        setPage(0);
      } else if (event.key === "ArrowRight") {
        setPage(prev => Math.min(totalPages - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalPages]);

  useEffect(() => {
    setPage(prev => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  return (
    <div className="pd-root">
      <div className="pd-shell">
        <header className="pd-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Dashboard</h1>
            <p>
              Spin up a new skill sprint with Ace or jump into counseling when you need deeper support. Use the left and right arrow keys to browse older projects when you’ve filled the first canvas.
            </p>
          </div>
          <button className="ace-btn ghost" onClick={() => navigate("/survey")}>
            Go to Counseling
          </button>
        </header>

        <div className="pd-surface">
          <div className="pd-grid">
            {page === 0 && (
              <button className="pd-template pd-template--new" onClick={() => setComposerOpen(true)}>
                +
              </button>
            )}
            {pageSkills.map((mission) => (
                <button
                  key={mission.id}
                  className="pd-template"
                  onClick={() => openMission(mission)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", mission.id);
                    e.dataTransfer.dropEffect = "move";
                    if (dragPreviewRef.current) {
                      const preview = dragPreviewRef.current;
                      preview.innerHTML = `<strong>${mission.title}</strong>`;
                      const rect = e.currentTarget.getBoundingClientRect();
                      preview.style.width = `${rect.width}px`;
                      preview.style.height = `${rect.height}px`;
                      const previewRect = preview.getBoundingClientRect();
                      e.dataTransfer.setDragImage(preview, previewRect.width / 2, previewRect.height / 2);
                    }
                    setDraggingId(mission.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  style={{ opacity: draggingId === mission.id ? 0 : 1 }}
                >
                  <strong>{mission.title}</strong>
                </button>
              ))}
          </div>
        </div>
      </div>

      <button
        className={`pd-trash ${draggingId ? "pd-trash-active" : ""}`}
        onDragOver={(e) => {
          if (draggingId) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingId) {
            confirmDelete(draggingId);
          }
        }}
        onClick={() => {
          if (draggingId) return;
          const title = window.prompt("Enter the name of the skill to delete:");
          if (!title) return;
          const match = skills.find(s => s.title === title);
          if (match) {
            confirmDelete(match.id);
          }
        }}
        aria-label="Delete mission"
      >
        🗑️
      </button>

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
      <div ref={dragPreviewRef} className="pd-drag-preview" />
    </div>
  );
}
