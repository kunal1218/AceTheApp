import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProductivityDashboard.css";
import "./SemesterWizard.css";
import { CARD_COLORS, addSemester } from "../utils/semesters";
import { uploadSyllabusFile } from "../api";

export default function SemesterWizard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [uploadFlash, setUploadFlash] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const triggerUploadFlash = () => {
    setUploadFlash(true);
    setTimeout(() => setUploadFlash(false), 600);
  };

  const handleFiles = (files) => {
    const pdfs = Array.from(files).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfs.length === 0) {
      triggerUploadFlash();
      setError("Please upload PDF files only.");
      return;
    }
    const list = pdfs.map((file) => ({
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: file.name,
      file,
    }));
    setUploads((prev) => [...prev, ...list]);
    setError("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[SemesterWizard] handleSubmit fired");
    if (!name.trim()) {
      setError("Please name your semester");
      return;
    }
    if (uploads.length === 0) {
      setError("Please upload at least one syllabus");
      return;
    }
    try {
      setIsUploading(true);
      console.log("[SemesterWizard] uploading", uploads.length, "syllabus files");
      const parsedUploads = [];
      const calendarEvents = [];
      let courseId = null;
      for (const u of uploads) {
        const { syllabusId, syllabus, courseId: returnedCourseId } = await uploadSyllabusFile(u.file, {
          courseId,
          courseName: name.trim(),
        });
        if (!courseId && returnedCourseId) {
          courseId = returnedCourseId;
        }
        parsedUploads.push({
          id: u.id,
          name: u.name,
          syllabusId,
          syllabusJson: syllabus,
        });
        const lessons = Array.isArray(syllabus?.schedule_entries) ? syllabus.schedule_entries : [];
        const datedLessons = lessons.filter((entry) => entry?.date);
        calendarEvents.push(
          ...datedLessons.map((entry) => ({
            id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
            date: entry.date,
            title: entry.title || "Lesson",
            source: "syllabus",
            syllabusId,
            syllabusName: u.name,
          }))
        );
      }
      const semester = addSemester({
        title: name.trim(),
        color,
        syllabus: parsedUploads,
        deadlines: [],
        calendarEvents,
        courseId,
      });
      navigate("/dashboard", { replace: true, state: { newSemester: semester.id } });
    } catch (err) {
      console.error("Failed to upload/parse syllabus", err);
      setError(err.message || "Something went wrong");
    } finally {
      setIsUploading(false);
    }
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
            className={`pd-upload-box${uploadFlash ? " pd-upload-box--error" : ""}`}
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
              accept="application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <p>
              {uploads.length > 0
                ? uploads.map((u) => u.name).join(", ")
                : "Drop PDF syllabuses here (local only for now)"}
            </p>
          </div>
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
