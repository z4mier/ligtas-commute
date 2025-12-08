// apps/mobile/screens/TripDetails.js
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
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
import { addRatingSubmitted, addIncidentSubmitted } from "../lib/notify";
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

/* ---------- Avatar helper (simple) ---------- */
function buildAbsoluteAvatarUrl(raw) {
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  let base = (API_URL || "").replace(/\/+$/, "");

  if (base.toLowerCase().endsWith("/api")) {
    base = base.slice(0, -4);
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const full = `${base}${path}`;
  console.log("[TripDetails] driver avatar URL =", full);
  return full;
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

function cleanPlace(s, fallback = "Unknown") {
  if (!s) return fallback;
  return String(s).trim();
}

export default function TripDetails({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { trip } = route.params || {};

  const initialRating =
    trip?.ratingScore ?? trip?.rating ?? trip?.score ?? null;

  const initialNotes =
    trip?.ratingComment ?? trip?.comment ?? trip?.feedback ?? "";

  const hasInitialRating = initialRating != null && initialRating > 0;

  const [rating, setRating] = useState(initialRating || 0);
  const [notes, setNotes] = useState(initialNotes);
  const [mode, setMode] = useState(hasInitialRating ? "summary" : "form");

  const [submitting, setSubmitting] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategories, setReportCategories] = useState([]);
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const [avatarError, setAvatarError] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!trip) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <LCText variant="tiny" style={styles.errorText}>
          No trip data.
        </LCText>
        <TouchableOpacity
          style={styles.backBtnInline}
          onPress={() => navigation.goBack()}
        >
          <LCText variant="tiny" style={styles.backBtnInlineText}>
            Go back
          </LCText>
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

  console.log("[TripDetails] trip =", JSON.stringify(trip, null, 2));

  const started = trip.startedAt || trip.endedAt;
  const dateTimeStr = fmtDateTime(started);

  const origin = cleanPlace(trip.originLabel, "Origin");
  const destination = cleanPlace(trip.destLabel, "Destination");

  const rawDriver =
    trip.driverProfile || trip.driver || trip.driverInfo || null;

  const driverName =
    trip.driverProfile?.fullName ||
    trip.driverName ||
    trip.driver_full_name ||
    rawDriver?.fullName ||
    rawDriver?.name ||
    rawDriver?.driverName ||
    rawDriver?.displayName ||
    rawDriver?.username ||
    "Your driver";

  const candidateAvatar =
    trip.driverAvatar ||
    trip.driver_avatar ||
    trip.avatar ||
    rawDriver?.profileUrl ||
    null;

  console.log("[TripDetails] raw driver avatar =", candidateAvatar);

  const driverAvatar = candidateAvatar
    ? buildAbsoluteAvatarUrl(candidateAvatar)
    : null;

  const showDriverImage = !!driverAvatar && !avatarError;

  const driverInitial =
    driverName && driverName.length > 0
      ? driverName.trim().charAt(0).toUpperCase()
      : "?";

  const isExpired = (() => {
    if (!started) return false;
    const d = new Date(started);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  })();

  const onSubmitRating = async () => {
    if (isExpired) {
      Alert.alert(
        "Rating not available",
        "You can rate a trip within 7 days after it ends."
      );
      return;
    }

    if (!rating || submitting) return;

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");
      const url = `${API_URL}/commuter/trips/${trip.id}/rating`;

      console.log("[TripDetails] submitting rating →", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          rating,
          comment: notes?.trim() || null,
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      console.log(
        "[TripDetails] rating response status =",
        res.status,
        "data =",
        data
      );

      if (!res.ok) {
        throw new Error(
          data.error || `Failed to submit rating (status ${res.status})`
        );
      }

      const updatedTrip = {
        ...trip,
        ratingScore: rating,
        ratingComment: notes?.trim() || null,
      };
      navigation.setParams({ trip: updatedTrip });

      await addRatingSubmitted({ trip: updatedTrip, rating });

      setSubmitting(false);
      setMode("summary");
      Alert.alert("Thank you!", "Your rating has been submitted.");
    } catch (err) {
      console.error("[TripDetails] rating error", err);
      setSubmitting(false);
      Alert.alert("Error", err.message || "Unable to submit rating.");
    }
  };

  const onSubmitReport = async () => {
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

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        console.log("[TripDetails] report error response =", data);
        throw new Error(data.error || "Failed to submit report");
      }

      await addIncidentSubmitted({ trip });

      setSubmittingReport(false);
      setReportModalVisible(false);
      setReportCategories([]);
      setReportNotes("");
      Alert.alert(
        "Report submitted",
        "Thank you for telling us about this issue."
      );
    } catch (err) {
      console.error("[TripDetails] report error", err);
      setSubmittingReport(false);
      Alert.alert("Error", err.message || "Unable to submit report.");
    }
  };

  const toggleCategory = (cat) => {
    setReportCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.screen,
        { paddingTop: Math.max(insets.top, 10) },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={C.text}
          />
        </TouchableOpacity>
        <LCText
          variant="label"
          style={styles.headerTitle}
          numberOfLines={1}
        >
          Trip details
        </LCText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* DATE / TIME */}
        <LCText variant="tiny" style={styles.dateText}>
          {dateTimeStr}
        </LCText>

        {/* DRIVER CARD */}
        <View style={styles.mainCard}>
          <View style={styles.tripRow}>
            <View style={styles.tripAvatar}>
              {showDriverImage ? (
                <Image
                  source={{ uri: driverAvatar }}
                  style={styles.tripAvatarImg}
                  onError={() => {
                    console.log(
                      "[TripDetails] avatar load failed, fallback to initial"
                    );
                    setAvatarError(true);
                  }}
                />
              ) : (
                <LCText
                  variant="label"
                  style={styles.tripAvatarInitial}
                >
                  {driverInitial}
                </LCText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <LCText variant="label" style={styles.tripTitle} numberOfLines={1}>
                {driverName}
              </LCText>
              <LCText variant="tiny" style={styles.tripSub}>
                LigtasCommute Driver
              </LCText>
            </View>
          </View>
        </View>

        {/* MAP + ROUTE CARD */}
        <View style={styles.tripCard}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons
              name="map-outline"
              size={20}
              color={C.sub}
            />
            <View style={{ flex: 1 }}>
              <LCText variant="label" style={styles.mapPlaceholderTitle}>
                Route Overview
              </LCText>
            </View>
          </View>

          <View style={styles.routeBlock}>
            <View style={styles.routeRow}>
              <View style={styles.routeDotOrigin} />
              <View style={{ flex: 1 }}>
                <LCText variant="tiny" style={styles.routeLabel}>
                  Pickup
                </LCText>
                <LCText
                  variant="tiny"
                  style={styles.routeText}
                  numberOfLines={2}
                >
                  {origin}
                </LCText>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routeRow}>
              <View style={styles.routeDotDest} />
              <View style={{ flex: 1 }}>
                <LCText variant="tiny" style={styles.routeLabel}>
                  Drop-off
                </LCText>
                <LCText
                  variant="tiny"
                  style={styles.routeText}
                  numberOfLines={2}
                >
                  {destination}
                </LCText>
              </View>
            </View>
          </View>
        </View>

        {/* RATING / REPORT CARD */}
        <View style={styles.ratingCard}>
          {mode === "form" ? (
            <>
              <LCText variant="label" style={styles.ratingTitle}>
                Help us improve your LigtasCommute experience
              </LCText>
              <LCText variant="tiny" style={styles.ratingSub}>
                Rate this ride with {driverName}.
              </LCText>

              <View
                style={[
                  styles.starsRow,
                  isExpired && { opacity: 0.4 },
                ]}
              >
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => {
                        if (isExpired) return;
                        setRating(value);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={active ? "star" : "star-outline"}
                        size={26}
                        color={active ? "#FACC15" : C.hint}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {rating > 0 && (
                <LCText variant="tiny" style={styles.ratingLabelText}>
                  {rating} ★ • {RATING_LABELS[rating] || ""}
                </LCText>
              )}

              <LCText variant="tiny" style={styles.notesLabel}>
                Additional feedback (optional)
              </LCText>
              <TextInput
                style={[
                  styles.notesInput,
                  isExpired && { opacity: 0.6 },
                ]}
                placeholder="Tell us what went well or what we can improve…"
                placeholderTextColor={C.hint}
                multiline
                value={notes}
                onChangeText={(v) => {
                  if (isExpired) return;
                  setNotes(v);
                }}
                editable={!isExpired}
              />

              {isExpired && (
                <LCText variant="tiny" style={styles.expiredText}>
                  Rating and reports are available within 7 days after
                  your trip.
                </LCText>
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    opacity:
                      !rating || submitting || isExpired ? 0.6 : 1,
                  },
                ]}
                disabled={!rating || submitting || isExpired}
                onPress={onSubmitRating}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <LCText variant="label" style={styles.submitBtnText}>
                    Submit rating
                  </LCText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.ratingSummaryPill}>
                <View style={styles.ratingSummaryRow}>
                  <LCText variant="label" style={styles.summaryLabel}>
                    Ride rating
                  </LCText>
                  <View style={styles.summaryValueRow}>
                    <LCText variant="label" style={styles.summaryRatingText}>
                      {rating || initialRating || "—"}
                    </LCText>
                    {!!(rating || initialRating) && (
                      <>
                        <MaterialCommunityIcons
                          name="star"
                          size={12}
                          color="#FACC15"
                          style={{ marginHorizontal: 2 }}
                        />
                        <LCText
                          variant="tiny"
                          style={styles.summaryLabelSmall}
                        >
                          •{" "}
                          {RATING_LABELS[rating || initialRating] || ""}
                        </LCText>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* REPORT LINK */}
          <TouchableOpacity
            style={[
              styles.reportLinkBtn,
              isExpired && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (isExpired) {
                Alert.alert(
                  "Reporting not available",
                  "You can report an issue within 7 days after the trip."
                );
                return;
              }
              setReportModalVisible(true);
            }}
          >
            <LCText variant="label" style={styles.reportLinkText}>
              Report An Issue
            </LCText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* REPORT ISSUE MODAL */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submittingReport && setReportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <LCText variant="label" style={styles.modalTitle}>
              Report an issue
            </LCText>
            <LCText variant="tiny" style={styles.modalSub}>
              Tell us what happened on this trip so we can review it.
            </LCText>

            <LCText variant="tiny" style={styles.modalLabel}>
              Category (select one or more)
            </LCText>
            <View style={styles.categoryPillsRow}>
              {INCIDENT_CATEGORIES.map((cat) => {
                const active = reportCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      active && styles.categoryPillActive,
                    ]}
                    onPress={() => toggleCategory(cat)}
                    disabled={submittingReport}
                  >
                    <LCText
                      variant="tiny"
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

            <LCText variant="tiny" style={styles.modalLabel}>
              What happened?
            </LCText>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Describe the issue (optional but helpful)…"
              placeholderTextColor={C.hint}
              multiline
              value={reportNotes}
              onChangeText={setReportNotes}
              editable={!submittingReport}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() =>
                  !submittingReport && setReportModalVisible(false)
                }
                disabled={submittingReport}
              >
                <LCText variant="tiny" style={styles.modalBtnSecondaryText}>
                  Cancel
                </LCText>
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
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <LCText variant="tiny" style={styles.modalBtnPrimaryText}>
                    Submit report
                  </LCText>
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
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  headerBack: {
    padding: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },

  dateText: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },

  mainCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
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

  tripRow: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  tripAvatarImg: {
    width: "100%",
    height: "100%",
  },
  tripAvatarInitial: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  tripTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: C.text,
  },
  tripSub: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.sub,
    marginTop: 2,
  },

  tripCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 14,
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

  mapPlaceholder: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  mapPlaceholderTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: C.text,
  },

  routeBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginRight: 8,
    marginTop: 3,
  },
  routeDotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.danger,
    marginRight: 8,
    marginTop: 3,
  },
  routeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: C.sub,
  },
  routeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.text,
    marginTop: 1,
  },
  routeLine: {
    height: 16,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    marginLeft: 4,
    marginVertical: 4,
  },

  ratingCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
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
  ratingTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  ratingSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginTop: 4,
  },
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
    fontSize: 11,
    color: C.text,
    marginBottom: 8,
  },
  notesLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
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
    fontSize: 11,
    color: C.text,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  expiredText: {
    marginTop: 6,
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.sub,
    textAlign: "center",
  },

  ratingSummaryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  ratingSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: C.text,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryRatingText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  summaryLabelSmall: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
  reportLinkBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  reportLinkText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: C.accent,
  },

  submitBtn: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: C.brand,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },

  errorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.text,
    marginBottom: 8,
  },
  backBtnInline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnInlineText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.brand,
  },

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
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: C.text,
  },
  modalSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
    marginTop: 4,
    marginBottom: 8,
  },
  modalLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.text,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  categoryPillText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: C.text,
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  modalTextArea: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
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
  modalBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
  },
  modalBtnSecondaryText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.text,
  },
  modalBtnPrimary: {
    backgroundColor: C.brand,
  },
  modalBtnPrimaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
});
