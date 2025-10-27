// apps/mobile/i18n/i18n.js
import { createInstance } from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import tl from "./locales/tl.json";
import ceb from "./locales/ceb.json";

const STORAGE_KEY = "app.lang";

function normalizeLang(code) {
  const c = String(code || "").toLowerCase();
  if (c.startsWith("ceb")) return "ceb";
  if (c.startsWith("fil") || c.startsWith("tl")) return "tl";
  if (c.startsWith("en")) return "en";
  return "en";
}

async function loadStoredLang() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeLang(saved);
  } catch {}
  const locales = typeof Localization.getLocales === "function" ? Localization.getLocales() : [];
  const tag = locales[0]?.languageTag || locales[0]?.languageCode || "en";
  return normalizeLang(tag);
}

let i18n;
if (!global.__LC_I18N__) {
  i18n = createInstance();
  global.__LC_I18N__ = i18n;
} else {
  i18n = global.__LC_I18N__;
}

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    tl: { translation: tl },
    ceb: { translation: ceb },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
  lng: "en", // temporary; will change below
});

// 🔹 Ensure language is loaded before app renders
(async () => {
  const lang = await loadStoredLang();
  await i18n.changeLanguage(lang);
})();

// --- helpers ---
export async function setAppLanguage(lng) {
  const code = normalizeLang(lng);
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

export function getAppLanguage() {
  return normalizeLang(i18n.language || "en");
}

export const useI18n = () => {
  const ux = useTranslation();
  return { ...ux, language: getAppLanguage() };
};

export default i18n;
