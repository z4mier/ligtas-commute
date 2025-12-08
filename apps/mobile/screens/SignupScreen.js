// apps/mobile/screens/SignupScreen.js
import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";
import LCText from "../components/LCText";

export default function SignupScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const [errors, setErrors] = useState({
    fullName: undefined,
    email: undefined,
    phone: undefined,
    password: undefined,
    confirm: undefined,
    general: undefined,
  });

  const clearErr = (k) =>
    setErrors((e) => ({ ...e, [k]: undefined, general: undefined }));

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const normalizePhone = (v) => v.replace(/\D/g, "");

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!isValidEmail(email)) e.email = "Enter a valid email.";
    const digits = normalizePhone(phone);
    if (digits.length < 10 || digits.length > 13)
      e.phone = "Enter a valid phone number.";
    if (password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors((prev) => ({ ...prev, ...e, general: undefined }));
    return Object.keys(e).length === 0;
  };

  const goVerify = (key, message) =>
    navigation.replace("OtpVerify", { email: key, message });

  async function requestOtp(key) {
    try {
      await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: key }),
      });
    } catch {
      return;
    }
  }

  async function createAccount() {
    if (!validate()) return;
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      setLoading(true);
      const key = email.trim().toLowerCase();

      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: key,
          phone: phone.trim(),
          password,
          role: "COMMUTER",
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("REGISTER RESPONSE:", res.status, data);

      if (res.status === 201) {
        goVerify(key, "We sent a verification code to your email.");
        return;
      }

      if (res.status === 200 && data?.code === "UNVERIFIED") {
        goVerify(key, "Account exists but unverified — we sent a new code.");
        return;
      }

      if (res.status === 409) {
        await requestOtp(key);
        goVerify(
          key,
          data?.message || "Email already registered — we sent a new code."
        );
        return;
      }

      const msg = data?.message || "Registration failed. Try again.";
      setErrors((prev) => ({ ...prev, general: msg }));
    } catch (err) {
      console.error("REGISTER ERR:", err);
      setErrors((prev) => ({
        ...prev,
        general: "Network error. Please try again.",
      }));
    } finally {
      setLoading(false);
      inFlight.current = false;
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={s.bodyPad}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backRow}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color="rgba(255,255,255,0.85)"
            />
            <LCText variant="label" style={[s.backText, s.f400]}>
              Back
            </LCText>
          </TouchableOpacity>

          <View style={s.header}>
            <Image
              source={require("../assets/images/logo.png")}
              style={{
                width: 56,
                height: 56,
                resizeMode: "contain",
                tintColor: "#FFFFFF",
              }}
            />
            <LCText variant="heading" style={[s.h2, s.f700]}>
              Join <LCText variant="heading" style={s.f700}>LigtasCommute</LCText>
            </LCText>
            <LCText variant="tiny" style={[s.subtle, s.f400]}>
              Create your account to start safe commuting
            </LCText>
          </View>

          <Field
            label="Full Name"
            icon="account-outline"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              clearErr("fullName");
            }}
            placeholder="Enter your full name"
            error={errors.fullName}
          />
          <Field
            label="Email"
            icon="email-outline"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearErr("email");
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Field
            label="Phone Number"
            icon="phone-outline"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              clearErr("phone");
            }}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <Field
            label="Password"
            icon="lock-outline"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearErr("password");
            }}
            placeholder="Create password"
            secureTextEntry={!showPw}
            error={errors.password}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPw((v) => !v)}
                style={s.rightIconBtn}
              >
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            }
          />
          <Field
            label="Confirm Password"
            icon="lock-check-outline"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              clearErr("confirm");
            }}
            placeholder="Confirm your password"
            secureTextEntry={!showConfirm}
            error={errors.confirm}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                style={s.rightIconBtn}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            }
          />

          {errors.general ? (
            <LCText variant="tiny" style={[s.errorText, { marginTop: 6 }]}>
              {errors.general}
            </LCText>
          ) : null}

          <TouchableOpacity
            onPress={createAccount}
            disabled={loading || inFlight.current}
            style={[
              s.primaryBtn,
              (loading || inFlight.current) && { opacity: 0.8 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LCText
                variant="label"
                style={[s.primaryBtnText, s.f600]}
              >
                Create Account
              </LCText>
            )}
          </TouchableOpacity>

          <View style={s.footerRow}>
            <LCText
              variant="tiny"
              style={[s.subtleFooter, s.f400]}
            >
              Already have an account?
            </LCText>
            <Pressable
              onPress={() => navigation.replace("Login")}
              hitSlop={8}
            >
              <LCText
                variant="label"
                style={[s.linkText, s.f600]}
              >
                Sign in
              </LCText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, icon, rightIcon, error, ...inputProps }) {
  const hasErr = !!error;
  return (
    <View style={{ marginTop: 10 }}>
      <LCText variant="label" style={[s.label, s.f600]}>
        {label}
      </LCText>
      <View style={[s.inputWrap, hasErr && s.inputError]}>
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={hasErr ? "#EF4444" : "#6B7280"}
          style={s.leftIcon}
        />
        <TextInput
          style={[s.input, s.f400]}
          placeholderTextColor="#9CA3AF"
          {...inputProps}
        />
        {rightIcon}
      </View>
      {hasErr && (
        <LCText variant="tiny" style={s.errorText}>
          {error}
        </LCText>
      )}
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

  backRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  backText: {
    color: "rgba(255,255,255,0.85)",
    marginLeft: 4,
  },

  header: { alignItems: "center", marginTop: 10 },
  h2: { color: "#FFFFFF", marginTop: 12 },
  subtle: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },
  subtleFooter: {
    color: "rgba(255,255,255,0.85)",
  },

  label: { color: "#FFFFFF", marginBottom: 4 },

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
  errorText: { color: "#EF4444", marginTop: 4 },

  leftIcon: { position: "absolute", left: 10, zIndex: 1 },
  rightIconBtn: { position: "absolute", right: 8, padding: 6 },

  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 40,
    paddingRight: 36,
    fontSize: 10, // actual visual size; LCText controls Text only
    color: "#0F1B2B",
  },

  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryBtnText: { color: "#FFFFFF" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 18,
  },
  linkText: {
    color: COLORS.link,
    marginLeft: 4,
    textDecorationLine: "none",
  },
});
