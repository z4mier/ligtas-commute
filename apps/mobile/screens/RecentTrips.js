// apps/mobile/screens/RecentTrips.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
};

/* ---------- token helpers (same idea as CommuterDashboard) ---------- */

const TOKEN_KEYS = [
  "authToken",
  "AUTH_TOKEN",
  "LC_COMMUTER_TOKEN",
  "lc_user",
  "lc_token",
  "token",
  "driverToken",
  "LC_DRIVER_TOKEN",
  "lc_admin",
];

async function getAuthToken() {
  for (const key of TOKEN_KEYS) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      const trimmed = String(raw).trim();

      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmed);
          const candidate =
            obj.token || obj.jwt || obj.accessToken || obj.authToken;
          if (candidate) return candidate;
        } catch {
          // ignore parse error
        }
      } else {
        return trimmed;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function clearAuthToken() {
  await Promise.all(TOKEN_KEYS.map((k) => AsyncStorage.removeItem(k)));
}

/* ---------- utils ---------- */

// "13 Nov 2025, 02:29 am"
function fmtDateTime(x) {
  if (!x) return "—";
  const d = new Date(x);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function cleanPlace(s, fallback = "Unknown destination") {
  if (!s) return fallback;
  return s.trim();
}

export default function RecentTrips({ navigation }) {
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTrips = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const token = await getAuthToken();
        if (!token) {
          await clearAuthToken();
          navigation.replace("Login");
          return;
        }

        const res = await fetch(`${API_URL}/commuter/trips/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await clearAuthToken();
          navigation.replace("Login");
          return;
        }

        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];

        // optional: sort newest first
        list.sort((a, b) => {
          const da = new Date(a.endedAt || a.startedAt || 0).getTime();
          const db = new Date(b.endedAt || b.startedAt || 0).getTime();
          return db - da;
        });

        setTrips(list);
      } catch (e) {
        console.log("[RecentTrips] load error:", e);
        setError("Unable to load your trips. Please try again.");
        setTrips([]);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [navigation]
  );

  useEffect(() => {
    loadTrips(false);
    const unsub = navigation.addListener("focus", () => loadTrips(false));
    return unsub;
  }, [navigation, loadTrips]);

  const onRefresh = () => loadTrips(true);

  const renderTrip = ({ item: trip }) => {
    const title = `Ride to ${cleanPlace(trip.destLabel)}`;
    const dateTimeStr = fmtDateTime(trip.endedAt || trip.startedAt);

    const driverName =
      trip.driverProfile?.fullName ||
      trip.driverProfile?.name ||
      trip.driverName ||
      null;

    const busLabel =
      trip.bus?.number ||
      trip.bus?.plate ||
      (trip.busId ? `Bus #${trip.busId}` : null);

    return (
      <TouchableOpacity
        style={styles.tripRow}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("TripDetails", { trip })}
      >
        {/* avatar with bus icon */}
        <View style={styles.tripAvatar}>
          <MaterialCommunityIcons name="bus" size={20} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.tripTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.tripSubtitle}>{dateTimeStr}</Text>

          {(driverName || busLabel) && (
            <View style={styles.tripMetaRow}>
              {driverName && (
                <View style={styles.tripMetaChip}>
                  <MaterialCommunityIcons
                    name="account"
                    size={13}
                    color={C.brand}
                  />
                  <Text style={styles.tripMetaText} numberOfLines={1}>
                    {driverName}
                  </Text>
                </View>
              )}
              {busLabel && (
                <View style={styles.tripMetaChip}>
                  <MaterialCommunityIcons
                    name="bus"
                    size={13}
                    color={C.brand}
                  />
                  <Text style={styles.tripMetaText} numberOfLines={1}>
                    {busLabel}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={C.sub}
        />
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { paddingTop: Math.max(insets.top, 10) }]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={C.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Your trips
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* BODY */}
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading your trips…</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={[styles.center, { flex: 1, paddingHorizontal: 32 }]}>
          <MaterialCommunityIcons
            name="history"
            size={32}
            color={C.hint}
          />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySub}>
            Your completed rides will appear here after you finish a trip.
          </Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadTrips(false)}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderTrip}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.brand}
            />
          }
          ListHeaderComponent={
            <>
              <Text style={styles.summaryText}>
                Showing{" "}
                <Text style={styles.summaryStrong}>{trips.length}</Text>{" "}
                completed trip{trips.length === 1 ? "" : "s"}.
              </Text>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  headerBack: {
    padding: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: C.text,
  },

  loadingText: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },

  summaryText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
    marginBottom: 4,
  },
  summaryStrong: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
  },

  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  tripAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  tripTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
  },
  tripSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: C.sub,
    marginTop: 2,
  },
  tripMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tripMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    gap: 4,
  },
  tripMetaText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.brand,
    maxWidth: 120,
  },

  emptyTitle: {
    marginTop: 8,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: C.hint,
    textAlign: "center",
  },
  errorText: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#B91C1C",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.brand,
    alignItems: "center",
  },
  retryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.brand,
  },
});
