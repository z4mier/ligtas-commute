// screens/SettingsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const API_URL = "http://192.168.125.171:4000";

// ===== helpers =====
const initialsFromName = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const fmtPhone = (s = "") => (s ? s.replace(/[^\d+ ]/g, "") : "");

// Format "Member since" like "April 2025"
function formatMemberSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

// ===== auth + fetch helper (auto-includes Bearer token) =====
const authHeaders = async (extra = {}) => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

async function api(path, opts = {}) {
  const headers = await authHeaders(opts.headers || {});
  return fetch(`${API_URL}${path}`, { ...opts, headers });
}

export default function SettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [lang, setLang] = useState("en");
  const [dark, setDark] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    memberSince: "", // string "April 2025"
  });

  useEffect(() => {
    fetchUser();
  }, []);

  // ===== fetch the logged-in user's profile =====
  async function fetchUser() {
    try {
      setLoading(true);
      const res = await api("/users/me");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load profile");

      // Map API → UI. Backend returns: id, fullName, email, phone, createdAt, points
      const profile = {
        id: data.id,
        fullName: data.fullName ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "", // backend currently doesn't send this; safe to keep
        createdAt: data.createdAt ?? null,
        points: Number.isFinite(data.points) ? data.points : 0,
        language: data.language ?? "en",
      };

      setUser({
        ...profile,
        memberSince: formatMemberSince(profile.createdAt),
      });
      setForm({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        memberSince: formatMemberSince(profile.createdAt),
      });
      setPoints(profile.points);
      setLang(profile.language);
    } catch (e) {
      Alert.alert("Could not load profile", e.message);
      setUser({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        memberSince: "—",
      });
      setForm({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        memberSince: "—",
      });
      setPoints(0);
    } finally {
      setLoading(false);
    }
  }

  // ===== modals =====
  function openProfile() {
    if (!user) return;
    setShowProfile(true);
  }
  function openEdit() {
    setForm({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      memberSince: user?.memberSince || "—",
    });
    setShowProfile(false);
    setShowEdit(true);
  }

  // ===== save profile edits =====
  async function saveProfile() {
    if (!form.fullName?.trim() || !form.email?.trim()) {
      return Alert.alert("Missing info", "Name and email are required.");
    }
    try {
      setSaving(true);
      const res = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone?.trim() || "",
          // address isn't persisted by current backend; safe to send/ignore
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update profile");

      // Merge server response (preferred) or local form
      const next = {
        ...user,
        fullName: data.fullName ?? form.fullName,
        email: data.email ?? form.email,
        phone: data.phone ?? form.phone,
        address: data.address ?? form.address,
      };
      setUser(next);
      setShowEdit(false);
      setShowProfile(true);
      Alert.alert("Saved", "Your profile was updated.");
    } catch (e) {
      Alert.alert("Update failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  // ===== redeem points → set to 0 in DB =====
  async function redeemPoints() {
    if (points <= 0) return;
    try {
      setRedeeming(true);

      // Try POST /users/me/redeem if you have it
      let ok = false;
      try {
        const r1 = await api("/users/me/redeem", { method: "POST" });
        ok = r1.ok;
      } catch {}

      // Fallback: PATCH /users/me { points: 0 }
      if (!ok) {
        const r2 = await api("/users/me", {
          method: "PATCH",
          body: JSON.stringify({ points: 0 }),
        });
        if (!r2.ok) {
          const d2 = await r2.json().catch(() => ({}));
          throw new Error(d2?.message || "Failed to redeem points");
        }
      }

      setPoints(0);
      setUser((u) => ({ ...(u || {}), points: 0 }));
      Alert.alert("Redeemed", "Your points were redeemed and set to 0.");
    } catch (e) {
      Alert.alert("Redeem failed", e.message);
    } finally {
      setRedeeming(false);
    }
  }

  async function changeLanguage(next) {
    try {
      setLang(next);
      await api("/users/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ language: next }),
      }).catch(() => {});
    } catch {}
  }

  function toggleDark(v) {
    setDark(v);
  }

  function manageCredentials() {
    Alert.alert("Coming soon", "Manage Username & Password");
  }
  function openTerms() {
    Alert.alert("Terms & Privacy", "Open Terms & Privacy screen");
  }
  function openHelp() {
    Alert.alert("Help & Support", "Open Help & Support screen");
  }
  async function logout() {
    await AsyncStorage.removeItem("token");
    Alert.alert("Logout", "You have been logged out.");
    navigation?.replace?.("Login"); // adjust to your route
  }

  const initials = useMemo(() => initialsFromName(user?.fullName), [user]);
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Settings</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Profile */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.sectionTitleRow}>
                <MaterialCommunityIcons name="account-cog-outline" size={18} color="#111827" />
                <Text style={s.sectionTitle}>Profile</Text>
              </View>
              <TouchableOpacity onPress={openProfile}>
                <Text style={s.tapHint}>Tap to view profile</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.profileRow} onPress={openProfile} activeOpacity={0.8}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{initials || "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{user?.fullName || "—"}</Text>
                <Text style={s.subtle}>Member since {user?.memberSince || "—"}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Language */}
          <View style={s.card}>
            <View style={s.sectionTitleRow}>
              <MaterialCommunityIcons name="web" size={18} color="#111827" />
              <Text style={s.sectionTitle}>Language</Text>
            </View>
            {[
              { key: "en", label: "English", badge: "US" },
              { key: "tl", label: "Tagalog", badge: "PH" },
              { key: "ceb", label: "Cebuano", badge: "PH" },
            ].map((row) => (
              <TouchableOpacity
                key={row.key}
                style={[s.langRow, lang === row.key && s.langRowActive]}
                onPress={() => changeLanguage(row.key)}
              >
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{row.badge}</Text>
                </View>
                <Text style={[s.langTxt, lang === row.key && s.langTxtActive]}>{row.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Appearance */}
          <View style={s.card}>
            <View style={s.sectionTitleRow}>
              <MaterialCommunityIcons name="brightness-6" size={18} color="#111827" />
              <Text style={s.sectionTitle}>Appearance</Text>
            </View>

            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleTitle}>Dark Mode</Text>
                <Text style={s.subtle}>Switch to dark theme</Text>
              </View>
              <Switch value={dark} onValueChange={toggleDark} />
            </View>
          </View>

          {/* Loyalty */}
          <View style={s.card}>
            <View style={s.sectionTitleRow}>
              <MaterialCommunityIcons name="medal-outline" size={18} color="#111827" />
              <Text style={s.sectionTitle}>Loyalty Rewards</Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={s.subtle}>Current Points</Text>
              <View style={s.pointsRow}>
                <Text style={s.points}>{points}</Text>
                <Text style={s.pointsUnit}>points</Text>
              </View>

              <View style={s.progressTrack}>
                <View style={[s.progressBar, { width: `${clamp(points, 0, 100)}%` }]} />
              </View>

              <Text style={s.progressHint}>
                {points === 0
                  ? "No points yet — earn points from safe rides and reports."
                  : `You're at ${points}/100 points.`}
              </Text>

              <TouchableOpacity
                style={[s.redeemBtn, points <= 0 && { opacity: 0.5 }]}
                disabled={points <= 0 || redeeming}
                onPress={redeemPoints}
                activeOpacity={0.9}
              >
                {redeeming ? <ActivityIndicator color="#111827" /> : <Text style={s.redeemTxt}>Redeem Rewards</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Links */}
          <View style={s.card}>
            <TouchableOpacity style={s.linkRow} onPress={openTerms}>
              <Text style={s.linkTxt}>Terms & Privacy</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={s.linkRow} onPress={openHelp}>
              <Text style={s.linkTxt}>Help & Support</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={s.linkRow} onPress={logout}>
              <Text style={[s.linkTxt, { color: "#EF4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Profile Modal */}
      <Modal visible={showProfile} animationType="fade" transparent onRequestClose={() => setShowProfile(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Profile</Text>
              <TouchableOpacity onPress={() => setShowProfile(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginTop: 6 }}>
              <View style={s.avatarLg}>
                <Text style={s.avatarLgTxt}>{initials || "?"}</Text>
              </View>
              <Text style={s.nameLg}>{user?.fullName || "—"}</Text>
            </View>

            <View style={s.infoBlock}>
              <View style={s.infoHeaderRow}>
                <Text style={s.infoTitle}>Personal Information</Text>
                <TouchableOpacity onPress={openEdit}>
                  <MaterialCommunityIcons name="square-edit-outline" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={s.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#6B7280" />
                <Text style={s.infoTxt}>{user?.email || "—"}</Text>
              </View>
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="phone-outline" size={16} color="#6B7280" />
                <Text style={s.infoTxt}>{fmtPhone(user?.phone) || "—"}</Text>
              </View>
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
                <Text style={s.infoTxt}>{user?.address || "—"}</Text>
              </View>
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#6B7280" />
                <Text style={s.infoTxt}>Member since {user?.memberSince || "—"}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.credBtn} onPress={manageCredentials}>
              <Text style={s.credBtnTxt}>Manage Username & Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} animationType="fade" transparent onRequestClose={() => setShowEdit(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginTop: 6 }}>
              <View style={s.avatarLg}>
                <Text style={s.avatarLgTxt}>{initialsFromName(form.fullName) || "?"}</Text>
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                value={form.fullName}
                onChangeText={(t) => setForm((v) => ({ ...v, fullName: t }))}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(t) => setForm((v) => ({ ...v, email: t }))}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={s.label}>Phone</Text>
                <TextInput
                  style={s.input}
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(t) => setForm((v) => ({ ...v, phone: t }))}
                  placeholder="+63 ..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[s.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={s.label}>Member Since</Text>
                <TextInput style={[s.input, { backgroundColor: "#F3F4F6" }]} value={form.memberSince} editable={false} />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Address</Text>
              <TextInput
                style={s.input}
                value={form.address}
                onChangeText={(t) => setForm((v) => ({ ...v, address: t }))}
                placeholder="City, Country"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={s.editActions}>
              <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===== styles =====
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 10,
    paddingBottom: 8,
    backgroundColor: "#F3F4F6",
  },
  topTitle: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#111827" },

  scroll: { padding: 12, paddingBottom: 120 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  sectionTitleRow: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 14, marginLeft: 6 },

  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tapHint: { fontFamily: "Poppins_400Regular", color: "#9CA3AF", fontSize: 12 },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 14 },

  name: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 14 },
  subtle: { fontFamily: "Poppins_400Regular", color: "#6B7280", fontSize: 12 },

  langRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  langRowActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  badge: {
    width: 34,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  badgeTxt: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  langTxt: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },
  langTxtActive: { color: "#fff" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  toggleTitle: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },

  pointsRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 2 },
  points: { fontFamily: "Poppins_700Bold", color: "#F59E0B", fontSize: 20, marginRight: 4 },
  pointsUnit: { fontFamily: "Poppins_600SemiBold", color: "#9CA3AF", fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: "#ECEFF3", overflow: "hidden", marginTop: 8 },
  progressBar: { height: 8, backgroundColor: "#F59E0B", borderRadius: 6 },
  progressHint: { fontFamily: "Poppins_400Regular", color: "#6B7280", fontSize: 12, marginTop: 6 },

  redeemBtn: {
    marginTop: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  redeemTxt: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },

  linkRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkTxt: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },

  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, padding: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontFamily: "Poppins_700Bold", color: "#111827", fontSize: 16 },

  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  avatarLgTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 20 },
  nameLg: { fontFamily: "Poppins_700Bold", color: "#111827", fontSize: 16, marginTop: 4 },

  infoBlock: { backgroundColor: "#FAFAFA", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 10 },
  infoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  infoTitle: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  infoTxt: { fontFamily: "Poppins_400Regular", color: "#111827", fontSize: 13 },

  credBtn: {
    marginTop: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  credBtnTxt: { fontFamily: "Poppins_600SemiBold", color: "#111827", fontSize: 13 },

  formGroup: { marginTop: 10 },
  label: { fontFamily: "Poppins_600SemiBold", color: "#6B7280", fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 12,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
    fontSize: 13,
  },
  formRow: { flexDirection: "row", marginTop: 6 },
  editActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginRight: 8,
  },
  saveTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 14 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginLeft: 8,
  },
  cancelTxt: { color: "#111827", fontFamily: "Poppins_600SemiBold", fontSize: 14 },
});
