// apps/mobile/constants/config.js
import { Platform } from "react-native";
import Constants from "expo-constants";

// Try to read from app.json -> expo.extra
const extra =
  // Newer Expo (expoConfig)
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  // Older Expo (manifest)
  (Constants.manifest && Constants.manifest.extra) ||
  {};

const ENV_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  extra.EXPO_PUBLIC_API_URL ||
  "";

// Final API base URL
export const API_URL =
  ENV_URL ||
  Platform.select({
    ios: "http://127.0.0.1:4000",
    android: "http://10.0.2.2:4000",
    default: "http://192.168.123.171:4000",
  });

if (__DEV__) {
  console.log("API_URL ->", API_URL);
}

export default API_URL;
