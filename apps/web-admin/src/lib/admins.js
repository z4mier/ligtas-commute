// apps/admin/src/lib/admins.js
import { API } from "./api";

/** Get currently signed-in admin profile */
export async function getMyProfile() {
  const { data } = await API.get("/admins/me");
  return data;
}

/** Update profile fields (name, email, phone, address, etc.) */
export async function updateMyProfile(payload) {
  const { data } = await API.patch("/admins/me", payload);
  return data;
}

/** Change password (requires current OR you can skip if your API sets default) */
export async function updateMyPassword({ newPassword }) {
  const { data } = await API.post("/admins/me/change-password", { newPassword });
  return data;
}
