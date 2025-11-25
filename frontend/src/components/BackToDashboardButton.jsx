import React from "react";
import { useNavigate } from "react-router-dom";
import "./BackToDashboardButton.css";

export default function BackToDashboardButton() {
  const navigate = useNavigate();

  return (
    <button
      className="back-to-dashboard-btn"
      onClick={() => navigate("/dashboard")}
      title="Back to dashboard"
      type="button"
    >
      Back to Dashboard
    </button>
  );
}
