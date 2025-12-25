import { Platform } from "react-native";
import Constants from "expo-constants";

const extra =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && Constants.manifest.extra) ||
  {};

const ENV_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  extra.EXPO_PUBLIC_API_URL ||
  "";

// ✅ for REAL PHONES use your PC LAN IP on BOTH android/ios
export const API_URL =
  ENV_URL ||
  Platform.select({
    ios: "http://192.168.254.108:4000",
    android: "http://192.168.254.108:4000",
    default: "http://192.168.254.108:4000",
  });

if (__DEV__) console.log("API_URL ->", API_URL);

export default API_URL;
