import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView, Modal, TextInput,
  StyleSheet, ActivityIndicator, Switch, Animated,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { StatusBar } from "expo-status-bar";
import { API_URL } from "../constants/config";
import { useI18n } from "../i18n/i18n";
import { useTheme, THEME } from "../theme/ThemeProvider";

function useToast(theme) {
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState("success");
  const y = useRef(new Animated.Value(-60)).current;

  const show = useCallback((text, t = "success") => {
    setTone(t); setMsg(text);
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(y, { toValue: -60, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [y]);

  const Toast = (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: 16, right: 16, top: 10, height: 44, borderRadius: 10, zIndex: 50,
        alignItems: "center", justifyContent: "center",
        shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
        transform: [{ translateY: y }], backgroundColor: tone === "success" ? theme.success : theme.danger,
      }}
    >
      <Text style={{ fontFamily: "Poppins_600SemiBold", color: THEME.light.white }}>{msg}</Text>
    </Animated.View>
  );
  return { show, Toast };
}

const makeStyles = (C) =>
  StyleSheet.create({
    f400: { fontFamily: "Poppins_400Regular" },
    f600: { fontFamily: "Poppins_600SemiBold" },
    f700: { fontFamily: "Poppins_700Bold" },

    modalTitle: { fontSize: 18, color: C.brand },
    modalH2: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 6 },
    modalP: { fontSize: 13, lineHeight: 20, color: C.text },

    screen: { flex: 1, backgroundColor: C.page },
    loadingBox: { flex: 1, backgroundColor: C.page, alignItems: "center", justifyContent: "center" },
    bodyPad: { paddingHorizontal: 16 },
    title: { fontSize: 18, color: C.text },

    card: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginTop: 12, borderWidth: 1, borderColor: C.border },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    sectionTitle: { color: C.text, fontSize: 14 },
    small: { fontSize: 12, color: C.text },
    label: { fontSize: 13, color: C.text },
    name: { color: C.text, fontSize: 15 },

    rowLeft: { flexDirection: "row", alignItems: "center" },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },

    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    langRow: { marginTop: 10, height: 44, borderRadius: 8, backgroundColor: C.chipBg, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10 },
    langRowActive: { backgroundColor: C.chipActive, borderColor: C.chipActive },
    langBadge: { height: 26, minWidth: 40, paddingHorizontal: 8, borderRadius: 6, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },

    progressTrack: { height: 8, backgroundColor: C.chipBg, borderRadius: 6, marginTop: 10, overflow: "hidden", borderWidth: 1, borderColor: C.border },
    progressFill: { height: 8, backgroundColor: C.yellow },

    btn: { height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    btnPrimary: { backgroundColor: C.brand },
    btnLight: { backgroundColor: C.ghostBg, borderWidth: 1, borderColor: C.border },
    btnGhost: { backgroundColor: C.ghostBg, borderWidth: 1, borderColor: C.border },

    errBox: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.danger, flexDirection: "row", alignItems: "center" },

    modalOverlay: { flex: 1, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

    modalBox: { width: "92%", maxWidth: 420, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
    modalScrollBox: { width: "92%", maxWidth: 420, maxHeight: "70%", backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },

    infoBoxHeader: { backgroundColor: C.infoBoxBg, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderBottomWidth: 0, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    roundIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
    infoBoxBody: { backgroundColor: C.infoBoxBg, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderTopWidth: 0, borderColor: C.border, padding: 10 },
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },

    input: { height: 44, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: C.inputBg, color: C.text, paddingRight: 44 },
    inputFlat: { height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, backgroundColor: C.inputBg, color: C.text },
    stackGap: { marginTop: 8 },
    stackGapTight: { marginTop: 6 },

    tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
    tab: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center", backgroundColor: C.ghostBg, flexDirection: "row" },
    tabActive: { backgroundColor: C.brand, borderColor: C.brand },
    tabTxt: { color: C.brand },
    tabTxtActive: { color: THEME.light.white },

    eyeWrap: { position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 32 },
  });

export default function SettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  const { mode, theme, toggle } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { show, Toast } = useToast(theme);
  const { language, setLanguage, t } = useI18n();

  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "", address: "", createdAt: new Date().toISOString(), language: "en", points: 0 });
  const [points, setPoints] = useState(0);

  const [profileModal, setProfileModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [tab, setTab] = useState("username");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [original, setOriginal] = useState({ fullName: "", email: "", phone: "", address: "" });

  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const [uErr, setUErr] = useState("");
  const [uLoading, setULoading] = useState(false);
  const [pErr, setPErr] = useState("");
  const [pLoading, setPLoading] = useState(false);

  const [editErr, setEditErr] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fetchMe = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) { navigation.replace("Login"); return; }
    const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 401) { await AsyncStorage.removeItem("token"); navigation.replace("Login"); return; }
    if (!res.ok) { show(t("err.loadProfile", "Failed to load profile"), "danger"); return; }

    const data = await res.json();
    const pts = Number(data?.points || 0);
    const nextProfile = {
      fullName: data?.fullName || "", email: data?.email || "", phone: data?.phone || "", address: data?.address || "",
      createdAt: data?.createdAt || new Date().toISOString(), language: data?.language || "en", points: pts,
    };
    setProfile(nextProfile);
    setPoints(pts);
    setFullName(nextProfile.fullName);
    setEmail(nextProfile.email);
    setPhone(nextProfile.phone);
    setAddress(nextProfile.address);

    if (nextProfile.language && nextProfile.language !== language) { try { await setLanguage(nextProfile.language); } catch {} }

    setOriginal({ fullName: nextProfile.fullName, email: nextProfile.email, phone: nextProfile.phone, address: nextProfile.address });
  }, [navigation, show, setLanguage, language, t]);

  useEffect(() => {
    (async () => {
      try { await fetchMe(); } finally { setLoading(false); }
    })();
  }, [fetchMe]);

  const hasChanges = fullName !== original.fullName || email !== original.email || phone !== original.phone || address !== original.address;

  async function saveProfile() {
    setEditErr("");
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!fullName.trim()) return setEditErr(t("err.fullName", "Please enter your full name."));
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) return setEditErr(t("err.email", "Please enter a valid email address."));
    try {
      setEditLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName, email: cleanEmail, phone, address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setEditErr(data?.message || t("err.update", "Update failed"));

      setProfile((p) => ({ ...p, fullName, email: cleanEmail, phone, address }));
      setOriginal({ fullName, email: cleanEmail, phone, address });
      setEditModal(false);
      show(t("toast.profileSaved", "Profile updated successfully"));
    } catch {
      setEditErr(t("err.network", "Network error"));
    } finally {
      setEditLoading(false);
    }
  }

  async function updateUsername() {
    const u = (newUsername || "").trim().toLowerCase();
    if (!u) return setUErr(t("err.enterNewUsername", "Enter your new username."));
    if (!u.includes("@")) return setUErr(t("err.usernameAt", "Username must contain @."));
    if (!EMAIL_RE.test(u)) return setUErr(t("err.validEmail", "Enter a valid email address."));
    try {
      setULoading(true); setUErr("");
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-username`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newUsername: u }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) return setUErr(t("err.usernameTaken", "Username already taken."));
        return setUErr(data?.message || t("err.tryAgain", "Update failed. Please try again."));
      }
      setProfile((p) => ({ ...p, email: u })); setEmail(u); setNewUsername(""); setAccountModal(false);
      show(t("toast.usernameChanged", "Username successfully changed")); await fetchMe();
    } catch {
      setUErr(t("err.networkTryAgain", "Network error. Please try again."));
    } finally {
      setULoading(false);
    }
  }

  async function updatePassword() {
    setPErr("");
    if (!currentPassword || !newPassword || !confirmPassword) return setPErr(t("err.fillAllPw", "Fill all password fields."));
    if (newPassword.length < 6) return setPErr(t("err.pwMin", "New password must be at least 6 characters."));
    if (newPassword !== confirmPassword) return setPErr(t("err.pwMatch", "Passwords do not match."));
    try {
      setPLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setPErr(data?.message || t("err.tryAgain", "Update failed. Please try again."));
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowCur(false); setShowNew(false); setShowCon(false);
      setAccountModal(false);
      show(t("toast.pwChanged", "Password successfully changed"));
    } catch {
      setPErr(t("err.networkTryAgain", "Network error. Please try again."));
    } finally {
      setPLoading(false);
    }
  }

  async function updateLanguage(next) {
    if (language === next) return;
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: next }),
      });
      if (!res.ok) { show(t("err.saveLanguage", "Failed to save language"), "danger"); return; }
      await setLanguage(next);
      show(t("toast.languageSaved", "Language saved"));
    } catch { show(t("err.network", "Network error"), "danger"); }
  }

  async function doLogout() { await AsyncStorage.removeItem("token"); navigation.replace("Login"); }

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.loadingBox}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={theme.text} />
      </SafeAreaView>
    );
  }

  const joinText = `${t("memberSince", "Member since")} ${new Date(profile?.createdAt || Date.now()).toLocaleString("default", { month: "long", year: "numeric" })}`;
  const pointsPct = Math.max(0, Math.min(100, Math.round((Number(points || 0) / 100) * 100)));

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {Toast}
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={s.bodyPad}>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, paddingRight: 10 }}>
            <Ionicons name="chevron-back" size={22} color={mode === "dark" ? THEME.light.white : theme.brand} />
          </TouchableOpacity>
          <Text style={[s.title, s.f700]}>{t("settings.title", "Settings")}</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, s.f700]}>{t("card.profile", "Profile")}</Text>
            <Text style={[s.small, { color: theme.textSub }]}>{t("tapToViewProfile", "Tap to view profile")}</Text>
          </View>

          <TouchableOpacity style={s.profileRow} onPress={() => setProfileModal(true)}>
            <View style={s.avatar}>
              <Text style={[s.f700, { color: THEME.light.white, fontSize: 16 }]}>{profile.fullName?.[0]?.toUpperCase() || "U"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, s.f600]}>{profile.fullName || "—"}</Text>
              <Text style={[s.small, { color: theme.textSub }]}>{joinText}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>{t("card.language", "Language")}</Text>
          <LangRow theme={theme} s={s} active={language === "en"} left="US" right={t("language.en", "English")} onPress={() => updateLanguage("en")} />
          <LangRow theme={theme} s={s} active={language === "tl"} left="PH" right={t("language.tl", "Tagalog")} onPress={() => updateLanguage("tl")} />
          <LangRow theme={theme} s={s} active={language === "ceb"} left="PH" right={t("language.ceb", "Cebuano")} onPress={() => updateLanguage("ceb")} />
        </View>

        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>{t("card.appearance", "Appearance")}</Text>
          <View style={[s.rowBetween, { marginTop: 10 }]}>
            <View>
              <Text style={[s.label, s.f600]}>{t("darkMode", "Dark Mode")}</Text>
              <Text style={[s.small, { color: theme.textSub }]}>{mode === "dark" ? t("usingDark", "Using dark theme") : t("switchToDark", "Switch to dark theme")}</Text>
            </View>
            <Switch value={mode === "dark"} onValueChange={toggle} />
          </View>
        </View>

        <View style={s.card}>
          <Text style={[s.sectionTitle, s.f700]}>{t("card.loyalty", "Loyalty Rewards")}</Text>
          <View style={s.rowBetween}>
            <View>
              <Text style={[s.label, s.f600]}>{t("currentPoints", "Current Points")}</Text>
              <Text style={[s.small, { color: theme.textSub }]}>{t("pointsHint", "Earn points based on your ride")}</Text>
            </View>
            <Text style={[s.f700, { color: theme.yellow }]}>{points}</Text>
          </View>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${pointsPct}%`, backgroundColor: theme.yellow }]} /></View>
          <View style={s.rowBetween}>
            <Text style={[s.small, { color: theme.textSub }]}>{Number(points) >= 100 ? t("pointsCongrats", "Congratulations! You’ve reached the 100 point limit.") : t("pointsKeepRiding", "Keep riding to reach 100 points.")}</Text>
            <Text style={[s.small, { color: theme.textSub }]}>{t("pointsUpTo", "Earn up to 100")}</Text>
          </View>
          <TouchableOpacity disabled style={[s.btn, s.btnGhost, { marginTop: 8 }]}><Text style={[s.f600, { color: theme.text }]}>{t("redeemRewards", "Redeem Rewards")}</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={s.card} onPress={() => setTermsModal(true)}>
          <View style={s.rowLeft}><MaterialCommunityIcons name="file-document-outline" size={20} color={theme.brand} /><Text style={[s.label, s.f600, { marginLeft: 8 }]}>{t("termsPrivacy", "Terms & Privacy")}</Text></View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => setSupportModal(true)}>
          <View style={s.rowLeft}><MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.brand} /><Text style={[s.label, s.f600, { marginLeft: 8 }]}>{t("helpSupport", "Help & Support")}</Text></View>
        </TouchableOpacity>

        <View style={s.card}>
          <TouchableOpacity onPress={() => setLogoutModal(true)} style={s.rowLeft}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.danger} />
            <Text style={[s.f600, { color: theme.danger, marginLeft: 8 }]}>{t("logout", "Logout")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={profileModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>{t("card.profile", "Profile")}</Text>
              <TouchableOpacity onPress={() => setProfileModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={[s.avatar, { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.brand }]}>
                <Text style={[s.f700, { color: THEME.light.white, fontSize: 18 }]}>{profile.fullName?.[0]?.toUpperCase() || "U"}</Text>
              </View>
              <Text style={[s.f700, { fontSize: 16, color: theme.text, marginTop: 10 }]}>{profile.fullName || "—"}</Text>
            </View>

            <View style={s.infoBoxHeader}>
              <Text style={[s.f600, { color: theme.text }]}>{t("personalInfo", "Personal Information")}</Text>
              <TouchableOpacity onPress={() => { setProfileModal(false); setEditModal(true); }} style={s.roundIcon}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.brand} />
              </TouchableOpacity>
            </View>
            <View style={s.infoBoxBody}>
              <InfoRow theme={theme} s={s} icon="email-outline" text={email || "—"} />
              <InfoRow theme={theme} s={s} icon="phone-outline" text={phone || "—"} />
              <InfoRow theme={theme} s={s} icon="map-marker-outline" text={address || "—"} />
              <InfoRow theme={theme} s={s} icon="calendar-month-outline" text={joinText} />
            </View>

            <Text style={[s.label, s.f600, { marginTop: 12, color: theme.text }]}>{t("security", "Security")}</Text>
            <TouchableOpacity onPress={() => { setProfileModal(false); setAccountModal(true); }} style={[s.btn, s.btnGhost, { marginTop: 8 }]}>
              <Text style={[s.f600, { color: theme.text }]}>{t("manageUserPw", "Manage Username & Password")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal (with inline errors) */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>{t("editProfile", "Edit Profile")}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={[s.avatar, { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.brand }]}>
                <Text style={[s.f700, { color: THEME.light.white, fontSize: 18 }]}>{fullName?.[0]?.toUpperCase() || "U"}</Text>
              </View>
              <TextInput
                style={[s.input, { textAlign: "center", marginTop: 10, paddingRight: 12 }]}
                value={fullName}
                onChangeText={(v) => { setFullName(v); if (editErr) setEditErr(""); }}
                placeholder={t("placeholder.fullName", "Full Name")}
                placeholderTextColor={theme.textSub}
              />
            </View>

            <View style={s.infoBoxBody}>
              <EditRow theme={theme} s={s} icon="email-outline">
                <TextInput
                  style={s.inputFlat}
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (editErr) setEditErr(""); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={t("placeholder.email", "Email")}
                  placeholderTextColor={theme.textSub}
                />
              </EditRow>
              <EditRow theme={theme} s={s} icon="phone-outline">
                <TextInput style={s.inputFlat} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t("placeholder.phone", "Phone")} placeholderTextColor={theme.textSub} />
              </EditRow>
              <EditRow theme={theme} s={s} icon="map-marker-outline">
                <TextInput style={s.inputFlat} value={address} onChangeText={setAddress} placeholder={t("placeholder.address", "Address")} placeholderTextColor={theme.textSub} />
              </EditRow>
              <EditRow theme={theme} s={s} icon="calendar-month-outline"><Text style={[s.small, { color: theme.textSub }]}>{joinText}</Text></EditRow>
            </View>

            {editErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                <Text style={[s.small, { color: THEME.light.white, marginLeft: 6 }]}>{editErr}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={saveProfile} disabled={!hasChanges || editLoading} style={[s.btn, s.btnPrimary, { flex: 1, opacity: !hasChanges || editLoading ? 0.6 : 1 }]}>
                {editLoading ? <ActivityIndicator color={THEME.light.white} /> : <Text style={[s.f600, { color: THEME.light.white }]}>{t("save", "Save")}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setFullName(original.fullName); setEmail(original.email); setPhone(original.phone); setAddress(original.address); setEditModal(false); setEditErr(""); }}
                style={[s.btn, s.btnLight, { flex: 1 }]}
              >
                <Text style={[s.f600, { color: theme.text }]}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal visible={accountModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>{t("accountSettings", "Account Settings")}</Text>
              <TouchableOpacity onPress={() => setAccountModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={s.tabs}>
              <TabBtn theme={theme} s={s} label={t("tab.username", "Username")} active={tab === "username"} onPress={() => setTab("username")} />
              <TabBtn theme={theme} s={s} label={t("tab.password", "Password")} active={tab === "password"} onPress={() => setTab("password")} />
            </View>

            {tab === "username" ? (
              <>
                <Text style={[s.label, s.f600, { marginBottom: 6 }]}>{t("changeUsername", "Change Username")}</Text>
                <TextInput style={[s.input, { marginBottom: 8 }]} value={email} editable={false} />
                <TextInput
                  style={[s.input, s.stackGap]}
                  value={newUsername}
                  onChangeText={(tval) => { setNewUsername(tval); if (uErr) setUErr(""); }}
                  placeholder={t("placeholder.newUsername", "New Username (email)")}
                  placeholderTextColor={theme.textSub}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {uErr ? (
                  <View style={s.errBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                    <Text style={[s.small, { color: THEME.light.white, marginLeft: 6 }]}>{uErr}</Text>
                  </View>
                ) : null}
                <TouchableOpacity onPress={updateUsername} disabled={uLoading} style={[s.btn, s.btnPrimary, { marginTop: 8, opacity: uLoading ? 0.7 : 1 }]}>
                  {uLoading ? <ActivityIndicator color={THEME.light.white} /> : <Text style={[s.f600, { color: THEME.light.white }]}>{t("updateUsername", "Update Username")}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.label, s.f600, { marginBottom: 6 }]}>{t("changePassword", "Change Password")}</Text>

                <View style={s.stackGap}>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={s.input}
                      value={currentPassword}
                      onChangeText={(v) => { setCurrentPassword(v); if (pErr) setPErr(""); }}
                      placeholder={t("placeholder.currentPassword", "Current Password")}
                      placeholderTextColor={theme.textSub}
                      secureTextEntry={!showCur}
                    />
                    <TouchableOpacity style={s.eyeWrap} onPress={() => setShowCur((v) => !v)}>
                      <Ionicons name={showCur ? "eye-off" : "eye"} size={20} color={theme.textSub} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.stackGap}>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={s.input}
                      value={newPassword}
                      onChangeText={(v) => { setNewPassword(v); if (pErr) setPErr(""); }}
                      placeholder={t("placeholder.newPassword", "New Password")}
                      placeholderTextColor={theme.textSub}
                      secureTextEntry={!showNew}
                    />
                    <TouchableOpacity style={s.eyeWrap} onPress={() => setShowNew((v) => !v)}>
                      <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={theme.textSub} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.stackGap}>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={s.input}
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); if (pErr) setPErr(""); }}
                      placeholder={t("placeholder.confirmPassword", "Confirm New Password")}
                      placeholderTextColor={theme.textSub}
                      secureTextEntry={!showCon}
                    />
                    <TouchableOpacity style={s.eyeWrap} onPress={() => setShowCon((v) => !v)}>
                      <Ionicons name={showCon ? "eye-off" : "eye"} size={20} color={theme.textSub} />
                    </TouchableOpacity>
                  </View>
                </View>

                {pErr ? (
                  <View style={s.errBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                    <Text style={[s.small, { color: THEME.light.white, marginLeft: 6 }]}>{pErr}</Text>
                  </View>
                ) : null}

                <TouchableOpacity onPress={updatePassword} disabled={pLoading} style={[s.btn, s.btnPrimary, { marginTop: 8, opacity: pLoading ? 0.7 : 1 }]}>
                  {pLoading ? <ActivityIndicator color={THEME.light.white} /> : <Text style={[s.f600, { color: THEME.light.white }]}>{t("updatePassword", "Update Password")}</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>{t("logout", "Logout")}</Text>
              <TouchableOpacity onPress={() => setLogoutModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <Text style={[s.label, { marginBottom: 14 }]}>{t("confirmLogout", "Are you sure you want to logout?")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setLogoutModal(false)} style={[s.btn, s.btnLight, { flex: 1 }]}><Text style={[s.f600, { color: theme.text }]}>{t("cancel", "Cancel")}</Text></TouchableOpacity>
              <TouchableOpacity onPress={doLogout} style={[s.btn, s.btnPrimary, { flex: 1 }]}><Text style={[s.f600, { color: THEME.light.white }]}>{t("logout", "Logout")}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Terms & Privacy Modal */}
      <Modal visible={termsModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalScrollBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, s.modalTitle]}>{t("termsPrivacy", "LigtasCommute Terms and Privacy")}</Text>
              <TouchableOpacity onPress={() => setTermsModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.modalP}>
                Last Updated: June 17, 2025{"\n\n"}
                1. Acceptance of Terms{"\n"}
                By using LigtasCommute, you agree to these Terms and Conditions.{"\n\n"}
                2. User Registration{"\n"}
                Provide accurate info and keep it updated.{"\n\n"}
                3. Location and GPS Use{"\n"}
                We use GPS data to track trips and ensure safety.{"\n\n"}
                4. QR Code Verification{"\n"}
                Always confirm the driver/vehicle match.{"\n\n"}
                5. Safety & Emergency Features{"\n"}
                Misuse of emergency alerts may result in suspension.{"\n\n"}
                6. Feedback & Reports{"\n"}
                Use respectful, accurate language when submitting feedback.{"\n\n"}
                7. Privacy Policy{"\n"}
                Your data is stored securely and not shared with advertisers.{"\n\n"}
                8. Changes to Terms{"\n"}
                Continued use after updates means you accept the new terms.
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setTermsModal(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}><Text style={[s.f600, { color: THEME.light.white }]}>{t("ok", "OK")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal visible={supportModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalScrollBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, s.modalTitle]}>{t("helpSupport", "Help & Support")}</Text>
              <TouchableOpacity onPress={() => setSupportModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.modalP}>
                • {t("tip.restartApp", "Close and restart the app")}{"\n"}
                • {t("tip.checkInternet", "Check internet connection")}{"\n"}
                • {t("tip.updateApp", "Update to the latest version")}{"\n"}
                • {t("tip.permissions", "Ensure GPS and camera permissions are enabled")}
              </Text>

              <Text style={[s.modalH2, { marginTop: 10 }]}>{t("commonIssues", "Common Issues")}</Text>
              <Text style={s.modalP}>
                • {t("issue.qr", "Can’t scan QR code? Check camera permissions.")}{"\n"}
                • {t("issue.location", "Location not updating? Make sure GPS is on.")}{"\n"}
                • {t("issue.contact", "Still stuck? Contact support@ligtascommute.com")}
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setSupportModal(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}><Text style={[s.f600, { color: THEME.light.white }]}>{t("ok", "OK")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LangRow({ theme, s, active, left, right, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.langRow, active && s.langRowActive]}>
      <View style={s.langBadge}><Text style={[s.f600, { color: THEME.light.white }]}>{left}</Text></View>
      <Text style={[s.f600, { color: active ? THEME.light.white : theme.text }]}>{right}</Text>
    </TouchableOpacity>
  );
}
function InfoRow({ theme, s, icon, text }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.brand} />
      <Text style={[s.small, { color: theme.text, marginLeft: 8 }]}>{text}</Text>
    </View>
  );
}
function EditRow({ theme, s, icon, children }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.brand} />
      <View style={{ flex: 1, marginLeft: 8 }}>{children}</View>
    </View>
  );
}
function TabBtn({ theme, s, label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.tab, active && s.tabActive]}>
      <MaterialCommunityIcons name={label.toLowerCase().includes("user") ? "account-outline" : "lock-outline"} size={16} color={active ? THEME.light.white : theme.brand} style={{ marginRight: 6 }} />
      <Text style={[s.f600, active ? s.tabTxtActive : s.tabTxt]}>{label}</Text>
    </TouchableOpacity>
  );
}
