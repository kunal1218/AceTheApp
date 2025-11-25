import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import "./ProductivityDashboard.css";
import { CARD_COLORS, addSemester, loadItems, saveItems, updateItem } from "../utils/semesters";
import settingsIcon from "../assets/settings.png";
import SettingsMenu from "./SettingsMenu";

const FIRST_PAGE_CAP = 14; // reserve one slot for the + tile on first page
const TASKS_PER_PAGE = 19;

export default function ProductivityDashboard() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [semesterComposerOpen, setSemesterComposerOpen] = useState(false);
  const [semesterName, setSemesterName] = useState("");
  const [semesterColor, setSemesterColor] = useState(CARD_COLORS[0]);
  const [semesterUploads, setSemesterUploads] = useState([]);
  const [semesterError, setSemesterError] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState(loadItems());
  const [justUnwrapped, setJustUnwrapped] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const dragPreviewRef = useRef(null);
  const semesterFileInputRef = useRef(null);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const handleDone = () => {
    if (!idea.trim()) return;
    const description = idea.trim();
    const mission = {
      id: Date.now().toString(),
      title: description,
      type: "task",
      color: selectedColor,
      revealed: false,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [mission, ...prev]);
    setComposerOpen(false);
    setChoiceOpen(false);
    setIdea("");
    setSelectedColor(CARD_COLORS[0]);
    setPage(0);
  };

  const handleSemesterFiles = (files) => {
    const list = Array.from(files).map((file) => ({
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: file.name,
    }));
    setSemesterUploads((prev) => [...prev, ...list]);
  };

  const handleSemesterDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      handleSemesterFiles(event.dataTransfer.files);
    }
  };

  const triggerSemesterFileDialog = () => {
    semesterFileInputRef.current?.click();
  };

  const resetSemesterComposer = () => {
    setSemesterComposerOpen(false);
    setSemesterName("");
    setSemesterColor(CARD_COLORS[0]);
    setSemesterUploads([]);
    setSemesterError("");
  };

  const handleSemesterSubmit = () => {
    if (!semesterName.trim()) {
      setSemesterError("Please name your semester");
      return;
    }
    if (semesterUploads.length === 0) {
      setSemesterError("Please upload at least one syllabus");
      return;
    }
    const semester = addSemester({
      title: semesterName.trim(),
      color: semesterColor,
      syllabus: semesterUploads,
      deadlines: [],
    });
    setItems(loadItems());
    resetSemesterComposer();
    setChoiceOpen(false);
    setPage(0);
    setJustUnwrapped(null);
    // Keep user on dashboard; no navigation needed.
  };

  const openMission = (mission) => {
    if (!mission.revealed) {
      updateItem(mission.id, { revealed: true });
      setItems(loadItems());
      setJustUnwrapped(mission.id);
      setTimeout(() => setJustUnwrapped(null), 400);
      return;
    }

    if (mission.type === "semester") {
      navigate(`/semester/${mission.id}`);
      return;
    }

    navigate("/ace-onboarding", { state: { idea: mission.title } });
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setDraggingId(null);
  };

  const confirmDelete = (id) => {
    const item = items.find(s => s.id === id);
    if (!item) return;
    if (window.confirm(`Delete "${item.title}"?`)) {
      handleDelete(id);
    }
  };

  const totalPages = useMemo(() => {
    if (items.length <= FIRST_PAGE_CAP) return 1;
    const remaining = items.length - FIRST_PAGE_CAP;
    return 1 + Math.ceil(remaining / TASKS_PER_PAGE);
  }, [items]);

  const pageItems = useMemo(() => {
    if (page === 0) {
      return items.slice(0, FIRST_PAGE_CAP);
    }
    const start = FIRST_PAGE_CAP + (page - 1) * TASKS_PER_PAGE;
    return items.slice(start, start + TASKS_PER_PAGE);
  }, [items, page]);

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
      <button
        className="pd-settings-btn"
        title="Settings"
        onClick={() => setSettingsOpen(true)}
        type="button"
      >
        <img src={settingsIcon} alt="Settings" width={24} height={24} />
      </button>
      <div className="pd-shell">
        <header className="pd-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Dashboard</h1>
            <p>Start Ace skill sprints, jump into counseling, and use the arrow keys to browse old projects when this fills up.</p>
          </div>
          <button
            className="ace-btn ghost"
            onClick={() => {
              const completed = typeof window !== "undefined" && localStorage.getItem("surveyCompleted") === "1";
              navigate(completed ? "/" : "/survey");
            }}
          >
            Go to Counseling
          </button>
        </header>

        <div className="pd-surface">
          <div className="pd-grid">
            {page === 0 && (
              <button className="pd-template pd-template--new" onClick={() => setChoiceOpen(true)}>
                +
              </button>
            )}
            {pageItems.map((item) => (
              <button
                key={item.id}
                className={`pd-template ${item.type === "semester" ? "pd-template--semester" : ""} ${justUnwrapped === item.id ? "pd-template--unwrapping" : ""}`}
                onClick={() => openMission(item)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item.id);
                  e.dataTransfer.dropEffect = "move";
                  if (dragPreviewRef.current) {
                    const preview = dragPreviewRef.current;
                    preview.innerHTML = `<strong>${item.title}</strong>`;
                    const rect = e.currentTarget.getBoundingClientRect();
                    preview.style.width = `${rect.width}px`;
                    preview.style.height = `${rect.height}px`;
                    const previewRect = preview.getBoundingClientRect();
                    e.dataTransfer.setDragImage(preview, previewRect.width / 2, previewRect.height / 2);
                  }
                  setDraggingId(item.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                style={{ opacity: draggingId === item.id ? 0 : 1, background: item.revealed ? item.color : "#fdfdfd" }}
              >
                {!item.revealed ? (
                  <div className="pd-gift-wrap">
                    <div className="pd-gift-icon">🎁</div>
                  </div>
                ) : (
                  <strong>{item.title}</strong>
                )}
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
          const match = items.find(s => s.title === title);
          if (match) {
            confirmDelete(match.id);
          }
        }}
        aria-label="Delete mission"
      >
        🗑️
      </button>

      {choiceOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal">
            <p className="eyebrow">Add something new</p>
            <h2>Choose what to create</h2>
            <div className="pd-choice-grid">
              <button className="pd-choice-card" onClick={() => { setChoiceOpen(false); setComposerOpen(true); }}>
                <strong>Add a task</strong>
                <span>Track a skill sprint or project</span>
              </button>
              <button
                className="pd-choice-card"
                onClick={() => {
                  setChoiceOpen(false);
                  setSemesterComposerOpen(true);
                }}
              >
                <strong>Add a school semester</strong>
                <span>Upload syllabuses and track deadlines</span>
              </button>
            </div>
            <div className="pd-modal-actions">
              <button className="ace-btn ghost" type="button" onClick={() => setChoiceOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal">
            <p className="eyebrow">New task</p>
            <h2>What are we building?</h2>
            <p>
              Give Ace a short description of the skill, challenge, or project you want to start. We&apos;ll handle the rest.
            </p>
            <textarea
              placeholder="Example: Build a full-stack personal finance tracker with React and MongoDB..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <div className="pd-color-row">
              <p className="eyebrow">Card color</p>
              <div className="pd-color-swatches">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`pd-color-swatch${selectedColor === c ? " is-selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setSelectedColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div className="pd-modal-actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setIdea("");
                  setSelectedColor(CARD_COLORS[0]);
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

      {semesterComposerOpen && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal" style={{ maxWidth: 720 }}>
            <label className="pd-field">
              <span>Semester name</span>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="Spring 2025"
              />
            </label>
            <div className="pd-color-row">
              <p className="eyebrow">Card color</p>
              <div className="pd-color-swatches">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`pd-color-swatch${semesterColor === c ? " is-selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setSemesterColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div
              className="pd-upload-box"
              role="button"
              tabIndex={0}
              onClick={triggerSemesterFileDialog}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerSemesterFileDialog();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleSemesterDrop}
            >
              <input
                ref={semesterFileInputRef}
                type="file"
                multiple
                onChange={(e) => handleSemesterFiles(e.target.files)}
              />
              <p>Drop PDF syllabuses here (local only for now)</p>
            </div>
            {semesterUploads.length > 0 && (
              <div className="pd-upload-list">
                {semesterUploads.map((u) => (
                  <div key={u.id} className="pd-upload-item">{u.name}</div>
                ))}
              </div>
            )}
            {semesterError && <div className="pd-error">{semesterError}</div>}
            <div className="pd-modal-actions">
              <button
                className="ace-btn ghost"
                type="button"
                onClick={resetSemesterComposer}
              >
                Cancel
              </button>
              <button
                className="ace-btn"
                type="button"
                disabled={!semesterName.trim() || semesterUploads.length === 0}
                onClick={handleSemesterSubmit}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <div ref={dragPreviewRef} className="pd-drag-preview" />
      {settingsOpen && (
        <SettingsMenu
          onClose={() => setSettingsOpen(false)}
          onOptions={() => {
            setSettingsOpen(false);
            navigate("/settings");
          }}
          onEditSurvey={() => {
            setSettingsOpen(false);
            navigate("/survey");
          }}
          onEditAssignments={() => {
            setSettingsOpen(false);
            navigate("/assignments");
          }}
          onLogout={() => {
            localStorage.removeItem("token");
            setSettingsOpen(false);
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}
