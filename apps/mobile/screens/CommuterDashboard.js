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
  redDark: "#B91C1C",
  star: "#F59E0B",
  dot: "#EF4444",
};

// === keep header visual metrics in sync with < Settings > screen ===
const HEADER_TITLE_SIZE = 18;
const HEADER_ICON_SIZE = 22;
const LOGO_SIZE = 28;
const HEADER_H = 48;

const TRACK_KEY = "lc_tracking";

/* small helper used both in Dashboard card and dropdown */
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

export default function CommuterDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [checking, setChecking] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return navigation.replace("Login");
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          await AsyncStorage.removeItem("token");
          return navigation.replace("Login");
        }
      } catch {
        return navigation.replace("Login");
      } finally {
        setChecking(false);
      }
    })();
  }, [navigation]);

  // Lists
  const [safetyItems] = useState([]);
  const [communityItems] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Active tracking snapshot (from MapTracking)
  const [activeTrack, setActiveTrack] = useState(null);

  // Notifications — now sourced from Notify store
  const [notifications, setNotifications] = useState([]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const [notifOpen, setNotifOpen] = useState(false);

  // Pull notifications from storage + subscribe for live updates
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

    // initial load
    refresh();

    // live updates when MapTracking adds a rating/incident
    const unsub = Notify.onChange(refresh);

    // also refresh whenever dashboard regains focus
    const unsubNav = navigation.addListener("focus", refresh);

    return () => {
      mounted = false;
      unsub?.();
      unsubNav?.();
    };
  }, [navigation]);

  const markAllRead = async () => {
    const updated = await Notify.markAllRead();
    setNotifications(updated.map((n) => ({ ...n, timeAgo: timeAgo(n.timestamp) })));
  };

  const openAllNotifications = () => {
    setNotifOpen(false);
    // The Notifications screen loads from Notify itself; no need to pass items
    navigation?.navigate?.("Notifications");
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingLists(true);
        // fetch list data here if needed
      } catch {
      } finally {
        if (mounted) setLoadingLists(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load/refresh active tracking snapshot whenever Dashboard gets focus
  useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      try {
        const json = await AsyncStorage.getItem(TRACK_KEY);
        setActiveTrack(json ? JSON.parse(json) : null);
      } catch {
        setActiveTrack(null);
      }
    });
    return unsub;
  }, [navigation]);

  const goSettings = () => navigation?.navigate?.("Settings");
  const goQR = () => navigation?.navigate?.("QRScanner");
  const goHome = () => navigation?.navigate?.("CommuterDashboard");

  // IMPORTANT: your Map screen route name — update if different
  const openTrackingMap = () => navigation?.navigate?.("Tracking");

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

      {/* HEADER */}
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

      {/* NOTIFICATIONS DROPDOWN */}
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
                    {!!n.body && <Text style={s.notifRowBody}>{n.body}</Text>}
                    <Text style={s.notifRowTime}>{timeAgo(n.timestamp)}</Text>
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
        contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]}
      >
        {/* Safety Insights */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>{t("safetyInsights")}</Text>
            <TouchableOpacity
              onPress={() =>
                navigation?.navigate?.("SafetyInsightsList", {
                  items: safetyItems,
                })
              }
            >
              <Text style={[s.viewAll, { color: C.brand }]}>{t("viewAll")}</Text>
            </TouchableOpacity>
          </View>

          {loadingLists ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
            </View>
          ) : safetyItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="shield-off-outline"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>{t("listEmptySafetyTitle")}</Text>
              <Text style={s.emptySub}>{t("listEmptySafetySub")}</Text>
            </View>
          ) : (
            safetyItems.map((it) => (
              <View key={String(it.id)} style={s.itemRow}>
                <Text style={s.itemTitle}>{it.title}</Text>
                <Text style={s.itemTime}>{it.time}</Text>
              </View>
            ))
          )}
        </View>

        {/* Community */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>{t("community")}</Text>
            <TouchableOpacity
              onPress={() =>
                navigation?.navigate?.("CommunityList", {
                  items: communityItems,
                })
              }
            >
              <Text style={[s.viewAll, { color: C.brand }]}>{t("viewAll")}</Text>
            </TouchableOpacity>
          </View>

          {loadingLists ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
            </View>
          ) : communityItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>{t("listEmptyCommunityTitle")}</Text>
              <Text style={s.emptySub}>{t("listEmptyCommunitySub")}</Text>
            </View>
          ) : (
            communityItems.map((it) => (
              <View key={String(it.id)} style={s.itemRow}>
                <Text style={s.itemTitle}>{it.title}</Text>
                <Text style={s.itemTime}>{it.time}</Text>
              </View>
            ))
          )}
        </View>

        {/* Tracking */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>{t("tracking")}</Text>
          </View>

          {loadingLists ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
            </View>
          ) : !activeTrack || !activeTrack.active ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="map-search-outline"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>{t("trackingEmptyTitle")}</Text>
              <Text style={s.emptySub}>{t("trackingEmptySub")}</Text>
            </View>
          ) : (
            <View style={s.trackActiveCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.trackNow}>{t("trackingNow")}</Text>
                {!!activeTrack.routeTitle && (
                  <Text style={s.trackRoute} numberOfLines={1}>
                    {activeTrack.routeTitle}
                  </Text>
                )}
                <Text style={s.trackDest} numberOfLines={1}>
                  {t("destination")}:{" "}
                  <Text style={s.bold}>{activeTrack.destinationName}</Text>
                </Text>
                {!!activeTrack.eta && (
                  <Text style={s.trackEta}>
                    {t("eta")}:{" "}
                    <Text style={s.bold}>{activeTrack.eta.durationText}</Text>{" "}
                    • {activeTrack.eta.distanceText}
                  </Text>
                )}
                {!!activeTrack?.driver?.name && (
                  <Text style={s.trackDriver}>
                    {t("driver")}: {activeTrack.driver.name}
                    {!!activeTrack.driver.routeName
                      ? ` • ${activeTrack.driver.routeName}`
                      : ""}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={s.openMapBtn}
                onPress={openTrackingMap}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="map" size={18} color="#fff" />
                <Text style={s.openMapTxt}>{t("openMap")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={[s.tabbar, { paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity style={s.tab} onPress={goHome}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="home-variant"
              size={26}
              color={C.text}
            />
          </View>
          <Text style={[s.tabLabel, s.tabActive]}>{t("tabHome")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goQR}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={22}
              color={C.text}
            />
          </View>
          <Text style={s.tabLabel}>{t("tabQR")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goSettings}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={C.text} />
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

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitleOnly: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 14 },
  viewAll: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 12 },

  // generic list rows
  itemRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
  },
  itemTitle: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12.5 },
  itemTime: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },

  // community (buttons removed; style kept for reuse if needed)
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 6 },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },

  // tracking – empty
  emptyWrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
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

  // tracking – active card
  trackActiveCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackNow: { fontFamily: "Poppins_700Bold", color: "#16A34A", fontSize: 12, marginBottom: 2 },
  trackRoute: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 13 },
  trackDest: { fontFamily: "Poppins_400Regular", color: C.sub, fontSize: 11, marginTop: 4 },
  trackEta: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12, marginTop: 2 },
  trackDriver: { fontFamily: "Poppins_400Regular", color: C.sub, fontSize: 11, marginTop: 2 },
  bold: { fontFamily: "Poppins_700Bold", color: C.text },

  openMapBtn: {
    backgroundColor: C.brand,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openMapTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 12.5 },

  // bottom nav
  tabbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tabLabel: { fontFamily: "Poppins_600SemiBold", color: "#6B7280", fontSize: 12 },
  tabActive: { color: C.text },

  // notifications modal
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
  notifTitle: { fontFamily: "Poppins_700Bold", fontSize: 14, color: C.text },
  notifMarkAll: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },

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
  notifRowTitle: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12.5 },
  notifRowBody: { fontFamily: "Poppins_400Regular", color: C.sub, fontSize: 11, marginTop: 2 },
  notifRowTime: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 10.5, marginTop: 2 },
  inlineDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: C.dot, marginLeft: 6 },

  viewAllBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 10,
  },
  viewAllBtnTxt: { fontFamily: "Poppins_700Bold", color: C.brand, fontSize: 12.5 },
});
