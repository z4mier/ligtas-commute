import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, StyleSheet
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

export default function SignupScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    if (!fullName || !email || !phone || !password || !confirm)
      return Alert.alert("Missing fields", "Please complete all fields.");
    if (password.length < 6) return Alert.alert("Weak password", "Use at least 6 characters.");
    if (password !== confirm) return Alert.alert("Password mismatch", "Passwords do not match.");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: email.trim().toLowerCase(),
          phone,
          password,
          role: "COMMUTER",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Registration failed");

      Alert.alert("Success", "Account created. Please sign in.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    } catch (err) {
      Alert.alert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!fontsLoaded) {
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
          <MaterialCommunityIcons name="bus" size={48} color="#FFFFFF" />
          <Text style={[s.h2, s.f700]}>
            Join <Text style={s.f700}>LigtasCommute</Text>
          </Text>
          <Text style={[s.subtle, s.f400]}>
            Create your account to start safe commuting
          </Text>
        </View>

        <Field label="Full Name" icon="account-outline" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />
        <Field label="Email" icon="email-outline" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone Number" icon="phone-outline" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" keyboardType="phone-pad" />
        <Field
          label="Password" icon="lock-outline" value={password} onChangeText={setPassword}
          placeholder="Create password" secureTextEntry={!showPw}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.rightIconBtn}>
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          }
        />
        <Field
          label="Confirm Password" icon="lock-check-outline" value={confirm} onChangeText={setConfirm}
          placeholder="Confirm your password" secureTextEntry={!showConfirm}
          rightIcon={
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.rightIconBtn}>
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          }
        />

        <TouchableOpacity onPress={createAccount} disabled={loading} style={s.primaryBtn}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[s.primaryBtnText, s.f600]}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={s.footerRow}>
          <Text style={[s.subtle, s.f400]}>Already have an account?</Text>
          <Pressable onPress={() => navigation.replace("Login")} hitSlop={8}>
            <Text style={[s.linkText, s.f600]}>  Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, icon, rightIcon, ...inputProps }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[s.label, s.f600]}>{label}</Text>
      <View style={s.inputWrap}>
        <MaterialCommunityIcons name={icon} size={20} color="#6B7280" style={s.leftIcon} />
        <TextInput
          style={[s.input, s.f400]}
          placeholderTextColor="#9CA3AF"
          {...inputProps}
        />
        {rightIcon}
      </View>
    </View>
  );
}

const COLORS = {
  bgdark: "#0F1B2B",
  brand: "#2078A8",
  inputBg: "#FFFFFF",
  border: "#2A3B52",
  link: "#9CC7E5",
};

const s = StyleSheet.create({
  // fonts
  f400: { fontFamily: "Poppins_400Regular" },
  f600: { fontFamily: "Poppins_600SemiBold" },
  f700: { fontFamily: "Poppins_700Bold" },

  screen: { flex: 1, backgroundColor: COLORS.bgdark },
  loadingBox: { flex: 1, backgroundColor: COLORS.bgdark, alignItems: "center", justifyContent: "center" },
  bodyPad: { paddingHorizontal: 20 },

  backRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  backText: { color: "rgba(255,255,255,0.85)", marginLeft: 6 },

  header: { alignItems: "center", marginTop: 10 },
  h2: { color: "#FFFFFF", fontSize: 22, marginTop: 16 },
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
  leftIcon: { position: "absolute", left: 12, zIndex: 1 },
  rightIconBtn: { position: "absolute", right: 8, padding: 6 },
  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 44,
    paddingRight: 40,
    fontSize: 14.5,
    color: "#0F1B2B",
  },

  primaryBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16 },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 16, marginBottom: 18 },
  linkText: { color: COLORS.link, textDecorationLine: "underline", fontSize: 13.5 },
});
