import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";
import { register, getApiBase } from "../api"; // <-- Import your API register function
import { saveSurveyAnswers, getToken } from "../api";

const LOCAL_STORAGE_KEY = "guestSurveyAnswers";

// Helper to get the correct backend URL for Google OAuth
const getGoogleAuthUrl = () => {
  const base = getApiBase().replace(/\/$/, "");
  return `${base}/auth/google`;
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
      navigate("/dashboard", { replace: true });
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
      const token = res?.token || res?.data?.token || localStorage.getItem("token");
      if (!token) {
        setError("Registration failed: No token returned from server. Please try again or contact support.");
        return;
      }
      // Save token (or whatever your backend returns)
      localStorage.setItem("token", token);
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
      navigate("/home", { replace: true });
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
    <section className="auth-shell">
      <div className="auth-panel">
        <div className="auth-info">
          <p className="eyebrow">Ace workspace</p>
          <h1>Spin up your Ace account</h1>
          <p>
            Capture your goals, sync your survey insights, and invite Ace to act as your productivity
            copilot. Your counseling data flows directly into the same dashboard.
          </p>
          <ul className="auth-list">
            <li>Unlimited goal blueprints and task suggestions</li>
            <li>Automatic sync with your counseling progress</li>
            <li>Secure storage for survey answers & preferences</li>
          </ul>
          <p className="auth-secondary">
            Already a member?{" "}
            <button type="button" onClick={() => navigate("/login")}>
              Log in here
            </button>
          </p>
        </div>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <h2>Create your account</h2>
            <p className="auth-subtitle">We’ll never share your details.</p>
          </div>
          <label className="auth-field">
            <span>Full name</span>
            <input
              name="name"
              placeholder="Jordan Kim"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="Secure password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              name="confirm"
              type="password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="primary-btn">
            Create account
          </button>
          <div className="auth-divider">
            <span />
            <p>or</p>
            <span />
          </div>
          <a href={getGoogleAuthUrl() + "?state=signup"} className="google-login-btn">
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="google-icon"
            />
            Sign up with Google
          </a>
        </form>
      </div>
    </section>
  );
}
