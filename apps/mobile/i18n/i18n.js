// apps/mobile-driver/i18n/i18n.js
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persist key */
const STORAGE_KEY = "settings.language";

/** Supported languages */
export const LANGS = [
  { code: "en", flag: "US", label: "English" },
  { code: "tl", flag: "PH", label: "Tagalog" },
  { code: "ceb", flag: "PH", label: "Cebuano" },
];

/** Translations
 *  TIP: you can add more keys anytime; t('key','Fallback') will use fallback if missing.
 */
const STRINGS = {
  en: {
    "settings.title": "Settings",
    "card.profile": "Profile",
    "tapToViewProfile": "Tap to view profile",
    "card.language": "Language",
    "language.en": "English",
    "language.tl": "Tagalog",
    "language.ceb": "Cebuano",
    "card.appearance": "Appearance",
    "darkMode": "Dark Mode",
    "usingDark": "Using dark theme",
    "switchToDark": "Switch to dark theme",
    "card.loyalty": "Loyalty Rewards",
    "currentPoints": "Current Points",
    "redeemRewards": "Redeem Rewards",
    "termsPrivacy": "Terms & Privacy",
    "helpSupport": "Help & Support",
    "logout": "Logout",
    "accountSettings": "Account Settings",
    "changeUsername": "Change Username",
    "changePassword": "Change Password",
    "updateUsername": "Update Username",
    "updatePassword": "Update Password",
    "ok": "OK",
  },
  tl: {
    "settings.title": "Mga Setting",
    "card.profile": "Profile",
    "tapToViewProfile": "Pindutin para makita ang profile",
    "card.language": "Wika",
    "language.en": "Ingles",
    "language.tl": "Tagalog",
    "language.ceb": "Cebuano",
    "card.appearance": "Hitsura",
    "darkMode": "Madilim na Tema",
    "usingDark": "Gumagamit ng madilim na tema",
    "switchToDark": "Lumipat sa madilim na tema",
    "card.loyalty": "Loyalty Rewards",
    "currentPoints": "Kasalukuyang Puntos",
    "redeemRewards": "I-redeem ang Rewards",
    "termsPrivacy": "Mga Tuntunin at Privacy",
    "helpSupport": "Tulong at Suporta",
    "logout": "Logout",
    "accountSettings": "Mga Setting ng Account",
    "changeUsername": "Palitan ang Username",
    "changePassword": "Palitan ang Password",
    "updateUsername": "I-update ang Username",
    "updatePassword": "I-update ang Password",
    "ok": "OK",
  },
  ceb: {
    "settings.title": "Mga Setting",
    "card.profile": "Profil",
    "tapToViewProfile": "I-tap aron tan-awon ang profil",
    "card.language": "Pinulongan",
    "language.en": "Iningles",
    "language.tl": "Tagalog",
    "language.ceb": "Cebuano",
    "card.appearance": "Panagway",
    "darkMode": "Dark Mode",
    "usingDark": "Gigamit ang dark theme",
    "switchToDark": "Ilis sa dark theme",
    "card.loyalty": "Loyalty Rewards",
    "currentPoints": "Karon nga Puntos",
    "redeemRewards": "Kuhaa ang Rewards",
    "termsPrivacy": "Mga Termino ug Privacy",
    "helpSupport": "Tabang ug Suporta",
    "logout": "Logout",
    "accountSettings": "Mga Setting sa Account",
    "changeUsername": "Usba ang Username",
    "changePassword": "Usba ang Password",
    "updateUsername": "I-update ang Username",
    "updatePassword": "I-update ang Password",
    "ok": "OK",
  },
};

/** Context */
const I18nContext = createContext({
  language: "en",
  setLanguage: (_next) => {},
  t: (key, fallback) => fallback || key,
});

/** Provider */
export function I18nProvider({ children }) {
  const [language, setLang] = useState("en");

  // load saved language
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setLang(saved);
      } catch {}
    })();
  }, []);

  const setLanguage = useCallback(async (next) => {
    setLang(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const t = useCallback(
    (key, fallback = key) => {
      const dict = STRINGS[language] || {};
      return (key in dict ? dict[key] : fallback);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hooks */
export function useI18n() {
  return useContext(I18nContext);
}

/** Helper: get label for a code (for your Language rows UI) */
export function getLanguageLabel(code) {
  const hit = LANGS.find((l) => l.code === code);
  return hit?.label || code;
}
