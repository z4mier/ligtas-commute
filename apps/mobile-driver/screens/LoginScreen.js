import React, { useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable, Alert,
  SafeAreaView, ScrollView, ActivityIndicator, useWindowDimensions,
  StyleSheet, Modal, Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const API_URL = "http://192.168.125.171:4000";

async function fetchWithTimeout(resource, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function LoginScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold,
  });

  const ellipse = useMemo(() => {
    const w = Math.max(width * 1.4, 640);
    const h = Math.max(220, Math.min(340, w * 0.42));
    return { width: w, height: h, radius: w };
  }, [width]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpMaskedTarget, setOtpMaskedTarget] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const setOtpDigit = (i, t) => {
    const v = t.replace(/\D/g, "");
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  function needsVerify(resStatus, data) {
    if (!data) return false;
    return (
      data.needsVerification === true ||
      data.code === "VERIFY_REQUIRED" ||
      /verify/i.test(String(data.message || ""))
    ) && (resStatus === 401 || resStatus === 403);
  }

  async function doLogin(rawEmail, rawPassword) {
    const cleanEmail = (rawEmail || "").trim().toLowerCase();
    const cleanPassword = (rawPassword || "").trim();

    const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
    });

    const data = await res.json().catch(() => ({}));

    // needs OTP?
    if (needsVerify(res.status, data)) {
      setOtpEmail(cleanEmail);
      setOtpMaskedTarget(data.target || cleanEmail);
      setOtp(["", "", "", "", "", ""]);
      setOtpVisible(true);
      return;
    }

    if (!res.ok) throw new Error(data?.message || `Login failed (${res.status})`);

    // save token
    if (data?.token) await AsyncStorage.setItem("auth_token", data.token);

    // route by role
    const role = (data?.role || "").toUpperCase();
    if (role === "DRIVER") navigation.replace("DriverDashboard");
    else if (role === "COMMUTER") navigation.replace("CommuterDashboard");
    else Alert.alert("Login", "Logged in, but dashboard not configured for this role.");
  }

  async function handleLogin() {
    if (!email || !password) return Alert.alert("Missing fields", "Please enter your email and password.");
    try {
      setLoading(true);
      Keyboard.dismiss();
      await doLogin(email, password);
    } catch (err) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    const code = otp.join("");
    if (code.length !== 6) return;
    try {
      setLoading(true);
      const r = await fetchWithTimeout(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Verification failed");

      setOtpVisible(false);
      await doLogin(otpEmail, password); // auto-login after verify
    } catch (e) {
      Alert.alert("Verify failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    try {
      const r = await fetchWithTimeout(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await r.json().catch(() => ({}));
      Alert.alert(r.ok ? "Sent" : "Error", data?.message || (r.ok ? "Code sent" : "Failed to resend"));
    } catch (e) {
      Alert.alert("Network error", e.message);
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
      {/* hero */}
      <View style={[styles.ellipseWrap, { height: ellipse.height + 40 }]}>
        <View style={{
          position: "absolute", top: 0, width: ellipse.width, height: ellipse.height,
          backgroundColor: COLORS.brand, borderBottomLeftRadius: ellipse.radius, borderBottomRightRadius: ellipse.radius, zIndex: -1,
        }} />
        <View style={styles.hero}>
          <MaterialCommunityIcons name="bus" size={56} color="#FFFFFF" />
          <Text style={[styles.brandTitle, styles.f700]}>
            <Text style={styles.f700}>Ligtas</Text>Commute
          </Text>
          <Text style={[styles.subtle, styles.f400]}>Safety that rides with you</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={styles.bodyPad} keyboardShouldPersistTaps="handled">
        <Text style={[styles.h2, styles.center, styles.f600]}>Login</Text>

        {/* Email */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.label, styles.f600]}>Email Address</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.f400]}
              placeholder="Enter your email" placeholderTextColor="#9CA3AF"
              keyboardType="email-address" autoCapitalize="none"
              value={email} onChangeText={setEmail} returnKeyType="next"
            />
          </View>
        </View>

        {/* Password */}
        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.label, styles.f600]}>Password</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.f400]}
              placeholder="Enter your password" placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword} value={password} onChangeText={setPassword}
              returnKeyType="done" onSubmitEditing={() => !loading && handleLogin()}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.rightIconBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert("Forgot password", "Coming soon.")}
          style={{ alignSelf: "flex-end", marginTop: 4, marginBottom: 12 }}
        >
          <Text style={[styles.smallText, styles.subtle, styles.f400]}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} disabled={loading} style={[styles.primaryBtn, loading && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryBtnText, styles.f600]}>Sign in</Text>}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={[styles.smallText, styles.subtle, styles.f400]}>Don’t have an account?</Text>
          <Pressable onPress={() => navigation.navigate("Signup")} hitSlop={8}>
            <Text style={[styles.linkText, styles.f600]}>  Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpVisible} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.card}>
            <Text style={m.title}>Enter the code sent to {otpMaskedTarget}</Text>
            <View style={m.row}>
              {Array.from({ length: 6 }).map((_, i) => (
                <TextInput
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  value={otp[i] || ""}
                  onChangeText={(t) => setOtpDigit(i, t)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={m.box}
                />
              ))}
            </View>

            <View style={m.btnRow}>
              <TouchableOpacity onPress={() => setOtpVisible(false)} style={[m.btn, m.gray]}>
                <Text style={m.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={verifyOtp} style={[m.btn, m.primary]}>
                <Text style={m.btnText}>OK</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={resendOtp} style={{ marginTop: 8 }}>
              <Text style={{ color: "#9CC7E5", textDecorationLine: "underline" }}>Resend code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  ellipseWrap: { width: "100%", alignItems: "center", justifyContent: "flex-end" },
  hero: { alignItems: "center", paddingTop: 12, paddingBottom: 6 },
  brandTitle: { color: "#FFFFFF", fontSize: 30, marginTop: 6, letterSpacing: 0.2 },
  subtle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },

  h2: { color: "#FFFFFF", fontSize: 22, marginTop: 8, marginBottom: 16 },

  fieldBlock: { marginBottom: 12 },
  label: { color: "#FFFFFF", fontSize: 12.5, marginBottom: 6 },

  inputWrap: {
    height: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg, flexDirection: "row", alignItems: "center",
  },
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

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  card: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  title: { fontWeight: "700", fontSize: 16, marginBottom: 12, color: "#0F1B2B" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  box: { width: 44, height: 50, borderWidth: 1, borderColor: "#2A3B52", borderRadius: 10, textAlign: "center", fontSize: 18 },
  btnRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  gray: { backgroundColor: "#D1D5DB" },
  primary: { backgroundColor: "#2078A8" },
  btnText: { color: "#fff", fontWeight: "600" },
});
