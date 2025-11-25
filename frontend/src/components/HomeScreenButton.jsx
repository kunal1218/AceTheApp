import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import homeIcon from "../assets/home.png";
import "./HomeScreenButton.css";
import { getToken } from "../api"; // Import your token getter

export default function HomeScreenButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    const token = getToken();
    const counselingPaths = ["/", "/home", "/top-colleges", "/colleges-list", "/affinity-calc"];
    const onCounselingArea = counselingPaths.includes(location.pathname);

    if (!token) {
      navigate("/");
      return;
    }

    if (onCounselingArea) {
      navigate("/", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <button
      className="home-screen-btn"
      title="Go Home"
      onClick={handleClick}
    >
      <img src={homeIcon} alt="Home" width={40} height={40} />
      <span className="home-screen-label">Ace The App</span>
    </button>
  );
}
