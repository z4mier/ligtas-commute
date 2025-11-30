// apps/mobile/screens/ResetPassword.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { StatusBar } from "expo-status-bar"; // ✅ added
import { API_URL } from "../constants/config";

const COLORS = {
  bgdark: "#0F1B2B",
  brand: "#2078A8",
  inputBg: "#FFFFFF",
  border: "#2A3B52",
  link: "#9CC7E5",
};

export default function ResetPassword({ navigation, route }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { email: routeEmail } = route.params || {};
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errors, setErrors] = useState({
    code: undefined,
    password: undefined,
    confirm: undefined,
    general: undefined,
  });
  const [success, setSuccess] = useState(false);
  const inFlight = useRef(false);

  // 👁️ Show / hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { width, height } = useWindowDimensions();
  const HERO_H = Math.min(height * 0.26, 240);
  const CIRCLE = Math.max(width * 3.4, 1700);
  const CURVE_DEPTH = Math.round(HERO_H * 0.9);
  const ICON = Math.min(90, Math.max(100, HERO_H * 0.85));

  function validate() {
    const e = {};
    if (!routeEmail) {
      e.general = "Missing email. Please go back and request a reset again.";
    }
    if (!code || code.trim().length !== 6) {
      e.code = "Enter the 6-digit code from your email.";
    }
    if (!password || password.length < 6) {
      e.password = "Password must be at least 6 characters.";
    }
    if (password && confirm && password !== confirm) {
      e.confirm = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleReset() {
    if (!validate()) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setLoading(true);
    setRedirecting(false);
    setErrors({
      code: undefined,
      password: undefined,
      confirm: undefined,
      general: undefined,
    });
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: routeEmail.toLowerCase().trim(),
          code: code.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message || "Unable to reset password. Please try again.";
        const lower = msg.toLowerCase();
        const fieldErr = {};

        if (lower.includes("code")) {
          fieldErr.code = msg;
        } else if (lower.includes("password")) {
          fieldErr.password = msg;
        } else if (lower.includes("user")) {
          fieldErr.general =
            "Email not found. Please request a new reset code.";
        } else {
          fieldErr.general = msg;
        }

        setErrors((prev) => ({ ...prev, ...fieldErr }));
        return;
      }

      // ✅ Success
      setSuccess(true);
      setErrors({
        code: undefined,
        password: undefined,
        confirm: undefined,
        general: undefined,
      });

      setRedirecting(true);
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }, 2500);
    } catch (_e) {
      setErrors({
        code: undefined,
        password: undefined,
        confirm: undefined,
        general: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingBox} edges={["bottom"]}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {/* ✅ Status bar over hero */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

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
              backgroundColor: COLORS.brand,
            },
          ]}
        />
        <View style={styles.hero}>
          <Image
            source={require("../assets/images/logo.png")}
            style={{
              width: ICON,
              height: ICON,
              resizeMode: "contain",
              tintColor: "#FFFFFF",
            }}
          />
          <Text style={[styles.brandTitle, styles.f700]}>
            <Text style={styles.f700}>Ligtas</Text>Commute
          </Text>
          <Text style={[styles.subtle, styles.f400]}>
            Set a new password for your account
          </Text>
        </View>
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 28 }}
            style={styles.bodyPad}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.h2, styles.center, styles.f600]}>
              Enter reset code
            </Text>
            <Text style={[styles.infoText, styles.center, styles.f400]}>
              We sent a 6-digit code to{" "}
              <Text style={{ fontWeight: "600" }}>{routeEmail}</Text>. Enter the
              code and choose a new password.
            </Text>

            {/* Code */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, styles.f600]}>Reset code</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.code && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-key-outline"
                  size={20}
                  color={errors.code ? "#EF4444" : "#6B7280"}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={[styles.input, styles.f400]}
                  placeholder="6-digit code"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t);
                    setErrors((e) => ({
                      ...e,
                      code: undefined,
                      general: undefined,
                    }));
                  }}
                />
              </View>
              {errors.code ? (
                <Text style={styles.errorText}>{errors.code}</Text>
              ) : null}
            </View>

            {/* New password */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, styles.f600]}>New password</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.password && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={errors.password ? "#EF4444" : "#6B7280"}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={[styles.input, styles.f400]}
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrors((e) => ({
                      ...e,
                      password: undefined,
                      general: undefined,
                    }));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.rightIcon}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Confirm password */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.label, styles.f600]}>
                Confirm password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.confirm && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color={errors.confirm ? "#EF4444" : "#6B7280"}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={[styles.input, styles.f400]}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirm}
                  value={confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    setErrors((e) => ({
                      ...e,
                      confirm: undefined,
                      general: undefined,
                    }));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((prev) => !prev)}
                  style={styles.rightIcon}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirm ? (
                <Text style={styles.errorText}>{errors.confirm}</Text>
              ) : null}
            </View>

            {/* General error */}
            {errors.general ? (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>
                {errors.general}
              </Text>
            ) : null}

            {/* Success */}
            {success && !errors.general ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={[styles.successText, styles.f400]}>
                  Password updated successfully. You can now log in with your
                  new password.
                </Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleReset}
              disabled={loading || inFlight.current || redirecting}
              style={[
                styles.primaryBtn,
                (loading || inFlight.current || redirecting) && {
                  opacity: 0.7,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.primaryBtnText, styles.f600]}>
                  Reset password
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: "Login" }] })
              }
              style={styles.backRow}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={COLORS.link}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.backText, styles.f600]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  f400: { fontFamily: "Poppins_400Regular" },
  f600: { fontFamily: "Poppins_600SemiBold" },
  f700: { fontFamily: "Poppins_700Bold" },

  screen: { flex: 1, backgroundColor: COLORS.bgdark },
  loadingBox: {
    flex: 1,
    backgroundColor: COLORS.bgdark,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyPad: { paddingHorizontal: 20 },
  center: { textAlign: "center" },

  curveHero: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  curveFill: { position: "absolute", alignSelf: "center" },
  hero: { alignItems: "center", paddingBottom: 10 },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  subtle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },

  h2: { color: "#FFFFFF", fontSize: 20, marginTop: 8, marginBottom: 8 },

  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 18,
    paddingHorizontal: 4,
  },

  fieldBlock: { marginBottom: 14 },
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
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 6 },

  leftIcon: { position: "absolute", left: 12, zIndex: 1 },
  rightIcon: { position: "absolute", right: 12, zIndex: 1 },

  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 44,
    paddingRight: 44,
    fontSize: 14.5,
    color: "#0F1B2B",
  },

  primaryBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15 },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  backText: {
    color: COLORS.link,
    textDecorationLine: "none",
    fontSize: 13.5,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.5)",
    marginTop: 4,
    marginBottom: 6,
    gap: 6,
  },
  successText: {
    color: "#D1FAE5",
    fontSize: 12,
    flex: 1,
  },
});
