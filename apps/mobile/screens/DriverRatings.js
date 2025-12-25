// apps/mobile/screens/DriverRatings.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { API_URL } from "../constants/config";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import LCText from "../components/LCText";

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

/* ----------------------------------------------------------
   ✅ robust helper: extract revealName + strip LCMETA
   Handles:
    - meta at start OR anywhere in comment
    - leading spaces/newlines
    - JSON-stringified comment like "\"[LCMETA:{\\\"revealName\\\":true}] hi\""
    - single quotes in JSON meta
---------------------------------------------------------- */
function unpackRatingComment(raw) {
  let text = typeof raw === "string" ? raw : "";
  if (!text) return { revealName: false, comment: null, hadMeta: false };

  // If accidentally JSON-stringified string, unwrap it once
  // e.g. "\"[LCMETA:{\\\"revealName\\\":true}] hello\""
  const tryJsonString = () => {
    const t = text.trim();
    if (!t) return;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      try {
        const parsed = JSON.parse(t);
        if (typeof parsed === "string") text = parsed;
      } catch {
        // ignore
      }
    }
  };
  tryJsonString();

  const original = text;
  const trimmed = text.trim();

  // find LCMETA anywhere (not only at start)
  const m = trimmed.match(/\[LCMETA:(\{.*?\})\]\s*/);
  if (!m) {
    return { revealName: false, comment: trimmed || null, hadMeta: false };
  }

  const metaRaw = m[1];
  // remove only the first meta occurrence
  const cleaned = trimmed.replace(m[0], "").trim();

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let meta = tryParse(metaRaw);

  // support single-quote JSON-ish
  if (!meta) {
    const fixed = metaRaw.replace(/'/g, '"');
    meta = tryParse(fixed);
  }

  // If still unparseable, privacy-first fallback
  if (!meta || typeof meta !== "object") {
    return {
      revealName: false,
      comment: cleaned || trimmed || original.trim() || null,
      hadMeta: true,
    };
  }

  return {
    revealName: !!meta.revealName,
    comment: cleaned || null,
    hadMeta: true,
  };
}

function normalizeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return null;
}

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

      if (!res.ok) throw new Error(data.error || "Failed to load ratings");

      console.log("DRIVER API_URL USED:", API_URL);


      console.log("Ratings loaded:", {
        total: data.totalRatings,
        average: data.averageScore,
        sample: Array.isArray(data.items) ? data.items[0] : null,
      });

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

  let avgDisplay = "No ratings yet";
  let countDisplay = "";

  if (hasRatings) {
    const rounded = Math.round((avgRating || 0) * 10) / 10;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.001;
    const scoreStr = isWhole ? `${Math.round(rounded)}` : rounded.toFixed(1);
    avgDisplay = `${scoreStr} / 5`;
    countDisplay = totalRatings === 1 ? "1 rating" : `${totalRatings} ratings`;
  }

  const renderStars = (score, size = 18) => {
    const s = Math.round(score || 0);
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
    const rawComment = typeof item?.comment === "string" ? item.comment : "";
    const parsed = unpackRatingComment(rawComment);

    const cleanComment = parsed.comment || "";
    const hasComment = cleanComment.trim().length > 0;

    // ✅ Decide reveal flag robustly
    const r1 = normalizeBool(item?.revealName);
    const r2 = normalizeBool(parsed?.revealName);
    const reveal = r1 !== null ? r1 : (r2 !== null ? r2 : false);

    // ✅ If reveal=true, show commuterName if present
    const nameFromApi = typeof item?.commuterName === "string" ? item.commuterName.trim() : "";
    const displayName = reveal && nameFromApi ? nameFromApi : "Anonymous";

    const initial =
      displayName !== "Anonymous" ? displayName.charAt(0).toUpperCase() : null;

    console.log("Rendering rating:", {
      id: item?.id,
      revealFromItem: item?.revealName,
      revealFromMeta: parsed?.revealName,
      revealFinal: reveal,
      commuterName: item?.commuterName,
      displayName,
      commentPreview: rawComment?.slice?.(0, 40),
    });

    return (
      <View style={styles.ratingCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={styles.avatarTiny}>
              {initial ? (
                <LCText style={styles.avatarInitial}>{initial}</LCText>
              ) : (
                <MaterialCommunityIcons
                  name="account-circle"
                  size={18}
                  color={C.sub}
                />
              )}
            </View>
            <LCText style={styles.anonName}>{displayName}</LCText>
          </View>

          {renderStars(item.score)}
        </View>

        <View style={{ marginTop: 4 }}>
          {hasComment ? (
            <LCText style={styles.commentText}>{cleanComment}</LCText>
          ) : (
            <>
              <LCText style={styles.commentTitle}>No written comment</LCText>
              <LCText style={styles.commentSub}>
                Passenger chose to rate this trip without a message.
              </LCText>
            </>
          )}
        </View>

        <View style={styles.cardFooter}>
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={C.sub}
            style={{ marginRight: 4 }}
          />
          <LCText style={styles.cardFooterText}>Rated via LigtasCommute</LCText>
        </View>
      </View>
    );
  };

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
      return sortMode === "NEWEST" ? tb - ta : ta - tb;
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

        <LCText style={styles.topTitle}>View Ratings</LCText>

        <View style={{ width: 32 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <LCText style={styles.summaryLabel}>Average rating</LCText>
          <LCText style={styles.summaryScore}>
            {hasRatings ? avgDisplay : "—"}
          </LCText>
        </View>
        <View style={styles.summaryRight}>
          <View style={styles.summaryIconWrap}>
            <MaterialCommunityIcons name="star-circle" size={30} color="#FBBF24" />
          </View>
          <LCText style={styles.summaryCount}>
            {hasRatings ? countDisplay : "0 ratings"}
          </LCText>
        </View>
      </View>

      {hasRatings && !loading && !errorMsg ? (
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.sortBtn} onPress={toggleSortMode}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={16}
              color={C.text}
              style={{ marginRight: 6 }}
            />
            <LCText style={styles.sortLabel}>
              {sortMode === "NEWEST" ? "Newest to oldest" : "Oldest to newest"}
            </LCText>
          </TouchableOpacity>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorWrap}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={C.danger}
          />
          <LCText style={styles.errorText}>{errorMsg}</LCText>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : !hasRatings ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="clipboard-check-outline"
            size={42}
            color={C.sub}
            style={{ marginBottom: 10 }}
          />
          <LCText style={styles.emptyText}>No commuter ratings</LCText>
          <LCText style={styles.emptySubText}>
            You currently have no ratings from commuters. Keep driving safely!
          </LCText>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(it) => String(it.id)}
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
  safe: { flex: 1 },

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
  summaryRight: { alignItems: "flex-end", justifyContent: "center" },
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

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  avatarInitial: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: C.sub,
  },
  anonName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: C.text,
  },
  starRow: { flexDirection: "row", alignItems: "center" },

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

  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  cardFooterText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
});
