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
  // payload: { number, plate, busType, status?, corridor?, isActive?, routeId?, forwardRoute?, returnRoute? }
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
  // convenience: only update status
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

/* ---------- FEEDBACK (ADMIN) ---------- */

export async function listFeedback(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/feedback${qs ? `?${qs}` : ""}`);
}

export async function getFeedback(id) {
  return request(`/admin/feedback/${id}`);
}

/* ---------- INCIDENTS (ADMIN) ---------- */

export async function listIncidents(params = {}) {
  const qs = new URLSearchParams(params).toString();

  try {
    // primary admin incidents endpoint
    return await request(`/admin/incidents${qs ? `?${qs}` : ""}`);
  } catch (err) {
    if (err.status === 404) {
      // fallback to generic emergency-incidents
      try {
        return await request(
          `/emergency-incidents${qs ? `?${qs}` : ""}`
        );
      } catch (err2) {
        // if this also doesn't exist, just return empty list
        if (err2.status === 404) {
          return [];
        }
        throw err2;
      }
    }
    throw err;
  }
}

/* ---------- EMERGENCY REPORTS (RESOLVED HISTORY / IOT ACTIVE) ---------- */

export async function listEmergencies(params = {}) {
  const qs = new URLSearchParams(params).toString();

  // 1) Try IoT emergencies first (for ESP32 device incidents)
  try {
    const data = await request(`/iot/emergencies${qs ? `?${qs}` : ""}`);
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  // 2) Fallback: admin emergencies endpoint (if exists)
  try {
    const data = await request(`/admin/emergencies${qs ? `?${qs}` : ""}`);
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err2) {
    if (err2.status !== 404) {
      throw err2;
    }
  }

  // 3) Final fallback: generic emergency-incidents (legacy)
  try {
    const data2 = await request(
      `/emergency-incidents${qs ? `?${qs}` : ""}`
    );
    if (Array.isArray(data2?.items)) return data2.items;
    if (Array.isArray(data2)) return data2;
    return [];
  } catch (err3) {
    if (err3.status === 404) {
      return [];
    }
    throw err3;
  }
}

/* ---------- NOTIFICATIONS (ADMIN) ---------- */

export async function listNotifications(params = {}) {
  const qs = new URLSearchParams(params).toString();

  try {
    // admin notifications (for bell)
    return await request(`/admin/notifications${qs ? `?${qs}` : ""}`);
  } catch (err) {
    if (err.status === 404) {
      // fallback to generic /notifications
      try {
        return await request(`/notifications${qs ? `?${qs}` : ""}`);
      } catch (err2) {
        if (err2.status === 404) {
          return [];
        }
        throw err2;
      }
    }
    throw err;
  }
}

/* ---------- IOT EMERGENCIES (ESP32 devices) ---------- */

export async function listIotEmergencies(params = {}) {
  const qs = new URLSearchParams(params).toString();
  // API route: GET http://localhost:4000/iot/emergencies
  return request(`/iot/emergencies${qs ? `?${qs}` : ""}`);
}

export async function resolveEmergency(id) {
  // API route: POST http://localhost:4000/iot/emergencies/:id/resolve
  return request(`/iot/emergencies/${id}/resolve`, {
    method: "POST",
  });
}
