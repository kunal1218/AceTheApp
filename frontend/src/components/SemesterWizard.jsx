import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProductivityDashboard.css";
import "./SemesterWizard.css";
import { CARD_COLORS, addSemester } from "../utils/semesters";

export default function SemesterWizard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const list = Array.from(files).map((file) => ({ id: crypto.randomUUID?.() || Date.now().toString(), name: file.name }));
    setUploads((prev) => [...prev, ...list]);
  };

  const triggerFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Please name your semester");
      return;
    }
    if (uploads.length === 0) {
      setError("Please upload at least one syllabus");
      return;
    }
    const semester = addSemester({
      title: name.trim(),
      color,
      syllabus: uploads,
      deadlines: [],
    });
    navigate("/dashboard", { replace: true, state: { newSemester: semester.id } });
  };

  return (
    <div className="pd-root">
      <div className="pd-shell">
        <header className="pd-header">
          <div>
            <p className="eyebrow">New semester</p>
            <h1>Upload your syllabuses</h1>
            <p>Give your semester a name, pick a card color, and drop in the files. You can add more later.</p>
          </div>
          <button className="ace-btn ghost" onClick={() => navigate(-1)}>Back</button>
        </header>

        <div className="pd-surface pd-surface--centered" aria-hidden="true" />
      </div>

      <div className="pd-modal-backdrop pd-modal-backdrop--wizard">
        <div className="pd-modal" style={{ maxWidth: 720 }}>
          <label className="pd-field">
            <span>Semester name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring 2025"
            />
          </label>
          <div className="pd-color-row">
            <p className="eyebrow">Card color</p>
            <div className="pd-color-swatches">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  className={`pd-color-swatch${color === c ? " is-selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div
            className="pd-upload-box"
            role="button"
            tabIndex={0}
            onClick={triggerFileDialog}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerFileDialog();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p>Drop PDF syllabuses here (local only for now)</p>
          </div>
          {uploads.length > 0 && (
            <div className="pd-upload-list">
              {uploads.map((u) => (
                <div key={u.id} className="pd-upload-item">{u.name}</div>
              ))}
            </div>
          )}
          {error && <div className="pd-error">{error}</div>}
          <div className="pd-modal-actions">
            <button className="ace-btn ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button className="ace-btn" disabled={!name.trim() || uploads.length === 0} onClick={handleSubmit}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
