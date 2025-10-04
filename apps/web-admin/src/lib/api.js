"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// --- token helpers ---
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function setToken(t) {
  if (typeof window !== "undefined") localStorage.setItem("token", t);
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("token");
}

// --- core fetch wrapper ---
async function request(path, options = {}, { auth = false } = {}) {
  if (!path.startsWith("/")) path = `/${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (auth) {
    const token = getToken();
    if (!token) {
      // not logged in
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Try to parse JSON safely (handles 204 / empty body)
  let data = null;
  try {
    data = await res.clone().json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // If unauthorized, force re-login
    if (res.status === 401 || res.status === 403) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// --- exported helpers ---
export function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}
export function get(path) {
  return request(path, { method: "GET" });
}
export function postWithAuth(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) }, { auth: true });
}
export function getWithAuth(path) {
  return request(path, { method: "GET" }, { auth: true });
}
