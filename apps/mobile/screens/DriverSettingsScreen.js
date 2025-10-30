// apps/mobile/screens/DriverSettingsScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal, TextInput,
  StyleSheet, ActivityIndicator, Animated, Image, Platform
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../constants/config";
import { useTheme, THEME } from "../theme/ThemeProvider";

/* ---------------- Toast ---------------- */
function useToast(theme, topOffset = 10) {
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState("success");
  const [visible, setVisible] = useState(false);
  const y = useRef(new Animated.Value(-100)).current;

  const show = useCallback((text, t = "success") => {
    setTone(t);
    setMsg(text);
    setVisible(true);
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(y, { toValue: -100, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setVisible(false));
  }, [y]);

  return {
    show,
    Toast: !visible ? null : (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: topOffset,
          height: 44,
          borderRadius: 10,
          zIndex: 50,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
          transform: [{ translateY: y }],
          backgroundColor: tone === "success" ? theme.success : theme.danger,
        }}
      >
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: THEME.light.white }}>{msg}</Text>
      </Animated.View>
    ),
  };
}

/* ---------------- Styles ---------------- */
const makeStyles = (C) =>
  StyleSheet.create({
    f400: { fontFamily: "Poppins_400Regular" },
    f600: { fontFamily: "Poppins_600SemiBold" },
    f700: { fontFamily: "Poppins_700Bold" },

    screen: { flex: 1, backgroundColor: C.page },
    loadingBox: { flex: 1, backgroundColor: C.page, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, color: C.text },
    bodyPad: { paddingHorizontal: 16, flex: 1 },

    card: { backgroundColor: C.card, borderRadius: 10, padding: 14, marginTop: 12, borderWidth: 1, borderColor: C.border },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { color: C.text, fontSize: 14 },
    small: { fontSize: 12, color: C.text },

    rowLeft: { flexDirection: "row", alignItems: "center" },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: "100%", height: "100%" },
    cameraBadge: {
      position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9,
      backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
    },
    name: { color: C.text, fontSize: 15 },

    btn: { height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    btnPrimary: { backgroundColor: C.brand },
    btnLight: { backgroundColor: C.ghostBg, borderWidth: 1, borderColor: C.border },

    modalOverlay: { flex: 1, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    modalBox: { width: "92%", maxWidth: 420, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },

    infoBoxHeader: { backgroundColor: C.infoBoxBg, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderBottomWidth: 0, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    roundIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
    infoBoxBody: { backgroundColor: C.infoBoxBg, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderTopWidth: 0, borderColor: C.border, padding: 10 },
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },

    input: { height: 44, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: C.inputBg, color: C.text, paddingRight: 44 },
    inputFlat: { height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, backgroundColor: C.inputBg, color: C.text },

    errBox: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.danger, flexDirection: "row", alignItems: "center" },
    errText: { color: THEME.light.white, fontFamily: "Poppins_400Regular", fontSize: 12 },
  });

/* helpers */
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/* ---------------- Screen ---------------- */
export default function DriverSettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  const { mode, theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  const { show, Toast } = useToast(theme, insets.top + 10);
  const [loading, setLoading] = useState(true);

  /* ---------- profile state ---------- */
  const [profile, setProfile] = useState({
    fullName: "", email: "", phone: "", address: "",
    createdAt: new Date().toISOString(),
    profileUrl: null,        // licenseNo removed
  });

  const [profileModal, setProfileModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [securityModal, setSecurityModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  /* edit form */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [original, setOriginal] = useState({ fullName: "", email: "", phone: "", address: "" });

  /* password form */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  /* errors & spinners */
  const [pErr, setPErr] = useState("");
  const [pLoading, setPLoading] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarErr, setAvatarErr] = useState("");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- Load profile (robust mapping) ---------- */
  const fetchMe = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return navigation.replace("Login");

    let userData = {};
    try {
      const r = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) userData = await r.json();
    } catch {}

    let d1 = {};
    try {
      const r = await fetch(`${API_URL}/driver/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) d1 = await r.json();
    } catch {}

    let d2 = {};
    try {
      const r = await fetch(`${API_URL}/driver/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) d2 = await r.json();
    } catch {}

    const driverRaw = Object.keys(d1 || {}).length ? d1 : d2;
    const driverData = driverRaw?.data ?? driverRaw;
    const user = userData?.data ?? userData;
    const driverProfile = driverData?.driverProfile ?? driverData?.profile ?? {};

    const nextProfile = {
      fullName:
        pick(driverData, ["fullName"]) ??
        pick(driverProfile, ["fullName"]) ??
        pick(user, ["fullName"]) ?? "—",
      email: pick(user, ["email"]) ?? pick(driverData, ["email"]) ?? "",
      phone: pick(user, ["phone"]) ?? pick(driverData, ["phone"]) ?? "",
      address: pick(user, ["address"]) ?? pick(driverData, ["address"]) ?? "",
      createdAt: pick(user, ["createdAt"]) ?? pick(driverData, ["createdAt"]) ?? new Date().toISOString(),
      // licenseNo removed
      profileUrl:
        pick(driverData, ["profileUrl", "avatarUrl", "photoUrl", "profile_url", "avatar_url"]) ??
        pick(driverProfile, ["profileUrl", "avatarUrl", "photoUrl"]) ??
        pick(user, ["profileUrl", "avatarUrl"]) ?? null,
    };

    setProfile(nextProfile);
    setFullName(nextProfile.fullName);
    setEmail(nextProfile.email);
    setPhone(nextProfile.phone);
    setAddress(nextProfile.address);
    setOriginal({
      fullName: nextProfile.fullName,
      email: nextProfile.email,
      phone: nextProfile.phone,
      address: nextProfile.address,
    });
  }, [navigation]);

  useEffect(() => {
    (async () => { try { await fetchMe(); } finally { setLoading(false); } })();
  }, [fetchMe]);

  const hasChanges =
    fullName !== original.fullName ||
    email !== original.email ||
    phone !== original.phone ||
    address !== original.address;

  async function saveProfile() {
    setEditErr("");
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!fullName.trim()) return setEditErr("Please enter your full name.");
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) return setEditErr("Please enter a valid email address.");
    try {
      setEditLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName, email: cleanEmail, phone, address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setEditErr(data?.message || "Update failed");

      setProfile((p) => ({ ...p, fullName, email: cleanEmail, phone, address }));
      setOriginal({ fullName, email: cleanEmail, phone, address });
      setEditModal(false);
      show("Profile updated successfully");
    } catch {
      setEditErr("Network error");
    } finally {
      setEditLoading(false);
    }
  }

  async function updatePassword() {
    setPErr("");
    if (!currentPassword || !newPassword || !confirmPassword) return setPErr("Fill all password fields.");
    if (newPassword.length < 6) return setPErr("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPErr("Passwords do not match.");
    try {
      setPLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setPErr(data?.message || "Update failed. Please try again.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowCur(false); setShowNew(false); setShowCon(false);
      setSecurityModal(false);
      show("Password successfully changed");
    } catch {
      setPErr("Network error. Please try again.");
    } finally {
      setPLoading(false);
    }
  }

  async function doLogout() {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  }

  /* ---------- Avatar upload ---------- */

  function buildFileFromAsset(asset) {
    const uri = asset.uri;
    const name =
      asset.fileName ||
      (Platform.OS === "ios" ? "avatar.jpg" : (uri?.split("/").pop() || "avatar.jpg"));
    let type = asset.type === "video" ? "video/mp4" : "image/jpeg";
    if (name && name.toLowerCase().endsWith(".png")) type = "image/png";
    return { uri, name, type };
  }

  const tryUploadTo = async (token, fileObj) => {
    const endpoints = [
      "/driver/profile/upload-avatar",
      "/users/upload-avatar",
      "/upload/avatar",
    ];
    const fields = ["avatar", "photo", "image", "file"];

    for (const p of endpoints) {
      for (const f of fields) {
        try {
          const form = new FormData();
          form.append(f, fileObj);
          const r = await fetch(`${API_URL}${p}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          const js = await r.json().catch(() => ({}));
          if (r.ok && js) return js;
        } catch {}
      }
    }
    throw new Error("UPLOAD_FAILED");
  };

  const pickAndUploadAvatar = useCallback(async () => {
    setAvatarErr("");
    try {
      setAvatarLoading(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setAvatarErr("Permission denied. Enable photo access in settings.");
        setAvatarLoading(false);
        return;
      }

      const mediaTypes = ["images"];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        selectionLimit: 1,
      });
      if (result.canceled) { setAvatarLoading(false); return; }

      const asset = result.assets[0];
      const fileObj = buildFileFromAsset(asset);
      const token = await AsyncStorage.getItem("token");

      const js = await tryUploadTo(token, fileObj);
      const newUrl =
        js?.profileUrl || js?.avatarUrl || js?.url || js?.location || asset.uri;

      setProfile((p) => ({ ...p, profileUrl: newUrl }));
      setAvatarErr("");
      show("Profile photo updated");
    } catch {
      setAvatarErr("Upload failed. Please try again.");
    } finally {
      setAvatarLoading(false);
    }
  }, [show]);

  /* ---------------- UI ---------------- */
  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.loadingBox}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={theme.text} />
      </SafeAreaView>
    );
  }

  const joinText = `Member since ${new Date(profile?.createdAt || Date.now()).toLocaleString("default", { month: "long", year: "numeric" })}`;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {Toast}

      <ScrollView
        style={s.bodyPad}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, paddingRight: 10 }}>
            <Ionicons name="chevron-back" size={22} color={theme.brand} />
          </TouchableOpacity>
          <Text style={[s.title, s.f700]}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, s.f700]}>Profile</Text>
            <Text style={[s.small, { color: theme.textSub }]}>Tap to view profile</Text>
          </View>

          <TouchableOpacity style={s.profileRow} onPress={() => setProfileModal(true)}>
            <View style={s.avatar}>
              {profile.profileUrl ? (
                <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
              ) : (
                <Text style={[s.f700, { color: THEME.light.white, fontSize: 16 }]}>{profile.fullName?.[0]?.toUpperCase() || "U"}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, s.f600]}>{profile.fullName || "—"}</Text>
              <Text style={[s.small, { color: theme.textSub }]}>{joinText}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Terms & Privacy */}
        <TermsAndPrivacyModals theme={theme} s={s} />
        {/* Help & Support */}
        <HelpSupportModals theme={theme} s={s} />

        {/* Spacer pushes logout to bottom */}
        <View style={{ flex: 1 }} />

        {/* Logout */}
        <View style={[s.card, { marginTop: 12 }]}>
          <TouchableOpacity onPress={() => setLogoutModal(true)} style={s.rowLeft}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.danger} />
            <Text style={[s.f600, { color: theme.danger, marginLeft: 8 }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={profileModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>Profile</Text>
              <TouchableOpacity onPress={() => setProfileModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={s.avatarLarge}>
                {profile.profileUrl ? (
                  <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
                ) : (
                  <Text style={[s.f700, { color: THEME.light.white, fontSize: 20 }]}>{profile.fullName?.[0]?.toUpperCase() || "U"}</Text>
                )}
              </View>
              <Text style={[s.f700, { fontSize: 16, color: theme.text, marginTop: 10 }]}>{profile.fullName || "—"}</Text>
            </View>

            <View style={s.infoBoxHeader}>
              <Text style={[s.f600, { color: theme.text }]}>Personal Information</Text>
              <TouchableOpacity onPress={() => { setProfileModal(false); setEditModal(true); }} style={s.roundIcon}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.brand} />
              </TouchableOpacity>
            </View>
            <View style={s.infoBoxBody}>
              <InfoRow theme={theme} s={s} icon="email-outline" text={email || "—"} />
              <InfoRow theme={theme} s={s} icon="phone-outline" text={phone || "—"} />
              <InfoRow theme={theme} s={s} icon="map-marker-outline" text={address || "—"} />
              {/* License row removed */}
              <InfoRow theme={theme} s={s} icon="calendar-month-outline" text={joinText} />
            </View>

            <Text style={[s.f600, { marginTop: 12, color: theme.text }]}>Security</Text>
            <TouchableOpacity onPress={() => { setProfileModal(false); setSecurityModal(true); }} style={[s.btn, s.btnLight, { marginTop: 8 }]}>
              <Text style={[s.f600, { color: theme.text }]}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={s.avatarLarge}>
                {profile.profileUrl ? (
                  <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
                ) : (
                  <Text style={[s.f700, { color: THEME.light.white, fontSize: 20 }]}>{fullName?.[0]?.toUpperCase() || "U"}</Text>
                )}
                <View style={s.cameraBadge}>
                  {avatarLoading ? (
                    <ActivityIndicator size="small" color={theme.brand} />
                  ) : (
                    <MaterialCommunityIcons name="camera" size={12} color={theme.brand} />
                  )}
                </View>
              </TouchableOpacity>

              {avatarErr ? (
                <View style={[s.errBox, { marginTop: 10 }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                  <Text style={[s.errText, { marginLeft: 6 }]}>{avatarErr}</Text>
                </View>
              ) : null}

              <Text style={[s.small, { color: theme.textSub, marginTop: 6 }]}>Tap photo to change</Text>

              <TextInput
                style={[s.input, { textAlign: "center", marginTop: 10, paddingRight: 12 }]}
                value={fullName}
                onChangeText={(v) => { setFullName(v); if (editErr) setEditErr(""); }}
                placeholder="Full Name"
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
                  placeholder="Email"
                  placeholderTextColor={theme.textSub}
                />
              </EditRow>
              <EditRow theme={theme} s={s} icon="phone-outline">
                <TextInput
                  style={s.inputFlat}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Phone"
                  placeholderTextColor={theme.textSub}
                />
              </EditRow>
              <EditRow theme={theme} s={s} icon="map-marker-outline">
                <TextInput
                  style={s.inputFlat}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Address"
                  placeholderTextColor={theme.textSub}
                />
              </EditRow>
              {/* read-only license field removed */}
            </View>

            {editErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                <Text style={[s.errText, { marginLeft: 6 }]}>{editErr}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveProfile}
                disabled={!hasChanges || editLoading}
                style={[s.btn, s.btnPrimary, { flex: 1, opacity: !hasChanges || editLoading ? 0.6 : 1 }]}
              >
                {editLoading
                  ? <ActivityIndicator color={THEME.light.white} />
                  : <Text style={[s.f600, { color: THEME.light.white }]}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFullName(original.fullName);
                  setEmail(original.email);
                  setPhone(original.phone);
                  setAddress(original.address);
                  setEditModal(false);
                  setEditErr("");
                }}
                style={[s.btn, s.btnLight, { flex: 1 }]}
              >
                <Text style={[s.f600, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security (Password only) */}
      <Modal visible={securityModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setSecurityModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>

            <View style={{ position: "relative", marginBottom: 8 }}>
              <TextInput
                style={s.input}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); if (pErr) setPErr(""); }}
                placeholder="Current Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showCur}
              />
              <TouchableOpacity style={{ position: "absolute", right: 10, top: 10 }} onPress={() => setShowCur((v) => !v)}>
                <Ionicons name={showCur ? "eye-off" : "eye"} size={20} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative", marginBottom: 8 }}>
              <TextInput
                style={s.input}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); if (pErr) setPErr(""); }}
                placeholder="New Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity style={{ position: "absolute", right: 10, top: 10 }} onPress={() => setShowNew((v) => !v)}>
                <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative" }}>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); if (pErr) setPErr(""); }}
                placeholder="Confirm New Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showCon}
              />
              <TouchableOpacity style={{ position: "absolute", right: 10, top: 10 }} onPress={() => setShowCon((v) => !v)}>
                <Ionicons name={showCon ? "eye-off" : "eye"} size={20} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            {pErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.light.white} />
                <Text style={[s.errText, { marginLeft: 6 }]}>{pErr}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={updatePassword}
              disabled={pLoading}
              style={[s.btn, s.btnPrimary, { marginTop: 8, opacity: pLoading ? 0.7 : 1 }]}
            >
              {pLoading
                ? <ActivityIndicator color={THEME.light.white} />
                : <Text style={[s.f600, { color: THEME.light.white }]}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={[s.f700, { fontSize: 16, color: theme.brand }]}>Logout</Text>
              <TouchableOpacity onPress={() => setLogoutModal(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <Text style={{ marginBottom: 14, color: theme.text, fontFamily: "Poppins_400Regular" }}>Are you sure you want to logout?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setLogoutModal(false)} style={[s.btn, s.btnLight, { flex: 1 }]}>
                <Text style={[s.f600, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doLogout} style={[s.btn, s.btnPrimary, { flex: 1 }]}>
                <Text style={[s.f600, { color: THEME.light.white }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* --------------- Small components --------------- */
function InfoRow({ theme, s, icon, text }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.brand} />
      <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Poppins_400Regular", fontSize: 12 }}>{text}</Text>
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

/* Terms & Privacy */
function TermsAndPrivacyModals({ theme, s }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={[s.card, { marginTop: 12 }]} onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.brand} />
          <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Poppins_600SemiBold" }}>Terms & Privacy</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: "75%" }]}>
            <View style={s.modalHeader}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: theme.brand }}>LigtasCommute Terms and Privacy</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ fontFamily: "Poppins_400Regular", color: theme.text, fontSize: 13, lineHeight: 20 }}>
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
            <TouchableOpacity onPress={() => setOpen(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}>
              <Text style={{ color: THEME.light.white, fontFamily: "Poppins_600SemiBold" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* Help & Support */
function HelpSupportModals({ theme, s }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.card} onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.brand} />
          <Text style={{ marginLeft: 8, color: theme.text, fontFamily: "Poppins_600SemiBold" }}>Help & Support</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: "75%" }]}>
            <View style={s.modalHeader}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: theme.brand }}>Help & Support</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={18} color={theme.brand} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ fontFamily: "Poppins_400Regular", color: theme.text, fontSize: 13, lineHeight: 20 }}>
                • Close and restart the app{"\n"}
                • Check internet connection{"\n"}
                • Update to the latest version{"\n"}
                • Ensure GPS and camera permissions are enabled{"\n\n"}
                Common Issues{"\n"}
                • Can’t scan QR code? Check camera permissions.{"\n"}
                • Location not updating? Make sure GPS is on.{"\n"}
                • Still stuck? Contact support@ligtascommute.com
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setOpen(false)} style={[s.btn, s.btnPrimary, { marginTop: 12 }]}>
              <Text style={{ color: THEME.light.white, fontFamily: "Poppins_600SemiBold" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
