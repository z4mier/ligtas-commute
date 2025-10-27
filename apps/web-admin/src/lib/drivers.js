// src/lib/drivers.js
import API from "./api";

/** List driver profiles for the admin console */
export async function listDrivers() {
  const { data } = await API.get("/admin/driver-profiles");
  return data?.items ?? [];
}
