import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ProductivityDashboard.css";
import { addCalendarEvents, addDeadline, addSyllabusEntry, getItemById, updateItem } from "../utils/semesters";
import { uploadSyllabusFile } from "../api"; // <--- make sure this path is correct

export default function SemesterWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hydrateItem = (raw) =>
    raw
      ? {
          ...raw,
          calendarEvents: Array.isArray(raw.calendarEvents) ? raw.calendarEvents : [],
        }
      : null;
  const [item, setItem] = useState(() => hydrateItem(getItemById(id)));
  const [activeTab, setActiveTab] = useState("calendar");
  const [newDeadline, setNewDeadline] = useState({ title: "", date: "" });
  const [uploadName, setUploadName] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const upcoming = useMemo(() => {
    if (!item || !item.deadlines) return [];
    return [...item.deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [item]);

  const calendarEvents = useMemo(() => {
    if (!item) return [];
    const lessonEvents = Array.isArray(item.calendarEvents) ? item.calendarEvents : [];
    const deadlineEvents =
      Array.isArray(item.deadlines) && item.deadlines.length > 0
        ? item.deadlines
            .filter((d) => d.date)
            .map((d) => ({
              id: `deadline-${d.id}`,
              date: d.date,
              title: d.title,
              source: "deadline",
            }))
        : [];
    return [...lessonEvents, ...deadlineEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [item]);

  const buildCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startOffset = start.getDay(); // 0-6
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ key: `empty-${i}`, label: "", date: null });
    }
    for (let d = 1; d <= end.getDate(); d++) {
      const iso = new Date(year, month, d).toISOString().slice(0, 10);
      const matching = calendarEvents.filter((ev) => ev.date === iso);
      cells.push({ key: `day-${d}`, label: d, date: iso, events: matching });
    }
    return {
      title: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells,
    };
  };

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
    if (!file) {
      console.warn("[SemesterWorkspace] handleAddSyllabus called with no file");
      return;
    }
    setIsUploading(true);
    console.log("[SemesterWorkspace] handleAddSyllabus fired, file =", file);
    console.log("[SemesterWorkspace] uploading syllabus file", file.name);

    try {
      const { syllabusId, syllabus, courseId: returnedCourseId } = await uploadSyllabusFile(file, {
        courseId: item.courseId,
        courseName: item.title,
      });
      let nextCourseId = item.courseId || returnedCourseId || null;

      console.log("[SemesterWorkspace] parsed syllabus", { syllabusId, syllabus });

      const displayName = uploadName.trim() || file.name;

      const updated = addSyllabusEntry(id, {
        id: crypto.randomUUID?.() || Date.now().toString(),
        name: displayName,
        syllabusId,
      });

      let nextItem = updated;
      if (nextCourseId && !updated.courseId) {
        nextItem = updateItem(id, { courseId: nextCourseId });
      }
      const lessons = Array.isArray(syllabus?.schedule_entries) ? syllabus.schedule_entries : [];
      const datedLessons = lessons.filter((entry) => entry?.date);
      if (datedLessons.length) {
        nextItem =
          addCalendarEvents(id, datedLessons.map((entry) => ({
            id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
            date: entry.date,
            title: entry.title || "Lesson",
            source: "syllabus",
            syllabusId,
            syllabusName: displayName,
          }))) || updated;
      }

      setItem(hydrateItem(nextItem));
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
          <div className="pd-tabs">
            <button
              className={`pd-tab ${activeTab === "calendar" ? "is-active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar
            </button>
            <button
              className={`pd-tab ${activeTab === "deadlines" ? "is-active" : ""}`}
              onClick={() => setActiveTab("deadlines")}
            >
              Deadlines
            </button>
            <button
              className={`pd-tab ${activeTab === "syllabi" ? "is-active" : ""}`}
              onClick={() => setActiveTab("syllabi")}
            >
              Syllabi
            </button>
          </div>

          {activeTab === "calendar" && (
            <div className="pd-tab-panel">
              <h3>Calendar</h3>
              <p className="pd-muted">Lessons from syllabus uploads are posted here automatically. Deadlines also appear here.</p>
              {(() => {
                const cal = buildCalendarDays();
                return (
                  <div className="pd-calendar-shell">
                    <div className="pd-calendar-header">
                      <span>{cal.title}</span>
                      <div className="pd-calendar-weekdays">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pd-calendar-grid">
                      {cal.cells.map((cell) => (
                        <div key={cell.key} className="pd-calendar-day">
                          <div className="pd-calendar-day-number">{cell.label}</div>
                          <div className="pd-calendar-day-dots">
                            {cell.events?.map((ev) => (
                              <span
                                key={ev.id}
                                className={`pd-dot pd-dot--${ev.source === "deadline" ? "deadline" : "syllabus"}`}
                                title={ev.title}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="pd-calendar-list">
                {calendarEvents.length === 0 && <p className="pd-muted">No calendar events yet</p>}
                {calendarEvents.map((ev) => (
                  <div key={ev.id} className="pd-calendar-event">
                    <div>
                      <strong>{ev.title}</strong>
                      <p className="pd-muted">{ev.date ? new Date(ev.date).toLocaleDateString() : "Date TBA"}</p>
                    </div>
                    <span className={`pd-chip pd-chip--${ev.source === "deadline" ? "deadline" : "syllabus"}`}>
                      {ev.source === "deadline" ? "Deadline" : "Lesson"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "deadlines" && (
            <div className="pd-tab-panel">
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
                {upcoming.length === 0 && (
                  <p className="pd-muted">No deadlines yet</p>
                )}
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
          )}

          {activeTab === "syllabi" && (
            <div className="pd-tab-panel">
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
          )}
        </div>
      </div>
    </div>
  );
}
