// apps/mobile-driver/constants/config.js
import { Platform } from "react-native";

// If you set EXPO_PUBLIC_API_URL, it will be used (handy for tunneling)
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_URL =
  ENV_URL ||
  Platform.select({
    ios: "http://127.0.0.1:4000",     // iOS simulator
    android: "http://10.0.2.2:4000",  // Android emulator
    default: "http://192.168.125.171:4000", 
  });
