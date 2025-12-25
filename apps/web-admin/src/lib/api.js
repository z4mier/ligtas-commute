// apps/web-admin/src/lib/api.js
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
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function API(path, options = {}) {
  return request(path, options);
}

/* ---------- BUSES (ADMIN) ---------- */

export async function listBuses(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/buses${qs ? `?${qs}` : ""}`);
}

export async function getBus(id) {
  return request(`/buses/${id}`);
}

export async function createBus(payload) {
  return request("/buses", {
    method: "POST",
    body: payload,
  });
}

export async function updateBus(id, payload) {
  return request(`/buses/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function setBusStatus(id, status) {
  return updateBus(id, { status });
}

/* ---------- DRIVERS ---------- */

export async function listDrivers() {
  try {
    const data = await request("/admin/driver-profiles");
    return data?.items ?? [];
  } catch (err) {
    if (err.status === 404) {
      const data = await request("/admin/drivers");
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

export async function createDriver(payload) {
  try {
    return await request("/admin/driver-profiles", {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    if (err.status !== 404) throw err;

    try {
      return await request("/admin/create-driver", {
        method: "POST",
        body: payload,
      });
    } catch (err2) {
      if (err2.status !== 404) throw err2;

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

export async function setDriverStatus({ driverId, status }) {
  try {
    return await request("/admin/driver-status", {
      method: "PATCH",
      body: { driverId, status },
    });
  } catch (err) {
    if (err.status === 404) {
      return request("/admin/drivers/status", {
        method: "PATCH",
        body: { driverId, status },
      });
    }
    throw err;
  }
}

/* ---------- INCIDENTS ---------- */

export async function listEmergencies(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await request(`/iot/emergencies/history${qs ? `?${qs}` : ""}`);
  return Array.isArray(data) ? data : [];
}

export async function listIotEmergencies(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await request(`/iot/emergencies${qs ? `?${qs}` : ""}`);
  return Array.isArray(data) ? data : [];
}

/* ---------- IOT DEVICES ---------- */

export async function listIotDevices(params = {}) {
  const qs = new URLSearchParams(params).toString();

  // Try the most likely endpoints in order
  const candidates = [
    `/iot/devices${qs ? `?${qs}` : ""}`,
    `/admin/iot/devices${qs ? `?${qs}` : ""}`,
    `/admin/iot/device-list${qs ? `?${qs}` : ""}`,
    `/iot/device-list${qs ? `?${qs}` : ""}`,
  ];

  for (const path of candidates) {
    try {
      const data = await request(path);
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.devices)) return data.devices;
      return [];
    } catch (err) {
      // only ignore 404 and try next endpoint
      if (err?.status !== 404) throw err;
    }
  }

  // if none exist, return empty list (no crash)
  return [];
}

/* ---------- IOT STATUS REPORTS ---------- */

export async function listIotStatusReports(params = {}) {
  const qs = new URLSearchParams(params).toString();

  const candidates = [
    `/iot/status-reports${qs ? `?${qs}` : ""}`,
    `/admin/iot/status-reports${qs ? `?${qs}` : ""}`,
    `/iot/reports${qs ? `?${qs}` : ""}`,
    `/admin/iot/reports${qs ? `?${qs}` : ""}`,
    `/iot/status${qs ? `?${qs}` : ""}`,
  ];

  for (const path of candidates) {
    try {
      const data = await request(path);
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.reports)) return data.reports;
      return [];
    } catch (err) {
      if (err?.status !== 404) throw err;
    }
  }

  return [];
}
