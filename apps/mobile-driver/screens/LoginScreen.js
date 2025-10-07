import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

export default function LoginScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // centered ellipse
  const ellipse = useMemo(() => {
    const w = Math.max(width * 1.4, 640);
    const h = Math.max(220, Math.min(340, w * 0.42));
    const r = w;
    return { width: w, height: h, radius: r };
  }, [width]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const e = email.trim().toLowerCase();
    const p = password;

    if (!e || !p) {
      return Alert.alert("Missing fields", "Please enter your email and password.");
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");

      // ✅ persist token for later requests (Settings, /users/me, etc.)
      await AsyncStorage.setItem("token", data.token);

      // Route by role
      if (data.role === "DRIVER") navigation.replace("DriverDashboard");
      else if (data.role === "COMMUTER") navigation.replace("CommuterDashboard");
      else Alert.alert("Login", "Logged in, but dashboard is not configured for this role.");
    } catch (err) {
      Alert.alert("Login Failed", err.message);
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
      {/* hero ellipse */}
      <View style={[styles.ellipseWrap, { height: ellipse.height + 40 }]}>
        <View
          style={{
            position: "absolute",
            top: 0,
            width: ellipse.width,
            height: ellipse.height,
            backgroundColor: COLORS.brand,
            borderBottomLeftRadius: ellipse.radius,
            borderBottomRightRadius: ellipse.radius,
            zIndex: -1,
          }}
        />
        <View style={styles.hero}>
          <MaterialCommunityIcons name="bus" size={56} color="#FFFFFF" />
          <Text style={[styles.brandTitle, styles.f700]}>
            <Text style={styles.f700}>Ligtas</Text>Commute
          </Text>
          <Text style={[styles.subtle, styles.f400]}>Safety that rides with you</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} style={styles.bodyPad}>
        <Text style={[styles.h2, styles.center, styles.f600]}>Login</Text>

        {/* Email */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.label, styles.f600]}>Email Address</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.f400]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
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
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.rightIconBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => Alert.alert("Forgot password", "Coming soon.")} style={{ alignSelf: "flex-end", marginTop: 4, marginBottom: 12 }}>
          <Text style={[styles.smallText, styles.subtle, styles.f400]}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign in */}
        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.primaryBtn}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryBtnText, styles.f600]}>Sign in</Text>}
        </TouchableOpacity>

        {/* Footer */}
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
  // fonts
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
    marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16 },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  smallText: { fontSize: 12.5 },
  linkText: { color: COLORS.link, textDecorationLine: "underline", fontSize: 13.5 },
});
