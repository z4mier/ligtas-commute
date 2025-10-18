
//screens/CommuterDashboard.js 
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

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

export default function CommuterDashboard({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // ---- Auth guard ----
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

  // Lists (empty by default; wire later)
  const [safetyItems] = useState([]);
  const [communityItems] = useState([]);
  const [trackingItems] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // ---- Notifications ----
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [notifOpen, setNotifOpen] = useState(false);

  const markAllRead = () => {
    if (!notifications.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openAllNotifications = () => {
    setNotifOpen(false);
    navigation?.navigate?.("Notifications", { items: notifications });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingLists(true);
        // TODO: fetch lists + notifications here later
      } catch {
      } finally {
        if (mounted) setLoadingLists(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const goSettings = () => navigation?.navigate?.("Settings");
  const goQR = () => navigation?.navigate?.("QRScanner");
  const goHome = () => navigation?.navigate?.("CommuterDashboard");
  const openTrackingMap = () => navigation?.navigate?.("Tracking");

  if (!fontsLoaded || checking) {
    return (
      <SafeAreaView
        style={[s.screen, { alignItems: "center", justifyContent: "center" }]}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <Image
            source={require("../assets/images/logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.brand}>LigtasCommute</Text>
        </View>

        {/* Bell with red dot */}
        <TouchableOpacity
          style={{ padding: 6 }}
          onPress={() => setNotifOpen(true)}
        >
          <View style={{ position: "relative" }}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={C.text}
            />
            {unreadCount > 0 && <View style={s.dot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications dropdown (modal) */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotifOpen(false)}>
          <View style={s.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={s.notifCardWrap} pointerEvents="box-none">
          <View style={s.notifCard}>
            <View style={s.notifHeader}>
              <Text style={s.notifTitle}>Notifications</Text>
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
                  Mark all as read
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {notifications.length === 0 ? (
              <View style={s.notifEmpty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={28}
                  color={C.hint}
                />
                <Text style={s.emptyTitle}>No notifications</Text>
                <Text style={s.emptySub}>
                  {"You're all caught up. We'll notify you here."}
                </Text>
              </View>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <View key={String(n.id)} style={s.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifRowTitle}>{n.title}</Text>
                    {!!n.body && <Text style={s.notifRowBody}>{n.body}</Text>}
                    {!!n.timeAgo && (
                      <Text style={s.notifRowTime}>{n.timeAgo}</Text>
                    )}
                  </View>
                  {!n.read && <View style={s.inlineDot} />}
                </View>
              ))
            )}

            <TouchableOpacity style={s.viewAllBtn} onPress={openAllNotifications}>
              <Text style={s.viewAllBtnTxt}>View all notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Content */}
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Safety Insights */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>Safety Insights</Text>
            <TouchableOpacity
              onPress={() =>
                navigation?.navigate?.("SafetyInsightsList", {
                  items: safetyItems,
                })
              }
            >
              <Text style={[s.viewAll, { color: C.brand }]}>View All</Text>
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
              <Text style={s.emptyTitle}>No safety insights yet</Text>
              <Text style={s.emptySub}>
                You’ll see updates here when new alerts are available.
              </Text>
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
            <Text style={s.cardTitleOnly}>Community</Text>
            <TouchableOpacity
              onPress={() =>
                navigation?.navigate?.("CommunityList", {
                  items: communityItems,
                })
              }
            >
              <Text style={[s.viewAll, { color: C.brand }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[s.btn, { backgroundColor: C.brand }]}
              onPress={() => navigation?.navigate?.("RateRide")}
            >
              <Text style={s.btnTxt}>Rate Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[s.btn, { backgroundColor: C.redDark }]}
              onPress={() => navigation?.navigate?.("ReportIncident")}
            >
              <Text style={s.btnTxt}>Report Issue</Text>
            </TouchableOpacity>
          </View>

          {loadingLists ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
            </View>
          ) : communityItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>No recent community activity</Text>
              <Text style={s.emptySub}>
                Ratings and reports will appear here when available.
              </Text>
            </View>
          ) : (
            communityItems.map((it) => (
              <View key={String(it.id)} style={s.commRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.commName}>{it.name}</Text>
                  <Text style={s.commSub}>{it.bus}</Text>
                </View>
                {it.stars > 0 ? (
                  <View style={s.starRow}>
                    <MaterialCommunityIcons name="star" size={14} />
                    <Text style={s.starTxt}>{it.stars}</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={C.hint}
                  />
                )}
              </View>
            ))
          )}
        </View>

        {/* Tracking */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitleOnly}>Tracking</Text>
          </View>

          {loadingLists ? (
            <View style={s.emptyWrap}>
              <ActivityIndicator />
            </View>
          ) : trackingItems.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="map-search-outline"
                size={28}
                color={C.hint}
              />
              <Text style={s.emptyTitle}>No active trips being tracked</Text>
              <Text style={s.emptySub}>
                Start a route to see live progress and ETA here.
              </Text>
              <TouchableOpacity style={s.cta} onPress={openTrackingMap}>
                <Text style={s.ctaText}>Open Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trackingItems.map((t) => (
              <View key={String(t.id)} style={s.trackCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.trackTitle}>{t.vehicle}</Text>
                  <Text style={s.trackSub}>{t.route}</Text>
                  <Text style={s.trackDriver}>{t.driver}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.etaLabel}>ETA</Text>
                  <Text style={s.etaValue}>{t.eta}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={s.tabbar}>
        <TouchableOpacity style={s.tab} onPress={goHome}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="home-variant"
              size={22}
              color={C.text}
            />
          </View>
          <Text style={[s.tabLabel, s.tabActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goQR}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={22}
              color={C.text}
            />
          </View>
          <Text style={s.tabLabel}>QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.tab} onPress={goSettings}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={22}
              color={C.text}
            />
          </View>
          <Text style={s.tabLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 8 : 10,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 22, height: 22 },
  brand: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 14 },

  // red dot on bell
  dot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: C.dot,
  },

  scroll: { padding: 12, paddingBottom: 120 },

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

  // list rows
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

  // action buttons
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 6 },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 13 },

  // community rows
  commRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
    marginTop: 8,
  },
  commName: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12.5 },
  commSub: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  starTxt: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 12 },

  // empty states
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
  cta: {
    marginTop: 10,
    backgroundColor: C.brand,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ctaText: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 12.5 },

  // tracking row style
  trackCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackTitle: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 13 },
  trackSub: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },
  trackDriver: { fontFamily: "Poppins_400Regular", color: C.sub, fontSize: 11, marginTop: 1 },
  etaLabel: { fontFamily: "Poppins_700Bold", color: "#16A34A", fontSize: 12 },
  etaValue: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 13 },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  notifCardWrap: {
    position: "absolute",
    top: Platform.OS === "android" ? 54 : 64,
    right: 12,
    left: undefined,
  },
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
