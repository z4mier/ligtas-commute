import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  SafeAreaView, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

export default function LoginScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });

  const { width } = useWindowDimensions();
  const HERO_H = 200;                         
  const CIRCLE = Math.max(width * 3.4, 1700); 
  const CURVE_DEPTH = Math.round(HERO_H * 0.9);
  const ICON = Math.min(120, Math.max(88, HERO_H * 0.6));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: undefined, password: undefined, general: undefined });

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validate = () => {
    const e = {};
    if (!isValidEmail(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Enter your password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function handleLogin() {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || "Login failed";
        const lower = String(msg).toLowerCase();
        const fieldErr = {};
        if (lower.includes("credential") || res.status === 401) fieldErr.password = "Invalid email or password.";
        else if (lower.includes("email")) fieldErr.email = msg;
        setErrors((prev) => ({ ...prev, ...fieldErr, general: Object.keys(fieldErr).length ? undefined : msg }));
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      if (data.role === "DRIVER") navigation.replace("DriverDashboard");
      else if (data.role === "COMMUTER") navigation.replace("CommuterDashboard");
      else setErrors({ general: "Logged in, but dashboard is not configured for this role." });
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingBox}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Curved hero */}
      <View style={[styles.curveHero, { height: HERO_H }]}>
        <View
          style={[
            styles.curveFill,
            {
              width: CIRCLE,
              height: CIRCLE,
              top: -CIRCLE + CURVE_DEPTH, 
              borderBottomLeftRadius: CIRCLE,
              borderBottomRightRadius: CIRCLE,
            },
          ]}
        />
        <View style={styles.hero}>
          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: ICON, height: ICON, resizeMode: "contain", tintColor: "#FFFFFF" }}
          />
          <Text style={[styles.brandTitle, styles.f700]}>
            <Text style={styles.f700}>Ligtas</Text>Commute
          </Text>
          <Text style={[styles.subtle, styles.f400]}>Safety that rides with you</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={styles.bodyPad}>
        <Text style={[styles.h2, styles.center, styles.f600]}>Login</Text>

        <View style={styles.fieldBlock}>
          <Text style={[styles.label, styles.f600]}>Email Address</Text>
          <View style={[styles.inputWrap, errors.email && styles.inputError]}>
            <MaterialCommunityIcons name="email-outline" size={20} color={errors.email ? "#EF4444" : "#6B7280"} style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.f400]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined, general: undefined })); }}
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.label, styles.f600]}>Password</Text>
          <View style={[styles.inputWrap, errors.password && styles.inputError]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={errors.password ? "#EF4444" : "#6B7280"} style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.f400]}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined, general: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.rightIconBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {errors.general ? <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.general}</Text> : null}

        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.primaryBtn}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryBtnText, styles.f600]}>Sign in</Text>}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={[styles.smallText, styles.subtle, styles.f400]}>Don’t have an account?</Text>
          <Pressable onPress={() => navigation.navigate("Signup")} hitSlop={8}>
            <Text style={[styles.linkText, styles.f600]}>  Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  bgdark: "#0F1B2B",
  brand: "#2078A8",
  inputBg: "#FFFFFF",
  border: "#2A3B52",
  link: "#9CC7E5",
};

const styles = StyleSheet.create({
  f400: { fontFamily: "Poppins_400Regular" },
  f600: { fontFamily: "Poppins_600SemiBold" },
  f700: { fontFamily: "Poppins_700Bold" },

  screen: { flex: 1, backgroundColor: COLORS.bgdark },
  loadingBox: { flex: 1, backgroundColor: COLORS.bgdark, alignItems: "center", justifyContent: "center" },
  bodyPad: { paddingHorizontal: 20 },
  center: { textAlign: "center" },

  curveHero: { width: "100%", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  curveFill: { position: "absolute", alignSelf: "center", backgroundColor: COLORS.brand },
  hero: { alignItems: "center", paddingBottom: 10 },

  brandTitle: { color: "#FFFFFF", fontSize: 30, marginTop: 6, letterSpacing: 0.2 },
  subtle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },

  h2: { color: "#FFFFFF", fontSize: 22, marginTop: 8, marginBottom: 16 },

  fieldBlock: { marginBottom: 12 },
  label: { color: "#FFFFFF", fontSize: 12.5, marginBottom: 6 },

  inputWrap: {
    height: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg, flexDirection: "row", alignItems: "center",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 6 },

  leftIcon: { position: "absolute", left: 12, zIndex: 1 },
  rightIconBtn: { position: "absolute", right: 8, padding: 6 },

  input: { flex: 1, height: "100%", paddingLeft: 44, paddingRight: 40, fontSize: 14.5, color: "#0F1B2B" },

  primaryBtn: {
    height: 48, borderRadius: 10, backgroundColor: COLORS.brand,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16 },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  smallText: { fontSize: 12.5 },
  linkText: { color: COLORS.link, textDecorationLine: "underline", fontSize: 13.5 },
});
