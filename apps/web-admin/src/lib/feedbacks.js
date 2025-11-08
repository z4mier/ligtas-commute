// apps/admin/src/lib/feedbacks.js
import { API } from "./api";

/**
 * Try common feedback endpoints in order until one works.
 * Supports array or paginated { items } payloads.
 * Never throws—returns [] on failure so UI stays stable.
 */
export async function listAllFeedbacks(params = {}) {
  const candidates = [
    "/feedbacks",          // if mounted as app.use("/feedbacks", ...)
    "/api/feedbacks",      // if prefixed with /api
    "/admins/feedbacks",   // if grouped under admins
  ];

  for (const path of candidates) {
    try {
      const { data } = await API.get(path, { params });

      // Normalize result
      if (Array.isArray(data)) {
        console.info(`[feedbacks] using endpoint: ${path} (array)`);
        return data;
      }
      if (data && Array.isArray(data.items)) {
        console.info(`[feedbacks] using endpoint: ${path} (paginated)`);
        return data.items;
      }

      // Unexpected shape; try next candidate
      console.warn(`[feedbacks] endpoint ${path} returned unexpected shape`, data);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      if (status === 404) {
        // Not found: silently try next candidate
        continue;
      }
      // Other errors: log and stop trying further (likely auth/network)
      console.error(`[feedbacks] ${path} failed:`, status, msg);
      return [];
    }
  }

  console.error("❌ listAllFeedbacks: no working endpoint found (tried /feedbacks, /api/feedbacks, /admins/feedbacks)");
  return [];
}

/** (Optional) Get feedback for a single driver */
export async function listFeedbackForDriver(driverId, params = {}) {
  if (!driverId) {
    console.warn("⚠️ listFeedbackForDriver: driverId is required");
    return [];
  }

  const candidates = [
    `/feedbacks/driver/${driverId}`,
    `/api/feedbacks/driver/${driverId}`,
    `/admins/feedbacks/driver/${driverId}`,
  ];

  for (const path of candidates) {
    try {
      const { data } = await API.get(path, { params });
      if (Array.isArray(data)) {
        console.info(`[feedbacks] using endpoint: ${path} (driver list)`);
        return data;
      }
    } catch (err) {
      if (err?.response?.status === 404) continue;
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      console.error(`[feedbacks] ${path} failed:`, status, msg);
      return [];
    }
  }

  console.error("❌ listFeedbackForDriver: no working endpoint found");
  return [];
}
