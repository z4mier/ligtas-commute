/* eslint-disable react/no-unescaped-entities */
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

/* ---------- Storage key for trip history ---------- */
const TRIP_HISTORY_KEY = "driverTrips";

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

/* ---------- Route label builder ---------- */
function buildLoopRouteLabel(forward, back) {
  if (!forward && !back) return null;

  const splitParts = (s) =>
    (s || "")
      .split(/→|->/g)
      .map((t) => t.trim())
      .filter(Boolean);

  const fParts = splitParts(forward);
  const rParts = splitParts(back);

  const start = fParts[0] || rParts[0] || null;
  const mid = fParts[1] || rParts[0] || null;
  const end =
    (rParts.length > 1 && rParts[rParts.length - 1]) || fParts[0] || null;

  const seq = [start, mid, end].filter(Boolean);

  if (!seq.length) return null;
  return seq.join(" → ");
}

function formatTimeLabel(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Save finished trip to local history (AsyncStorage) */
async function saveTripToHistory(trip) {
  try {
    const raw = await AsyncStorage.getItem(TRIP_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];

    // unshift so latest appears on top
    arr.unshift(trip);

    await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(arr));
    console.log("[DriverDashboard] Trip saved to local history", trip);
  } catch (e) {
    console.log("[DriverDashboard] Failed to save trip history", e);
  }
}

export default function DriverDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [driver, setDriver] = useState({ fullName: "Driver", avatar: null });
  const [driverId, setDriverId] = useState(null); // <-- NEW

  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // duty status – synced with API (/driver/duty)
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [dutyUpdating, setDutyUpdating] = useState(false);

  // bus + route info for header
  const [busInfo, setBusInfo] = useState({
    number: null,
    plate: null,
    routeLabel: null, // "SBT → Alegria → SBT"
  });

  // current trip session (local for now)
  const [currentTrip, setCurrentTrip] = useState(null);
  // last finished trip (for display after End trip)
  const [lastTrip, setLastTrip] = useState(null);

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

      /* -------- profile / name + bus + route for header + duty -------- */
      try {
        const r = await fetch(`${API_URL}/users/me`, { headers });
        if (!r.ok) {
          console.log("[DriverDashboard] /users/me not ok", r.status);
          throw new Error("Failed to load profile");
        }
        const profileData = await r.json().catch(() => ({}));

        const driverProfile =
          profileData.driver || profileData.driverProfile || {};

        const fullName =
          profileData.fullName || driverProfile.fullName || "Driver";

        const avatar =
          profileData.profileUrl || driverProfile.profileUrl || null;

        setDriver({ fullName, avatar });

        // NEW: store driverId for trip history
        setDriverId(driverProfile.id || profileData.id || null);

        // sync duty from driverProfile.status
        const rawStatus = (driverProfile.status || "").toUpperCase();
        const onDutyFromApi =
          rawStatus === "ON_DUTY" || rawStatus === "ACTIVE";
        setIsOnDuty(onDutyFromApi);

        // Bus details
        const bus = driverProfile.bus || profileData.bus || null;

        let number = null;
        let plate = null;
        let routeLabel = null;

        if (bus) {
          number = bus.number || bus.busNumber || null;
          plate = bus.plate || bus.plateNumber || null;

          routeLabel =
            bus.routeLabel ||
            bus.route ||
            buildLoopRouteLabel(bus.forwardRoute, bus.returnRoute);
        }

        setBusInfo({
          number,
          plate,
          routeLabel,
        });
      } catch (e) {
        console.log("[DriverDashboard] load driver profile error", e);
        setBusInfo({ number: null, plate: null, routeLabel: null });
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

  /* ---------- Duty handlers (with confirmation + API) ---------- */

  const updateDutyOnServer = async (nextStatusBool) => {
    if (dutyUpdating) return;
    setDutyUpdating(true);
    const previous = isOnDuty;

    try {
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      const res = await fetch(`${API_URL}/driver/duty`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          status: nextStatusBool ? "ON_DUTY" : "OFF_DUTY",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.log("[DriverDashboard] duty update error", data);
        setIsOnDuty(previous);
        Alert.alert("Error", data.message || "Failed to update duty status.");
        return;
      }

      setIsOnDuty(nextStatusBool);

      if (!nextStatusBool) {
        setCurrentTrip(null);
        setLastTrip(null);
      }
    } catch (err) {
      console.log("[DriverDashboard] duty update exception", err);
      setIsOnDuty(previous);
      Alert.alert("Error", "Failed to update duty status.");
    } finally {
      setDutyUpdating(false);
    }
  };

  const confirmDutyChange = (nextStatus) => {
    if (nextStatus === isOnDuty || dutyUpdating) return;

    const goingOn = nextStatus === true;

    Alert.alert(
      goingOn ? "Start duty?" : "End duty?",
      goingOn
        ? "You will be marked ON duty and can start trips."
        : "You will go OFF duty. Any ongoing trip will be closed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: goingOn ? "default" : "destructive",
          onPress: () => {
            updateDutyOnServer(nextStatus);
          },
        },
      ]
    );
  };

  /* ---------- Trip handlers (local + saved to history) ---------- */

  const startTripSession = () => {
    if (!busInfo.routeLabel) {
      Alert.alert("No route", "Ask the admin to set up your bus route first.");
      return;
    }

    const now = new Date();
    const id = `${now.getTime()}`;

    setCurrentTrip({
      id,
      routeLabel: busInfo.routeLabel,
      startedAt: now.toISOString(),
      passengers: 0,
    });
  };

  const endTripSession = () => {
    if (!currentTrip) return;

    Alert.alert("End trip?", "This will close your current trip session.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End trip",
        style: "destructive",
        onPress: async () => {
          const endedAt = new Date().toISOString();

          const finishedTrip = {
            id: currentTrip.id,
            routeLabel: currentTrip.routeLabel || busInfo.routeLabel,
            startedAt: currentTrip.startedAt,
            endedAt,
            driverId, // <-- tag trip with this driver
          };

          setLastTrip(finishedTrip);
          await saveTripToHistory(finishedTrip);
          setCurrentTrip(null);
        },
      },
    ]);
  };

  const handleTripAction = () => {
    if (!isOnDuty) {
      Alert.alert("Off duty", "Start duty first before starting a trip.");
      return;
    }
    if (currentTrip) {
      endTripSession();
    } else {
      startTripSession();
    }
  };

  const handleReportIssue = () => {
    navigation?.navigate?.("DriverReports");
  };

  const hasRatings = totalRatings > 0 && (avgRating || 0) > 0;

  let avgDisplay = "No ratings yet";

  if (hasRatings) {
    const rounded = Math.round((avgRating || 0) * 10) / 10;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.001;
    const scoreStr = isWhole ? `${Math.round(rounded)}` : rounded.toFixed(1);
    avgDisplay = `${scoreStr} / 5`;
  }

  const ratingCountLabel =
    totalRatings === 1 ? "1 rating" : `${totalRatings} ratings`;
  const ratingSubtitle = hasRatings
    ? `${avgDisplay} • ${ratingCountLabel}`
    : "No ratings yet";

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const busLine =
    busInfo.number || busInfo.plate
      ? `Bus ${busInfo.number || "—"} · ${busInfo.plate || "—"}`
      : "No bus assigned";

  const routeLine = busInfo.routeLabel || "Route not set";
  const hasActiveTrip = !!currentTrip;

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
          {/* Header Card – profile + bus/route */}
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

                  <Text style={styles.busLine} numberOfLines={1}>
                    {busLine}
                  </Text>

                  <Text style={styles.routeLine} numberOfLines={2}>
                    {routeLine}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Live Status Section */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="radar"
                  size={18}
                  color={C.text}
                />
                <Text style={styles.sectionTitle}>  Live status</Text>
              </View>
            </View>

            <View style={styles.liveCard}>
              {!isOnDuty && (
                <>
                  <Text style={styles.liveLabel}>You are OFF duty</Text>
                  <Text style={styles.liveMeta}>
                    Start duty to begin tracking your trips and to be visible in
                    the system.
                  </Text>
                </>
              )}

              {isOnDuty && !hasActiveTrip && (
                <>
                  <Text style={styles.liveLabel}>On duty</Text>
                  <Text style={styles.liveValue}>
                    {routeLine !== "Route not set"
                      ? routeLine
                      : "Waiting for assigned route"}
                  </Text>
                  <Text style={styles.liveMeta}>
                    You are available for trips. Tap "Start trip" once you are
                    ready to depart.
                  </Text>

                  {lastTrip && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.liveSubheading}>Last trip</Text>
                      <Text style={styles.liveMeta}>
                        {lastTrip.routeLabel || routeLine || "—"}
                      </Text>
                      <Text style={styles.liveMeta}>
                        Time: {formatTimeLabel(lastTrip.startedAt)} –{" "}
                        {formatTimeLabel(lastTrip.endedAt)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {isOnDuty && hasActiveTrip && (
                <>
                  <Text style={styles.liveLabel}>Current trip</Text>
                  <Text style={styles.liveValue}>
                    {currentTrip.routeLabel || routeLine || "—"}
                  </Text>

                  <View style={styles.liveRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={16}
                      color={C.sub}
                    />
                    <Text style={styles.liveMeta}>
                      Started at: {formatTimeLabel(currentTrip.startedAt)}
                    </Text>
                  </View>

                  <View style={styles.liveRow}>
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={16}
                      color={C.sub}
                    />
                    <Text style={styles.liveMeta}>
                      Passengers scanned: {currentTrip.passengers || 0}
                    </Text>
                  </View>
                </>
              )}
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
              {loading || dutyUpdating ? (
                <ActivityIndicator size="small" color={C.sub} />
              ) : null}
            </View>

            <View style={styles.quickGrid}>
              {/* 1. Start / End Duty */}
              <QuickBox
                icon={isOnDuty ? "power" : "play-circle-outline"}
                title={isOnDuty ? "End duty" : "Start duty"}
                subtitle={
                  isOnDuty
                    ? "Go off duty after your last trip"
                    : "Make yourself available for trips"
                }
                variant="primary"
                onPress={() => confirmDutyChange(!isOnDuty)}
              />

              {/* 2. Start / End Trip */}
              <QuickBox
                icon={
                  hasActiveTrip ? "stop-circle-outline" : "navigation-variant"
                }
                title={hasActiveTrip ? "End trip" : "Start trip"}
                subtitle={
                  !isOnDuty
                    ? "Start duty first"
                    : hasActiveTrip
                    ? "Finish current trip"
                    : "Begin trip session"
                }
                variant="accent"
                onPress={handleTripAction}
              />

              {/* 3. Passenger Reports */}
              <QuickBox
                icon="alert-circle-outline"
                title="Passenger reports"
                subtitle="View issues reported by commuters"
                onPress={handleReportIssue}
              />

              {/* 4. Trip History */}
              <QuickBox
                icon="history"
                title="Trip history"
                subtitle="View completed trips"
                onPress={() => navigation?.navigate?.("DriverTripHistory")}
              />

              {/* 5. Ratings */}
              <QuickBox
                icon="star-circle-outline"
                title="Ratings"
                subtitle={ratingSubtitle}
                onPress={() => navigation?.navigate?.("DriverRatings")}
              />

              {/* 6. Profile Settings */}
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
  busLine: {
    color: "#D1D5DB",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 6,
  },
  routeLine: {
    color: "#9CA3AF",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 2,
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

  liveCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  liveLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: C.text,
    marginBottom: 4,
  },
  liveSubheading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
    marginBottom: 2,
  },
  liveValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
    marginBottom: 8,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  liveMeta: {
    marginLeft: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
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
