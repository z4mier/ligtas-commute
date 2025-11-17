// src/lib/api.js
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API ||
  "http://localhost:4000";

/* ---------- AUTH ---------- */

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

/* ---------- CORE REQUEST WRAPPER ---------- */

async function request(path, { method = "GET", headers, body } = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(headers || {}),
    },
    body: body && typeof body === "object" ? JSON.stringify(body) : body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) apiLogout();
    const err = new Error(data.error || data.message || `Error ${res.status}`);
    err.status = res.status; // 👈 keep HTTP status so callers can branch
    throw err;
  }

  return data;
}

export async function API(path, options = {}) {
  return request(path, options);
}

/* ---------- DRIVERS ---------- */

/**
 * List drivers.
 * Tries /admin/driver-profiles then falls back to /admin/drivers if 404.
 */
export async function listDrivers() {
  try {
    const data = await request("/admin/driver-profiles");
    return data?.items ?? [];
  } catch (err) {
    if (err.status === 404) {
      // maybe older route name
      const data = await request("/admin/drivers");
      // some backends return { items: [...] }, some return [...];
      return Array.isArray(data?.items) ? data.items : data ?? [];
    }
    throw err;
  }
}

export async function getDriver(id) {
  try {
    return await request(`/admin/driver-profiles/${id}`);
  } catch (err) {
    if (err.status === 404) {
      return request(`/admin/drivers/${id}`);
    }
    throw err;
  }
}

/**
 * Create a driver.
 * 1) POST /admin/driver-profiles
 * 2) if 404, POST /admin/create-driver
 * 3) if still 404, POST /admin/drivers
 */
export async function createDriver(payload) {
  // prefer RESTful route
  try {
    return await request("/admin/driver-profiles", {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    if (err.status !== 404) throw err;

    // legacy path 1
    try {
      return await request("/admin/create-driver", {
        method: "POST",
        body: payload,
      });
    } catch (err2) {
      if (err2.status !== 404) throw err2;

      // legacy path 2
      return request("/admin/drivers", {
        method: "POST",
        body: payload,
      });
    }
  }
}

export async function previewIdentifiers({ busNumber, plateNumber }) {
  return request("/admin/preview-identifiers", {
    method: "POST",
    body: { busNumber, plateNumber },
  });
}

/**
 * Update driver active / inactive status.
 * Try /admin/driver-status, fall back if needed.
 */
export async function setDriverStatus({ driverId, status }) {
  try {
    return await request("/admin/driver-status", {
      method: "PATCH",
      body: { driverId, status },
    });
  } catch (err) {
    if (err.status === 404) {
      // maybe older route like /admin/drivers/status
      return request("/admin/drivers/status", {
        method: "PATCH",
        body: { driverId, status },
      });
    }
    throw err;
  }
}
