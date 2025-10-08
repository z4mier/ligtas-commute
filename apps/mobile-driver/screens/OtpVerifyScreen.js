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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_URL } from "../constants/config";

const RESEND_SECONDS = 60;

export default function OtpVerifyScreen({ route, navigation }) {
  const { email } = route.params;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  // screens
  const [showTerms, setShowTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // terms checkbox
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

  // Verify OTP -> open Terms modal (not success yet)
  async function verify() {
    if (!code.trim() || code.trim().length !== 6) {
      return Alert.alert("Invalid code", "Enter the 6-digit code.");
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Verification failed");

      // ✅ Show terms first
      setShowTerms(true);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP
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
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  // ====== Terms & Privacy (dark modal-like screen) ======
  if (showTerms) {
    const handleOk = () => {
      if (!checked) {
        Alert.alert("Please accept", "You must accept the Terms and Privacy Policy first.");
        return;
      }
      // Close terms -> show success screen
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

            {/* Checkbox */}
            <TouchableOpacity
              style={s.checkboxRow}
              onPress={() => setChecked(!checked)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={22}
                color={checked ? "#4CC3FF" : "#9CA3AF"}
              />
              <Text style={s.checkboxText}>
                I have read and accept the Terms and Privacy Policy.
              </Text>
            </TouchableOpacity>

            {/* OK */}
            <View style={s.okButtonWrap}>
              <TouchableOpacity
                style={[s.primaryBtn, !checked && { opacity: 0.5 }]}
                onPress={handleOk}
                activeOpacity={0.9}
              >
                <Text style={s.primaryBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ====== Success screen (with Next -> CommuterDashboard) ======
  if (showSuccess) {
    return (
      <SafeAreaView style={s.screen}>
        {/* simple hero top arc */}
        <View style={{ width: "100%", height: 140, overflow: "hidden", marginBottom: 24 }}>
          <View
            style={{
              position: "absolute",
              left: -80,
              right: -80,
              top: -120,
              height: 260,
              borderBottomLeftRadius: 240,
              borderBottomRightRadius: 240,
              backgroundColor: "#2078A8",
            }}
          />
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
          <MaterialCommunityIcons name="bus" size={56} color="#FFFFFF" style={{ marginTop: -120 }} />
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 6 }}>
            LigtasCommute
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
            Safety that rides with you
          </Text>

          <Text style={{ color: "#4CC3FF", fontSize: 18, fontWeight: "800", marginTop: 38 }}>
            Successful!
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            you have successfully created a LigtasCommute{"\n"}
            account! Welcome to LigtasCommute!
          </Text>

          <TouchableOpacity
            onPress={() => navigation.replace("CommuterDashboard")}
            style={[s.primaryBtn, { marginTop: 28, width: 220 }]}
            activeOpacity={0.9}
          >
            <Text style={s.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ====== Verify screen ======
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={80} color="#4CC3FF" />
          </View>

          <Text style={s.verifyTitle}>Verify Your Account</Text>
          <Text style={s.verifySub}>Enter the 6-digit code sent to your email</Text>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              returnKeyType="done"
              onSubmitEditing={() => !loading && verify()}
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={verify}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Verify</Text>}
          </TouchableOpacity>

          {remaining > 0 ? (
            <Text style={s.resendDisabled}>Resend code in {mmss(remaining)}</Text>
          ) : (
            <TouchableOpacity onPress={resend}>
              <Text style={s.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- Styles ----
const COLORS = {
  bg: "#0F172A",
  brand: "#2078A8",
  white: "#FFFFFF",
  border: "#2A3B52",
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "rgba(76,195,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  verifyTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  verifySub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  inputWrap: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    height: 52,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
    color: "#0F172A",
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  resendDisabled: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
  },
  resendLink: {
    color: "#4CC3FF",
    textDecorationLine: "underline",
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
  },
  termsScroll: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
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
  termsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 6,
  },
  termsDate: {
    fontSize: 12,
    color: "#A1A1AA",
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
    lineHeight: 20,
  },
  section: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  checkboxText: {
    color: "rgba(255,255,255,0.9)",
    marginLeft: 8,
    fontSize: 13.5,
    flexShrink: 1,
  },
  okButtonWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
});
