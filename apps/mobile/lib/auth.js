// apps/mobile/lib/auth.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";

export async function requestOtp(email) {
  const res = await fetch(`${API_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to send OTP");
  return data;
}

export async function verifyOtp(email, code) {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: (email || "").trim().toLowerCase(), code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Invalid code");

  // Save token & user for later requests
  await AsyncStorage.setItem("token", data.token);
  await AsyncStorage.setItem("user", JSON.stringify(data.user));
  return data;
}
