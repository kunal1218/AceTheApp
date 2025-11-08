import React from "react";
import { useNavigate } from "react-router-dom";
import "./SettingsMenu.css";

export default function SettingsMenu({ onClose, onOptions, onEditSurvey, onLogout, onEditAssignments }) {
  const [showOptions, setShowOptions] = React.useState(false);
  const navigate = useNavigate();

  if (showOptions) {
    // Navigate directly using react-router's useNavigate
    const handleUserInfoClick = () => {
      onClose();
      setTimeout(() => navigate("/user-info"), 0);
    };
    const handleSystemOptionsClick = () => {
      onClose();
      setTimeout(() => navigate("/settings"), 0);
    };
    return (
      <div className="settings-menu-overlay" onClick={onClose}>
        <div className="settings-menu" onClick={e => e.stopPropagation()}>
          <button className="settings-menu-btn" onClick={handleUserInfoClick}>
            User Info
          </button>
          <button className="settings-menu-btn" onClick={handleSystemOptionsClick}>
            System Settings
          </button>
          <button className="settings-menu-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div className="settings-menu" onClick={e => e.stopPropagation()}>
        <button className="settings-menu-btn" onClick={() => setShowOptions(true)}>
          Options
        </button>
        <button className="settings-menu-btn" onClick={onEditSurvey}>
          Edit Survey Responses
        </button>
        <button className="settings-menu-btn" onClick={onEditAssignments}>
          Edit Assignment Questions
        </button>
        <button className="settings-menu-btn" onClick={onLogout}>
          Log Out
        </button>
        <button className="settings-menu-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}