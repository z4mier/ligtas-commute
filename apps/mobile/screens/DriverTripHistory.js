// apps/mobile/screens/DriverTripHistory.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
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

  const loadTrips = useCallback(async (activeDriverId) => {
    try {
      const raw = await AsyncStorage.getItem(TRIP_HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];

      const filtered = Array.isArray(arr)
        ? arr.filter(
            (t) => t.driverId && (!activeDriverId || t.driverId === activeDriverId)
          )
        : [];

      filtered.sort((a, b) => {
        const aTime = new Date(a.startedAt || 0).getTime();
        const bTime = new Date(b.startedAt || 0).getTime();
        return bTime - aTime;
      });

      setTrips(filtered);
    } catch (e) {
      console.log("[DriverTripHistory] Failed to load trips", e);
      setTrips([]);
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
          <Text style={styles.routeText} numberOfLines={1}>
            {item.routeLabel || "Route"}
          </Text>
        </View>

        <Text style={styles.dateText}>{dateLabel}</Text>

        <View style={styles.timeRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={C.sub}
          />
          <Text style={styles.timeText}>
            {startLabel} – {endLabel}
          </Text>
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
      {/* Top header */}
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
        <Text style={styles.topTitle}>Trip history</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Dark summary card */}
      <View style={styles.summaryWrapper}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Trip summary</Text>
            <Text style={styles.summaryValue}>
              {totalTrips === 0 ? "—" : totalTrips}
            </Text>
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

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={C.sub} />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={42}
            color={C.sub}
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.emptyTitle}>No trip history</Text>
          <Text style={styles.emptySubtitle}>
            You currently have no recorded trips. Keep driving safely!
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
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

  summaryWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
