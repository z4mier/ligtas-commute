// apps/mobile/screens/ResetPassword.js
import React, { useState, useRef } from "react";
import {
  View,
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
import { StatusBar } from "expo-status-bar";
import { API_URL } from "../constants/config";
import LCText from "../components/LCText";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { width, height } = useWindowDimensions();
  const HERO_H = Math.min(height * 0.24, 220);
  const CIRCLE = Math.max(width * 3.4, 1700);
  const CURVE_DEPTH = Math.round(HERO_H * 0.9);
  const ICON = Math.min(70, Math.max(72, HERO_H * 0.8)); // keeping your original logic

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
      <StatusBar style="light" translucent backgroundColor="transparent" />

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
          <LCText variant="title" style={[styles.brandTitle, styles.f700]}>
            <LCText variant="title" style={styles.f700}>
              Ligtas
            </LCText>
            Commute
          </LCText>
          <LCText variant="tiny" style={[styles.subtle, styles.f400]}>
            Set a new password for your account
          </LCText>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            style={styles.bodyPad}
            keyboardShouldPersistTaps="handled"
          >
            <LCText
              variant="heading"
              style={[styles.h2, styles.center, styles.f600]}
            >
              Enter reset code
            </LCText>

            <LCText
              variant="body"
              style={[styles.infoText, styles.center, styles.f400]}
            >
              We sent a 6-digit code to{" "}
              <LCText
                variant="body"
                style={{ fontWeight: "600" }}
              >
                {routeEmail}
              </LCText>
              . Enter the code and choose a new password.
            </LCText>

            <View style={styles.fieldBlock}>
              <LCText variant="label" style={[styles.label, styles.f600]}>
                Reset code
              </LCText>
              <View
                style={[
                  styles.inputWrap,
                  errors.code && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-key-outline"
                  size={18}
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
                <LCText variant="tiny" style={styles.errorText}>
                  {errors.code}
                </LCText>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <LCText variant="label" style={[styles.label, styles.f600]}>
                New password
              </LCText>
              <View
                style={[
                  styles.inputWrap,
                  errors.password && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={18}
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
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <LCText variant="tiny" style={styles.errorText}>
                  {errors.password}
                </LCText>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <LCText variant="label" style={[styles.label, styles.f600]}>
                Confirm password
              </LCText>
              <View
                style={[
                  styles.inputWrap,
                  errors.confirm && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={18}
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
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirm ? (
                <LCText variant="tiny" style={styles.errorText}>
                  {errors.confirm}
                </LCText>
              ) : null}
            </View>

            {errors.general ? (
              <LCText
                variant="tiny"
                style={[styles.errorText, { marginBottom: 8 }]}
              >
                {errors.general}
              </LCText>
            ) : null}

            {success && !errors.general ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <LCText variant="tiny" style={[styles.successText, styles.f400]}>
                  Password updated successfully. You can now log in with your
                  new password.
                </LCText>
              </View>
            ) : null}

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
                <LCText variant="label" style={[styles.primaryBtnText, styles.f600]}>
                  Reset password
                </LCText>
              )}
            </TouchableOpacity>

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
              <LCText variant="label" style={[styles.backText, styles.f600]}>
                Back to Login
              </LCText>
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
  bodyPad: { paddingHorizontal: 18 },
  center: { textAlign: "center" },

  curveHero: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  curveFill: { position: "absolute", alignSelf: "center" },
  hero: { alignItems: "center", paddingBottom: 8 },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    marginTop: 3,
  },

  h2: { color: "#FFFFFF", fontSize: 13, marginTop: 8, marginBottom: 8 },

  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  fieldBlock: { marginBottom: 12 },
  label: { color: "#FFFFFF", fontSize: 11.5, marginBottom: 4 },

  inputWrap: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    flexDirection: "row",
    alignItems: "center",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 11.5, marginTop: 4 },

  leftIcon: { position: "absolute", left: 10, zIndex: 1 },
  rightIcon: { position: "absolute", right: 10, zIndex: 1 },

  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    color: "#0F1B2B",
  },

  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 11 },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  backText: {
    color: COLORS.link,
    textDecorationLine: "none",
    fontSize: 10,
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
    fontSize: 11,
    flex: 1,
  },
});
