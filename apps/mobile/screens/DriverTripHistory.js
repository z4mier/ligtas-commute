import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import LCText from "../components/LCText";

const TRIP_HISTORY_KEY = "driverTrips";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#0B132B",
};

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DriverTripHistory({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");

  // Add the notificationVisible state
  const [notificationVisible, setNotificationVisible] = useState(false);

  const loadTrips = useCallback(async (activeDriverId) => {
    try {
      const raw = await AsyncStorage.getItem(TRIP_HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];

      // Filter only completed trips based on driverId
      const filtered = Array.isArray(arr)
        ? arr.filter(
            (t) =>
              t.driverId &&
              (!activeDriverId || t.driverId === activeDriverId) &&
              t.status === "COMPLETED"  // Only include completed trips
          )
        : [];

      setTrips(filtered);
      setNotificationVisible(filtered.length > 0); // Show notification if there are completed trips
    } catch (e) {
      console.log("[DriverTripHistory] Failed to load trips", e);
      setTrips([]);
      setNotificationVisible(false); // Hide notification if trips load fails
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      let activeDriverId = null;

      try {
        const token =
          (await AsyncStorage.getItem("driverToken")) ||
          (await AsyncStorage.getItem("token"));

        if (token) {
          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };
          const res = await fetch(`${API_URL}/users/me`, { headers });
          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            const driverProfile = data.driver || data.driverProfile || {};
            activeDriverId = driverProfile.id || data.id || null;
          } else {
            console.log("[DriverTripHistory] /users/me not ok", res.status);
          }
        }
      } catch (err) {
        console.log("[DriverTripHistory] Failed to load profile", err);
      }

      setDriverId(activeDriverId);
      await loadTrips(activeDriverId);
    } finally {
      setLoading(false);
    }
  }, [loadTrips]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips(driverId);
    setRefreshing(false);
  }, [loadTrips, driverId]);

  const sortedTrips = [...trips].sort((a, b) => {
    const getTime = (t) => {
      const d = new Date(t.startedAt || 0);
      const n = d.getTime();
      return Number.isNaN(n) ? 0 : n;
    };
    const at = getTime(a);
    const bt = getTime(b);
    if (sortOrder === "newest") return bt - at;
    return at - bt;
  });

  const sortLabel =
    sortOrder === "newest" ? "Newest to oldest" : "Oldest to newest";

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  const renderItem = ({ item }) => {
    const dateLabel = formatDate(item.startedAt);
    const startLabel = formatTime(item.startedAt);
    const endLabel = formatTime(item.endedAt);

    return (
      <View style={styles.card}>
        <View style={styles.routeRow}>
          <MaterialCommunityIcons
            name="navigation-variant"
            size={18}
            color={C.brand}
            style={{ marginRight: 6 }}
          />
          <LCText style={styles.routeText} numberOfLines={1}>
            {item.routeLabel || "Route"}
          </LCText>
        </View>

        <LCText style={styles.dateText}>{dateLabel}</LCText>

        <View style={styles.timeRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={C.sub}
          />
          <LCText style={styles.timeText}>
            {startLabel} – {endLabel}
          </LCText>
        </View>
      </View>
    );
  };

  const totalTrips = trips.length;

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {notificationVisible && (
        <View style={styles.notification}>
          <LCText style={styles.notificationText}>
            New trip history available!
          </LCText>
          <TouchableOpacity onPress={() => setNotificationVisible(false)}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={C.text}
            />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={C.text}
          />
        </TouchableOpacity>
        <LCText style={styles.topTitle}>Trip history</LCText>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.summaryWrapper}>
        <View style={styles.summaryCard}>
          <View>
            <LCText style={styles.summaryLabel}>Trip summary</LCText>
            <LCText style={styles.summaryValue}>
              {totalTrips === 0 ? "—" : totalTrips}
            </LCText>
          </View>
          <View style={styles.summaryRight}>
            <MaterialCommunityIcons
              name="bus-clock"
              size={30}
              color="#FBBF24"
            />
          </View>
        </View>
      </View>

      <View style={styles.sortWrapper}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleSortOrder}
          style={styles.sortPill}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={16}
            color={C.text}
            style={{ marginRight: 6 }}
          />
          <LCText style={styles.sortText}>{sortLabel}</LCText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={C.sub} />
        </View>
      ) : sortedTrips.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={42}
            color={C.sub}
            style={{ marginBottom: 10 }}
          />
          <LCText style={styles.emptyTitle}>No trip history</LCText>
          <LCText style={styles.emptySubtitle}>
            You currently have no recorded trips. Keep driving safely!
          </LCText>
        </View>
      ) : (
        <FlatList
          data={sortedTrips}
          keyExtractor={(item, idx) => item.id || `${item.startedAt}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: C.text,
    fontFamily: "Poppins_600SemiBold",
  },

  notification: {
    backgroundColor: "#FBBF24",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  notificationText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },

  summaryWrapper: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: C.brand,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "#E5E7EB",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  summaryValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },
  summaryRight: {
    alignItems: "center",
    justifyContent: "center",
  },

  sortWrapper: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.text,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 15,
    color: C.text,
    fontFamily: "Poppins_600SemiBold",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: C.sub,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  routeText: {
    fontSize: 14,
    color: C.text,
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
  },
  dateText: {
    fontSize: 12,
    color: C.sub,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 12,
    color: C.text,
    fontFamily: "Poppins_400Regular",
  },
});
