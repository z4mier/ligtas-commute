// apps/mobile/screens/DriverReports.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
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
import LCText from "../components/LCText";

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
  const [sortOrder, setSortOrder] = useState("newest");

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

  const sortedReports = [...reports].sort((a, b) => {
    const getTime = (item) => {
      const t =
        item.createdAt ||
        item.created_at ||
        item.submittedAt ||
        item.submitted_at ||
        0;
      const d = new Date(t);
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
                <LCText style={styles.cardAnonLabel} numberOfLines={1}>
                  Anonymous
                </LCText>
                <View style={styles.cardMetaRow}>
                  <View style={styles.dot} />
                  <LCText style={styles.cardMetaText} numberOfLines={1}>
                    {categoryLabel}
                  </LCText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <LCText style={styles.cardMessage} numberOfLines={4}>
          {bodyText}
        </LCText>

        <View style={styles.cardFooter}>
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={C.sub}
            style={{ marginRight: 4 }}
          />
          <LCText style={styles.cardFooterText}>
            Reported via LigtasCommute
          </LCText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />

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
        <LCText style={styles.topTitle}>View Reports</LCText>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <LCText style={styles.headerLabel}>Commuter reports</LCText>
          <LCText style={styles.headerValue}>
            {loading ? "—" : totalReports}
          </LCText>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons
            name="file-document-alert-outline"
            size={36}
            color="#FBBF24"
          />
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

      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={C.sub} />
            <LCText style={styles.loadingText}>Loading reports…</LCText>
          </View>
        ) : sortedReports.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={42}
              color={C.sub}
              style={{ marginBottom: 10 }}
            />
            <LCText style={styles.emptyTitle}>No commuter reports</LCText>
            <LCText style={styles.emptySubtitle}>
              You currently have no reports from commuters. Keep driving
              safely!
            </LCText>
          </View>
        ) : (
          <FlatList
            data={sortedReports}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
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
