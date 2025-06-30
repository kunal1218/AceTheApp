import React from "react";
import { useNavigate } from "react-router-dom";
import "./VideoPage.css";

export default function VideoPage() {
  const navigate = useNavigate();

  return (
    <div className="video-page-bg">
      <div className="video-page-content">
        <h2 className="video-page-title">Watch This Video</h2>
        <div className="video-and-next-row">
          <div className="video-wrapper">
            <iframe
              className="video-page-iframe"
              src="https://www.youtube.com/embed/ubr9BW6g7mg"
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <button
            className="next-btn"
            onClick={() => navigate("/assignments")}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}