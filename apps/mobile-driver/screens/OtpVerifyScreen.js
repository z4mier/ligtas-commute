import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_URL } from "../constants/config";

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

export default function OtpVerifyScreen({ route, navigation }) {
  const { email } = route.params;

  // responsive curve for success hero
  const { width } = useWindowDimensions();
  const HERO_H = 170;
  const CIRCLE = Math.max(width * 3.2, 1600);
  const CURVE_DEPTH = Math.min(130, Math.max(80, HERO_H * 0.7));

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_SECONDS);
  const [showTerms, setShowTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checked, setChecked] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  function startCountdown() {
    clearInterval(timerRef.current);
    setRemaining(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function mmss(n) {
    const m = Math.floor(n / 60).toString().padStart(2, "0");
    const s = (n % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function verify() {
    const digits = (code || "").replace(/\D/g, "");
    if (digits.length !== OTP_LENGTH) {
      return Alert.alert("Invalid code", `Enter the ${OTP_LENGTH}-digit code.`);
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Verification failed");
      setShowTerms(true);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (remaining > 0) return;
    try {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to resend");

      Alert.alert("OTP Sent", "A new code has been sent. Check your terminal (for testing).");
      startCountdown();
      setCode("");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  // ----- Terms (unchanged) -----
  if (showTerms) {
    const handleOk = () => {
      if (!checked) {
        Alert.alert("Please accept", "You must accept the Terms and Privacy Policy first.");
        return;
      }
      setShowTerms(false);
      setShowSuccess(true);
    };

    return (
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.termsScroll}>
          <View style={s.termsCard}>
            <Text style={s.termsTitle}>Terms and Privacy Policy</Text>
            <Text style={s.termsDate}>Last Updated: June 17, 2025</Text>

            <Text style={s.termsText}>
              Welcome! By using this app, you agree to the following terms and conditions.
              Please read carefully before continuing.
            </Text>

            <Text style={s.section}>
              1. Acceptance of Terms{"\n"}By using this app, you acknowledge that you have read
              and agreed to these Terms and Conditions.
            </Text>
            <Text style={s.section}>
              2. User Registration{"\n"}Some features require an account. Keep your information
              secure and up to date.
            </Text>
            <Text style={s.section}>
              3. Location & GPS Use{"\n"}This app uses GPS and mobile data to track trips and
              send alerts.
            </Text>
            <Text style={s.section}>
              4. QR Code Verification{"\n"}Always confirm the driver and vehicle identity before
              boarding.
            </Text>
            <Text style={s.section}>
              5. Safety & Emergency Features{"\n"}You may use the emergency alert feature when
              you feel unsafe. Misuse may lead to suspension.
            </Text>
            <Text style={s.section}>
              6. Feedback & Reports{"\n"}You can submit feedback about your experience. Please
              be respectful and honest.
            </Text>
            <Text style={s.section}>
              7. Privacy Policy{"\n"}We collect your name, contact, GPS data, and feedback to
              improve the service. Your data is secure and never shared with advertisers.
            </Text>
            <Text style={s.section}>
              8. Changes to Terms{"\n"}These terms may change at any time. Continued use means
              you accept the updates.
            </Text>

            <Pressable style={s.checkboxRow} onPress={() => setChecked(!checked)}>
              <MaterialCommunityIcons
                name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={22}
                color={checked ? "#4CC3FF" : "#9CA3AF"}
              />
              <Text style={s.checkboxText}>
                I have read and accept the Terms and Privacy Policy.
              </Text>
            </Pressable>

            <View style={s.okButtonWrap}>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, { width: "100%", maxWidth: 420 }, !checked && { opacity: 0.6 }]}
                onPress={handleOk}
                activeOpacity={0.9}
              >
                <Text style={s.btnPrimaryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----- Success (polished) -----
  if (showSuccess) {
    return (
      <SafeAreaView style={s.screen}>
        {/* Curved hero */}
        <View style={[s.curveHero, { height: HERO_H }]}>
          <View
            style={[
              s.curveFill,
              {
                width: CIRCLE,
                height: CIRCLE,
                top: -CIRCLE + CURVE_DEPTH,
                borderBottomLeftRadius: CIRCLE,
                borderBottomRightRadius: CIRCLE,
              },
            ]}
          />
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Image
              source={require("../assets/images/logo.png")}
              style={{ width: 82, height: 82, tintColor: "#FFFFFF", resizeMode: "contain" }}
            />
            <Text style={s.brandTitle}>LigtasCommute</Text>
            <Text style={s.brandTagline}>Safety that rides with you</Text>
          </View>
        </View>

        {/* Card content */}
        <View style={s.successWrap}>
          <View style={s.successBadge}>
            <MaterialCommunityIcons name="check-decagram" size={28} color="#1CC88A" />
          </View>

          <Text style={s.successTitle}>Account Verified</Text>
          <Text style={s.successText}>
            Your account has been verified successfully. Welcome to{" "}
            <Text style={{ fontWeight: "700" }}>LigtasCommute</Text>!
          </Text>

          <TouchableOpacity
            onPress={() => navigation.replace("CommuterDashboard")}
            style={[s.btn, s.btnPrimary, { marginTop: 18, width: "100%" }]}
            activeOpacity={0.9}
          >
            <Text style={s.btnPrimaryText}>Go to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.replace("Login")}
            style={[s.btn, s.btnGhost]}
            activeOpacity={0.9}
          >
            <Text style={s.btnGhostText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ----- Verify -----
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={84} color="#4CC3FF" />
          </View>

          <Text style={s.verifyTitle}>Verify Your Account</Text>
          <Text style={s.verifySub}>
            Enter the {OTP_LENGTH}-digit code sent to{" "}
            <Text style={{ color: "#E5F3FF" }}>{email}</Text>
          </Text>

          <OTPCells value={code} onChange={setCode} length={OTP_LENGTH} />

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, loading && { opacity: 0.7 }, { marginTop: 16, width: "100%", maxWidth: 420 }]}
            onPress={verify}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Verify</Text>}
          </TouchableOpacity>

          {remaining > 0 ? (
            <View style={s.countdownChip}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#A7B3C9" />
              <Text style={s.countdownText}>Resend available in {mmss(remaining)}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={resend} style={{ marginTop: 14 }}>
              <Text style={s.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OTPCells({ value, onChange, length = 6 }) {
  const hiddenRef = useRef(null);
  const handleChange = (t) => onChange(t.replace(/\D/g, "").slice(0, length));
  const cells = Array.from({ length }).map((_, i) => value[i] || "");
  const isFocusedIndex = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => hiddenRef.current?.focus()} style={s.otpContainer}>
      <TextInput
        ref={hiddenRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        style={s.hiddenInput}
      />
      {cells.map((c, i) => (
        <View
          key={i}
          style={[s.otpCell, i === isFocusedIndex && value.length < length ? s.otpCellActive : null]}
        >
          <Text style={s.otpChar}>{c}</Text>
        </View>
      ))}
    </Pressable>
  );
}

// Styles
const COLORS = {
  bg: "#0F172A",
  brand: "#2078A8",
  white: "#FFFFFF",
  border: "#2A3B52",
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  // Curved hero (success)
  curveHero: { width: "100%", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  curveFill: { position: "absolute", alignSelf: "center", backgroundColor: COLORS.brand },
  brandTitle: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 6 },
  brandTagline: { color: "rgba(255,255,255,0.9)", marginTop: 2 },

  // Success content card
  successWrap: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  successBadge: {
    width: 46,
    height: 46,
    borderRadius: 24,
    backgroundColor: "rgba(28,200,138,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  successTitle: { color: "#E5F3FF", fontSize: 20, fontWeight: "800" },
  successText: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 460,
  },

  // Verify screen
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 64,
    backgroundColor: "rgba(76,195,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  verifyTitle: { color: COLORS.white, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  verifySub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14.5,
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 420,
  },

  otpContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  otpCell: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpCellActive: { borderColor: COLORS.brand, shadowColor: COLORS.brand, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  otpChar: { fontSize: 20, color: "#0F172A", fontWeight: "700" },

  // Buttons
  btn: { height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  btnPrimary: { backgroundColor: COLORS.brand },
  btnPrimaryText: { color: COLORS.white, fontSize: 16.5, fontWeight: "700" },
  btnGhost: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    width: "100%",
  },
  btnGhostText: { color: "#E5F3FF", fontSize: 15, fontWeight: "600" },

  resendDisabled: { color: "rgba(255,255,255,0.6)", marginTop: 10, fontSize: 13, textAlign: "center" },
  resendLink: { color: "#4CC3FF", textDecorationLine: "underline", marginTop: 10, fontSize: 15, textAlign: "center" },
  countdownChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 14,
  },
  countdownText: { color: "#A7B3C9", fontSize: 13.5 },

  termsScroll: { padding: 24, alignItems: "center", justifyContent: "center" },
  termsCard: {
    backgroundColor: "#14213D",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  termsTitle: { fontSize: 20, fontWeight: "700", color: COLORS.white, marginBottom: 6 },
  termsDate: { fontSize: 12, color: "#A1A1AA", marginBottom: 12 },
  termsText: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 10, lineHeight: 20 },
  section: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 10, lineHeight: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  checkboxText: { color: "rgba(255,255,255,0.9)", marginLeft: 8, fontSize: 13.5, flexShrink: 1 },
  okButtonWrap: { alignItems: "center", justifyContent: "center", marginTop: 24, width: "100%" },
});
