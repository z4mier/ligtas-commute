// apps/mobile-driver/screens/SettingsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

const COLORS = {
  bgdark: "#0F1B2B",
  brand: "#2078A8",
  inputBg: "#FFFFFF",
  border: "#2A3B52",
  link: "#9CC7E5",
  danger: "#EF4444",
  success: "#22C55E",
};

export default function SettingsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [errors, setErrors] = useState({
    fullName: undefined,
    email: undefined,
    phone: undefined,
    general: undefined,
    success: undefined,
  });

  const original = useMemo(
    () => ({ fullName, email, phone }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading] // lock initial snapshot after fetch completes
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigation.replace("Login");
          return;
        }
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
          return;
        }
        const data = await res.json();
        setFullName(data?.fullName || "");
        setEmail(data?.email || "");
        setPhone(data?.phone || "");
      } catch (_err) {
        setErrors((e) => ({ ...e, general: "Failed to load profile." }));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  const normalizePhone = (v) => String(v).replace(/\D/g, "");

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!isValidEmail(email)) e.email = "Enter a valid email.";
    const digits = normalizePhone(phone);
    if (digits.length < 10 || digits.length > 13) e.phone = "Enter a valid phone number.";
    setErrors((prev) => ({ ...prev, ...e, general: undefined, success: undefined }));
    return Object.keys(e).length === 0;
  };

  const hasChanges =
    !loading &&
    (fullName !== original.fullName ||
      email !== original.email ||
      phone !== original.phone);

  async function saveProfile() {
    if (!validate()) return;
    if (!hasChanges) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          (res.status === 409 ? "Email already in use." : "Update failed.");
        const lower = String(msg).toLowerCase();
        const fieldErr = {};
        if (lower.includes("email")) fieldErr.email = msg;
        else if (lower.includes("phone")) fieldErr.phone = msg;
        else if (lower.includes("full name")) fieldErr.fullName = msg;

        setErrors((prev) => ({
          ...prev,
          ...fieldErr,
          general: Object.keys(fieldErr).length ? undefined : msg,
          success: undefined,
        }));
        return;
      }

      setErrors({ fullName: undefined, email: undefined, phone: undefined, general: undefined, success: "Profile saved." });
      setEditing(false);
    } catch (_err) {
      setErrors((prev) => ({ ...prev, general: "Network error. Please try again.", success: undefined }));
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  }

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.loadingBox}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={s.bodyPad}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
          <Text style={[s.backText, s.f400]}>Back</Text>
        </TouchableOpacity>

        <View style={s.header}>
          <MaterialCommunityIcons name="account-cog" size={42} color="#FFFFFF" />
          <Text style={[s.h2, s.f700]}>Settings</Text>
          <Text style={[s.subtle, s.f400]}>Manage your profile</Text>
        </View>

        <Field
          label="Full Name"
          icon="account-outline"
          editable={editing}
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            setErrors((e) => ({ ...e, fullName: undefined, general: undefined, success: undefined }));
          }}
          error={errors.fullName}
        />

        <Field
          label="Email"
          icon="email-outline"
          editable={editing}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((e) => ({ ...e, email: undefined, general: undefined, success: undefined }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <Field
          label="Phone Number"
          icon="phone-outline"
          editable={editing}
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setErrors((e) => ({ ...e, phone: undefined, general: undefined, success: undefined }));
          }}
          keyboardType="phone-pad"
          error={errors.phone}
        />

        {errors.general ? <Text style={s.errorText}>{errors.general}</Text> : null}
        {errors.success ? <Text style={s.successText}>{errors.success}</Text> : null}

        {editing ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity onPress={saveProfile} disabled={saving} style={[s.modalBtn, s.btnPrimary, { flex: 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnPrimaryText, s.f600]}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditing(false);
                setErrors({ fullName: undefined, email: undefined, phone: undefined, general: undefined, success: undefined });
                // reset to original fetched values
                setFullName(original.fullName);
                setEmail(original.email);
                setPhone(original.phone);
              }}
              style={[s.modalBtn, s.btnGhost, { flex: 1 }]}
            >
              <Text style={[s.btnGhostText, s.f600]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={[s.modalBtn, s.btnPrimary, { marginTop: 12 }]}>
            <Text style={[s.btnPrimaryText, s.f600]}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={logout} style={[s.modalBtn, s.btnDanger, { marginTop: 10 }]}>
          <Text style={[s.btnDangerText, s.f600]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, icon, error, editable = false, ...inputProps }) {
  const hasErr = !!error;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[s.label, s.f600]}>{label}</Text>
      <View style={[s.inputWrap, hasErr && s.inputError, !editable && s.inputDisabled]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={hasErr ? COLORS.danger : "#6B7280"}
          style={s.leftIcon}
        />
        <TextInput
          editable={editable}
          style={[s.input, s.f400, !editable && { color: "#6B7280" }]}
          placeholderTextColor="#9CA3AF"
          {...inputProps}
        />
      </View>
      {hasErr && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  f400: { fontFamily: "Poppins_400Regular" },
  f600: { fontFamily: "Poppins_600SemiBold" },
  f700: { fontFamily: "Poppins_700Bold" },

  screen: { flex: 1, backgroundColor: COLORS.bgdark },
  loadingBox: { flex: 1, backgroundColor: COLORS.bgdark, alignItems: "center", justifyContent: "center" },
  bodyPad: { paddingHorizontal: 20 },
  backRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  backText: { color: "rgba(255,255,255,0.85)", marginLeft: 6 },
  header: { alignItems: "center", marginTop: 10 },
  h2: { color: "#FFFFFF", fontSize: 22, marginTop: 12 },
  subtle: { color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 },

  label: { color: "#FFFFFF", fontSize: 12.5, marginBottom: 6 },

  inputWrap: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    flexDirection: "row",
    alignItems: "center",
  },
  inputError: { borderColor: COLORS.danger },
  inputDisabled: { backgroundColor: "#F4F6F8" },

  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 6 },
  successText: { color: COLORS.success, fontSize: 12, marginTop: 6 },

  leftIcon: { position: "absolute", left: 12, zIndex: 1 },
  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 14.5,
    color: "#0F1B2B",
  },

  modalBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: COLORS.brand },
  btnPrimaryText: { color: "#FFFFFF", fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border },
  btnGhostText: { color: "#FFFFFF", fontSize: 16 },
  btnDanger: { backgroundColor: "#1F2937" },
  btnDangerText: { color: "#FCA5A5", fontSize: 16 },
});
