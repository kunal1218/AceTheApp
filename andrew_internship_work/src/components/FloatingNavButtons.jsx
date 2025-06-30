import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FloatingNavButtons.css";
import bookIcon from "../assets/book.svg";
import gavelIcon from "../assets/gavel.webp";
import calculatorIcon from "../assets/calculator.png";
import settingsIcon from "../assets/settings.png";
import SettingsMenu from "./SettingsMenu";
import EditApplicationsPopup from "./EditApplicationsPopup";
import { setToken } from "../api"; // <-- Import setToken to clear token on logout
import { getSurveyAnswers } from "../api"; // Add this import


export default function FloatingNavButtons() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleSettingsClick = () => setShowSettings(true);

  const handleOptions = () => {
    setShowSettings(false);
    navigate("/settings");
  };

  const handleEditSurvey = async () => {
    setShowSettings(false);
    try {
      const answers = await getSurveyAnswers();
      if (Array.isArray(answers) && answers.length === 10 && answers.every(a => a !== null && a !== "")) {
        navigate("/survey?recap=1");
      } else {
        navigate("/survey");
      }
    } catch (e) {
      navigate("/survey");
    }
  };

  const handleEditAssignments = () => {
    setShowSettings(false);
    navigate("/assignments");
  };

  const handleLogout = () => {
    setShowSettings(false);
    setToken(null); // Remove token from localStorage and memory
    window.location.href = "/";
  };

  const handleEditApplications = () => {
    setShowSettings(false);
    setShowPopup(true);
  };

  return (
    <>
      <div className="floating-nav-buttons">
        <button title="Colleges List" onClick={() => navigate('/colleges-list')}>
          <img src={bookIcon} alt="Colleges List" width={24} height={24} />
        </button>
        <button
          title="Edit Applications"
          onClick={handleEditApplications}
        >
          <img src={gavelIcon} alt="Edit Applications" width={24} height={24} />
        </button>
        <button title="Affinity Calculator" onClick={() => navigate('/affinity-calc')}>
          <img src={calculatorIcon} alt="Affinity Calculator" width={24} height={24} />
        </button>
      </div>
      <div className="settings-nav-button">
        <button title="Settings" onClick={handleSettingsClick}>
          <img src={settingsIcon} alt="Settings" width={24} height={24} />
        </button>
      </div>
      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onOptions={handleOptions}
          onEditSurvey={handleEditSurvey}
          onLogout={handleLogout}
          onEditAssignments={handleEditAssignments}
        />
      )}
      {showPopup && (
        <EditApplicationsPopup
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  );
}