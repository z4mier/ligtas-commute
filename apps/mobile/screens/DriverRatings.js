// apps/mobile/screens/DriverRatings.js
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
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
import { API_URL } from "../constants/config";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

/* ---------- Colors (match DriverDashboard & Reports) ---------- */
const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#0B132B",
  star: "#F59E0B",
  danger: "#B91C1C",
};

export default function DriverRatings({ navigation }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [sortMode, setSortMode] = useState("NEWEST");

  const loadRatings = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const res = await fetch(`${API_URL}/driver/ratings`, { headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to load ratings");
      }

      setAvgRating(data.averageScore || 0);
      setTotalRatings(data.totalRatings || 0);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.log("[DriverRatings] error", e);
      setErrorMsg(e.message || "Failed to load ratings");
      setAvgRating(0);
      setTotalRatings(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRatings();
    setRefreshing(false);
  }, [loadRatings]);

  const hasRatings = totalRatings > 0 && (avgRating || 0) > 0;

  // --- average + count display (4.5 / 5, "3 ratings") --- //
  let avgDisplay = "No ratings yet";
  let countDisplay = "";

  if (hasRatings) {
    const rounded = Math.round((avgRating || 0) * 10) / 10;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.001;
    const scoreStr = isWhole ? `${Math.round(rounded)}` : rounded.toFixed(1);
    avgDisplay = `${scoreStr} / 5`;
    countDisplay =
      totalRatings === 1 ? "1 rating" : `${totalRatings} ratings`;
  }

  const renderStars = (score, size = 18) => {
    const s = Math.round(score || 0); // 0–5
    return (
      <View style={styles.starRow}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <MaterialCommunityIcons
            key={idx}
            name={idx < s ? "star" : "star-outline"}
            size={size}
            color={C.star}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const hasComment = !!item.comment && item.comment.trim().length > 0;

    return (
      <View style={styles.ratingCard}>
        {/* Header: Anonymous + stars */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={styles.avatarTiny}>
              <MaterialCommunityIcons
                name="account-circle"
                size={18}
                color={C.sub}
              />
            </View>
            <Text style={styles.anonName}>Anonymous</Text>
          </View>
          {renderStars(item.score)}
        </View>

        {/* Comment block */}
        <View style={{ marginTop: 4 }}>
          {hasComment ? (
            <Text style={styles.commentText}>{item.comment}</Text>
          ) : (
            <>
              <Text style={styles.commentTitle}>No written comment</Text>
              <Text style={styles.commentSub}>
                Passenger chose to rate this trip without a message.
              </Text>
            </>
          )}
        </View>

        {/* Footer – same feel as reports: rated via LigtasCommute */}
        <View style={styles.cardFooter}>
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={C.sub}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.cardFooterText}>Rated via LigtasCommute</Text>
        </View>
      </View>
    );
  };

  // ---------- SORTING LOGIC (Newest ↔ Oldest) ---------- //
  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const arr = [...items];

    const getDateValue = (it) => {
      const raw =
        it.createdAt ||
        it.updatedAt ||
        it.date ||
        it.ratedAt ||
        it.timestamp ||
        null;
      const t = raw ? new Date(raw).getTime() : 0;
      return Number.isNaN(t) ? 0 : t;
    };

    arr.sort((a, b) => {
      const ta = getDateValue(a);
      const tb = getDateValue(b);

      if (sortMode === "NEWEST") {
        return tb - ta; // newest first
      } else {
        return ta - tb; // oldest first
      }
    });

    return arr;
  }, [items, sortMode]);

  const toggleSortMode = () => {
    setSortMode((prev) => (prev === "NEWEST" ? "OLDEST" : "NEWEST"));
  };

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
      <StatusBar style="dark" />

      {/* Top header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={C.text}
          />
        </TouchableOpacity>

        <Text style={styles.topTitle}>View Ratings</Text>

        <View style={{ width: 32 }} />
      </View>

      {/* Summary card – blue like DriverDashboard headerCard */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Average rating</Text>
          <Text style={styles.summaryScore}>
            {hasRatings ? avgDisplay : "—"}
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons
              name="star-circle"
              size={30}
              color="#FBBF24"
            />
          </View>
          <Text style={styles.summaryCount}>
            {hasRatings ? countDisplay : "0 ratings"}
          </Text>
        </View>
      </View>

      {/* Sort / Filter button (only if there are ratings and no error) */}
      {hasRatings && !loading && !errorMsg ? (
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.sortBtn} onPress={toggleSortMode}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={16}
              color={C.text}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.sortLabel}>
              {sortMode === "NEWEST"
                ? "Newest to oldest"
                : "Oldest to newest"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Error state */}
      {errorMsg ? (
        <View style={styles.errorWrap}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={C.danger}
          />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : !hasRatings ? (
        <View style={styles.center}>
          {/* Empty state like "No commuter reports" */}
          <MaterialCommunityIcons
            name="clipboard-check-outline"
            size={42}
            color={C.sub}
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.emptyText}>No commuter ratings</Text>
          <Text style={styles.emptySubText}>
            You currently have no ratings from commuters. Keep driving safely!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  /* top header */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: C.text,
    fontFamily: "Poppins_600SemiBold",
  },

  /* summary card – BLUE like DriverDashboard headerCard */
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: C.brand,
    borderWidth: 1,
    borderColor: C.brand,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#E5E7EB",
    fontFamily: "Poppins_400Regular",
  },
  summaryScore: {
    fontSize: 22,
    color: "#F9FAFB",
    fontFamily: "Poppins_700Bold",
    marginTop: 4,
  },
  summaryRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 12,
    color: "#E5E7EB",
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
  },

  /* toolbar (sort button) */
  toolbarRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  sortLabel: {
    fontSize: 12,
    color: C.text,
    fontFamily: "Poppins_400Regular",
  },

  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  errorText: {
    marginLeft: 6,
    fontSize: 12,
    color: C.danger,
    fontFamily: "Poppins_400Regular",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state styles (match "No commuter reports" vibe)
  emptyText: {
    fontSize: 15,
    color: C.text,
    fontFamily: "Poppins_600SemiBold",
  },
  emptySubText: {
    marginTop: 4,
    fontSize: 12,
    color: C.sub,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },

  /* rating card – styled to match reports look */
  ratingCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  anonName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: C.text,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  commentTitle: {
    marginTop: 6,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.sub,
  },
  commentText: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: C.text,
  },
  commentSub: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  cardFooterText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
});
