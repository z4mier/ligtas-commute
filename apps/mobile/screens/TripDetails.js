// apps/mobile/screens/TripDetails.js
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
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
  accent: "#2563EB",
  danger: "#DC2626",
};

const RATING_LABELS = {
  1: "Terrible",
  2: "Poor",
  3: "Okay",
  4: "Near perfect",
  5: "Excellent",
};

const INCIDENT_CATEGORIES = [
  "Driver behavior",
  "Overspeeding / reckless driving",
  "Vehicle condition",
  "Suspicious activity / safety concern",
  "Other",
];

function buildAbsoluteAvatarUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  let base = (API_URL || "").replace(/\/+$/, "");
  if (base.toLowerCase().endsWith("/api")) base = base.slice(0, -4);

  const p = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${p}`;
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

/**
 * Keep unpacker ONLY for reading old saved comments that might still include LCMETA.
 * We will STOP writing LCMETA going forward.
 */
function unpackRatingComment(raw) {
  const text = typeof raw === "string" ? raw : "";
  const trimmed = text.trim();

  // supports meta at start
  const m = trimmed.match(/^\[LCMETA:(\{.*?\})\]\s*/);
  if (!m) return { revealName: null, comment: trimmed || "" };

  const metaRaw = m[1];
  const comment = trimmed.replace(m[0], "").trim();

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let meta = tryParse(metaRaw);
  if (!meta) meta = tryParse(metaRaw.replace(/'/g, '"'));

  if (!meta || typeof meta !== "object") {
    return { revealName: null, comment: comment || "" };
  }

  return { revealName: !!meta.revealName, comment: comment || "" };
}

export default function TripDetails({ route, navigation }) {
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const trip = route?.params?.trip || null;

  const rawInitialComment = useMemo(() => {
    if (!trip) return "";
    return trip?.ratingComment ?? trip?.comment ?? trip?.feedback ?? "";
  }, [trip]);

  const unpacked = useMemo(
    () => unpackRatingComment(rawInitialComment),
    [rawInitialComment]
  );

  const initialRating = useMemo(() => {
    if (!trip) return 0;
    return Number(trip?.ratingScore ?? trip?.rating ?? trip?.score ?? 0) || 0;
  }, [trip]);

  const initialReveal = useMemo(() => {
    if (!trip) return false;
    if (typeof trip?.ratingRevealName === "boolean") return trip.ratingRevealName;
    if (typeof unpacked.revealName === "boolean") return unpacked.revealName;
    return false;
  }, [trip, unpacked.revealName]);

  const [rating, setRating] = useState(initialRating || 0);
  const [notes, setNotes] = useState(unpacked.comment || "");
  const [revealName, setRevealName] = useState(initialReveal);

  // ✅ CRITICAL FIX: always keep latest revealName for submit
  const revealNameRef = useRef(!!initialReveal);

  useEffect(() => {
    revealNameRef.current = !!revealName;
  }, [revealName]);

  const [avatarError, setAvatarError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategories, setReportCategories] = useState([]);
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!trip) return;

    const raw = trip?.ratingComment ?? trip?.comment ?? trip?.feedback ?? "";
    const parsed = unpackRatingComment(raw);

    const nextRating =
      Number(trip?.ratingScore ?? trip?.rating ?? trip?.score ?? 0) || 0;

    setRating(nextRating);
    setNotes(parsed.comment || "");

    const nextReveal =
      typeof trip?.ratingRevealName === "boolean"
        ? trip.ratingRevealName
        : typeof parsed.revealName === "boolean"
        ? parsed.revealName
        : false;

    setRevealName(!!nextReveal);
    revealNameRef.current = !!nextReveal; // ✅ keep ref in sync immediately
  }, [trip]);

  const alreadyRated = useMemo(() => {
    if (!trip) return false;
    const s = trip?.ratingScore ?? trip?.rating ?? trip?.score ?? null;
    return s !== null && s !== undefined && Number(s) > 0;
  }, [trip]);

  const started = trip?.startedAt || trip?.endedAt || null;
  const dateTimeStr = useMemo(() => fmtDateTime(started), [started]);

  const driverName = useMemo(() => {
    if (!trip) return "Your driver";
    const rawDriver =
      trip.driverProfile || trip.driver || trip.driverInfo || null;
    return (
      trip.driverProfile?.fullName ||
      trip.driverName ||
      trip.driver_full_name ||
      rawDriver?.fullName ||
      rawDriver?.name ||
      rawDriver?.driverName ||
      rawDriver?.displayName ||
      rawDriver?.username ||
      "Your driver"
    );
  }, [trip]);

  const driverInitial = useMemo(() => {
    if (!driverName) return "?";
    return driverName.trim().charAt(0).toUpperCase();
  }, [driverName]);

  const driverAvatar = useMemo(() => {
    if (!trip) return null;
    const rawDriver =
      trip.driverProfile || trip.driver || trip.driverInfo || null;
    const candidate =
      trip.driverAvatar ||
      trip.driver_avatar ||
      trip.avatar ||
      rawDriver?.profileUrl ||
      null;
    return candidate ? buildAbsoluteAvatarUrl(candidate) : null;
  }, [trip]);

  const showDriverImage = !!driverAvatar && !avatarError;

  const isExpired = useMemo(() => {
    if (!started) return false;
    const d = new Date(started);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  }, [started]);

  const toggleCategory = useCallback((cat) => {
    setReportCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  // ✅ make toggle atomic + sync ref instantly
  const onToggleRevealName = useCallback(() => {
    setRevealName((prev) => {
      const next = !prev;
      revealNameRef.current = next;
      return next;
    });
  }, []);

  const onSubmitRating = useCallback(async () => {
    if (!trip) return;

    if (isExpired) {
      Alert.alert(
        "Rating not available",
        "You can rate a trip within 7 days after it ends."
      );
      return;
    }

    if (alreadyRated) {
      Alert.alert("Rating submitted", "You already rated this trip.");
      return;
    }

    if (!rating || submitting) return;

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");
      const url = `${API_URL}/commuter/trips/${trip.id}/rating`;

      // ✅ IMPORTANT: use ref so it never sends stale false
      const revealNow = !!revealNameRef.current;

      const payload = {
        rating: Number(rating),
        comment: (notes || "").toString().trim() || null,
        revealName: revealNow, // ✅ always latest boolean
      };

      console.log("✅ SUBMITTING RATING payload:", payload);
      console.log("✅ SUBMITTING RATING url:", url);
      console.log("API_URL USED:", API_URL);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit rating");

      const updatedTrip = {
        ...trip,
        ratingScore: Number(rating),
        ratingComment: payload.comment,
        ratingRevealName: revealNow,
      };

      navigation.setParams({ trip: updatedTrip });

      Alert.alert("Thank you!", "Your rating has been submitted.");
    } catch (e) {
      console.error("Rating submission error:", e);
      Alert.alert("Error", e.message || "Unable to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }, [trip, isExpired, alreadyRated, rating, submitting, notes, navigation]);

  const onSubmitReport = useCallback(async () => {
    if (!trip) return;

    if (isExpired) {
      Alert.alert(
        "Reporting not available",
        "You can report an issue within 7 days after the trip."
      );
      return;
    }

    if (reportCategories.length === 0 && !reportNotes.trim()) {
      Alert.alert(
        "Missing details",
        "Please select at least one category or describe what happened."
      );
      return;
    }

    try {
      setSubmittingReport(true);
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          tripId: trip.id,
          categories: reportCategories,
          note: reportNotes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit report");

      setReportModalVisible(false);
      setReportCategories([]);
      setReportNotes("");
      Alert.alert(
        "Report submitted",
        "Thank you for telling us about this issue."
      );
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to submit report.");
    } finally {
      setSubmittingReport(false);
    }
  }, [trip, isExpired, reportCategories, reportNotes]);

  if (!trip) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <LCText style={{ color: C.text }}>No trip data.</LCText>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
        >
          <LCText style={{ color: C.accent }}>Go back</LCText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={C.text} />
        </TouchableOpacity>
        <LCText style={styles.headerTitle}>Trip details</LCText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        <LCText style={styles.dateText}>{dateTimeStr}</LCText>

        <View style={styles.mainCard}>
          <View style={styles.tripRow}>
            <View style={styles.tripAvatar}>
              {showDriverImage ? (
                <Image
                  source={{ uri: driverAvatar }}
                  style={styles.tripAvatarImg}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <LCText style={styles.tripAvatarInitial}>{driverInitial}</LCText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <LCText style={styles.tripTitle}>{driverName}</LCText>
              <LCText style={styles.tripSub}>LigtasCommute Driver</LCText>
            </View>
          </View>
        </View>

        <View style={styles.ratingCard}>
          <LCText style={styles.ratingTitle}>
            Help us improve your LigtasCommute experience
          </LCText>

          <View
            style={[
              styles.starsRow,
              (isExpired || alreadyRated) && { opacity: 0.6 },
            ]}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => {
                  if (isExpired || alreadyRated) return;
                  setRating(v);
                }}
                activeOpacity={0.8}
                disabled={isExpired || alreadyRated}
              >
                <MaterialCommunityIcons
                  name={v <= rating ? "star" : "star-outline"}
                  size={26}
                  color={v <= rating ? "#FACC15" : C.hint}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 ? (
            <LCText style={styles.ratingLabelText}>
              {rating} ★ • {RATING_LABELS[rating]}
            </LCText>
          ) : null}

          {alreadyRated ? (
            <LCText
              style={{
                textAlign: "center",
                marginTop: 4,
                color: C.sub,
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
              }}
            >
              Rating submitted ✔
            </LCText>
          ) : null}

          <LCText style={styles.notesLabel}>Additional feedback (optional)</LCText>
          <TextInput
            style={[
              styles.notesInput,
              (isExpired || alreadyRated) && { opacity: 0.6 },
            ]}
            placeholder="Tell us what went well or what we can improve…"
            placeholderTextColor={C.hint}
            multiline
            value={notes}
            onChangeText={setNotes}
            editable={!isExpired && !alreadyRated}
          />

          <TouchableOpacity
            style={[
              styles.revealRow,
              (isExpired || alreadyRated) && { opacity: 0.6 },
            ]}
            onPress={() => {
              if (isExpired || alreadyRated) return;
              onToggleRevealName();
            }}
            disabled={isExpired || alreadyRated}
          >
            <MaterialCommunityIcons
              name={revealName ? "checkbox-marked" : "checkbox-blank-outline"}
              size={18}
              color={revealName ? C.brand : C.hint}
            />
            <View style={{ flex: 1 }}>
              <LCText style={styles.revealTitle}>Reveal my name to the driver</LCText>
              <LCText style={styles.revealSub}>
                If unchecked, your rating will show as Anonymous.
              </LCText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!rating || submitting || isExpired || alreadyRated) && {
                opacity: 0.6,
              },
            ]}
            disabled={!rating || submitting || isExpired || alreadyRated}
            onPress={onSubmitRating}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LCText style={styles.submitBtnText}>Submit rating</LCText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 10, alignItems: "center" }}
            onPress={() => !isExpired && setReportModalVisible(true)}
            disabled={isExpired}
          >
            <LCText style={{ color: C.accent, fontFamily: "Poppins_500Medium" }}>
              Report An Issue
            </LCText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <LCText style={styles.modalTitle}>Report an issue</LCText>
            <LCText style={styles.modalSub}>Tell us what happened on this trip.</LCText>

            <LCText style={styles.modalLabel}>Category</LCText>
            <View style={styles.categoryPillsRow}>
              {INCIDENT_CATEGORIES.map((cat) => {
                const active = reportCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, active && styles.categoryPillActive]}
                    onPress={() => toggleCategory(cat)}
                    disabled={submittingReport}
                  >
                    <LCText
                      style={[
                        styles.categoryPillText,
                        active && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </LCText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <LCText style={styles.modalLabel}>What happened?</LCText>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Describe the issue…"
              placeholderTextColor={C.hint}
              multiline
              value={reportNotes}
              onChangeText={setReportNotes}
              editable={!submittingReport}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => !submittingReport && setReportModalVisible(false)}
                disabled={submittingReport}
              >
                <LCText style={styles.modalBtnSecondaryText}>Cancel</LCText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  submittingReport && { opacity: 0.7 },
                ]}
                onPress={onSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <LCText style={styles.modalBtnPrimaryText}>Submit report</LCText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  headerBack: { padding: 6 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    color: C.text,
  },

  dateText: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
    color: C.sub,
    fontFamily: "Poppins_400Regular",
  },

  mainCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  tripRow: { flexDirection: "row", alignItems: "center" },
  tripAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  tripAvatarImg: { width: "100%", height: "100%" },
  tripAvatarInitial: { fontFamily: "Poppins_600SemiBold", color: "#fff" },
  tripTitle: { fontFamily: "Poppins_700Bold", color: C.text },
  tripSub: {
    fontFamily: "Poppins_500Medium",
    color: C.sub,
    marginTop: 2,
  },

  ratingCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  ratingTitle: { fontFamily: "Poppins_600SemiBold", color: C.text },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 6,
    gap: 4,
  },
  ratingLabelText: {
    textAlign: "center",
    fontFamily: "Poppins_500Medium",
    color: C.text,
    marginBottom: 8,
  },

  notesLabel: {
    fontFamily: "Poppins_500Medium",
    color: C.text,
    marginTop: 8,
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    color: C.text,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },

  revealRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  revealTitle: { fontFamily: "Poppins_600SemiBold", color: C.text },
  revealSub: {
    fontFamily: "Poppins_400Regular",
    color: C.sub,
    marginTop: 2,
    fontSize: 12,
  },

  submitBtn: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: C.brand,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitBtnText: { fontFamily: "Poppins_600SemiBold", color: "#fff" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 14,
  },
  modalTitle: { fontFamily: "Poppins_600SemiBold", color: C.text },
  modalSub: {
    fontFamily: "Poppins_400Regular",
    color: C.sub,
    marginTop: 4,
    marginBottom: 8,
  },
  modalLabel: {
    fontFamily: "Poppins_500Medium",
    color: C.text,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  categoryPillText: {
    fontFamily: "Poppins_400Regular",
    color: C.text,
    fontSize: 12,
  },
  categoryPillTextActive: { color: "#fff" },
  modalTextArea: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    color: C.text,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  modalBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
  },
  modalBtnSecondaryText: { fontFamily: "Poppins_500Medium", color: C.text },
  modalBtnPrimary: { backgroundColor: C.brand },
  modalBtnPrimaryText: { fontFamily: "Poppins_600SemiBold", color: "#fff" },
});
