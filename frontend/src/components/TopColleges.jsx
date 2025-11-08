import React, { useEffect, useState } from "react";
import "./TopColleges.css";
import { useNavigate } from "react-router-dom";
import { allColleges } from "./CollegeList";
import { useCollegeList } from "./CollegeProvider";
import defaultCollegePic from '../assets/collegepictures/default.jpg'; // fallback image


const collegeImageModules = import.meta.glob('../assets/collegepictures/*.jpeg', { eager: true });
const collegeImages = {};
Object.entries(collegeImageModules).forEach(([path, mod]) => {
  const id = path.match(/\/([^/]+)\.jpeg$/)[1];
  collegeImages[id] = mod.default;
});

const getCollegeImage = (college) => {
  if (college.image) return college.image;
  if (collegeImages[college.id]) return collegeImages[college.id];
  return defaultCollegePic;
};

function getTuition(college) {
  return college.tuition ?? college.out_state_tuition ?? null;
}
function getInStateTuition(college) {
  return college.in_state_tuition ?? college.tuition ?? null;
}
function getAcceptanceRate(college) {
  return college.acceptance_rate ?? null;
}
function getEnrollment(college) {
  return college.undergrad_enrollment ?? null;
}

export default function TopColleges() {
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    ranking: [1, 100],
    tuition: [0, 90000],
    inStateTuition: [0, 90000],
    enrollment: [0, 100000],
    acceptanceRate: [0, 100],
    type: "all",
    search: "",
    region: "all"
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [filterRanges, setFilterRanges] = useState({
    ranking: [1, 100],
    tuition: [0, 90000],
    inStateTuition: [0, 90000],
    enrollment: [0, 100000],
    acceptanceRate: [0, 100],
  });
  const [pendingFilterInputs, setPendingFilterInputs] = useState({
    ranking: [String(filters.ranking[0]), String(filters.ranking[1])],
    tuition: [String(filters.tuition[0]), String(filters.tuition[1])],
    inStateTuition: [String(filters.inStateTuition[0]), String(filters.inStateTuition[1])],
    enrollment: [String(filters.enrollment[0]), String(filters.enrollment[1])],
    acceptanceRate: [String(filters.acceptanceRate[0]), String(filters.acceptanceRate[1])],
  });

  const navigate = useNavigate();
  const { myColleges, refreshColleges, addCollege } = useCollegeList();
  const alreadyAdded = myColleges.map((c) => c.id);

  useEffect(() => {
    let rankings = allColleges.map(c => c.ranking).filter(Boolean);
    let tuitions = allColleges.map(getTuition).filter(Boolean);
    let inStateTuitions = allColleges.map(getInStateTuition).filter(Boolean);
    let enrollments = allColleges.map(getEnrollment).filter(Boolean);
    let acceptanceRates = allColleges.map(getAcceptanceRate).filter(Boolean).map(r => r * 100);

    setFilterRanges({
      ranking: [Math.min(...rankings), Math.max(...rankings)],
      tuition: [Math.min(...tuitions), Math.max(...tuitions)],
      inStateTuition: [Math.min(...inStateTuitions), Math.max(...inStateTuitions)],
      enrollment: [Math.min(...enrollments), Math.max(...enrollments)],
      acceptanceRate: [Math.min(...acceptanceRates), Math.max(...acceptanceRates)],
    });

    setPendingFilters(f => {
      let changed = false;
      const newFilters = { ...f };
      if (f.ranking[0] === 1 && f.ranking[1] === 100) {
        newFilters.ranking = [Math.min(...rankings), Math.max(...rankings)];
        changed = true;
      }
      if (f.tuition[0] === 0 && f.tuition[1] === 90000) {
        newFilters.tuition = [Math.min(...tuitions), Math.max(...tuitions)];
        changed = true;
      }
      if (f.inStateTuition[0] === 0 && f.inStateTuition[1] === 90000) {
        newFilters.inStateTuition = [Math.min(...inStateTuitions), Math.max(...inStateTuitions)];
        changed = true;
      }
      if (f.enrollment[0] === 0 && f.enrollment[1] === 100000) {
        newFilters.enrollment = [Math.min(...enrollments), Math.max(...enrollments)];
        changed = true;
      }
      if (f.acceptanceRate[0] === 0 && f.acceptanceRate[1] === 100) {
        newFilters.acceptanceRate = [Math.min(...acceptanceRates), Math.max(...acceptanceRates)];
        changed = true;
      }
      return changed ? newFilters : f;
    });
    // eslint-disable-next-line
  }, []);

  const applyFilters = () => {
    let result = allColleges.filter(college => {
      // Ranking
      if (college.ranking < pendingFilters.ranking[0] || college.ranking > pendingFilters.ranking[1]) return false;
      // Tuition (private)
      const tuition = getTuition(college);
      if (tuition !== null && (tuition < pendingFilters.tuition[0] || tuition > pendingFilters.tuition[1])) return false;
      // In-state Tuition (public)
      const inStateTuition = getInStateTuition(college);
      if (inStateTuition !== null && (inStateTuition < pendingFilters.inStateTuition[0] || inStateTuition > pendingFilters.inStateTuition[1])) return false;
      // Enrollment
      const enrollment = getEnrollment(college);
      if (enrollment !== null && (enrollment < pendingFilters.enrollment[0] || enrollment > pendingFilters.enrollment[1])) return false;
      // Acceptance Rate
      const acceptanceRate = getAcceptanceRate(college);
      const acceptanceRatePercent = acceptanceRate !== null ? acceptanceRate * 100 : null;
      if (
        acceptanceRatePercent !== null &&
        (acceptanceRatePercent < pendingFilters.acceptanceRate[0] ||
          acceptanceRatePercent > pendingFilters.acceptanceRate[1])
      )
        return false;
      // Type
      if (pendingFilters.type === "private" && !college.tuition) return false;
      if (pendingFilters.type === "public" && !college.in_state_tuition) return false;

      if (
        pendingFilters.region !== "all" &&
        !/alaska|hawaii/i.test(college.name)
      ) {
        const x = college.x;
        const y = college.y;
        let region = "West";
        if (x > 810 && y < 231) region = "Northeast";
        else if (x > 590 && y > 231) region = "Southeast";
        else if (x > 455 && x <= 810 && y < 231) region = "Midwest";
        else if (x > 289 && x <= 590 && y > 231) region = "Southwest";
        // else region stays "West"
        if (region !== pendingFilters.region) return false;
      }
      // Search
      if (
        pendingFilters.search &&
        !college.name.toLowerCase().includes(pendingFilters.search.toLowerCase())
      ) return false;
      return true;
    });
    // Remove already added
    result = result.filter(college => !alreadyAdded.includes(college.id));
    setFilteredColleges(result);
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line
  }, [myColleges]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line
  }, [pendingFilters, myColleges]);

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleAddToList = async () => {
    for (const id of selected) {
      try {
        await addCollege(id); // This now updates context and backend
      } catch (e) {
        console.error(`Failed to add college ${id}:`, e);
      }
    }
    await refreshColleges();
    setSelected([]);
  };

  // Sync pendingFilterInputs with pendingFilters when filters change
  useEffect(() => {
    setPendingFilterInputs({
      ranking: [String(pendingFilters.ranking[0]), String(pendingFilters.ranking[1])],
      tuition: [String(pendingFilters.tuition[0]), String(pendingFilters.tuition[1])],
      inStateTuition: [String(pendingFilters.inStateTuition[0]), String(pendingFilters.inStateTuition[1])],
      enrollment: [String(pendingFilters.enrollment[0]), String(pendingFilters.enrollment[1])],
      acceptanceRate: [String(pendingFilters.acceptanceRate[0]), String(pendingFilters.acceptanceRate[1])],
    });
  }, [pendingFilters]);

  // Handler for raw input change (lets user type anything)
  const handleRangeInputRawChange = (key, idx, value) => {
    setPendingFilterInputs(inputs => {
      const newInputs = { ...inputs };
      newInputs[key] = [...newInputs[key]];
      newInputs[key][idx] = value;
      return newInputs;
    });
  };

  // Handler for blur: clamp and commit
  const handleRangeInputBlur = (key, idx) => {
    setPendingFilterInputs(inputs => {
      const raw = inputs[key][idx];
      let num = Number(raw);
      if (isNaN(num)) num = pendingFilters[key][idx];
      const min = filterRanges[key][0];
      const max = filterRanges[key][1];
      if (idx === 0) {
        // Lower bound cannot exceed upper bound
        num = Math.max(min, Math.min(num, pendingFilters[key][1]));
      } else {
        // Upper bound cannot be less than lower bound
        num = Math.min(max, Math.max(num, pendingFilters[key][0]));
      }
      // Clamp to allowed range
      if (num < min) num = min;
      if (num > max) num = max;
      // Update filters
      setPendingFilters(f => {
        const newRange = [...f[key]];
        newRange[idx] = num;
        // Ensure order
        if (newRange[0] > newRange[1]) {
          if (idx === 0) newRange[1] = newRange[0];
          else newRange[0] = newRange[1];
        }
        return { ...f, [key]: newRange };
      });
      // Update input to clamped value
      const newInputs = { ...inputs };
      newInputs[key] = [...newInputs[key]];
      newInputs[key][idx] = String(num);
      return newInputs;
    });
  };

  const handleTypeChange = (e) => {
    setPendingFilters(f => ({ ...f, type: e.target.value }));
  };

  const handleSearchChange = (e) => {
    setPendingFilters(f => ({ ...f, search: e.target.value }));
  };

  const handleRegionChange = (e) => {
    setPendingFilters(f => ({ ...f, region: e.target.value }));
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      ranking: [filterRanges.ranking[0], filterRanges.ranking[1]],
      tuition: [filterRanges.tuition[0], filterRanges.tuition[1]],
      inStateTuition: [filterRanges.inStateTuition[0], filterRanges.inStateTuition[1]],
      enrollment: [filterRanges.enrollment[0], filterRanges.enrollment[1]],
      acceptanceRate: [filterRanges.acceptanceRate[0], filterRanges.acceptanceRate[1]],
      type: "all",
      search: "",
      region: "all"
    };
    setPendingFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  // Helper to render a static blue bar for a filter
  function StaticBar({ min, max, valueMin, valueMax, width = 200 }) {
    const left = ((valueMin - min) / (max - min)) * width;
    const barWidth = ((valueMax - valueMin) / (max - min)) * width;
    return (
      <div style={{ position: "relative", width, height: 8, background: "#eee", borderRadius: 4, margin: "8px 0" }}>
        <div
          style={{
            position: "absolute",
            left,
            width: barWidth,
            height: 8,
            background: "#1976d2",
            borderRadius: 4,
            transition: "left 0.2s, width 0.2s"
          }}
        />
      </div>
    );
  }

  return (
    <div className="top-colleges-flex">
      <aside className="filters-sidebar-fixed">
        <div className="sticky-filters">
          <h1 className="top-colleges-title">Top Colleges</h1>
          <div className="search-bar-wrap">
            <form
              onSubmit={e => {
                e.preventDefault();
                applyFilters();
              }}
              style={{ width: "100%" }}
            >
              <input
                className="college-search-bar"
                type="text"
                placeholder="College Name"
                value={pendingFilters.search}
                onChange={handleSearchChange}
                style={{ width: "100%" }}
              />
            </form>
          </div>

          {/* Ranking */}
          <div className="filter-group">
            <label>Ranking:</label>
            <StaticBar
              min={filterRanges.ranking[0]}
              max={filterRanges.ranking[1]}
              valueMin={pendingFilters.ranking[0]}
              valueMax={pendingFilters.ranking[1]}
              width={140}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={filterRanges.ranking[0]}
                max={filterRanges.ranking[1]}
                value={pendingFilterInputs.ranking[0]}
                onChange={e => handleRangeInputRawChange("ranking", 0, e.target.value)}
                onBlur={() => handleRangeInputBlur("ranking", 0)}
                className="slider-num"
                style={{ width: 70 }}
              />
              <span>to</span>
              <input
                type="number"
                min={filterRanges.ranking[0]}
                max={filterRanges.ranking[1]}
                value={pendingFilterInputs.ranking[1]}
                onChange={e => handleRangeInputRawChange("ranking", 1, e.target.value)}
                onBlur={() => handleRangeInputBlur("ranking", 1)}
                className="slider-num"
                style={{ width: 70 }}
              />
            </div>
          </div>

          {/* Tuition */}
          <div className="filter-group">
            <label>*Out-State Tuition:</label>
            <StaticBar
              min={filterRanges.tuition[0]}
              max={filterRanges.tuition[1]}
              valueMin={pendingFilters.tuition[0]}
              valueMax={pendingFilters.tuition[1]}
              width={180}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={filterRanges.tuition[0]}
                max={filterRanges.tuition[1]}
                value={pendingFilterInputs.tuition[0]}
                onChange={e => handleRangeInputRawChange("tuition", 0, e.target.value)}
                onBlur={() => handleRangeInputBlur("tuition", 0)}
                className="slider-num"
                style={{ width: 90 }}
              />
              <span>to</span>
              <input
                type="number"
                min={filterRanges.tuition[0]}
                max={filterRanges.tuition[1]}
                value={pendingFilterInputs.tuition[1]}
                onChange={e => handleRangeInputRawChange("tuition", 1, e.target.value)}
                onBlur={() => handleRangeInputBlur("tuition", 1)}
                className="slider-num"
                style={{ width: 90 }}
              />
            </div>
          </div>

          {/* In-State Tuition */}
          <div className="filter-group">
            <label>*In-State Tuition:</label>
            <StaticBar
              min={filterRanges.inStateTuition[0]}
              max={filterRanges.inStateTuition[1]}
              valueMin={pendingFilters.inStateTuition[0]}
              valueMax={pendingFilters.inStateTuition[1]}
              width={180}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={filterRanges.inStateTuition[0]}
                max={filterRanges.inStateTuition[1]}
                value={pendingFilterInputs.inStateTuition[0]}
                onChange={e => handleRangeInputRawChange("inStateTuition", 0, e.target.value)}
                onBlur={() => handleRangeInputBlur("inStateTuition", 0)}
                className="slider-num"
                style={{ width: 90 }}
              />
              <span>to</span>
              <input
                type="number"
                min={filterRanges.inStateTuition[0]}
                max={filterRanges.inStateTuition[1]}
                value={pendingFilterInputs.inStateTuition[1]}
                onChange={e => handleRangeInputRawChange("inStateTuition", 1, e.target.value)}
                onBlur={() => handleRangeInputBlur("inStateTuition", 1)}
                className="slider-num"
                style={{ width: 90 }}
              />
            </div>
          </div>

          {/* Undergrad Enrollment */}
          <div className="filter-group">
            <label>Undergrad Enrollment:</label>
            <StaticBar
              min={filterRanges.enrollment[0]}
              max={filterRanges.enrollment[1]}
              valueMin={pendingFilters.enrollment[0]}
              valueMax={pendingFilters.enrollment[1]}
              width={180}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={filterRanges.enrollment[0]}
                max={filterRanges.enrollment[1]}
                value={pendingFilterInputs.enrollment[0]}
                onChange={e => handleRangeInputRawChange("enrollment", 0, e.target.value)}
                onBlur={() => handleRangeInputBlur("enrollment", 0)}
                className="slider-num"
                style={{ width: 90 }}
              />
              <span>to</span>
              <input
                type="number"
                min={filterRanges.enrollment[0]}
                max={filterRanges.enrollment[1]}
                value={pendingFilterInputs.enrollment[1]}
                onChange={e => handleRangeInputRawChange("enrollment", 1, e.target.value)}
                onBlur={() => handleRangeInputBlur("enrollment", 1)}
                className="slider-num"
                style={{ width: 90 }}
              />
            </div>
          </div>

          {/* Acceptance Rate */}
          <div className="filter-group">
            <label>Acceptance Rate (%):</label>
            <StaticBar
              min={filterRanges.acceptanceRate[0]}
              max={filterRanges.acceptanceRate[1]}
              valueMin={pendingFilters.acceptanceRate[0]}
              valueMax={pendingFilters.acceptanceRate[1]}
              width={140}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={filterRanges.acceptanceRate[0]}
                max={filterRanges.acceptanceRate[1]}
                value={pendingFilterInputs.acceptanceRate[0]}
                onChange={e => handleRangeInputRawChange("acceptanceRate", 0, e.target.value)}
                onBlur={() => handleRangeInputBlur("acceptanceRate", 0)}
                className="slider-num"
                style={{ width: 70 }}
              />
              <span>to</span>
              <input
                type="number"
                min={filterRanges.acceptanceRate[0]}
                max={filterRanges.acceptanceRate[1]}
                value={pendingFilterInputs.acceptanceRate[1]}
                onChange={e => handleRangeInputRawChange("acceptanceRate", 1, e.target.value)}
                onBlur={() => handleRangeInputBlur("acceptanceRate", 1)}
                className="slider-num"
                style={{ width: 70 }}
              />
            </div>
          </div>

          {/* Type */}
          <div className="filter-group">
            <label>Type:</label>
            <select value={pendingFilters.type} onChange={handleTypeChange}>
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Region */}
          <div className="filter-group">
            <label>Region:</label>
            <select value={pendingFilters.region} onChange={handleRegionChange}>
              <option value="all">All</option>
              <option value="Northeast">Northeast</option>
              <option value="Southeast">Southeast</option>
              <option value="Midwest">Midwest</option>
              <option value="Southwest">Southwest</option>
              <option value="West">West</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button
              className="reset-filters-btn"
              onClick={handleResetFilters}
              disabled={JSON.stringify(pendingFilters) === JSON.stringify(filters)}
              style={{
                background: JSON.stringify(pendingFilters) === JSON.stringify(filters) ? "#eee" : "#1976d2",
                color: JSON.stringify(pendingFilters) === JSON.stringify(filters) ? "#333" : "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 20px",
                fontWeight: 600,
                cursor: JSON.stringify(pendingFilters) === JSON.stringify(filters) ? "not-allowed" : "pointer",
                transition: "background 0.2s"
              }}
            >
              Reset Filters
            </button>
          </div>
          <div style={{ marginTop: 18, fontSize: 13, color: "#666", textAlign: "center" }}>
            *Private institutions have equal In-State and Out-State tuitions
          </div>
        </div>
      </aside>
      <div className="colleges-list colleges-list-with-padding">
        {filteredColleges
          .sort((a, b) => a.ranking - b.ranking)
          .map((college) => (
            <div
              className={`college-card selectable-card ${
                selected.includes(college.id) ? "selected" : ""
              }`}
              key={college.id}
              onClick={() => handleSelect(college.id)}
            >
              <input
                type="checkbox"
                checked={selected.includes(college.id)}
                onChange={() => handleSelect(college.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div
                className="college-rank college-rank-image"
                style={{
                  backgroundImage: `url(${getCollegeImage(college)})`,
                }}
              >
                <span className="college-rank-number">{college.ranking}.</span>
              </div>
              <div className="college-info">
                <div className="college-name">{college.name}</div>
                <div className="college-location">{college.location}</div>
                <div className="college-description">{college.description}</div>
                <div className="college-metrics">
                  {college.in_state_tuition && college.out_state_tuition ? (
                    <>
                      <span>
                        <b>In-State Tuition:</b> ${college.in_state_tuition.toLocaleString()}
                      </span>
                      <span>
                        <b>Out-of-State Tuition:</b> ${college.out_state_tuition.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span>
                      <b>Tuition:</b> ${getTuition(college)?.toLocaleString() || "N/A"}
                    </span>
                  )}
                  <span>
                    <b>Enrollment:</b> {getEnrollment(college)?.toLocaleString() || "N/A"}
                  </span>
                  <span>
                    <b>Acceptance Rate:</b>{" "}
                    {getAcceptanceRate(college) !== null
                      ? `${(getAcceptanceRate(college) * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
      <button
        className="add-to-list-btn"
        onClick={handleAddToList}
        disabled={selected.length === 0}
      >
        Add to List
      </button>
    </div>
  );
}