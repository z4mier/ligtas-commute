// apps/mobile/screens/TripDetails.js
import React, { useState } from "react";
import {
  View,
  Text,
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

// ✅ NEW: notification helpers
import {
  addRatingSubmitted,
  addIncidentSubmitted,
} from "../lib/notify";

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
    trip?.ratingScore ??
    trip?.rating ??
    trip?.score ??
    null;

  const initialNotes =
    trip?.ratingComment ??
    trip?.comment ??
    trip?.feedback ??
    "";

  const hasInitialRating = initialRating != null && initialRating > 0;

  const [rating, setRating] = useState(initialRating || 0);
  const [notes, setNotes] = useState(initialNotes);
  const [mode, setMode] = useState(hasInitialRating ? "summary" : "form"); // "form" | "summary"

  const [submitting, setSubmitting] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategories, setReportCategories] = useState([]);
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!trip) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>No trip data.</Text>
        <TouchableOpacity
          style={styles.backBtnInline}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnInlineText}>Go back</Text>
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

  const driverAvatar =
    trip.driverAvatar ||
    rawDriver?.profileUrl ||
    rawDriver?.avatarUrl ||
    rawDriver?.photoUrl ||
    rawDriver?.image ||
    rawDriver?.picture ||
    null;

  const driverInitial =
    driverName && driverName.length > 0
      ? driverName.trim().charAt(0).toUpperCase()
      : "?";

  /* ------------------------------------------------------------------
   * SUBMIT RATING
   * ------------------------------------------------------------------ */
  const onSubmitRating = async () => {
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

      // ✅ Mark this trip as rated in the current screen / nav params
      const updatedTrip = {
        ...trip,
        ratingScore: rating,
        ratingComment: notes?.trim() || null,
      };
      navigation.setParams({ trip: updatedTrip });

      // ✅ Create a notification for the bell (Rating submitted)
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

  /* ------------------------------------------------------------------
   * SUBMIT INCIDENT REPORT
   * ------------------------------------------------------------------ */
  const onSubmitReport = async () => {
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

      // ✅ Create a notification for the bell (Issue reported)
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
            size={24}
            color={C.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Trip details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* DATE / TIME */}
        <Text style={styles.dateText}>{dateTimeStr}</Text>

        {/* DRIVER CARD */}
        <View style={styles.mainCard}>
          <View style={styles.tripRow}>
            <View style={styles.tripAvatar}>
              {driverAvatar ? (
                <Image
                  source={{ uri: driverAvatar }}
                  style={styles.tripAvatarImg}
                />
              ) : (
                <Text style={styles.tripAvatarInitial}>{driverInitial}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle} numberOfLines={1}>
                {driverName}
              </Text>
              <Text style={styles.tripSub}>LigtasCommute Driver</Text>
            </View>
          </View>
        </View>

        {/* MAP + ROUTE CARD */}
        <View style={styles.tripCard}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons
              name="map-outline"
              size={22}
              color={C.sub}
            />
            <Text style={styles.mapPlaceholderText}>
              Trip route preview will appear here.
            </Text>
          </View>

          <View style={styles.routeBlock}>
            <View style={styles.routeRow}>
              <View style={styles.routeDotOrigin} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeText} numberOfLines={2}>
                  {origin}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routeRow}>
              <View style={styles.routeDotDest} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeText} numberOfLines={2}>
                  {destination}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* RATING / REPORT CARD */}
        <View style={styles.ratingCard}>
          {mode === "form" ? (
            <>
              <Text style={styles.ratingTitle}>
                Help us improve your LigtasCommute experience
              </Text>
              <Text style={styles.ratingSub}>
                Rate this ride with {driverName}.
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setRating(value)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={active ? "star" : "star-outline"}
                        size={32}
                        color={active ? "#FACC15" : C.hint}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {rating > 0 && (
                <Text style={styles.ratingLabelText}>
                  {rating} ★ • {RATING_LABELS[rating] || ""}
                </Text>
              )}

              <Text style={styles.notesLabel}>
                Additional feedback (optional)
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Tell us what went well or what we can improve…"
                placeholderTextColor={C.hint}
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { opacity: !rating || submitting ? 0.6 : 1 },
                ]}
                disabled={!rating || submitting}
                onPress={onSubmitRating}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit rating</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.ratingSummaryPill}>
                <View style={styles.ratingSummaryRow}>
                  <Text style={styles.summaryLabel}>Ride rating</Text>
                  <View style={styles.summaryValueRow}>
                    <Text style={styles.summaryRatingText}>
                      {rating || initialRating || "—"}
                    </Text>
                    {!!(rating || initialRating) && (
                      <>
                        <MaterialCommunityIcons
                          name="star"
                          size={14}
                          color="#FACC15"
                          style={{ marginHorizontal: 2 }}
                        />
                        <Text style={styles.summaryLabelSmall}>
                          •{" "}
                          {
                            RATING_LABELS[rating || initialRating] ||
                            ""
                          }
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ALWAYS VISIBLE: REPORT LINK */}
          <TouchableOpacity
            style={styles.reportLinkBtn}
            onPress={() => setReportModalVisible(true)}
          >
            <Text style={styles.reportLinkText}>Report An Issue</Text>
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
            <Text style={styles.modalTitle}>Report an issue</Text>
            <Text style={styles.modalSub}>
              Tell us what happened on this trip so we can review it.
            </Text>

            <Text style={styles.modalLabel}>Category (select one or more)</Text>
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
                    <Text
                      style={[
                        styles.categoryPillText,
                        active && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>What happened?</Text>
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
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
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
                  <Text style={styles.modalBtnPrimaryText}>
                    Submit report
                  </Text>
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
    fontSize: 16,
    color: C.text,
  },

  dateText: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },

  mainCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  tripAvatarImg: {
    width: "100%",
    height: "100%",
  },
  tripAvatarInitial: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  tripTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: C.text,
  },
  tripSub: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
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
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  mapPlaceholderText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.accent,
    marginRight: 10,
    marginTop: 3,
  },
  routeDotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.danger,
    marginRight: 10,
    marginTop: 3,
  },
  routeLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: C.sub,
  },
  routeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.text,
    marginTop: 1,
  },
  routeLine: {
    height: 18,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    marginLeft: 5,
    marginVertical: 4,
  },

  ratingCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 15,
    color: C.text,
  },
  ratingSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 6,
    gap: 4,
  },
  ratingLabelText: {
    textAlign: "center",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: C.text,
    marginBottom: 8,
  },
  notesLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
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
    fontSize: 12,
    color: C.text,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },

  ratingSummaryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
  },
  ratingSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: C.text,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryRatingText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: C.text,
  },
  summaryLabelSmall: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },
  reportLinkBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  reportLinkText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: C.accent,
  },

  submitBtn: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: C.brand,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  errorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
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
    fontSize: 12,
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
    padding: 16,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: C.text,
  },
  modalSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
    marginBottom: 8,
  },
  modalLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
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
    fontSize: 11,
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
    fontSize: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
  },
  modalBtnSecondaryText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: C.text,
  },
  modalBtnPrimary: {
    backgroundColor: C.brand,
  },
  modalBtnPrimaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
});