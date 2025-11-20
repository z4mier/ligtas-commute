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

/* ---------- Colors ---------- */
const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
  star: "#F59E0B",
  danger: "#B91C1C",
  success: "#10B981",
};

/* ---------- Tiny helpers ---------- */
const StarRow = ({ rating = 0, size = 16 }) => {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <MaterialCommunityIcons
          key={i}
          name={i < n ? "star" : "star-outline"}
          size={size}
          color={C.star}
        />
      ))}
    </View>
  );
};

const EmptyState = ({ title, subtitle, icon = "comment-off-outline" }) => (
  <View style={styles.emptyWrap}>
    <MaterialCommunityIcons name={icon} size={32} color={C.hint} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
  </View>
);

function timeAgo(dateLike) {
  try {
    const dt = dateLike ? new Date(dateLike) : null;
    if (!dt || isNaN(dt.getTime())) return "";
    const diff = (Date.now() - dt.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} day(s) ago`;
  } catch {
    return "";
  }
}

export default function DriverDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // TODO: replace with data from /driver/me later
  const [driver] = useState({ fullName: "Driver", avatar: null });

  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]); // list of RideRating
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Try driverToken first, then fallback to token
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      console.log("[DriverDashboard] using token =", !!token);

      const res = await fetch(`${API_URL}/driver/ratings`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await res.json().catch(() => ({}));
      console.log("[DriverDashboard] /driver/ratings response =", data);

      if (!res.ok) {
        console.log("[DriverDashboard] ratings error =", data);
        throw new Error(data.error || "Failed to load ratings");
      }

      setAvgRating(data.averageScore || 0);
      setTotalRatings(data.totalRatings || 0);
      setFeedbacks(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.log("[DriverDashboard] load ratings error", e);
      setAvgRating(0);
      setTotalRatings(0);
      setFeedbacks([]);
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

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerCard}
          onPress={() => navigation?.navigate?.("Profile")}
        >
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              {driver?.avatar ? (
                <Image source={{ uri: driver.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {(driver?.fullName?.[0] || "D").toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <MaterialCommunityIcons
                  name="bus"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.brandText}>LigtasCommute</Text>
              </View>

              <Text style={styles.driverName} numberOfLines={1}>
                {driver?.fullName || "—"}
              </Text>

              <Text style={styles.driverRole}>Professional Driver</Text>

              {/* Rating summary */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                  gap: 6,
                }}
              >
                <StarRow rating={avgRating || 0} size={14} />
                <Text
                  style={{
                    color: "#FBBF24",
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  {totalRatings > 0
                    ? `${(avgRating || 0).toFixed(1)} / 5`
                    : "No ratings yet"}
                </Text>
                {totalRatings > 0 && (
                  <Text
                    style={{
                      color: "#E5E7EB",
                      fontFamily: "Poppins_400Regular",
                      fontSize: 11,
                    }}
                  >
                    ({totalRatings} ratings)
                  </Text>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Tabs Row */}
        <View style={styles.tabs}>
          <Tab icon="home" label="Home" active />
          <Tab
            icon="map-marker-path"
            label="Tracking"
            onPress={() => navigation?.navigate?.("DriverTracking")}
          />
          <Tab
            icon="cog"
            label="Settings"
            onPress={() => navigation?.navigate?.("DriverSettings")}
          />
        </View>

        {/* Feedback Section – real ratings now */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color={C.text}
              />
              <Text style={styles.sectionTitle}>  Feedback</Text>
            </View>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.markAll}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading feedback…</Text>
            </View>
          ) : feedbacks.length === 0 ? (
            <EmptyState
              title="No feedback yet"
              subtitle="You’ll see passenger ratings and comments here once they start reviewing trips."
            />
          ) : (
            feedbacks.map((f) => {
              const score = Number(f.score) || 0;
              const hasComment = !!(f.comment && f.comment.trim());
              return (
                <View key={String(f.id)} style={styles.feedbackCard}>
                  <View style={styles.feedRowTop}>
                    <Text style={styles.feedAuthor}>Anonymous passenger</Text>
                    <StarRow rating={score} size={14} />
                  </View>

                  {hasComment ? (
                    <Text style={styles.feedMsg} numberOfLines={4}>
                      {f.comment}
                    </Text>
                  ) : (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.noCommentLabel}>
                        No written comment
                      </Text>
                      <Text style={styles.noCommentHint}>
                        Passenger chose to rate this trip without a message.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.feedTime}>{timeAgo(f.createdAt)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Small components ---------- */
const Tab = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabBtn, active && styles.tabActive]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={active ? "#fff" : C.sub}
    />
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: C.brand,
    borderRadius: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  brandText: { color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  driverName: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginTop: 2,
  },
  driverRole: {
    color: "#E5E7EB",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },

  tabs: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F9FAFB",
    flexDirection: "column",
    gap: 6,
  },
  tabActive: { backgroundColor: C.brand, borderColor: C.brand },
  tabText: {
    fontFamily: "Poppins_600SemiBold",
    color: C.sub,
    fontSize: 12,
  },
  tabTextActive: { color: "#fff" },

  section: { marginHorizontal: 16, marginTop: 16 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 16,
  },
  markAll: {
    fontFamily: "Poppins_600SemiBold",
    color: C.brand,
    fontSize: 12,
  },

  loadingArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  loadingText: { color: C.sub, fontFamily: "Poppins_400Regular" },

  feedbackCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  feedRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  feedAuthor: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 13,
  },
  feedMsg: { color: C.text, fontFamily: "Poppins_400Regular", fontSize: 12 },
  noCommentLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: C.sub,
  },
  noCommentHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.hint,
    marginTop: 2,
  },
  feedTime: {
    color: C.hint,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 8,
  },

  emptyWrap: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.sub,
    fontSize: 13,
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
