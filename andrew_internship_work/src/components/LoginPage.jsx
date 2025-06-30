import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateAccount.css";
import { login } from "../api"; // <-- Import your API login function
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
      navigate("/home");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    }
  };

  return (
    <div className="create-account-outer">
      <form className="create-account-box" onSubmit={handleSubmit}>
        <h2>Log In</h2>
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
          autoComplete="current-password"
        />
        {error && <div className="create-account-error">{error}</div>}
        <button type="submit" className="create-account-btn">
          Log In
        </button>
      </form>
    </div>
  );
}