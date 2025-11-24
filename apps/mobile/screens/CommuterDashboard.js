// apps/mobile/screens/CommuterDashboard.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
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
import { useI18n } from "../i18n/i18n";
import * as Notify from "../lib/notify";

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

const HEADER_TITLE_SIZE = 18;
const HEADER_ICON_SIZE = 22;
const LOGO_SIZE = 28;
const HEADER_H = 48;

/* ---------- Safety tips (for daily random tip) ---------- */

const SAFETY_TIPS = [
  "Always check the driver's ID and bus number before boarding.",
  "Share your trip details with a trusted contact when traveling at night.",
  "Avoid displaying valuables like phones and wallets near the bus doors.",
  "Stay seated or hold onto the handrails when the bus is moving.",
  "Know the location of the emergency button and exits in case of incidents.",
  "Report unsafe driving or suspicious behavior through the app.",
];

/* ---------- Shared auth helpers (same idea as BusScanner) ---------- */

const TOKEN_KEYS = [
  "authToken", // main commuter key (most likely)
  "AUTH_TOKEN",
  "LC_COMMUTER_TOKEN",
  "lc_user",
  "lc_token",
  "token", // legacy
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

      // JSON? e.g. { token: "...", role: "COMMUTER" }
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmed);
          const candidate =
            obj.token || obj.jwt || obj.accessToken || obj.authToken;
          if (candidate) return candidate;
        } catch {
          // ignore parse error, try next key
        }
      } else {
        // plain token string
        return trimmed;
      }
    } catch {
      // ignore and try next key
    }
  }
  return null;
}

async function clearAuthToken() {
  await Promise.all(TOKEN_KEYS.map((k) => AsyncStorage.removeItem(k)));
}

/* ---------- utils ---------- */

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

// 👉 "13 Nov 2025, 02:29 am" style
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

  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);

  // notifications
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // recent trips from API
  const [recentTrips, setRecentTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // "daily" safety tip – stable per day
  const todayTip = useMemo(() => {
    const today = new Date();
    const idx = today.getDate() % SAFETY_TIPS.length;
    return SAFETY_TIPS[idx];
  }, []);

  // ---- auth + profile ----
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

  // ---- load notifications ----
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

  // ---- load recent trips when dashboard gains focus ----
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

  // bottom nav actions
  const goSettings = () => navigation?.navigate?.("Settings");
  const goQR = () => navigation?.navigate?.("QRScanner");
  const goHome = () => navigation?.navigate?.("CommuterDashboard");

  const openAllTrips = () => {
    navigation?.navigate?.("RecentTrips"); // create this screen for full history
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

      {/* TOP BAR */}
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

        <Text
          style={[
            s.brand,
            { fontSize: HEADER_TITLE_SIZE, lineHeight: HEADER_TITLE_SIZE + 2 },
          ]}
          numberOfLines={1}
        >
          LigtasCommute
        </Text>

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

      {/* NOTIFICATION DROPDOWN */}
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
              <Text style={s.notifTitle}>{t("notifications")}</Text>
              <TouchableOpacity
                onPress={markAllRead}
                disabled={!notifications.length}
              >
                <Text
                  style={[
                    s.notifMarkAll,
                    { color: notifications.length ? C.brand : C.hint },
                  ]}
                >
                  {t("markAllRead")}
                </Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={s.notifEmpty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={28}
                  color={C.hint}
                />
                <Text style={s.emptyTitle}>{t("noNotifications")}</Text>
                <Text style={s.emptySub}>{t("noNotificationsSub")}</Text>
              </View>
            ) : (
              notifications.slice(0, 3).map((n) => (
                <View key={String(n.id)} style={s.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifRowTitle}>{n.title}</Text>
                    {!!n.body && (
                      <Text style={s.notifRowBody}>{n.body}</Text>
                    )}
                    <Text style={s.notifRowTime}>{n.timeAgo}</Text>
                  </View>
                  {!n.read && <View style={s.inlineDot} />}
                </View>
              ))
            )}

            <TouchableOpacity
              style={s.viewAllBtn}
              onPress={openAllNotifications}
            >
              <Text style={s.viewAllBtnTxt}>{t("viewAllNotifications")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* GREETING */}
        <View style={s.hero}>
          <Text style={s.heroHello}>Hello,</Text>
          <Text style={s.heroName}>
            {displayName || t("commuter" /* fallback */)}
          </Text>
          <Text style={s.heroSub}>Ready for a safer commute today?</Text>
        </View>

        {/* 🔐 SAFETY TIP CARD (above recent trips) */}
        <View style={s.card}>
          <View style={s.safetyHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={s.safetyIconWrap}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
              <Text style={s.safetyTitle}>Tips for a safer commute</Text>
            </View>
            <Text style={s.safetyBadge}>Daily tip</Text>
          </View>
          <Text style={s.safetyBody}>{todayTip}</Text>
        </View>

        {/* 1️⃣ RECENT TRIPS – MoveIt style */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent trips</Text>
            {recentTrips.length > 0 && (
              <TouchableOpacity onPress={openAllTrips}>
                <Text style={s.viewAllTrips}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingTrips ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
              <Text style={s.emptySub}>Loading your trips…</Text>
            </View>
          ) : recentTrips.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="history"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>No trips yet</Text>
              <Text style={s.emptySub}>
                Your completed rides will appear here after you finish a trip.
              </Text>
            </View>
          ) : (
            recentTrips.slice(0, MAX_RECENT_SHOWN).map((trip) => {
              const title = `Ride to ${cleanPlace(trip.destLabel)}`;
              const dateTimeStr = fmtDateTime(
                trip.endedAt || trip.startedAt
              );

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
                  {/* avatar with bus icon */}
                  <View style={s.tripAvatar}>
                    <MaterialCommunityIcons
                      name="bus"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>

                  {/* main text */}
                  <View style={{ flex: 1 }}>
                    <Text style={s.tripTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={s.tripSubtitle}>{dateTimeStr}</Text>

                    {(driverName || busLabel) && (
                      <View style={s.tripMetaRow}>
                        {driverName && (
                          <View style={s.tripMetaChip}>
                            <MaterialCommunityIcons
                              name="account"
                              size={13}
                              color={C.brand}
                            />
                            <Text style={s.tripMetaText} numberOfLines={1}>
                              {driverName}
                            </Text>
                          </View>
                        )}
                        {busLabel && (
                          <View style={s.tripMetaChip}>
                            <MaterialCommunityIcons
                              name="bus"
                              size={13}
                              color={C.brand}
                            />
                            <Text style={s.tripMetaText} numberOfLines={1}>
                              {busLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* chevron */}
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={C.sub}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* (Where's your bus / announcements sections can stay the same) */}
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={[s.tabbar, { paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity style={s.tab} onPress={goHome}>
          <View style={[s.iconWrap, s.iconWrapActive]}>
            <MaterialCommunityIcons
              name="home-variant"
              size={24}
              color="#fff"
            />
          </View>
          <Text style={[s.tabLabel, s.tabActive]}>{t("tabHome")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goQR}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={22}
              color={C.brand}
            />
          </View>
          <Text style={s.tabLabel}>{t("tabQR")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goSettings}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={22}
              color={C.brand}
            />
          </View>
          <Text style={s.tabLabel}>{t("tabSettings")}</Text>
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
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: C.bg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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

  scroll: { padding: 12 },

  /* HERO */
  hero: { marginBottom: 8 },
  heroHello: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: C.sub,
  },
  heroName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: C.text,
  },
  heroSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.hint,
    marginTop: 2,
  },

  /* GENERIC CARD */
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllTrips: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: C.brand,
  },

  /* SAFETY TIP */
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  safetyIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
  },
  safetyBadge: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#10B981",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  safetyBody: {
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: C.sub,
  },

  /* RECENT TRIPS */
  emptyWrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    marginTop: 8,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 12.5,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 11,
    textAlign: "center",
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

  /* WHERE'S YOUR BUS (styles kept for future sections) */
  busSection: { marginBottom: 12 },
  busTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: C.text,
  },
  busSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginBottom: 6,
  },
  busCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
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
    fontSize: 14,
    color: C.text,
  },
  busMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginTop: 2,
  },
  etaBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
  },
  etaLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 9,
    color: "#4F46E5",
  },
  etaValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#312E81",
  },
  busRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  busDistance: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    flex: 1,
    marginRight: 6,
  },
  busMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.brand,
  },
  busMapTxt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#fff",
    marginLeft: 6,
  },
  busEmptyInner: { alignItems: "center", gap: 6 },
  busScanBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  busScanTxt: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },

  /* ANNOUNCEMENTS */
  annHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  annItem: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  annTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: C.text,
  },
  annBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginTop: 2,
  },
  annTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.hint,
    marginTop: 4,
  },

  bold: { fontFamily: "Poppins_700Bold", color: C.text },

  /* BOTTOM NAV */
  tabbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: C.brand,
  },
  tabLabel: {
    fontFamily: "Poppins_600SemiBold",
    color: "#6B7280",
    fontSize: 11,
  },
  tabActive: { color: C.brand },

  /* NOTIF MODAL */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.12)" },
  notifCardWrap: { position: "absolute", right: 12 },
  notifCard: {
    width: 310,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },
  notifHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: C.text,
  },
  notifMarkAll: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  notifEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 22,
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  notifRow: {
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifRowTitle: {
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
    fontSize: 12.5,
  },
  notifRowBody: {
    fontFamily: "Poppins_400Regular",
    color: C.sub,
    fontSize: 11,
    marginTop: 2,
  },
  notifRowTime: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 10.5,
    marginTop: 2,
  },
  inlineDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: C.dot,
    marginLeft: 6,
  },
  viewAllBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 10,
  },
  viewAllBtnTxt: {
    fontFamily: "Poppins_700Bold",
    color: C.brand,
    fontSize: 12.5,
  },
});
