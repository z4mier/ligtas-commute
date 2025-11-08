import { API } from "@/lib/api";

// attach Authorization header per call (no changes to API instance needed)
function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("lc_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerDriver(payload) {
  // Server is authoritative for IDs; POST to /drivers
  const { data } = await API.post("/drivers", payload, {
    headers: { ...authHeaders() },
  });
  return data;
}

export async function listDrivers() {
  const { data } = await API.get("/drivers", {
    headers: { ...authHeaders() },
  });
  return data;
}

export async function setDriverStatus(driverId, status) {
  const { data } = await API.patch(
    `/drivers/${driverId}/status`,
    { status },
    { headers: { ...authHeaders() } }
  );
  return data;
}

export async function updateDriver(driverId, payload) {
  const { data } = await API.patch(`/drivers/${driverId}`, payload, {
    headers: { ...authHeaders() },
  });
  return data;
}

export async function previewIdentifiers(vehicleType) {
  // Matches API route: GET /drivers/preview-identifiers
  const { data } = await API.get("/drivers/preview-identifiers", {
    params: { vehicleType },
    headers: { ...authHeaders() },
  });
  return data;
}
