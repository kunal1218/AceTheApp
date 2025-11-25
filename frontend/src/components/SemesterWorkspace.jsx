import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ProductivityDashboard.css";
import { addDeadline, addSyllabusEntry, getItemById } from "../utils/semesters";
import { uploadSyllabusFile } from "../api"; // <-- import the helper

export default function SemesterWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(() => getItemById(id));
  const [newDeadline, setNewDeadline] = useState({ title: "", date: "" });
  const [uploadName, setUploadName] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const upcoming = useMemo(() => {
    if (!item || !item.deadlines) return [];
    return [...item.deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [item]);

  const handleAddDeadline = () => {
    if (!newDeadline.title || !newDeadline.date) return;
    const updated = addDeadline(id, {
      ...newDeadline,
      id: crypto.randomUUID?.() || Date.now().toString(),
    });
    setItem(updated);
    setNewDeadline({ title: "", date: "" });
  };

  const handleAddSyllabus = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      // Call backend to parse + save syllabus
      const { syllabusId, syllabus } = await uploadSyllabusFile(file);

      // Store a reference locally (you can shape this however you want)
      const displayName = uploadName.trim() || file.name;
      const updated = addSyllabusEntry(id, {
        id: crypto.randomUUID?.() || Date.now().toString(),
        name: displayName,
        syllabusId,     // id in your DB
        syllabusJson: syllabus, // optional: keep parsed data locally
      });

      setItem(updated);
      setUploadName("");
      setFile(null);
    } catch (err) {
      console.error("Failed to upload/parse syllabus", err);
      alert(err.message || "Failed to parse syllabus");
    } finally {
      setIsUploading(false);
    }
  };

  if (!item) {
    return (
      <div className="pd-root">
        <div className="pd-shell">
          <p className="eyebrow">Semester not found</p>
          <button className="ace-btn" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-root">
      <div className="pd-shell">
        <header className="pd-header">
          <div>
            <p className="eyebrow">Semester workspace</p>
            <h1>{item.title}</h1>
            <p>Manage upcoming deadlines and syllabuses. You can always add more.</p>
          </div>
          <button className="ace-btn ghost" onClick={() => navigate("/dashboard")}>
            Back
          </button>
        </header>

        <div className="pd-surface pd-workspace" style={{ borderColor: item.color }}>
          <div className="pd-workspace-column">
            <h3>Upcoming deadlines</h3>
            <div className="pd-field-row">
              <input
                type="text"
                placeholder="Exam 1"
                value={newDeadline.title}
                onChange={(e) =>
                  setNewDeadline((d) => ({ ...d, title: e.target.value }))
                }
              />
              <input
                type="date"
                value={newDeadline.date}
                onChange={(e) =>
                  setNewDeadline((d) => ({ ...d, date: e.target.value }))
                }
              />
              <button
                className="ace-btn"
                onClick={handleAddDeadline}
                disabled={!newDeadline.title || !newDeadline.date}
              >
                Add
              </button>
            </div>
            <div className="pd-deadline-list">
              {upcoming.length === 0 && <p className="pd-muted">No deadlines yet</p>}
              {upcoming.map((d) => (
                <div key={d.id} className="pd-deadline-card">
                  <div>
                    <strong>{d.title}</strong>
                    <p className="pd-muted">
                      {new Date(d.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-workspace-column">
            <h3>Syllabuses</h3>
            <div className="pd-field-row">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <input
                type="text"
                placeholder="Display name (optional)"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
              <button
                className="ace-btn"
                onClick={handleAddSyllabus}
                disabled={!file || isUploading}
              >
                {isUploading ? "Uploading..." : "Add syllabus"}
              </button>
            </div>
            <div className="pd-upload-list">
              {(!item.syllabus || item.syllabus.length === 0) && (
                <p className="pd-muted">No syllabuses yet</p>
              )}
              {item.syllabus?.map((s) => (
                <div key={s.id} className="pd-upload-item">
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}