import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";
import { login, getApiBase } from "../api";
import { useCollegeList } from "./CollegeProvider";

export default function LoginPage({ setLoggedIn }) {
  const navigate = useNavigate();
  const { refreshColleges } = useCollegeList();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call backend API to log in
      await login({ email: form.email, password: form.password });
      // login() in api.js should set the token in localStorage
      setLoggedIn(true);
      await refreshColleges(); // Ensure college list is loaded after login
      localStorage.removeItem("wizardGatePassed");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    }
  };

  // Helper to get the correct backend URL for Google OAuth
  const getGoogleAuthUrl = () => {
    const raw = getApiBase().replace(/\/$/, "");
    const base = raw.endsWith("/api") ? raw.slice(0, -4) : raw;
    return `${base}/auth/google`;
  };

  return (
    <section className="auth-shell">
      <div className="auth-panel">
        <div className="auth-info">
          <p className="eyebrow">Welcome back</p>
          <h1>Pick up right where Ace left you</h1>
          <p>
            Sign in to access your daily mission brief, synced survey preferences, and counseling
            roadmap without skipping a beat.
          </p>
          <ul className="auth-list">
            <li>Instant access to your Ace dashboard</li>
            <li>Syncs with every counseling milestone</li>
            <li>Secure Google login supported</li>
          </ul>
          <p className="auth-secondary">
            First time here?{" "}
            <button type="button" onClick={() => navigate("/create-account")}>
              Create an account
            </button>
          </p>
        </div>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <h2>Log into Ace</h2>
            <p className="auth-subtitle">Enter your credentials to continue.</p>
          </div>
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
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="primary-btn">
            Log in
          </button>
          <div className="auth-divider">
            <span />
            <p>or</p>
            <span />
          </div>
          <a href={getGoogleAuthUrl()} className="google-login-btn">
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="google-icon"
            />
            Log in with Google
          </a>
        </form>
      </div>
    </section>
  );
}
