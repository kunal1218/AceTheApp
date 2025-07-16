import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";
import { register } from "../api"; // <-- Import your API register function
import { saveSurveyAnswers, getToken } from "../api";

const LOCAL_STORAGE_KEY = "guestSurveyAnswers";

// Helper to get the correct backend URL for Google OAuth
const getGoogleAuthUrl = () => {
  if (window.location.hostname === "localhost") {
    return "http://localhost:5001/api/auth/google";
  } else {
    return "https://ace-the-app-backend.onrender.com/api/auth/google";
  }
};

export default function CreateAccount({ setLoggedIn }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");

  // Redirect if already authenticated (e.g., token exists)
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill out all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      console.log("[DEBUG] Registration form data:", form);
      // Call backend API to register
      let res;
      try {
        res = await register({
          name: form.name,
          email: form.email,
          password: form.password
        });
      } catch (err) {
        // Clear any stale token on error
        localStorage.removeItem("token");
        // Show backend error message if available
        if (err && err.message) {
          setError("Registration failed: " + err.message);
        } else {
          setError("Registration failed. Please try again.");
        }
        console.error("[DEBUG] Registration error:", err);
        return;
      }
      console.log("[DEBUG] Registration response:", res);
      if (!res.token) {
        setError("Registration failed: No token returned from server. Please try again or contact support.");
        return;
      }
      // Save token (or whatever your backend returns)
      localStorage.setItem("token", res.token);
      setLoggedIn(true);
      // --- Sync guest survey answers if they exist ---
      const guestAnswers = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (guestAnswers) {
        try {
          const parsed = JSON.parse(guestAnswers);
          if (Array.isArray(parsed)) {
            await saveSurveyAnswers(parsed);
          }
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (err) {
          // Ignore sync errors, or show a message if you want
        }
      }
      // -----------------------------------------------
      navigate("/home");
    } catch (err) {
      // Show backend error message if available
      if (err && err.message) {
        setError("Registration failed: " + err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
      console.error("[DEBUG] Registration error:", err);
    }
  };

  return (
    <div className="create-account-outer">
      <form className="create-account-box" onSubmit={handleSubmit}>
        <h2>Create Your Account</h2>
        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
        />
        <input
          name="confirm"
          type="password"
          placeholder="Confirm Password"
          value={form.confirm}
          onChange={handleChange}
          autoComplete="new-password"
        />
        {error && <div className="create-account-error">{error}</div>}
        <button type="submit" className="create-account-btn">
          Create Account
        </button>
        <div className="or-separator">
          <span className="or-line" />
          <span className="or-text">or</span>
          <span className="or-line" />
        </div>
        <a
          href={getGoogleAuthUrl() + '?state=signup'}
          className="google-login-btn"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" />
          Sign up with Google
        </a>
      </form>
    </div>
  );
}