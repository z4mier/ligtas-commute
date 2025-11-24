// apps/mobile/screens/DriverReports.js
import React, { useCallback, useEffect, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { API_URL } from "../constants/config";

/* ---------- Theme (match dashboard) ---------- */
const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#0B132B",
  danger: "#B91C1C",
  warning: "#F59E0B",
  success: "#10B981",
};

export default function DriverReports({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const res = await fetch(`${API_URL}/driver/reports`, { headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to load reports");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setReports(items);

      const total =
        typeof data.totalReports === "number"
          ? data.totalReports
          : items.length;
      setTotalReports(total);
    } catch (e) {
      console.log("[DriverReports] loadReports error", e);
      setReports([]);
      setTotalReports(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await loadReports();
    })();
    return () => {
      mounted = false;
    };
  }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const categoryLabel =
      Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories.join(" • ")
        : "General concern";

    const bodyText =
      item.message && item.message.trim().length > 0
        ? item.message.trim()
        : categoryLabel;

    return (
      <View style={styles.card}>
        {/* Top row: anonymous + category (no status pill) */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardAnonRow}>
              <View style={styles.avatarTiny}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={18}
                  color={C.sub}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardAnonLabel} numberOfLines={1}>
                  Anonymous
                </Text>
                <View style={styles.cardMetaRow}>
                  <View style={styles.dot} />
                  <Text style={styles.cardMetaText} numberOfLines={1}>
                    {categoryLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Message / body */}
        <Text style={styles.cardMessage} numberOfLines={4}>
          {bodyText}
        </Text>

        {/* Footer – source text */}
        <View style={styles.cardFooter}>
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={C.sub}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.cardFooterText}>Reported via LigtasCommute</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />

      {/* Top bar (like ratings page) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={20}
            color={C.text}
          />
        </TouchableOpacity>
        <Text style={styles.topTitle}>View Reports</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Commuter reports header (blue) */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>Commuter reports</Text>
          <Text style={styles.headerValue}>
            {loading ? "—" : totalReports}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons
            name="file-document-alert-outline"
            size={36}
            color="#FBBF24"
          />
        </View>
      </View>

      {/* List / Empty / Loading */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={C.sub} />
            <Text style={styles.loadingText}>Loading reports…</Text>
          </View>
        ) : reports.length === 0 ? (
          // 👇 Centered empty state, same text style as screenshot
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={42}
              color={C.sub}
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.emptyTitle}>No commuter reports</Text>
            <Text style={styles.emptySubtitle}>
              You currently have no reports from commuters. Keep driving
              safely!
            </Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  /* top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: C.text,
  },

  /* blue header – same family as Average Rating */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: C.brand,
  },
  headerLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  headerValue: {
    marginTop: 6,
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  headerRight: {
    alignItems: "center",
    justifyContent: "center",
  },

  listContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 4,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },

  // Empty state text styles (match “No commuter reports” look)
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: C.text,
  },
  emptySubtitle: {
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardAnonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarTiny: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cardAnonLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.sub,
    marginRight: 6,
  },
  cardMetaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
  },

  cardMessage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.text,
    marginTop: 2,
    marginBottom: 10,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardFooterText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
  },
});
