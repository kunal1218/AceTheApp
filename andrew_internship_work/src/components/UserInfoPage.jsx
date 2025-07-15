import React, { useEffect, useState } from "react";
import "./UserInfoPage.css";
import { getUser, setToken } from "../api";
import backgroundGif from "../assets/background.gif";
import colleges from "../colleges";

// User.js fields: name, email, password, myColleges, collegeDocs, assignmentAnswers, usaMapClickedChain, collegeProgress

const OPTIONS = ["Very Unlikely", "Unlikely", "Neutral", "Likely", "Very Likely"];

export default function UserInfoPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      // Optionally, trigger a reload or state update here
      window.location.reload(); // Ensures user info loads with new token
    }
  }, []);

  useEffect(() => {
    getUser().then(setUser).catch(e => setError("Failed to load user info."));
  }, []);

  // Helper: map college IDs to names
  const collegeIdToName = (id) => {
    const college = colleges.find(c => c.id === id);
    return college ? college.name : id;
  };

  if (error) return <div className="user-info-outer water-bg"><div className="user-info-box error">{error}</div></div>;
  if (!user) return <div className="user-info-outer water-bg"><div className="user-info-box">Loading...</div></div>;

  return (
    <div className="user-info-outer water-bg">
      <div className="user-info-box">
        <h2>User Info</h2>
        <ul className="user-info-list">
          <li className="user-info-item"><span className="user-info-key">Name:</span> <span className="user-info-value">{user.name}</span></li>
          <li className="user-info-item"><span className="user-info-key">Email:</span> <span className="user-info-value">{user.email}</span></li>
          <li className="user-info-item"><span className="user-info-key">Password:</span> <span className="user-info-value">(hidden)</span></li>
          <li className="user-info-item"><span className="user-info-key">My Colleges:</span> <span className="user-info-value">{Array.isArray(user.myColleges) ? user.myColleges.map(collegeIdToName).join(", ") : ""}</span></li>
          <li className="user-info-item"><span className="user-info-key">College Docs:</span> <span className="user-info-value">{
  user.collegeDocs && Object.keys(user.collegeDocs).length > 0
    ? Object.entries(user.collegeDocs).map(([collegeId, url], idx) => (
        <div key={collegeId}>
          <span style={{ fontWeight: 500 }}>{collegeIdToName(collegeId)}:</span> <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{idx !== Object.entries(user.collegeDocs).length - 1 && <br />}
        </div>
      ))
    : ""
}</span></li>
          <li className="user-info-item"><span className="user-info-key">Assignment Answers:</span> <span className="user-info-value">{user.assignmentAnswers ? JSON.stringify(user.assignmentAnswers) : ""}</span></li>
          <li className="user-info-item"><span className="user-info-key">USA Map Clicked Chain:</span> <span className="user-info-value">{user.usaMapClickedChain ? JSON.stringify(user.usaMapClickedChain) : ""}</span></li>
          <li className="user-info-item"><span className="user-info-key">College Progress:</span> <span className="user-info-value">{
  // Show all colleges in myColleges, even if no progress exists
  Array.isArray(user.myColleges) && user.myColleges.length > 0
    ? user.myColleges.map((collegeId, idx) => {
        const progress = (user.collegeProgress && user.collegeProgress[collegeId]) || {};
        const weights = {
          questions: 0.3,
          writing: 0.4,
          recommenders: 0.2,
          review: 0.1
        };
        const sum =
          (progress.questions ? 1 : 0) * weights.questions +
          (progress.writing ? 1 : 0) * weights.writing +
          (progress.recommenders ? 1 : 0) * weights.recommenders +
          (progress.review ? 1 : 0) * weights.review;
        return (
          <div key={collegeId}>
            <span style={{ fontWeight: 500 }}>{collegeIdToName(collegeId)}:</span> {(sum * 100).toFixed(0)}%
            {idx !== user.myColleges.length - 1 && <br />}
          </div>
        );
      })
    : ""
}</span></li>
          <li className="user-info-item"><span className="user-info-key">Survey Answers:</span> <span className="user-info-value">{
  (() => {
    console.log("[DEBUG] user.surveyAnswers:", user.surveyAnswers);
    if (!Array.isArray(user.surveyAnswers)) {
      return <span style={{color:'#c00'}}>(surveyAnswers not an array: {String(user.surveyAnswers)})</span>;
    }
    if (user.surveyAnswers.length !== 10) {
      return <span style={{color:'#c00'}}>(surveyAnswers length: {user.surveyAnswers.length})</span>;
    }
    return user.surveyAnswers.map((ans, idx) =>
      <span key={idx} style={{marginRight: 8}}>
        Q{idx + 1}: {typeof ans === "number" && ans >= 0 && ans < OPTIONS.length ? OPTIONS[ans] : (ans === null || ans === "" || typeof ans === "undefined" ? <span style={{color:'#888'}}>(no answer)</span> : String(ans))}
        {idx !== user.surveyAnswers.length - 1 && ", "}
      </span>
    );
  })()
}</span></li>
        </ul>
      </div>
    </div>
  );
}
