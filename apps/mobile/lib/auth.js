// apps/mobile/lib/auth.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";

// Request OTP function
export async function requestOtp(email) {
  try {
    const res = await fetch(`${API_URL}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.message || "Failed to send OTP");

    console.log("OTP request successful:", data); // Log successful OTP request response
    return data;
  } catch (error) {
    console.error("Error requesting OTP:", error);
    throw error; // Rethrow to handle it further up if necessary
  }
}

// Verify OTP function
export async function verifyOtp(email, code) {
  try {
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

    console.log("OTP verification successful:", data); // Log successful verification

    return data;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error; // Rethrow to handle it further up if necessary
  }
}
