// src/lib/api.js
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Login failed");

  if (data.token) {
    localStorage.setItem("lc_token", data.token);
    localStorage.setItem(
      "lc_user",
      JSON.stringify({
        id: data.user?.id,
        email: data.user?.email || email,
        role: data.user?.role || data.role || "ADMIN",
      })
    );
  }
  return data;
}

export function apiLogout() {
  localStorage.removeItem("lc_token");
  localStorage.removeItem("lc_user");
}

export function authHeaders(extra = {}) {
  const token =
    (typeof window !== "undefined" && localStorage.getItem("lc_token")) || "";
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, { method = "GET", headers, body } = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders(headers || {}) },
    body: body && typeof body === "object" ? JSON.stringify(body) : body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) apiLogout();
    throw new Error(data.error || data.message || `Error ${res.status}`);
  }
  return data;
}

export async function API(path, options = {}) {
  return request(path, options);
}

export async function listDrivers() {
  const data = await request("/admin/driver-profiles");
  return data?.items ?? [];
}

export async function getDriver(id) {
  return request(`/admin/driver-profiles/${id}`);
}

export async function createDriver(payload) {
  return request("/admin/create-driver", {
    method: "POST",
    body: payload,
  });
}

export async function previewIdentifiers({ busNumber, plateNumber }) {
  return request("/admin/preview-identifiers", {
    method: "POST",
    body: { busNumber, plateNumber },
  });
}

export async function setDriverStatus({ driverId, status }) {
  return request("/admin/driver-status", {
    method: "PATCH",
    body: { driverId, status },
  });
}
