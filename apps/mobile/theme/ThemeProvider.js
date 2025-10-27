import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const THEME = {
  light: {
    name: "light",
    brand: "#0B132B",
    text: "#111827",
    textSub: "#9CA3AF",
    white: "#FFFFFF",
    card: "#FFFFFF",
    page: "#F3F4F6",
    border: "#E5E7EB",
    chipBg: "#F3F4F6",
    chipActive: "#0B132B",
    yellow: "#F59E0B",
    success: "#22C55E",
    danger: "#EF4444",
    overlay: "rgba(0,0,0,0.45)",
    ghostBg: "#F9FAFB",
    infoBoxBg: "#F6F7FB",
    inputBg: "#FFFFFF",
  },
  dark: {
    name: "dark",
    brand: "#0B132B",
    text: "#E5E7EB",
    textSub: "#9CA3AF",
    white: "#0B1220",
    card: "#0F172A",
    page: "#0B1220",
    border: "#1F2A44",
    chipBg: "#121A2B",
    chipActive: "#0B132B",
    yellow: "#F8D477",
    success: "#34D399",
    danger: "#F87171",
    overlay: "rgba(0,0,0,0.65)",
    ghostBg: "#111827",
    infoBoxBg: "#0B1426",
    inputBg: "#0B1420",
  },
};

const ThemeCtx = createContext({ mode: "light", theme: THEME.light, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("settings.theme");
        if (saved === "dark" || saved === "light") setMode(saved);
      } catch {}
    })();
  }, []);

  const toggle = useCallback(async () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    try { await AsyncStorage.setItem("settings.theme", next); } catch {}
  }, [mode]);

  const theme = useMemo(() => (mode === "dark" ? THEME.dark : THEME.light), [mode]);
  const value = useMemo(() => ({ mode, theme, toggle }), [mode, theme, toggle]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
