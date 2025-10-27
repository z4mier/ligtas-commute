import { Platform } from "react-native";

const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_URL =
  ENV_URL ||
  Platform.select({
    ios: "http://127.0.0.1:4000",
    android: "http://10.0.2.2:4000",
    default: "http://192.168.123.171:4000",
  });

if (__DEV__) console.log("API_URL ->", API_URL);
export default API_URL;
