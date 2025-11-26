// apps/mobile-driver/screens/QRScanner.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/config";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
  redDark: "#B91C1C",
  green: "#059669",
  amber: "#D97706",
};

const HEADER_H = 48;

/** Small helper: try reading token from various keys & shapes */
async function getAuthToken() {
  const tokenKeys = [
    "authToken", // pinaka-common sa mobile
    "AUTH_TOKEN",
    "LC_COMMUTER_TOKEN",
    "LC_DRIVER_TOKEN",
    "driverToken",
    "lc_token",
    "lc_admin",
    "lc_user",
  ];

  for (const key of tokenKeys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      console.log("[QRScanner] found something in AsyncStorage key =", key);

      // If JSON (e.g. { token: "...", role: "COMMUTER" })
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmed);
          const candidate =
            obj.token || obj.jwt || obj.accessToken || obj.authToken;
          if (candidate) {
            console.log("[QRScanner] using token from JSON under key =", key);
            return candidate;
          }
        } catch (e) {
          console.log("[QRScanner] failed to parse JSON for key", key, e);
        }
      } else {
        // plain string token
        console.log("[QRScanner] using raw token under key =", key);
        return trimmed;
      }
    } catch (e) {
      console.log("[QRScanner] error reading key", key, e);
    }
  }

  return null;
}

export default function QRScanner({ navigation }) {
  const insets = useSafeAreaInsets();

  // --------- FONTS (POPPINS) ----------
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = !!permission?.granted;

  const [scanning, setScanning] = useState(true);
  const scanLock = useRef(false);

  const [driver, setDriver] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  /** Reset scanning */
  const resetScan = useCallback(() => {
    scanLock.current = false;
    setScanning(true);
    setError("");
  }, []);

  /** Close modal and go back */
  const closeAndBack = useCallback(() => {
    setInfoOpen(false);
    setDriver(null);
    resetScan();
    navigation.goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------- HELPERS -------------- */

  const corridorLabel = (c) => {
    if (c === "EAST") return "EAST (via Oslob)";
    if (c === "WEST") return "WEST (via Barili)";
    return c || "—";
  };

  const normalizeBusType = (out) => {
    const t =
      out.busType ??
      out.vehicleType ??
      out.bus?.type ??
      out.bus?.busType ??
      out.bus_type ??
      "";
    if (!t) return "—";
    if (String(t).toUpperCase() === "AIRCON") return "AIRCON";
    if (String(t).toUpperCase() === "NON_AIRCON") return "NON_AIRCON";
    return String(t);
  };

  const busTypeLabel = (t) => {
    if (!t) return "—";
    const up = String(t).toUpperCase();
    if (up === "AIRCON") return "Aircon";
    if (up === "NON_AIRCON") return "Non-aircon";
    return t;
  };

  // ---------- ROUTE FORMATTER (SBT — Santander / Lilo-an Port — SBT) ----------
  const formatRouteLine = (forwardRoute, returnRoute) => {
    if (!forwardRoute && !returnRoute) return "—";
    if (forwardRoute && !returnRoute) return forwardRoute;
    if (!forwardRoute && returnRoute) return returnRoute;

    // Try to compress A → B and B → A to "A — B — A"
    const partsF = String(forwardRoute).split("→").map((s) => s.trim());
    const partsR = String(returnRoute).split("→").map((s) => s.trim());

    if (partsF.length === 2 && partsR.length === 2) {
      const a = partsF[0]; // e.g., SBT
      const b = partsF[1]; // e.g., Santander / Lilo-an Port
      const rFrom = partsR[0]; // e.g., Santander / Lilo-an Port
      const rTo = partsR[1]; // e.g., SBT

      if (a && b && a === rTo && b === rFrom) {
        // Symmetric route A → B, B → A
        return `${a} — ${b} — ${a}`;
      }
    }

    // Fallback: standard "forward — return"
    return `${forwardRoute} — ${returnRoute}`;
  };

  /** Build driver object from API response */
  const normalizeDriverFromApi = (out) => {
    const driverProfileId =
      out.driverProfileId ?? out.driverId ?? out.id ?? out.profileId ?? null;

    const busId = out.busId ?? out.bus?.id ?? null;

    const corridor =
      out.corridor ?? out.bus?.corridor ?? out.bus_corridor ?? null;

    const forwardRoute =
      out.forwardRoute ??
      out.bus?.forwardRoute ??
      out.routeForward ??
      out.route_forward ??
      null;

    const returnRoute =
      out.returnRoute ??
      out.bus?.returnRoute ??
      out.routeReturn ??
      out.route_return ??
      null;

    const status =
      out.status ??
      out.driverStatus ??
      out.onDutyStatus ??
      out.on_duty_status ??
      null;

    const onDuty =
      out.onDuty ??
      out.isOnDuty ??
      out.is_on_duty ??
      status === "ON_DUTY" ??
      false;

    return {
      id: driverProfileId,
      driverProfileId,
      busId,

      name: out.name ?? out.fullName ?? out.driverName ?? "Unknown Driver",
      code:
        out.code ??
        out.driverCode ??
        out.driverId ??
        out.id ??
        out.empCode ??
        "N/A",

      busNumber: out.busNumber ?? out.bus?.number ?? out.bus_no ?? "—",
      plateNumber: out.plateNumber ?? out.bus?.plate ?? out.plate ?? "—",

      busType: normalizeBusType(out),
      vehicleType: normalizeBusType(out),

      corridor,
      forwardRoute,
      returnRoute,

      status,
      onDuty: !!onDuty,

      scannedAt: new Date(),
    };
  };

  /** Build driver object from JSON QR (embedded driver info) */
  const normalizeDriverFromJson = (parsed) => {
    const driverProfileId =
      parsed.driverProfileId ?? parsed.driverId ?? parsed.id ?? null;

    const busId = parsed.busId ?? parsed.bus?.id ?? null;

    const corridor =
      parsed.corridor ??
      parsed.bus?.corridor ??
      parsed.bus_corridor ??
      null;

    const forwardRoute =
      parsed.forwardRoute ??
      parsed.bus?.forwardRoute ??
      parsed.routeForward ??
      parsed.route_forward ??
      null;

    const returnRoute =
      parsed.returnRoute ??
      parsed.bus?.returnRoute ??
      parsed.routeReturn ??
      parsed.route_return ??
      null;

    const status =
      parsed.status ??
      parsed.driverStatus ??
      parsed.onDutyStatus ??
      parsed.on_duty_status ??
      null;

    const onDuty =
      parsed.onDuty ??
      parsed.isOnDuty ??
      parsed.is_on_duty ??
      status === "ON_DUTY" ??
      false;

    return {
      id: driverProfileId,
      driverProfileId,
      busId,

      name: parsed.name ?? parsed.driverName ?? "Unknown Driver",
      code:
        parsed.code ??
        parsed.driverCode ??
        parsed.driverId ??
        parsed.id ??
        "N/A",

      busNumber: parsed.busNumber ?? parsed.bus ?? "—",
      plateNumber: parsed.plateNumber ?? parsed.plate ?? "—",

      busType: normalizeBusType(parsed),
      vehicleType: normalizeBusType(parsed),

      corridor,
      forwardRoute,
      returnRoute,

      status,
      onDuty: !!onDuty,

      scannedAt: new Date(),
    };
  };

  /** ---------------------------------
   *  MAIN HANDLER FOR SCANNED PAYLOAD
   *  --------------------------------- */
  const handlePayload = async (data) => {
    try {
      console.log("[QRScanner] scanned data =", data);

      // Try JSON first
      let parsed = null;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        parsed = null;
      }

      // If QR contains embedded DRIVER info (no type: "bus")
      if (
        parsed &&
        !parsed.type &&
        (parsed.driverId || parsed.driverProfileId || parsed.name)
      ) {
        const obj = normalizeDriverFromJson(parsed);
        console.log("[QRScanner] parsed embedded JSON DRIVER:", obj);
        setDriver(obj);
        setInfoOpen(true);
        return;
      }

      /** Fallback: call API for BUS QR */
      setLoadingLookup(true);

      const token = await getAuthToken();

      if (!token) {
        setLoadingLookup(false);
        throw new Error(
          "No token found. Please log out and log in again in the commuter app."
        );
      }

      const res = await fetch(`${API_URL}/commuter/scan-bus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payload: parsed ?? data }),
      });

      const out = await res.json().catch(() => ({}));
      setLoadingLookup(false);

      if (!res.ok) {
        console.log("[QRScanner] API ERROR:", out);
        throw new Error(out?.message || "Invalid QR code");
      }

      const obj = normalizeDriverFromApi(out);
      console.log("[QRScanner] Driver+Bus from API:", obj);

      setDriver(obj);
      setInfoOpen(true);
    } catch (e) {
      console.error("[QRScanner] handlePayload ERROR:", e);
      setError(e.message || "Scan failed. Try again.");

      setTimeout(() => {
        scanLock.current = false;
        setScanning(true);
      }, 1500);
    }
  };

  /** Camera callback */
  const onBarcodeScanned = ({ data }) => {
    if (!scanning || scanLock.current || infoOpen) return;

    scanLock.current = true;
    setScanning(false);
    setError("");

    handlePayload(data);
  };

  /** Time text for modal */
  const timeText = useMemo(() => {
    if (!driver?.scannedAt) return "";
    const d = driver.scannedAt;
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Scanned on ${date}, ${time}`;
  }, [driver]);

  const isOnDuty =
    !!driver?.onDuty || driver?.status === "ON_DUTY" || driver?.status === "ACTIVE";

  // Use formatted route line (SBT — Santander / Lilo-an Port — SBT style)
  const routeLine = formatRouteLine(driver?.forwardRoute, driver?.returnRoute);

  /** =============================
   *   PERMISSION / LOADING STATES
   *  ============================= */

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator />
        <Text style={s.hint}>Loading fonts…</Text>
      </SafeAreaView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <MaterialCommunityIcons name="web" size={34} color={C.hint} />
        <Text style={s.hint}>Camera not available on web</Text>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator />
        <Text style={s.hint}>Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <Text style={s.hint}>Camera permission required</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
          <Text style={s.primaryBtnTxt}>Enable</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /** =============================
   *        MAIN UI
   *  ============================= */

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* HEADER */}
      <View
        style={[
          s.topBar,
          { paddingTop: insets.top, height: HEADER_H + insets.top },
        ]}
      >
        <TouchableOpacity style={s.iconBtn} onPress={closeAndBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Scan Bus QR</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* CAMERA */}
      <View style={s.cameraWrap}>
        {scanning ? (
          <CameraView
            style={s.camera}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            facing="back"
          />
        ) : (
          <View style={[s.camera, s.center]}>
            {loadingLookup ? (
              <>
                <ActivityIndicator />
                <Text style={[s.hint, { marginTop: 8 }]}>
                  Looking up driver and bus…
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={34}
                  color={C.hint}
                />
                <Text style={[s.hint, { marginTop: 8 }]}>
                  {error || "Processing…"}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Scan frame */}
        <View pointerEvents="none" style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.overlayHint}>Align QR inside the frame</Text>
        </View>
      </View>

      {/* RESCAN */}
      <View style={[s.actionsRow, { paddingBottom: 14 + insets.bottom }]}>
        <TouchableOpacity style={s.secondaryBtn} onPress={resetScan}>
          <MaterialCommunityIcons name="reload" size={18} color={C.brand} />
          <Text style={s.secondaryBtnTxt}>Rescan</Text>
        </TouchableOpacity>
      </View>

      {/* DRIVER + BUS INFO MODAL */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInfoOpen(false);
          resetScan();
        }}
      >
        <View style={s.modalBg} />
        <View style={s.infoCardWrap}>
          <View style={s.infoCard}>
            {/* Header */}
            <View style={s.infoHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={s.avatarCircle}>
                  <MaterialCommunityIcons
                    name="account"
                    size={22}
                    color={C.brand}
                  />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={s.infoTitle}>
                    {driver?.name ?? "Unknown Driver"}
                  </Text>
                  {!!timeText && <Text style={s.infoSub}>{timeText}</Text>}
                </View>
              </View>

              <TouchableOpacity onPress={() => setInfoOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Status row */}
            <View style={[s.row, { marginTop: 8 }]}>
              <View style={s.badge}>
                <Text style={s.badgeTxt}>
                  {driver?.code ? `ID: ${driver.code}` : "No driver code"}
                </Text>
              </View>

              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: isOnDuty ? "#DCFCE7" : "#F3F4F6",
                    borderColor: isOnDuty ? "#22C55E" : C.border,
                  },
                ]}
              >
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: isOnDuty ? C.green : C.hint },
                  ]}
                />
                <Text
                  style={[
                    s.statusPillTxt,
                    { color: isOnDuty ? C.green : C.sub },
                  ]}
                >
                  {isOnDuty ? "On duty" : "Off duty"}
                </Text>
              </View>
            </View>

            {/* Info sections */}
            <View style={[s.infoBox, { marginTop: 14 }]}>
              {/* Bus */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="bus-side"
                  size={20}
                  color={C.brand}
                />
                <Text style={[s.sectionTitle, { marginLeft: 6 }]}>
                  Assigned Bus
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Bus Number</Text>
                <Text style={s.value}>{driver?.busNumber ?? "—"}</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Plate Number</Text>
                <Text style={s.value}>{driver?.plateNumber ?? "—"}</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Bus Type</Text>
                <Text style={s.value}>
                  {busTypeLabel(driver?.busType) ?? "—"}
                </Text>
              </View>
            </View>

            <View style={[s.infoBox, { marginTop: 10 }]}>
              {/* Route */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="map-marker-path"
                  size={20}
                  color={C.brand}
                />
                <Text style={[s.sectionTitle, { marginLeft: 6 }]}>
                  Route & Corridor
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Corridor</Text>
                <Text style={s.value}>{corridorLabel(driver?.corridor)}</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={s.label}>Route</Text>
                <Text style={s.value}>{routeLine}</Text>
              </View>
            </View>

            {/* Proceed */}
            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 14 }]}
              onPress={async () => {
                const normalized = {
                  ...driver,
                  driverProfileId:
                    driver?.driverProfileId ?? driver?.id ?? null,
                  busId: driver?.busId ?? null,
                };

                await AsyncStorage.setItem(
                  "LC_CURRENT_DRIVER",
                  JSON.stringify(normalized)
                );

                navigation.navigate("MapTracking", {
                  driver: normalized,
                });
              }}
            >
              <Text style={s.primaryBtnTxt}>
                Go Online & Open Live Tracking
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** =============================
 *  STYLES
 *  ============================= */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    justifyContent: "space-between",
    backgroundColor: C.bg,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: C.text,
    fontFamily: "Poppins_700Bold",
  },

  cameraWrap: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  camera: { flex: 1 },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.8)",
  },
  overlayHint: {
    marginTop: 14,
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
    fontFamily: "Poppins_400Regular",
  },

  actionsRow: { paddingHorizontal: 14 },

  secondaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryBtnTxt: {
    color: C.brand,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.18)" },

  infoCardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E0ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: C.text,
    fontFamily: "Poppins_700Bold",
  },
  infoSub: {
    color: C.sub,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
  },

  infoBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FAFAFA",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  badge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  badgeTxt: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusPillTxt: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
    fontFamily: "Poppins_700Bold",
  },

  label: {
    fontSize: 11,
    color: C.sub,
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    marginTop: 2,
    fontFamily: "Poppins_600SemiBold",
  },

  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },

  hint: {
    color: C.hint,
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
  },
});
