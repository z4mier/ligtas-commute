// apps/mobile/screens/DriverDashboard.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";
import DriverQR from "./DriverQR";

/* ---------- Colors ---------- */
const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#0B132B",
  star: "#F59E0B",
  danger: "#B91C1C",
  success: "#10B981",
};

/* ---------- Tiny helpers ---------- */
const QuickBox = ({ icon, title, subtitle, variant = "default", onPress }) => {
  let bg = "#F9FAFB";
  let border = C.border;
  let iconColor = C.sub;
  let titleColor = C.text;

  if (variant === "primary") {
    bg = C.brand;
    border = C.brand;
    iconColor = "#E5E7EB";
    titleColor = "#FFFFFF";
  } else if (variant === "danger") {
    bg = "#FEE2E2";
    border = "#FCA5A5";
    iconColor = C.danger;
    titleColor = C.danger;
  } else if (variant === "accent") {
    bg = "#DBEAFE";
    border = "#93C5FD";
    iconColor = "#1D4ED8";
    titleColor = "#1D4ED8";
  }

  return (
    <TouchableOpacity
      style={[styles.quickBox, { backgroundColor: bg, borderColor: border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.quickBoxIconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text
        style={[styles.quickBoxTitle, { color: titleColor }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.quickBoxSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function DriverDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [driver, setDriver] = useState({ fullName: "Driver", avatar: null });

  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [tripsToday] = useState(0);
  const [reportsToday] = useState(0);

  const [isOnDuty, setIsOnDuty] = useState(false);

  // 🔹 QR modal state
  const [showQrModal, setShowQrModal] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      /* -------- ratings -------- */
      try {
        const res = await fetch(`${API_URL}/driver/ratings`, { headers });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Failed to load ratings");
        }

        setAvgRating(data.averageScore || 0);
        setTotalRatings(data.totalRatings || 0);
      } catch (e) {
        console.log("[DriverDashboard] load ratings error", e);
        setAvgRating(0);
        setTotalRatings(0);
      }

      /* -------- profile / name for header -------- */
      try {
        let profileData = null;

        // try /driver/me
        try {
          const r1 = await fetch(`${API_URL}/driver/me`, { headers });
          if (r1.ok) {
            const j1 = await r1.json().catch(() => ({}));
            profileData = j1?.data ?? j1;
          }
        } catch {}

        // fallback /driver/profile
        if (!profileData) {
          try {
            const r2 = await fetch(`${API_URL}/driver/profile`, { headers });
            if (r2.ok) {
              const j2 = await r2.json().catch(() => ({}));
              profileData = j2?.data ?? j2;
            }
          } catch {}
        }

        // fallback /users/me
        if (!profileData) {
          try {
            const r3 = await fetch(`${API_URL}/users/me`, { headers });
            if (r3.ok) {
              const j3 = await r3.json().catch(() => ({}));
              profileData = j3?.data ?? j3;
            }
          } catch {}
        }

        if (profileData) {
          const driverProfile = profileData.driverProfile ?? {};
          const fullName =
            profileData.fullName ||
            driverProfile.fullName ||
            profileData.name ||
            "Driver";

          const avatar =
            profileData.profileUrl ||
            profileData.avatarUrl ||
            driverProfile.profileUrl ||
            driverProfile.avatarUrl ||
            null;

          setDriver({ fullName, avatar });
        }
      } catch (e) {
        console.log("[DriverDashboard] load driver profile error", e);
      }
    } catch (e) {
      console.log("[DriverDashboard] reload error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await reload();
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleToggleDuty = () => {
    setIsOnDuty((prev) => !prev);
  };

  const handleStartTrip = () => {
    if (!isOnDuty) {
      Alert.alert("Off duty", "Switch ON duty first to start a trip.");
      return;
    }
    navigation?.navigate?.("DriverTracking");
  };

  const hasRatings = totalRatings > 0 && (avgRating || 0) > 0;

  let avgDisplay = "No ratings yet";

  if (hasRatings) {
    const rounded = Math.round((avgRating || 0) * 10) / 10;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.001;
    const scoreStr = isWhole
      ? `${Math.round(rounded)}`
      : rounded.toFixed(1);
    avgDisplay = `${scoreStr} / 5`;
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const avgMiniNumber = hasRatings ? avgDisplay.replace(" / 5", "") : "—";
  const tripsNumber = typeof tripsToday === "number" ? tripsToday : "—";
  const reportsNumber = typeof reportsToday === "number" ? reportsToday : "—";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header Card – profile + ON/OFF toggle */}
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  {driver?.avatar ? (
                    <Image
                      source={{ uri: driver.avatar }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <Text style={styles.avatarLetter}>
                      {(driver?.fullName?.[0] || "D").toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {driver?.fullName || "—"}
                  </Text>

                  <Text style={styles.driverRole}>LigtasCommute Driver</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleToggleDuty}
                activeOpacity={0.8}
                style={[
                  styles.dutyToggle,
                  {
                    backgroundColor: isOnDuty
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(31,41,55,0.45)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.dutyDot,
                    { backgroundColor: isOnDuty ? C.success : "#9CA3AF" },
                  ]}
                />
                <Text
                  style={[
                    styles.dutyText,
                    { color: isOnDuty ? "#A7F3D0" : "#E5E7EB" },
                  ]}
                >
                  {isOnDuty ? "On duty" : "Off duty"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today overview mini cards */}
          <View style={styles.todayRow}>
            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>Trips today</Text>
              <View style={styles.todayValueRow}>
                <MaterialCommunityIcons
                  name="bus-clock"
                  size={16}
                  color={C.text}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.todayValue}>{tripsNumber}</Text>
              </View>
            </View>

            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>Avg rating</Text>
              <View style={styles.todayValueRow}>
                <MaterialCommunityIcons
                  name="star"
                  size={16}
                  color={C.star}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.todayValue}>{avgMiniNumber}</Text>
              </View>
            </View>

            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>Avg reports</Text>
              <View style={styles.todayValueRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={16}
                  color={C.text}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.todayValue}>{reportsNumber}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={18}
                  color={C.text}
                />
                <Text style={styles.sectionTitle}>  Quick actions</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={C.sub} />
              ) : null}
            </View>

            <View style={styles.quickGrid}>
              <QuickBox
                icon="play-circle-outline"
                title="Start Trip"
                subtitle={
                  isOnDuty ? "Begin live tracking" : "Go ON duty first"
                }
                variant="primary"
                onPress={handleStartTrip}
              />

              {/* QR Code – now opens modal */}
              <QuickBox
                icon="qrcode"
                title="My QR Code"
                subtitle={
                  isOnDuty ? "QR ready to scan" : "QR disabled while off duty"
                }
                variant="accent"
                onPress={() => {
                  if (!isOnDuty) {
                    Alert.alert(
                      "QR disabled",
                      "Turn ON duty first to show your QR code."
                    );
                    return;
                  }
                  setShowQrModal(true);
                }}
              />

              <QuickBox
                icon="history"
                title="Trip History"
                subtitle="View completed trips"
                onPress={() => navigation?.navigate?.("DriverTripHistory")}
              />

              <QuickBox
                icon="file-document-alert-outline"
                title="Reports"
                subtitle="View commuter reports"
                onPress={() => navigation?.navigate?.("DriverReports")}
              />

              <QuickBox
                icon="star-circle-outline"
                title="Ratings"
                subtitle="View commuter ratings"
                onPress={() => {
                  navigation?.navigate?.("DriverRatings");
                }}
              />

              <QuickBox
                icon="account-circle-outline"
                title="Profile"
                subtitle="View & edit profile"
                onPress={() => navigation?.navigate?.("DriverSettings")}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 🔹 QR Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <DriverQR onClose={() => setShowQrModal(false)} />
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: C.brand,
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 999 },
  avatarLetter: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
  driverName: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
  },
  driverRole: {
    color: "#E5E7EB",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  dutyToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dutyText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },

  todayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
    gap: 8,
  },
  todayCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  todayLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginBottom: 4,
  },
  todayValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: C.text,
  },

  section: { marginHorizontal: 16, marginTop: 18 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 16,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickBox: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickBoxIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  quickBoxTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    marginBottom: 2,
  },
  quickBoxSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
});
