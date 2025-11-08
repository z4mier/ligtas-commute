// src/lib/reports.js
import { API } from "./api";

/** Normal commuter reports (non-emergency) */
export async function listReports(params = {}) {
  const { q } = params || {};
  const { data } = await API.get("/reports", { params: { q } });
  return Array.isArray(data) ? data : [];
}

/** Emergency incidents only */
export async function listEmergencyIncidents(params = {}) {
  const { q } = params || {};
  const { data } = await API.get("/reports/emergencies", { params: { q } });
  return Array.isArray(data) ? data : [];
}
