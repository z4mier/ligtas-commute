import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// ---- CONFIG ----
const API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) || "http://192.168.245.171:4000";

// ---- THEME (from screenshot) ----
const C = {
  bg: "#0F1B2B",        // page background
  hero: "#0F1B2B",      // hero area (same bg, with arc)
  card: "#14243A",      // form card
  border: "#2A3B52",    // input border
  text: "#EAF2F8",      // main text
  sub: "#B8C7D4",       // sub text / placeholders
  link: "#9CC7E5",      // links
  link2: "#79B8FF",
  accent: "#2078A7",    // button teal
  iconBg: "#DBE9F5",    // circle bg for bus icon
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogin() {
    setErr(null);
    const e = email.trim();
    if (!e || !pw) {
      setErr("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: pw }),
      });

      const txt = await res.text();
      let data: any = {};
      try { data = txt ? JSON.parse(txt) : {}; } catch {}
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || `Login failed (HTTP ${res.status})`;
        setErr(typeof msg === "string" ? msg : "Login failed");
        return;
      }

      // mustChangePassword → go to change password first
      if (data.mustChangePassword === true) {
        router.replace({ pathname: "/change-password", params: { token: data.token } });
        return;
      }

      if (data.role === "DRIVER") {
        router.replace("/driver-dashboard");
      } else if (data.role === "COMMUTER") {
        router.replace("/commuter-dashboard");
      } else {
        setErr("This account is not a driver or commuter.");
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Hero with arc */}
      <View style={styles.heroWrap}>
        <View style={styles.arc} />
        <View style={styles.heroInner}>
          <View style={styles.busCircle}>
            <MaterialCommunityIcons name="bus" size={48} color={C.hero} />
          </View>
          <Text style={styles.brand}>LigtasCommute</Text>
          <Text style={styles.tagline}>Safety that rides with you</Text>
          <Text style={styles.title}>Login</Text>
        </View>
      </View>

      {/* Card Form */}
      <View style={styles.card}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="email-outline" size={20} color="#7A8792" />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={C.sub}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#7A8792" />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={C.sub}
            secureTextEntry={!show}
            value={pw}
            onChangeText={setPw}
          />
          <Pressable onPress={() => setShow((s) => !s)}>
            <MaterialCommunityIcons
              name={show ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#7A8792"
            />
          </Pressable>
        </View>

        <Pressable onPress={() => Alert.alert("Forgot password", "Flow coming soon")}>
          <Text style={styles.linkRight}>Forgot password?</Text>
        </Pressable>

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Pressable style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>

        <Text style={styles.meta}>
          Don’t have an account?{" "}
          <Text style={styles.link} onPress={() => Alert.alert("Sign up", "Coming soon")}>
            Sign up
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // page
  screen: { flex: 1, backgroundColor: C.bg },

  // hero
  heroWrap: { position: "relative" },
  arc: {
    backgroundColor: "#0B3954",
    height: 150,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  heroInner: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  busCircle: {
    backgroundColor: C.iconBg,
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brand: { color: C.text, fontFamily: "Poppins_700Bold", fontSize: 28 },
  tagline: { color: C.sub, marginTop: 2, fontFamily: "Poppins_400Regular" },
  title: {
    color: C.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    marginTop: 12,
  },

  // card form
  card: {
    backgroundColor: C.card,
    marginHorizontal: 18,
    marginTop: 160,
    padding: 16,
    borderRadius: 14,
  },
  label: { color: "#CDD9E3", fontSize: 12, marginBottom: 6, fontFamily: "Poppins_600SemiBold" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, color: C.text, paddingVertical: 8, fontFamily: "Poppins_400Regular" },
  linkRight: {
    color: C.link,
    textAlign: "right",
    marginTop: 8,
    fontFamily: "Poppins_400Regular",
  },
  error: { color: "#FFB4B4", textAlign: "center", marginTop: 10, fontFamily: "Poppins_400Regular" },

  btn: {
    marginTop: 12,
    backgroundColor: C.accent,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 16 },

  meta: {
    color: "#CDD9E3",
    textAlign: "center",
    marginTop: 14,
    fontFamily: "Poppins_400Regular",
  },
  link: { color: C.link2, fontFamily: "Poppins_600SemiBold" },
});
