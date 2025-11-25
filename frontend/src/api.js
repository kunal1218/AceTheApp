import NProgress from 'nprogress';

const normalizeApiBase = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // If the value is missing a scheme, assume https to avoid relative URL issues in prod.
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL) ?? "http://localhost:3001";
const OFFLINE_DEV = import.meta.env.VITE_OFFLINE_DEV === "1";
console.debug("[api] API_BASE =", API_BASE);
let jwt = localStorage.getItem("token") || null;

const getMockUser = () => {
  const stored = localStorage.getItem("mockUser");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return {
    id: "mock-user",
    email: "dev@example.com",
    name: "Dev User",
    role: "ADMIN",
    hasActiveSubscription: true,
  };
};

const persistMockUser = (user) => {
  localStorage.setItem("mockUser", JSON.stringify(user));
};

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

// Helper to wrap fetch with NProgress
export async function apiFetch(url, options) {
  NProgress.start();
  try {
    const res = await fetch(url, options);
    return res;
  } finally {
    NProgress.done();
  }
}

const parseJsonSafe = async (res) => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const handleResponse = async (res, fallbackMessage) => {
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const message = data?.error || data?.message || fallbackMessage || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
};

// Auth
export async function register({ name, email, password }) {
  if (OFFLINE_DEV) {
    const mock = { ...getMockUser(), name: name || "Dev User", email: email || "dev@example.com" };
    persistMockUser(mock);
    const token = "mock-token";
    setToken(token);
    return { token, user: mock };
  }
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await handleResponse(res, "Register failed");
  const token = data?.token ?? data?.data?.token;
  if (token) {
    setToken(token);
  }
  return data; // Return full response shape
}

export async function login({ email, password }) {
  if (OFFLINE_DEV) {
    const mock = { ...getMockUser(), email: email || "dev@example.com" };
    persistMockUser(mock);
    const token = "mock-token";
    setToken(token);
    return mock;
  }
  const res = await apiFetch(`${API_BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res, "Login failed");
  const token = data?.token ?? data?.data?.token;
  if (token) {
    setToken(token);
  }
  const user = data?.user ?? data?.data?.user;
  return user;
}

// Profile
export async function getProfile() {
  const token = getToken();
  if (OFFLINE_DEV) {
    return getMockUser();
  }
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) {
    // Gracefully fall back instead of throwing, so the app can continue.
    const maybeJson = await parseJsonSafe(res);
    console.warn("[api] getProfile failed", res.status, maybeJson);
    return null;
  }
  return handleResponse(res, "Failed to fetch profile");
}

export async function getColleges() {
  const token = getToken();
  if (!token) return [];
  const res = await apiFetch(`${API_BASE}/profile/colleges`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return [];
  return handleResponse(res, "Failed to fetch colleges");
}

export async function addCollege(id) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/colleges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to add college");
}

export async function removeCollege(id) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/colleges/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to remove college");
}

export async function saveCollegeDoc(collegeId, docUrl) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/college-doc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ collegeId, docUrl }),
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to save doc");
}

export async function getCollegeDocs() {
  const token = getToken();
  if (!token) return [];
  const res = await apiFetch(`${API_BASE}/profile/college-docs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return [];
  return handleResponse(res, "Failed to fetch docs");
}

export async function getAssignmentAnswers() {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/assignment-answers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to fetch assignment answers");
}

export async function saveAssignmentAnswers(answers) {
  const token = getToken();
  if (!token) return null;
  // Convert answers object to array in correct order
  const arr = [answers.q1 || "", answers.q2 || "", answers.q3 || "", answers.q4 || ""];
  const res = await apiFetch(`${API_BASE}/profile/assignment-answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers: arr }), // send as { answers: [...] }
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to save assignment answers");
}

export async function getUser() {
  const token = getToken();
  if (!token) return null;
  // Use the correct endpoint: /profile/me
  const res = await apiFetch(`${API_BASE}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to fetch user");
}

export async function getSurveyAnswers() {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/survey-answers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 404) return [];
  if (!res.ok) {
    const maybeJson = await parseJsonSafe(res);
    console.warn("[api] getSurveyAnswers failed", res.status, maybeJson);
    return [];
  }
  return handleResponse(res, "Failed to fetch survey answers");
}

export async function saveSurveyAnswers(answers) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/survey-answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) {
    const maybeJson = await parseJsonSafe(res);
    console.warn("[api] saveSurveyAnswers failed", res.status, maybeJson);
    return null;
  }
  return handleResponse(res, "Failed to save survey answers");
}

export async function getUsaMapClickedChain() {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/usa-map-chain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to fetch clicked chain");
}

export async function saveUsaMapClickedChain(chain) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/usa-map-chain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chain }),
  });
  if (res.status === 401) return null;
  return handleResponse(res, "Failed to save clicked chain");
}

export async function getCollegeProgress() {
  const token = getToken();
  if (!token) return {};
  const res = await apiFetch(`${API_BASE}/profile/progress`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return handleResponse(res, "Failed to fetch college progress");
}

export async function saveCollegeProgress(collegeId, progress) {
  const token = getToken();
  if (!token) return null;
  const res = await apiFetch(`${API_BASE}/profile/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    credentials: "include",
    body: JSON.stringify({ collegeId, progress }),
  });
  return handleResponse(res, "Failed to save college progress");
}

export async function generateSubgoals(goal) {
  const token = getToken();
  const res = await apiFetch(`${API_BASE}/profile/generate-subgoals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ goal }),
  });
  return handleResponse(res, "Failed to generate subgoals");
}
