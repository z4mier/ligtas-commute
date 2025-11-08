import { API } from "./api";

export async function loginAdmin(emailOrPhone, password) {
  const { data } = await API.post("/auth/login", { emailOrPhone, password });
  if (data?.user?.role !== "ADMIN") throw new Error("Admin account required");
  return data;
}

export async function fetchDrivers() {
  const { data } = await API.get("/drivers");
  return data;
}

export async function fetchReports(params) {
  const { data } = await API.get("/reports", { params });
  return data;
}

export async function fetchAdmins() {
  const { data } = await API.get("/admins");
  return data;
}
