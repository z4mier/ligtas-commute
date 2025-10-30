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

/* ---------- Local-only fake feedbacks (anonymous) ---------- */
const now = Date.now();
const FAKE_FEEDBACKS = [
  {
    id: "f1",
    type: "rating",
    rating: 5,
    message: "Smooth ride. Driver was courteous and kept a steady speed.",
    createdAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 min ago
  },
  {
    id: "f2",
    type: "incident",
    tags: ["Delay", "Traffic"],
    message: "There was a slight delay due to heavy traffic near Minglanilla.",
    createdAt: new Date(now - 45 * 60 * 1000).toISOString(), // 45 min ago
  },
  {
    id: "f3",
    type: "rating",
    rating: 4,
    message: "Aircon was okay and comfortable seats. Thanks!",
    createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  },
  {
    id: "f4",
    type: "incident",
    tags: ["Crowded"],
    message:
      "Bus was a bit crowded at Naga stop, but the driver handled boarding safely.",
    createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
  {
    id: "f5",
    type: "rating",
    rating: 5,
    message: "Great driving and helpful announcements before each stop.",
    createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(), // 1 day+ ago
  },
  {
    id: "f6",
    type: "incident",
    tags: ["Cleanliness"],
    message: "Bus interior was kept clean during the whole trip. Good job.",
    createdAt: new Date(now - 30 * 60 * 60 * 1000).toISOString(), // ~1.25 days ago
  },
];

export default function DriverDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // For demo/local-only, we keep driver static.
  const driver = { fullName: "Driver Test", avatar: null };

  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    // Simulate load from local-only feed:
    // Shuffle a bit so "Refresh" feels dynamic
    const shuffled = [...FAKE_FEEDBACKS].sort(() => Math.random() - 0.5);
    const list = shuffled.slice(0, 5); // show last 5 (fake)
    setFeedbacks(list);
    setLoading(false);
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
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <MaterialCommunityIcons name="bus" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.brandText}>LigtasCommute</Text>
              </View>

              <Text style={styles.driverName} numberOfLines={1}>
                {driver?.fullName || "—"}
              </Text>

              <Text style={styles.driverRole}>Professional Driver</Text>
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

        {/* Feedback Section (local-only & anonymous) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="message-text-outline" size={18} color={C.text} />
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
              title="No feedbacks available"
              subtitle="You’ll see passenger feedback here once they start reviewing trips."
            />
          ) : (
            feedbacks.map((f) => (
              <View key={String(f.id)} style={[styles.feedbackCard]}>
                <View style={styles.feedRowTop}>
                  <Text style={styles.feedAuthor}>Anonymous</Text>
                  {f.type === "rating" ? <StarRow rating={Number(f.rating) || 0} size={14} /> : null}
                </View>

                {f.type === "incident" && Array.isArray(f.tags) && f.tags.length > 0 ? (
                  <Text style={[styles.feedMsg, { fontStyle: "italic" }]}>{f.tags.join(", ")}</Text>
                ) : null}

                <Text style={styles.feedMsg} numberOfLines={4}>
                  {f.message ||
                    (f.type === "rating" ? "Thanks for your rating." : "Incident reported.")}
                </Text>
                <Text style={styles.feedTime}>{timeAgo(f.createdAt)}</Text>
              </View>
            ))
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
    <MaterialCommunityIcons name={icon} size={20} color={active ? "#fff" : C.sub} />
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
  driverRole: { color: "#E5E7EB", fontFamily: "Poppins_400Regular", fontSize: 12 },

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
  tabText: { fontFamily: "Poppins_600SemiBold", color: C.sub, fontSize: 12 },
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
  feedRowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  feedAuthor: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 13 },
  feedMsg: { color: C.text, fontFamily: "Poppins_400Regular", fontSize: 12 },
  feedTime: { color: C.hint, fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 8 },

  emptyWrap: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", color: C.sub, fontSize: 13 },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
