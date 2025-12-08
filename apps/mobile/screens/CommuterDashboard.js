// apps/mobile/screens/CommuterDashboard.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";
import * as Notify from "../lib/notify";
import LCText from "../components/LCText"; // ✅ our custom Text

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
  dot: "#EF4444",
};

const HEADER_TITLE_SIZE = 12;
const HEADER_ICON_SIZE = 20;
const LOGO_SIZE = 30;
const HEADER_H = 44;

const SAFETY_TIPS = [
  "Always check the driver's ID and bus number before boarding.",
  "Share your trip details with a trusted contact when traveling.",
  "Avoid displaying valuables like phones and wallets near the bus doors.",
  "Stay seated or hold onto the handrails when the bus is moving.",
  "Know the location of the emergency button and exits in case of incidents.",
  "Report unsafe driving or suspicious behavior through the app.",
];

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
        } catch {}
      } else {
        return trimmed;
      }
    } catch {}
  }
  return null;
}

async function clearAuthToken() {
  await Promise.all(TOKEN_KEYS.map((k) => AsyncStorage.removeItem(k)));
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

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

function cleanPlace(s) {
  if (!s) return "Unknown destination";
  return s.trim();
}

const MAX_RECENT_SHOWN = 5;

export default function CommuterDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const insets = useSafeAreaInsets();

  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const [recentTrips, setRecentTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const todayTip = useMemo(() => {
    const today = new Date();
    const idx = today.getDate() % SAFETY_TIPS.length;
    return SAFETY_TIPS[idx];
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) return navigation.replace("Login");

        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          await clearAuthToken();
          return navigation.replace("Login");
        }

        const data = await res.json().catch(() => null);
        if (data) setMe(data);
      } catch (e) {
        console.log("[CommuterDashboard] /users/me error:", e);
        await clearAuthToken();
        return navigation.replace("Login");
      } finally {
        setChecking(false);
      }
    })();
  }, [navigation]);

  const displayName = useMemo(() => {
    if (!me) return "";
    const basis = me.fullName || me.email || "";
    return basis.split(" ")[0];
  }, [me]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const list = await Notify.load();
      if (!mounted) return;
      setNotifications(
        list.map((n) => ({
          ...n,
          timeAgo: timeAgo(n.timestamp),
        }))
      );
    };

    refresh();

    const unsubStore = Notify.onChange(refresh);
    const unsubNav = navigation.addListener("focus", refresh);

    return () => {
      mounted = false;
      unsubStore?.();
      unsubNav?.();
    };
  }, [navigation]);

  const markAllRead = async () => {
    const updated = await Notify.markAllRead();
    setNotifications(
      updated.map((n) => ({ ...n, timeAgo: timeAgo(n.timestamp) }))
    );
  };

  const openAllNotifications = () => {
    setNotifOpen(false);
    navigation?.navigate?.("Notifications");
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      try {
        setLoadingTrips(true);
        const token = await getAuthToken();
        if (!token) {
          setRecentTrips([]);
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
        setRecentTrips(Array.isArray(data) ? data : []);
      } catch (e) {
        console.log("[CommuterDashboard] load recent trips error:", e);
        setRecentTrips([]);
      } finally {
        setLoadingTrips(false);
      }
    });

    return unsub;
  }, [navigation]);

  const goSettings = () => navigation?.navigate?.("Settings");
  const goQR = () => navigation?.navigate?.("BusScanner");
  const goHome = () => navigation?.navigate?.("CommuterDashboard");

  const openAllTrips = () => {
    navigation?.navigate?.("RecentTrips");
  };

  if (!fontsLoaded || checking) {
    return (
      <SafeAreaView style={[s.screen, s.center]} edges={["top", "bottom"]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top bar */}
      <View
        style={[
          s.topBar,
          {
            paddingTop: Math.max(insets.top, 0),
            height: Math.max(insets.top, 0) + HEADER_H,
          },
        ]}
      >
        <View style={s.brandRow}>
          <Image
            source={require("../assets/images/logo.png")}
            style={[s.logo, { width: LOGO_SIZE, height: LOGO_SIZE }]}
            resizeMode="contain"
          />
        </View>

        <LCText
          variant="label"
          style={[
            s.brand,
            { fontSize: HEADER_TITLE_SIZE, lineHeight: HEADER_TITLE_SIZE + 2 },
          ]}
          numberOfLines={1}
        >
          LigtasCommute
        </LCText>

        <TouchableOpacity style={s.notifBtn} onPress={() => setNotifOpen(true)}>
          <View style={{ position: "relative" }}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={HEADER_ICON_SIZE}
              color={C.text}
            />
            {unreadCount > 0 && <View style={s.dot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications dropdown */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotifOpen(false)}>
          <View style={s.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            s.notifCardWrap,
            { top: Math.max(insets.top, 0) + HEADER_H },
          ]}
          pointerEvents="box-none"
        >
          <View style={s.notifCard}>
            <View style={s.notifHeader}>
              <LCText variant="label" style={s.notifTitle}>
                Notifications
              </LCText>
              <TouchableOpacity
                onPress={markAllRead}
                disabled={!notifications.length}
              >
                <LCText
                  variant="tiny"
                  style={[
                    s.notifMarkAll,
                    { color: notifications.length ? C.brand : C.hint },
                  ]}
                >
                  Mark all as read
                </LCText>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={s.notifEmpty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={22}
                  color={C.hint}
                />
                <LCText variant="label" style={s.emptyTitle}>
                  No notifications yet
                </LCText>
                <LCText variant="tiny" style={s.emptySub}>
                  You’ll see important alerts and updates here.
                </LCText>
              </View>
            ) : (
              notifications.slice(0, 3).map((n) => (
                <View key={String(n.id)} style={s.notifRow}>
                  <View style={{ flex: 1 }}>
                    <LCText variant="label" style={s.notifRowTitle}>
                      {n.title}
                    </LCText>
                    {!!n.body && (
                      <LCText variant="tiny" style={s.notifRowBody}>
                        {n.body}
                      </LCText>
                    )}
                    <LCText variant="tiny" style={s.notifRowTime}>
                      {n.timeAgo}
                    </LCText>
                  </View>
                  {!n.read && <View style={s.inlineDot} />}
                </View>
              ))
            )}

            <TouchableOpacity style={s.viewAllBtn} onPress={openAllNotifications}>
              <LCText variant="label" style={s.viewAllBtnTxt}>
                View all notifications
              </LCText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Body */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: 110 + insets.bottom },
        ]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <LCText variant="tiny" style={s.heroHello}>
            Hello,
          </LCText>
          <LCText variant="heading" style={s.heroName}>
            {displayName || "Commuter"}
          </LCText>
          <LCText variant="tiny" style={s.heroSub}>
            Ready for a safer commute today?
          </LCText>
        </View>

        {/* Safety card */}
        <View style={s.card}>
          <View style={s.safetyHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={s.safetyIconWrap}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <LCText variant="label" style={s.safetyTitle}>
                Tips for a safer commute
              </LCText>
            </View>
            <LCText variant="tiny" style={s.safetyBadge}>
              Daily tip
            </LCText>
          </View>
          <LCText variant="body" style={s.safetyBody}>
            {todayTip}
          </LCText>
        </View>

        {/* Recent trips */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <LCText variant="label" style={s.sectionTitle}>
              Recent trips
            </LCText>
            {recentTrips.length > 0 && (
              <TouchableOpacity onPress={openAllTrips}>
                <LCText variant="tiny" style={s.viewAllTrips}>
                  View all
                </LCText>
              </TouchableOpacity>
            )}
          </View>

          {loadingTrips ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
              <LCText variant="tiny" style={s.emptySub}>
                Loading your trips…
              </LCText>
            </View>
          ) : recentTrips.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="history"
                size={26}
                color={C.hint}
              />
              <LCText variant="label" style={s.emptyTitle}>
                No trips yet
              </LCText>
              <LCText variant="tiny" style={s.emptySub}>
                Your completed rides will appear here after you finish a trip.
              </LCText>
            </View>
          ) : (
            recentTrips.slice(0, MAX_RECENT_SHOWN).map((trip) => {
              const title = `Ride to ${cleanPlace(trip.destLabel)}`;
              const dateTimeStr = fmtDateTime(trip.endedAt || trip.startedAt);

              const driverName =
                trip.driverProfile?.fullName ||
                trip.driverProfile?.name ||
                null;

              const busLabel =
                trip.bus?.number ||
                trip.bus?.plate ||
                (trip.busId ? `Bus #${trip.busId}` : null);

              return (
                <TouchableOpacity
                  key={String(trip.id)}
                  style={s.tripRow}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation?.navigate?.("TripDetails", { trip })
                  }
                >
                  <View style={s.tripAvatar}>
                    <MaterialCommunityIcons
                      name="bus"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <LCText
                      variant="label"
                      style={s.tripTitle}
                      numberOfLines={1}
                    >
                      {title}
                    </LCText>
                    <LCText variant="tiny" style={s.tripSubtitle}>
                      {dateTimeStr}
                    </LCText>

                    {(driverName || busLabel) && (
                      <View style={s.tripMetaRow}>
                        {driverName && (
                          <View style={s.tripMetaChip}>
                            <MaterialCommunityIcons
                              name="account"
                              size={12}
                              color={C.brand}
                            />
                            <LCText
                              variant="tiny"
                              style={s.tripMetaText}
                              numberOfLines={1}
                            >
                              {driverName}
                            </LCText>
                          </View>
                        )}
                        {busLabel && (
                          <View style={s.tripMetaChip}>
                            <MaterialCommunityIcons
                              name="bus"
                              size={12}
                              color={C.brand}
                            />
                              <LCText
                                variant="tiny"
                                style={s.tripMetaText}
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
                    size={18}
                    color={C.sub}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Bottom tabbar */}
      <View style={[s.tabbar, { paddingBottom: 8 + insets.bottom }]}>
        <TouchableOpacity style={s.tab} onPress={goHome}>
          <View style={[s.iconWrap, s.iconWrapActive]}>
            <MaterialCommunityIcons
              name="home-variant"
              size={22}
              color="#fff"
            />
          </View>
          <LCText variant="tiny" style={[s.tabLabel, s.tabActive]}>
            Home
          </LCText>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goQR}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={20}
              color={C.brand}
            />
          </View>
          <LCText variant="tiny" style={s.tabLabel}>
            Scan
          </LCText>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goSettings}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={20}
              color={C.brand}
            />
          </View>
          <LCText variant="tiny" style={s.tabLabel}>
            Settings
          </LCText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
    backgroundColor: C.bg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  logo: { width: 28, height: 28 },
  brand: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    letterSpacing: 0.2,
  },
  notifBtn: { padding: 6 },
  dot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: C.dot,
  },

  scroll: { padding: 10 },

  hero: { marginBottom: 6 },
  heroHello: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },
  heroName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: C.text,
  },
  heroSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.hint,
    marginTop: 2,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 1 },
    }),
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllTrips: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: C.brand,
  },

  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  safetyIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  safetyBadge: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9,
    color: "#10B981",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  safetyBody: {
    marginTop: 3,
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: C.sub,
  },

  emptyWrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    marginTop: 6,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 11.5,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 10,
    textAlign: "center",
  },

  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  tripAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  tripTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  tripSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: C.sub,
    marginTop: 1,
  },
  tripMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tripMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    gap: 4,
  },
  tripMetaText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: C.brand,
    maxWidth: 110,
  },

  // (bus / announcements styles kept as-is in case you use later)
  busSection: { marginBottom: 10 },
  busTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
  },
  busSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
    marginBottom: 4,
  },
  busCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  busRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  busRoute: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
  },
  busMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
    marginTop: 2,
  },
  etaBubble: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
  },
  etaLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 8,
    color: "#4F46E5",
  },
  etaValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#312E81",
  },
  busRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  busDistance: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
    flex: 1,
    marginRight: 4,
  },
  busMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.brand,
  },
  busMapTxt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#fff",
    marginLeft: 5,
  },
  busEmptyInner: { alignItems: "center", gap: 6 },
  busScanBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  busScanTxt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },

  annHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  annItem: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  annTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: C.text,
  },
  annBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
    marginTop: 2,
  },
  annTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 9.5,
    color: C.hint,
    marginTop: 3,
  },

  bold: { fontFamily: "Poppins_700Bold", color: C.text },

  tabbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  iconWrapActive: {
    backgroundColor: C.brand,
  },
  tabLabel: {
    fontFamily: "Poppins_600SemiBold",
    color: "#6B7280",
    fontSize: 10,
  },
  tabActive: { color: C.brand },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.12)" },
  notifCardWrap: { position: "absolute", right: 10 },
  notifCard: {
    width: 290,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 3 },
    }),
  },
  notifHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11.5,
    color: C.text,
  },
  notifMarkAll: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  notifEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  notifRow: {
    marginHorizontal: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifRowTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 11,
  },
  notifRowBody: {
    fontFamily: "Poppins_400Regular",
    color: C.sub,
    fontSize: 9.5,
    marginTop: 2,
  },
  notifRowTime: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 9,
    marginTop: 2,
  },
  inlineDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: C.dot,
    marginLeft: 4,
  },
  viewAllBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  viewAllBtnTxt: {
    fontFamily: "Poppins_700Bold",
    color: C.brand,
    fontSize: 11,
  },
});
