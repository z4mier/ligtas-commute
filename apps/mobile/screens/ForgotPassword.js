// apps/mobile/screens/ForgotPassword.js
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

export default function ForgotPassword({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { width, height } = useWindowDimensions();
  const HERO_H = Math.min(height * 0.24, 220);
  const CIRCLE = Math.max(width * 3.4, 1700);
  const CURVE_DEPTH = Math.round(HERO_H * 0.9);
  const ICON = Math.min(72, HERO_H * 0.6);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: undefined,
    general: undefined,
  });

  const inFlight = useRef(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  function validate() {
    const e = {};
    if (!isValidEmail(email)) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setLoading(true);
    setErrors({ email: undefined, general: undefined });

    try {
      const key = email.trim().toLowerCase();

      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: key }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 400) {
          setErrors((prev) => ({
            ...prev,
            email: "Enter a valid email address.",
          }));
        } else if (res.status === 404) {
          setErrors((prev) => ({
            ...prev,
            email: "Email not registered.",
          }));
        } else {
          const msg =
            data?.message ||
            "Unable to send reset instructions. Please try again later.";
          setErrors((prev) => ({ ...prev, general: msg }));
        }
        return;
      }

      navigation.navigate("ResetPassword", { email: key });
      return;
    } catch (_e) {
      setErrors({
        email: undefined,
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
            Reset your password safely
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
              Forgot password
            </LCText>

            <LCText
              variant="body"
              style={[styles.infoText, styles.center, styles.f400]}
            >
              Enter the email associated with your account and we&apos;ll send
              you a 6-digit code to reset your password.
            </LCText>

            <View style={styles.fieldBlock}>
              <LCText variant="label" style={[styles.label, styles.f600]}>
                Email Address
              </LCText>
              <View
                style={[
                  styles.inputWrap,
                  errors.email && styles.inputError,
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={errors.email ? "#EF4444" : "#6B7280"}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={[styles.input, styles.f400]}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrors((e) => ({
                      ...e,
                      email: undefined,
                      general: undefined,
                    }));
                  }}
                />
              </View>
              {errors.email ? (
                <LCText variant="tiny" style={styles.errorText}>
                  {errors.email}
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

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || inFlight.current}
              style={[
                styles.primaryBtn,
                (loading || inFlight.current) && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <LCText variant="label" style={[styles.primaryBtnText, styles.f600]}>
                  Send reset code
                </LCText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
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
    fontSize: 22,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  subtle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 3,
  },

  h2: { color: "#FFFFFF", fontSize: 15, marginTop: 8, marginBottom: 8 },

  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
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

  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 40,
    paddingRight: 16,
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
});
