const API_URL = "http://localhost:5001/api";
let jwt = localStorage.getItem("token") || null;

export function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}
export function getToken() {
  return localStorage.getItem("token");
}

// Auth
export async function register({ name, email, password }) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Register failed");
  const data = await res.json();
  setToken(data.token);
  return data; // Return full { token, user }
}

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Login failed");
  const data = await res.json();
  setToken(data.token);
  return data.user;
}

// Profile
export async function getProfile() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function getColleges() {
  const token = getToken();
  if (!token) return [];
  const res = await fetch(`${API_URL}/profile/colleges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to fetch colleges");
  return res.json();
}

export async function addCollege(id) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/colleges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to add college");
  return res.json();
}

export async function removeCollege(id) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/colleges/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to remove college");
  return res.json();
}

export async function saveCollegeDoc(collegeId, docUrl) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/college-doc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ collegeId, docUrl }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to save doc");
  return res.json();
}

export async function getCollegeDocs() {
  const token = getToken();
  if (!token) return [];
  const res = await fetch(`${API_URL}/profile/college-docs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to fetch docs");
  return res.json();
}

export async function getAssignmentAnswers() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/assignment-answers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch assignment answers");
  return res.json();
}

export async function saveAssignmentAnswers(answers) {
  const token = getToken();
  if (!token) return null;
  // Convert answers object to array in correct order
  const arr = [answers.q1 || "", answers.q2 || "", answers.q3 || "", answers.q4 || ""];
  const res = await fetch(`${API_URL}/profile/assignment-answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers: arr }), // send as { answers: [...] }
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to save assignment answers");
  return res.json();
}

export async function getUser() {
  const token = getToken();
  if (!token) return null;
  // Use the correct endpoint: /profile/me
  const res = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function getSurveyAnswers() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/survey-answers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch survey answers");
  return res.json();
}

export async function saveSurveyAnswers(answers) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/survey-answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to save survey answers");
  return res.json();
}

export async function getUsaMapClickedChain() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/usa-map-chain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch clicked chain");
  return res.json();
}

export async function saveUsaMapClickedChain(chain) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/usa-map-chain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chain }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to save clicked chain");
  return res.json();
}

export async function getCollegeProgress() {
  const token = getToken();
  if (!token) return {};
  const res = await fetch(`${API_URL}/profile/progress`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch college progress");
  return res.json();
}

export async function saveCollegeProgress(collegeId, progress) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/profile/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify({ collegeId, progress }),
  });
  if (!res.ok) throw new Error("Failed to save college progress");
  return res.json();
}