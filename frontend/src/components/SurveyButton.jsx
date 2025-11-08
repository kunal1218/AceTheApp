import React from "react";
import { useNavigate } from "react-router-dom";
import "./TopCollegesButton.css";

export default function SurveyButton() {
  const navigate = useNavigate();
  return (
    <button
      className="survey-btn"
      onClick={() => navigate("/survey")}
    >
      Take our Survey!
    </button>
  );
}