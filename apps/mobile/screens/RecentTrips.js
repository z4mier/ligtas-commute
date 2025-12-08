// apps/mobile/screens/RecentTrips.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
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
import LCText from "../components/LCText";

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

// sort helper
function sortTrips(list, order = "desc") {
  const copy = [...list];
  copy.sort((a, b) => {
    const da = new Date(a.endedAt || a.startedAt || 0).getTime();
    const db = new Date(b.endedAt || b.startedAt || 0).getTime();
    return order === "asc" ? da - db : db - da; // desc = newest → oldest
  });
  return copy;
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
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = newest first, "asc" = oldest first

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

        // sort based on current sortOrder
        const sorted = sortTrips(list, sortOrder);
        setTrips(sorted);
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
    [navigation, sortOrder]
  );

  useEffect(() => {
    loadTrips(false);
    const unsub = navigation.addListener("focus", () => loadTrips(false));
    return unsub;
  }, [navigation, loadTrips]);

  const onRefresh = () => loadTrips(true);

  const handleSortChange = (order) => {
    if (order === sortOrder) return;
    setSortOrder(order);
    setTrips((prev) => sortTrips(prev, order));
  };

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
          <LCText variant="label" style={styles.tripTitle} numberOfLines={1}>
            {title}
          </LCText>
          <LCText variant="tiny" style={styles.tripSubtitle}>
            {dateTimeStr}
          </LCText>

          {(driverName || busLabel) && (
            <View style={styles.tripMetaRow}>
              {driverName && (
                <View style={styles.tripMetaChip}>
                  <MaterialCommunityIcons
                    name="account"
                    size={13}
                    color={C.brand}
                  />
                  <LCText
                    variant="tiny"
                    style={styles.tripMetaText}
                    numberOfLines={1}
                  >
                    {driverName}
                  </LCText>
                </View>
              )}
              {busLabel && (
                <View style={styles.tripMetaChip}>
                  <MaterialCommunityIcons
                    name="bus"
                    size={13}
                    color={C.brand}
                  />
                  <LCText
                    variant="tiny"
                    style={styles.tripMetaText}
                    numberOfLines={1}
                  >
                    {busLabel}
                  </LCText>
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
        <LCText
          variant="label"
          style={styles.headerTitle}
          numberOfLines={1}
        >
          Your trips
        </LCText>
        <View style={{ width: 24 }} />
      </View>

      {/* BODY */}
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator />
          <LCText variant="tiny" style={styles.loadingText}>
            Loading your trips…
          </LCText>
        </View>
      ) : trips.length === 0 ? (
        <View style={[styles.center, { flex: 1, paddingHorizontal: 32 }]}>
          <MaterialCommunityIcons
            name="history"
            size={32}
            color={C.hint}
          />
          <LCText variant="label" style={styles.emptyTitle}>
            No trips yet
          </LCText>
          <LCText variant="tiny" style={styles.emptySub}>
            Your completed rides will appear here after you finish a trip.
          </LCText>
          {!!error && (
            <LCText variant="tiny" style={styles.errorText}>
              {error}
            </LCText>
          )}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadTrips(false)}
          >
            <LCText variant="label" style={styles.retryBtnText}>
              Retry
            </LCText>
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
              <View style={styles.listHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <LCText variant="tiny" style={styles.summaryText}>
                    Showing{" "}
                    <LCText
                      variant="tiny"
                      style={styles.summaryStrong}
                    >
                      {trips.length}
                    </LCText>{" "}
                    completed trip{trips.length === 1 ? "" : "s"}.
                  </LCText>
                </View>

                <View style={styles.sortRow}>
                  <LCText variant="tiny" style={styles.sortLabel}>
                    Sort:
                  </LCText>

                  <TouchableOpacity
                    style={[
                      styles.sortChip,
                      sortOrder === "desc" && styles.sortChipActive,
                    ]}
                    onPress={() => handleSortChange("desc")}
                    activeOpacity={0.8}
                  >
                    <LCText
                      variant="tiny"
                      style={[
                        styles.sortChipText,
                        sortOrder === "desc" && styles.sortChipTextActive,
                      ]}
                    >
                      Newest
                    </LCText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sortChip,
                      sortOrder === "asc" && styles.sortChipActive,
                    ]}
                    onPress={() => handleSortChange("asc")}
                    activeOpacity={0.8}
                  >
                    <LCText
                      variant="tiny"
                      style={[
                        styles.sortChipText,
                        sortOrder === "asc" && styles.sortChipTextActive,
                      ]}
                    >
                      Oldest
                    </LCText>
                  </TouchableOpacity>
                </View>
              </View>

              {!!error && (
                <LCText variant="tiny" style={styles.errorText}>
                  {error}
                </LCText>
              )}
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
    fontSize: 13,
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

  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },

  summaryText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },
  summaryStrong: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
  },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
    marginLeft: 4,
  },
  sortChipActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  sortChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.text,
  },
  sortChipTextActive: {
    color: "#FFFFFF",
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
