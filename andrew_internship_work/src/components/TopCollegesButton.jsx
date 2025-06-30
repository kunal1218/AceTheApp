import React, { useEffect, useState } from "react";
import "./TopCollegesButton.css";
import { useNavigate } from "react-router-dom";
import { getUsaMapClickedChain } from "../api";

export default function TopCollegesButton() {
  const navigate = useNavigate();
  const [clickedChain, setClickedChain] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsaMapClickedChain()
      .then(setClickedChain)
      .catch(() => setClickedChain([]))
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = Array.isArray(clickedChain) && clickedChain.length >= 3;

  return (
    <div className="button-group-centered">
      <button
        className="top-colleges-btn"
        onClick={() => isEnabled && navigate("/top-colleges")}
        disabled={!isEnabled || loading}
      >
        Top Colleges
      </button>
    </div>
  );
}