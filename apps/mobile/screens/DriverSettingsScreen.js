// apps/mobile/screens/DriverSettingsScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
  Platform,
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
import LCText from "../components/LCText";

function useToast(theme, topOffset = 10) {
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState("success");
  const [visible, setVisible] = useState(false);
  const y = useRef(new Animated.Value(-100)).current;

  const show = useCallback(
    (text, t = "success") => {
      setTone(t);
      setMsg(text);
      setVisible(true);
      Animated.sequence([
        Animated.timing(y, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(y, { toValue: -100, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    },
    [y]
  );

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
        <LCText style={{ fontFamily: "Poppins_600SemiBold", color: THEME.light.white }}>
          {msg}
        </LCText>
      </Animated.View>
    ),
  };
}

const makeStyles = (C) =>
  StyleSheet.create({
    f400: { fontFamily: "Poppins_400Regular" },
    f600: { fontFamily: "Poppins_600SemiBold" },
    f700: { fontFamily: "Poppins_700Bold" },

    screen: { flex: 1, backgroundColor: C.page },
    loadingBox: {
      flex: 1,
      backgroundColor: C.page,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 18, color: C.text },
    bodyPad: { paddingHorizontal: 16, flex: 1 },

    card: {
      backgroundColor: C.card,
      borderRadius: 10,
      padding: 14,
      marginTop: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { color: C.text, fontSize: 14 },
    small: { fontSize: 12, color: C.text },

    rowLeft: { flexDirection: "row", alignItems: "center" },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.brand,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarLarge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: C.brand,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImg: { width: "100%", height: "100%" },
    cameraBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: C.border,
    },
    name: { color: C.text, fontSize: 15 },

    btn: { height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    btnPrimary: { backgroundColor: C.brand },
    btnLight: { backgroundColor: C.ghostBg, borderWidth: 1, borderColor: C.border },
    btnGhost: { backgroundColor: C.ghostBg, borderWidth: 1, borderColor: C.border },

    modalOverlay: {
      flex: 1,
      backgroundColor: C.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    modalBox: {
      width: "92%",
      maxWidth: 420,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },

    infoBoxHeader: {
      backgroundColor: C.infoBoxBg,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    roundIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.white,
    },
    infoBoxBody: {
      backgroundColor: C.infoBoxBg,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: C.border,
      padding: 10,
    },
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },

    input: {
      height: 44,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: C.inputBg,
      color: C.text,
      paddingRight: 44,
    },
    inputFlat: {
      height: 40,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      backgroundColor: C.inputBg,
      color: C.text,
    },

    errBox: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: C.danger,
      flexDirection: "row",
      alignItems: "center",
    },
    errText: { color: THEME.light.white, fontFamily: "Poppins_400Regular", fontSize: 12 },

    ecRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    ecName: { color: C.text, fontWeight: "700" },
    ecPhone: { color: C.text, fontSize: 12 },
    ecRel: { color: C.text, fontSize: 12, opacity: 0.8 },
    ecActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  });

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE =
  /^(?:\+?63\s?9\d{2}[- ]?\d{3}[- ]?\d{4}|09\d{9})$/;

function phonePretty(x = "") {
  return x
    .replace(/\s+/g, "")
    .replace(/^(?:\+?63)?0?/, (m) => (m.startsWith("+63") ? "+63" : "09"));
}

function buildFileFromAsset(asset) {
  const uri = asset.uri;
  const name =
    asset.fileName ||
    (Platform.OS === "ios"
      ? "avatar.jpg"
      : uri?.split("/").pop() || "avatar.jpg");

  let type = asset.mimeType || "image/jpeg";
  if (name.toLowerCase().endsWith(".png")) type = "image/png";

  return { uri, name, type };
}

async function tryUploadTo(token, fileObj) {
  const endpoint = `${API_URL}/driver/profile/avatar`;

  const form = new FormData();
  form.append("avatar", fileObj);

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const js = await r.json().catch(() => ({}));

  if (!r.ok) {
    console.log("avatar upload response:", r.status, js);
    const msg = js?.message || `UPLOAD_FAILED_${r.status}`;
    throw new Error(msg);
  }

  return js;
}

export default function DriverSettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const { mode, theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  const { show, Toast } = useToast(theme, insets.top + 10);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    createdAt: new Date().toISOString(),
    profileUrl: null,
    emergencyContacts: [],
  });

  const [profileModal, setProfileModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [securityModal, setSecurityModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [original, setOriginal] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [pErr, setPErr] = useState("");
  const [pLoading, setPLoading] = useState(false);

  const [editErr, setEditErr] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarErr, setAvatarErr] = useState("");

  const [contacts, setContacts] = useState([]);
  const [ecModal, setEcModal] = useState(false);
  const [ecErr, setEcErr] = useState("");
  const [ecLoading, setEcLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRel, setEcRel] = useState("");

  const fetchMe = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return navigation.replace("Login");

    let userData = {};
    try {
      const r = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) userData = await r.json();
    } catch {}

    let d1 = {};
    try {
      const r = await fetch(`${API_URL}/driver/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) d1 = await r.json();
    } catch {}

    let d2 = {};
    try {
      const r = await fetch(`${API_URL}/driver/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) d2 = await r.json();
    } catch {}

    const driverRaw = Object.keys(d1 || {}).length ? d1 : d2;
    const driverData = driverRaw?.data ?? driverRaw;
    const user = userData?.data ?? userData;
    const driverProfile = driverData?.driverProfile ?? driverData?.profile ?? {};

    const emergencyContacts = Array.isArray(user?.emergencyContacts)
      ? user.emergencyContacts
      : [];

    const nextProfile = {
      fullName:
        pick(driverData, ["fullName"]) ??
        pick(driverProfile, ["fullName"]) ??
        pick(user, ["fullName"]) ??
        "—",
      email: pick(user, ["email"]) ?? pick(driverData, ["email"]) ?? "",
      phone: pick(user, ["phone"]) ?? pick(driverData, ["phone"]) ?? "",
      address: pick(user, ["address"]) ?? pick(driverData, ["address"]) ?? "",
      createdAt:
        pick(user, ["createdAt"]) ??
        pick(driverData, ["createdAt"]) ??
        new Date().toISOString(),
      profileUrl:
        pick(driverData, ["profileUrl", "avatarUrl", "photoUrl", "profile_url", "avatar_url"]) ??
        pick(driverProfile, ["profileUrl", "avatarUrl", "photoUrl"]) ??
        pick(user, ["profileUrl", "avatarUrl"]) ??
        null,
      emergencyContacts,
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

    setContacts(nextProfile.emergencyContacts.slice(0, 3));
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
      } finally {
        setLoading(false);
      }
    })();
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
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail))
      return setEditErr("Please enter a valid email address.");
    try {
      setEditLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!currentPassword || !newPassword || !confirmPassword)
      return setPErr("Fill all password fields.");
    if (newPassword.length < 6)
      return setPErr("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword)
      return setPErr("Passwords do not match.");
    try {
      setPLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return setPErr(data?.message || "Update failed. Please try again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCur(false);
      setShowNew(false);
      setShowCon(false);
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) {
        setAvatarLoading(false);
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset) {
        setAvatarErr("No image selected. Please try again.");
        setAvatarLoading(false);
        return;
      }

      const fileObj = buildFileFromAsset(asset);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAvatarErr("Session expired. Please log in again.");
        setAvatarLoading(false);
        return;
      }

      const js = await tryUploadTo(token, fileObj);

      const newUrl =
        js?.profileUrl ||
        js?.avatarUrl ||
        js?.url ||
        js?.location ||
        asset.uri;

      setProfile((p) => ({ ...p, profileUrl: newUrl }));
      setAvatarErr("");
      show("Profile photo updated");
    } catch (err) {
      console.log("Avatar upload error:", err);
      setAvatarErr("Upload failed. Please try again.");
    } finally {
      setAvatarLoading(false);
    }
  }, [show]);

  function openAddContact() {
    if (contacts.length >= 3) {
      show("You can add up to 3 contacts only.", "danger");
      return;
    }
    setEditingIndex(-1);
    setEcName("");
    setEcPhone("");
    setEcRel("");
    setEcErr("");
    setEcModal(true);
  }

  function openEditContact(idx) {
    const c = contacts[idx];
    setEditingIndex(idx);
    setEcName(c?.name || "");
    setEcPhone(c?.phone || "");
    setEcRel(c?.relation || "");
    setEcErr("");
    setEcModal(true);
  }

  function removeContact(idx) {
    const next = contacts.filter((_, i) => i !== idx);
    setContacts(next);
    saveContacts(next, false);
  }

  async function saveContacts(nextList, closing = true) {
    try {
      const payload = nextList.map((c, i) => ({
        ...c,
        priority: i,
      }));
      setEcLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emergencyContacts: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEcErr(data?.message || "Update failed");
        return;
      }
      const returned = Array.isArray(data?.emergencyContacts)
        ? data.emergencyContacts
        : payload;
      setContacts(returned);
      setProfile((p) => ({
        ...p,
        emergencyContacts: returned,
      }));
      show("Emergency contacts saved");
      if (closing) setEcModal(false);
    } catch {
      setEcErr("Network error");
    } finally {
      setEcLoading(false);
    }
  }

  function onSubmitContact() {
    setEcErr("");
    const nm = ecName.trim();
    const ph = ecPhone.trim();
    const rl = ecRel.trim();
    if (!nm) return setEcErr("Please enter a name.");
    if (!ph || !PHONE_RE.test(ph))
      return setEcErr("Please enter a valid PH mobile number.");

    const item = { name: nm, phone: ph, relation: rl || "—" };
    let next = [...contacts];
    if (editingIndex === -1) {
      if (next.length >= 3)
        return setEcErr("You can add up to 3 contacts only.");
      next.push(item);
    } else {
      next[editingIndex] = item;
    }
    setContacts(next);
    saveContacts(next, true);
  }

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.loadingBox}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={theme.text} />
      </SafeAreaView>
    );
  }

  const joinText = `Member since ${new Date(
    profile?.createdAt || Date.now()
  ).toLocaleString("default", { month: "long", year: "numeric" })}`;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {Toast}

      <ScrollView
        style={s.bodyPad}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 6, paddingRight: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.brand} />
          </TouchableOpacity>
          <LCText style={[s.title, s.f700]}>Settings</LCText>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <LCText style={[s.sectionTitle, s.f700]}>Profile</LCText>
            <LCText style={[s.small, { color: theme.textSub }]}>
              Tap to view profile
            </LCText>
          </View>

          <TouchableOpacity style={s.profileRow} onPress={() => setProfileModal(true)}>
            <View style={s.avatar}>
              {profile.profileUrl ? (
                <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
              ) : (
                <LCText
                  style={[
                    s.f700,
                    { color: THEME.light.white, fontSize: 16 },
                  ]}
                >
                  {profile.fullName?.[0]?.toUpperCase() || "U"}
                </LCText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <LCText style={[s.name, s.f600]}>{profile.fullName || "—"}</LCText>
              <LCText style={[s.small, { color: theme.textSub }]}>{joinText}</LCText>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <LCText style={[s.sectionTitle, s.f700]}>Emergency Contacts</LCText>
            <LCText style={[s.small, { color: theme.textSub }]}>
              Add up to 3 contacts
            </LCText>
          </View>

          {contacts.length === 0 ? (
            <LCText style={[s.small, { color: theme.textSub, marginTop: 8 }]}>
              No contacts yet.
            </LCText>
          ) : (
            <View style={{ marginTop: 6 }}>
              {contacts.map((c, idx) => (
                <View key={`${c.phone}-${idx}`} style={s.ecRow}>
                  <MaterialCommunityIcons
                    name="account-heart-outline"
                    size={18}
                    color={theme.brand}
                  />
                  <View style={{ flex: 1 }}>
                    <LCText style={s.ecName}>{c.name}</LCText>
                    <LCText style={s.ecPhone}>{phonePretty(c.phone)}</LCText>
                    {!!c.relation && <LCText style={s.ecRel}>{c.relation}</LCText>}
                  </View>
                  <View style={s.ecActions}>
                    <TouchableOpacity onPress={() => openEditContact(idx)}>
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={18}
                        color={theme.text}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeContact(idx)}>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={theme.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={openAddContact}
            disabled={contacts.length >= 3}
            style={[
              s.btn,
              s.btnGhost,
              { marginTop: 10, opacity: contacts.length >= 3 ? 0.6 : 1 },
            ]}
          >
            <LCText style={[s.f600, { color: theme.text }]}>
              Add Emergency Contact
            </LCText>
          </TouchableOpacity>
        </View>

        <TermsAndPrivacyModals theme={theme} s={s} />
        <HelpSupportModals theme={theme} s={s} />

        <View style={[s.card, { marginTop: 12 }]}>
          <TouchableOpacity onPress={() => setLogoutModal(true)} style={s.rowLeft}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.danger} />
            <LCText style={[s.f600, { color: theme.danger, marginLeft: 8 }]}>
              Logout
            </LCText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={profileModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <LCText style={[s.f700, { fontSize: 16, color: theme.brand }]}>
                Profile
              </LCText>
              <TouchableOpacity onPress={() => setProfileModal(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <View style={s.avatarLarge}>
                {profile.profileUrl ? (
                  <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
                ) : (
                  <LCText
                    style={[
                      s.f700,
                      { color: THEME.light.white, fontSize: 20 },
                    ]}
                  >
                    {profile.fullName?.[0]?.toUpperCase() || "U"}
                  </LCText>
                )}
              </View>
              <LCText
                style={[
                  s.f700,
                  { fontSize: 16, color: theme.text, marginTop: 10 },
                ]}
              >
                {profile.fullName || "—"}
              </LCText>
            </View>

            <View style={s.infoBoxHeader}>
              <LCText style={[s.f600, { color: theme.text }]}>
                Personal Information
              </LCText>
              <TouchableOpacity
                onPress={() => {
                  setProfileModal(false);
                  setEditModal(true);
                }}
                style={s.roundIcon}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={16}
                  color={theme.brand}
                />
              </TouchableOpacity>
            </View>
            <View style={s.infoBoxBody}>
              <InfoRow theme={theme} s={s} icon="email-outline" text={email || "—"} />
              <InfoRow theme={theme} s={s} icon="phone-outline" text={phone || "—"} />
              <InfoRow theme={theme} s={s} icon="map-marker-outline" text={address || "—"} />
              <InfoRow theme={theme} s={s} icon="calendar-month-outline" text={joinText} />
            </View>

            <LCText style={[s.f600, { marginTop: 12, color: theme.text }]}>
              Security
            </LCText>
            <TouchableOpacity
              onPress={() => {
                setProfileModal(false);
                setSecurityModal(true);
              }}
              style={[s.btn, s.btnLight, { marginTop: 8 }]}
            >
              <LCText style={[s.f600, { color: theme.text }]}>
                Change Password
              </LCText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <LCText style={[s.f700, { fontSize: 16, color: theme.brand }]}>
                Edit Profile
              </LCText>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <TouchableOpacity
                onPress={pickAndUploadAvatar}
                activeOpacity={0.8}
                style={s.avatarLarge}
              >
                {profile.profileUrl ? (
                  <Image source={{ uri: profile.profileUrl }} style={s.avatarImg} />
                ) : (
                  <LCText
                    style={[
                      s.f700,
                      { color: THEME.light.white, fontSize: 20 },
                    ]}
                  >
                    {fullName?.[0]?.toUpperCase() || "U"}
                  </LCText>
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
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={THEME.light.white}
                  />
                  <LCText style={[s.errText, { marginLeft: 6 }]}>{avatarErr}</LCText>
                </View>
              ) : null}

              <LCText style={[s.small, { color: theme.textSub, marginTop: 6 }]}>
                Tap photo to change
              </LCText>

              <TextInput
                style={[s.input, { textAlign: "center", marginTop: 10, paddingRight: 12 }]}
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (editErr) setEditErr("");
                }}
                placeholder="Full Name"
                placeholderTextColor={theme.textSub}
              />
            </View>

            <View style={s.infoBoxBody}>
              <EditRow theme={theme} s={s} icon="email-outline">
                <TextInput
                  style={s.inputFlat}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (editErr) setEditErr("");
                  }}
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
            </View>

            {editErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color={THEME.light.white}
                />
                <LCText style={[s.errText, { marginLeft: 6 }]}>{editErr}</LCText>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={saveProfile}
                disabled={!hasChanges || editLoading}
                style={[
                  s.btn,
                  s.btnPrimary,
                  { flex: 1, opacity: !hasChanges || editLoading ? 0.6 : 1 },
                ]}
              >
                {editLoading ? (
                  <ActivityIndicator color={THEME.light.white} />
                ) : (
                  <LCText style={[s.f600, { color: THEME.light.white }]}>
                    Save
                  </LCText>
                )}
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
                <LCText style={[s.f600, { color: theme.text }]}>
                  Cancel
                </LCText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={securityModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <LCText style={[s.f700, { fontSize: 16, color: theme.brand }]}>
                Change Password
              </LCText>
              <TouchableOpacity onPress={() => setSecurityModal(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative", marginBottom: 8 }}>
              <TextInput
                style={s.input}
                value={currentPassword}
                onChangeText={(v) => {
                  setCurrentPassword(v);
                  if (pErr) setPErr("");
                }}
                placeholder="Current Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showCur}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 10 }}
                onPress={() => setShowCur((v) => !v)}
              >
                <Ionicons
                  name={showCur ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSub}
                />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative", marginBottom: 8 }}>
              <TextInput
                style={s.input}
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  if (pErr) setPErr("");
                }}
                placeholder="New Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 10 }}
                onPress={() => setShowNew((v) => !v)}
              >
                <Ionicons
                  name={showNew ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSub}
                />
              </TouchableOpacity>
            </View>

            <View style={{ position: "relative" }}>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (pErr) setPErr("");
                }}
                placeholder="Confirm New Password"
                placeholderTextColor={theme.textSub}
                secureTextEntry={!showCon}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 10 }}
                onPress={() => setShowCon((v) => !v)}
              >
                <Ionicons
                  name={showCon ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSub}
                />
              </TouchableOpacity>
            </View>

            {pErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color={THEME.light.white}
                />
                <LCText style={[s.errText, { marginLeft: 6 }]}>{pErr}</LCText>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={updatePassword}
              disabled={pLoading}
              style={[s.btn, s.btnPrimary, { marginTop: 8, opacity: pLoading ? 0.7 : 1 }]}
            >
              {pLoading ? (
                <ActivityIndicator color={THEME.light.white} />
              ) : (
                <LCText style={[s.f600, { color: THEME.light.white }]}>
                  Update Password
                </LCText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={ecModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <LCText style={[s.f700, { fontSize: 16, color: theme.brand }]}>
                {editingIndex === -1 ? "Add Emergency Contact" : "Edit Emergency Contact"}
              </LCText>
              <TouchableOpacity onPress={() => setEcModal(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 8 }}>
              <TextInput
                style={s.input}
                value={ecName}
                onChangeText={(v) => {
                  setEcName(v);
                  if (ecErr) setEcErr("");
                }}
                placeholder="Full Name"
                placeholderTextColor={theme.textSub}
              />
            </View>
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={s.input}
                value={ecPhone}
                onChangeText={(v) => {
                  setEcPhone(v);
                  if (ecErr) setEcErr("");
                }}
                keyboardType="phone-pad"
                placeholder="Phone (e.g. 09XXXXXXXXX)"
                placeholderTextColor={theme.textSub}
              />
            </View>
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={s.input}
                value={ecRel}
                onChangeText={setEcRel}
                placeholder="Relation (optional)"
                placeholderTextColor={theme.textSub}
              />
            </View>

            {ecErr ? (
              <View style={s.errBox}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color={THEME.light.white}
                />
                <LCText style={[s.errText, { marginLeft: 6 }]}>{ecErr}</LCText>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={onSubmitContact}
              disabled={ecLoading}
              style={[s.btn, s.btnPrimary, { marginTop: 8, opacity: ecLoading ? 0.7 : 1 }]}
            >
              {ecLoading ? (
                <ActivityIndicator color={THEME.light.white} />
              ) : (
                <LCText style={[s.f600, { color: THEME.light.white }]}>
                  Save
                </LCText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <LCText style={[s.f700, { fontSize: 16, color: theme.brand }]}>
                Logout
              </LCText>
              <TouchableOpacity onPress={() => setLogoutModal(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>
            <LCText
              style={{
                marginBottom: 14,
                color: theme.text,
                fontFamily: "Poppins_400Regular",
              }}
            >
              Are you sure you want to logout?
            </LCText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setLogoutModal(false)}
                style={[s.btn, s.btnLight, { flex: 1 }]}
              >
                <LCText style={[s.f600, { color: theme.text }]}>
                  Cancel
                </LCText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={doLogout}
                style={[s.btn, s.btnPrimary, { flex: 1 }]}
              >
                <LCText style={[s.f600, { color: THEME.light.white }]}>
                  Logout
                </LCText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ theme, s, icon, text }) {
  return (
    <View style={s.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.brand} />
      <LCText
        style={{
          marginLeft: 8,
          color: theme.text,
          fontFamily: "Poppins_400Regular",
          fontSize: 12,
        }}
      >
        {text}
      </LCText>
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

function TermsAndPrivacyModals({ theme, s }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={[s.card, { marginTop: 12 }]} onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color={theme.brand}
          />
          <LCText
            style={{
              marginLeft: 8,
              color: theme.text,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Terms & Privacy
          </LCText>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: "75%" }]}>
            <View style={s.modalHeader}>
              <LCText
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 16,
                  color: theme.brand,
                }}
              >
                LigtasCommute Terms and Privacy
              </LCText>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <LCText
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: theme.text,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
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
              </LCText>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[s.btn, s.btnPrimary, { marginTop: 12 }]}
            >
              <LCText
                style={{
                  color: THEME.light.white,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                OK
              </LCText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function HelpSupportModals({ theme, s }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.card} onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="help-circle-outline"
            size={20}
            color={theme.brand}
          />
          <LCText
            style={{
              marginLeft: 8,
              color: theme.text,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Help & Support
          </LCText>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: "75%" }]}>
            <View style={s.modalHeader}>
              <LCText
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 16,
                  color: theme.brand,
                }}
              >
                Help & Support
              </LCText>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={18} color={theme.brand} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <LCText
                style={{
                  fontFamily: "Poppins_400Regular",
                  color: theme.text,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                • Close and restart the app{"\n"}
                • Check internet connection{"\n"}
                • Update to the latest version{"\n"}
                • Ensure GPS and camera permissions are enabled{"\n\n"}
                Common Issues{"\n"}
                • Can’t scan QR code? Check camera permissions.{"\n"}
                • Location not updating? Make sure GPS is on.{"\n"}
                • Still stuck? Contact support@ligtascommute.com
              </LCText>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[s.btn, s.btnPrimary, { marginTop: 12 }]}
            >
              <LCText
                style={{
                  color: THEME.light.white,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                OK
              </LCText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
