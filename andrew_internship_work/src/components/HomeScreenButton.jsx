import React from "react";
import { useNavigate } from "react-router-dom";
import homeIcon from "../assets/home.png";
import "./HomeScreenButton.css";
import { getToken } from "../api"; // Import your token getter

export default function HomeScreenButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    // Check if the user is authenticated by checking for a token
    const token = getToken();
    if (token) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <button
      className="home-screen-btn"
      title="Go Home"
      onClick={handleClick}
    >
      <img src={homeIcon} alt="Home" width={40} height={40} />
    </button>
  );
}