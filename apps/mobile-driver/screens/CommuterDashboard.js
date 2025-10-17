// screens/CommuterDashboard.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  accent: "#0F172A",
  rate: "#F59E0B",     // Rate Your Ride (yellow)
  report: "#DC2626",   // Report Incident (red)
};

const safety = [
  { id: "s1", title: "You are approaching a high-risk area", time: "5 min ago" },
  { id: "s2", title: "Heavy traffic detected on Pardo Street", time: "10 min ago" },
  { id: "s3", title: "Accident reported 2km ahead on Tabunok", time: "15 min ago" },
];

const community = [
  { id: "c1", name: "Juan Dela Cruz", bus: "BUS-1000", stars: 4 },
  { id: "c2", name: "Pedro Garcia", bus: "BUS-2000", stars: 3 },
  { id: "c3", name: "Car crash", bus: "Location: Tungkop, Minglanilla", stars: 0 },
];

export default function CommuterDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // ✅ Auth guard
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          return navigation.replace("Login");
        }
        // Optional: verify token is still valid
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          await AsyncStorage.removeItem("token");
          return navigation.replace("Login");
        }
      } catch {
        // On error, keep user safe by sending to Login
        return navigation.replace("Login");
      } finally {
        setChecking(false);
      }
    })();
  }, [navigation]);

  function goSettings() {
    navigation?.navigate?.("Settings");
  }
  function goQR() {
    navigation.navigate("QRScanner");
  }
  function goHome() {
    navigation?.navigate?.("CommuterDashboard");
  }

  if (!fontsLoaded || checking) {
    return (
      <SafeAreaView style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top app bar */}
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <MaterialCommunityIcons name="bus" size={18} color={C.text} />
          <Text style={s.brand}>LigtasCommute</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell-outline" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Safety Insights */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.rowCenter}>
              <MaterialCommunityIcons name="shield-alert-outline" size={18} color={C.rate} />
              <Text style={s.cardTitle}>Safety Insights</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {safety.map((it) => (
            <View key={it.id} style={s.itemRow}>
              <Text style={s.itemTitle}>{it.title}</Text>
              <Text style={s.itemTime}>{it.time}</Text>
            </View>
          ))}
        </View>

        {/* Community */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>Community</Text>
            <TouchableOpacity>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity activeOpacity={0.9} style={[s.btn, { backgroundColor: C.rate }]}>
              <Text style={s.btnTxt}>Rate Your Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={[s.btn, { backgroundColor: C.report }]}>
              <Text style={s.btnTxt}>Report Incident</Text>
            </TouchableOpacity>
          </View>

          {community.map((it) => (
            <View key={it.id} style={s.commRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.commName}>{it.name}</Text>
                <Text style={s.commSub}>{it.bus}</Text>
              </View>
              {it.stars > 0 ? (
                <View style={s.starRow}>
                  <MaterialCommunityIcons name="star" size={14} color={C.rate} />
                  <Text style={s.starTxt}>{it.stars}</Text>
                </View>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={18} color={C.hint} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={s.tabbar}>
        <TouchableOpacity style={s.tab} onPress={goHome}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="home-variant" size={22} color={C.text} />
          </View>
          <Text style={[s.tabLabel, s.tabActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goQR}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={C.text} />
          </View>
          <Text style={s.tabLabel}>QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goSettings}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={C.text} />
          </View>
          <Text style={s.tabLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 8 : 10,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brand: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 14 },
  scroll: { padding: 12, paddingBottom: 120 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 14,
    marginLeft: 6,
  },
  cardTitleOnly: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 14 },
  viewAll: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 12 },

  itemRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
  },
  itemTitle: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12.5 },
  itemTime: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 6 },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 12.5 },

  commRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
    marginTop: 8,
  },
  commName: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12.5 },
  commSub: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  starTxt: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12 },

  tabbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tabLabel: { fontFamily: "Poppins_600SemiBold", color: "#6B7280", fontSize: 12 },
  tabActive: { color: C.text },
});
