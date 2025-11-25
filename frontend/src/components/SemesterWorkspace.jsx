import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ProductivityDashboard.css";
import { addCalendarEvents, addDeadline, addSyllabusEntry, getItemById, updateItem } from "../utils/semesters";
import { uploadSyllabusFile, getCourseSyllabus, getWorkspaceSyllabus } from "../api"; // <--- make sure this path is correct

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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // month is 0-indexed
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  React.useEffect(() => {
    let cancelled = false;
    const hydrateFromDb = async () => {
      if (!item) return;
      try {
        let rows = [];
        if (item.courseId) {
          const res = await getCourseSyllabus(item.courseId);
          rows = res?.data?.syllabus || res?.syllabus || res?.items || res || [];
        }
        if ((!rows || rows.length === 0) && item.title) {
          const resByWorkspace = await getWorkspaceSyllabus(item.title);
          const items = resByWorkspace?.items || resByWorkspace?.data || resByWorkspace || [];
          rows = Array.isArray(items) ? items : [];
        }
        if (!Array.isArray(rows) || rows.length === 0) return;
        const events = rows
          .map((row) => {
            let dateValue = row.date;
            if (!dateValue && row.rawText) {
              try {
                const parsed = JSON.parse(row.rawText);
                if (parsed?.date) dateValue = parsed.date;
              } catch (e) {
                // ignore parse errors, fall through
              }
            }
            if (!dateValue) return null;
            const iso = typeof dateValue === "string" ? dateValue.slice(0, 10) : new Date(dateValue).toISOString().slice(0, 10);
            return {
              id: row.id,
              date: iso,
              title: row.title || "Lesson",
              source: "syllabus",
              syllabusId: row.id,
              syllabusName: row.title,
              color: item.color,
            };
          })
          .filter(Boolean);
        const updated = addCalendarEvents(id, events);
        if (!cancelled && updated) {
          setItem(hydrateItem(updated));
        }
      } catch (err) {
        console.warn("[SemesterWorkspace] Failed to fetch syllabus from Postgres", err);
      }
    };
    hydrateFromDb();
    return () => {
      cancelled = true;
    };
  }, [id, item?.courseId, item?.title, item?.color]);

  const buildCalendarDays = () => {
    const year = calendarMonth.year;
    const month = calendarMonth.month;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startOffset = start.getDay(); // 0-6
    const monthEvents = calendarEvents.filter((ev) => {
      if (!ev.date) return false;
      const d = new Date(ev.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ key: `empty-${i}`, label: "", date: null });
    }
    for (let d = 1; d <= end.getDate(); d++) {
      const iso = new Date(year, month, d).toISOString().slice(0, 10);
      const matching = monthEvents.filter((ev) => ev.date === iso);
      cells.push({ key: `day-${d}`, label: d, date: iso, events: matching });
    }
    const monthLabel = start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const prev = () => {
      const prevMonth = new Date(year, month - 1, 1);
      setCalendarMonth({ year: prevMonth.getFullYear(), month: prevMonth.getMonth() });
    };
    const next = () => {
      const nextMonth = new Date(year, month + 1, 1);
      setCalendarMonth({ year: nextMonth.getFullYear(), month: nextMonth.getMonth() });
    };
    return { title: monthLabel, cells, prev, next };
  };

  React.useEffect(() => {
    if (!calendarEvents.length) return;
    const sorted = [...calendarEvents].filter((e) => e.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!sorted.length) return;
    const first = new Date(sorted[0].date);
    if (Number.isNaN(first.getTime())) return;
    setCalendarMonth({ year: first.getFullYear(), month: first.getMonth() });
  }, [calendarEvents]);

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
        workspaceName: item.title,
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
            color: item.color,
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
                      <div className="pd-calendar-nav">
                        <button type="button" onClick={cal.prev}>Prev</button>
                        <button type="button" onClick={cal.next}>Next</button>
                      </div>
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
                          <div className="pd-calendar-day-events">
                            {cell.events?.map((ev) => (
                              <button
                                key={ev.id}
                                className="pd-calendar-event-chip"
                                style={{ background: ev.color || item.color || "#6366f1" }}
                                title={ev.title}
                                onClick={() => setSelectedEvent(ev)}
                              >
                                <span>{ev.title}</span>
                              </button>
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
                <button
                  key={ev.id}
                  className="pd-calendar-event"
                  type="button"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div>
                    <strong>{ev.title}</strong>
                    <p className="pd-muted">{ev.date ? new Date(ev.date).toLocaleDateString() : "Date TBA"}</p>
                  </div>
                  <span className={`pd-chip pd-chip--${ev.source === "deadline" ? "deadline" : "syllabus"}`}>
                    {ev.source === "deadline" ? "Deadline" : "Lesson"}
                  </span>
                </button>
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
      {selectedEvent && (
        <div className="pd-modal-backdrop">
          <div className="pd-modal" role="dialog" aria-modal="true" aria-label="Event details">
            <p className="eyebrow">{selectedEvent.source === "deadline" ? "Deadline" : "Lesson"}</p>
            <h2>{selectedEvent.title}</h2>
            <p className="pd-muted">{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : "Date TBA"}</p>
            {selectedEvent.description && <p>{selectedEvent.description}</p>}
            <div className="pd-modal-actions">
              <button className="ace-btn" type="button" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
