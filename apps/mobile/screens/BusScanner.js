// apps/mobile/screens/BusScanner.js
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

/** Try reading token from various keys & shapes */
async function getAuthToken() {
  const tokenKeys = [
    "authToken", // previous main commuter key
    "AUTH_TOKEN",
    "LC_COMMUTER_TOKEN",

    // 🔥 actual key from your Login screen
    "token",

    // other possible keys we might reuse
    "lc_user",
    "lc_token",
    "lc_admin",
    "LC_DRIVER_TOKEN",
    "driverToken",
  ];

  for (const key of tokenKeys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      console.log("[BusScanner] found something in AsyncStorage key =", key);

      const trimmed = String(raw).trim();

      // JSON stored: { token: "...", role: "COMMUTER" }
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmed);
          const candidate =
            obj.token || obj.jwt || obj.accessToken || obj.authToken;
          if (candidate) {
            console.log(
              "[BusScanner] using token from JSON under key =",
              key
            );
            return candidate;
          }
        } catch (err) {
          console.log(
            "[BusScanner] failed to parse JSON for key",
            key,
            err
          );
        }
      } else {
        // plain string token
        console.log("[BusScanner] using raw token under key =", key);
        return trimmed;
      }
    } catch (err) {
      console.log("[BusScanner] error reading key", key, err);
    }
  }

  return null;
}

/* --------- helper: make route pretty like "SBT — Santander / Lilo-an Port — SBT" --------- */
function prettyRouteLabel(forward, back, rawLabel) {
  // If backend already gave a nice label, use it
  if (rawLabel && String(rawLabel).trim()) return String(rawLabel).trim();

  const f = forward ? String(forward).trim() : "";
  const r = back ? String(back).trim() : "";

  if (!f && !r) return "—";
  if (f && !r) return f;
  if (!f && r) return r;

  // Try to split on "→" first (your bus routes use this)
  const splitSegment = (seg) => {
    if (!seg) return [];
    if (seg.includes("→")) {
      return seg.split("→").map((s) => s.trim());
    }
    if (seg.includes("-")) {
      return seg.split("-").map((s) => s.trim());
    }
    return [seg.trim()];
  };

  const fParts = splitSegment(f); // e.g. ["SBT", "Santander / Lilo-an Port"]
  const rParts = splitSegment(r); // e.g. ["Santander / Lilo-an Port", "SBT"]

  if (fParts.length >= 2 && rParts.length >= 2) {
    const start = fParts[0];
    const mid = fParts[fParts.length - 1];
    const end = rParts[rParts.length - 1];

    if (start && mid && end) {
      // If it’s a loop (SBT at both ends) this becomes: SBT — Santander / Lilo-an Port — SBT
      return `${start} — ${mid} — ${end}`;
    }
  }

  // Fallback: just show forward — return raw
  return `${f} — ${r}`;
}

export default function BusScanner({ navigation }) {
  const insets = useSafeAreaInsets();

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

  /** Close screen */
  const closeAndBack = useCallback(() => {
    setInfoOpen(false);
    setDriver(null);
    resetScan();
    navigation.goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------- HELPERS -------------- */

  const corridorLabel = (c) => {
    if (!c) return "—";
    const up = String(c).toUpperCase();
    if (up === "EAST") return "EAST (via Oslob)";
    if (up === "WEST") return "WEST (via Barili)";
    return c;
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

    const routeLabel =
      out.routeLabel ??
      out.bus?.routeLabel ??
      out.bus?.route ??
      out.route ??
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
      routeLabel, // 🔹 keep raw route label if backend provides it

      status,
      onDuty: !!onDuty,

      scannedAt: new Date(),
    };
  };

  /** MAIN HANDLER FOR SCANNED PAYLOAD (BUS QR) */
  const handlePayload = async (data) => {
    try {
      console.log("[BusScanner] scanned data =", data);

      // Decode QR payload. For bus QR we expect JSON from backend.
      let parsed = null;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        parsed = data;
      }

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
        body: JSON.stringify({ payload: parsed }),
      });

      const out = await res.json().catch(() => ({}));
      setLoadingLookup(false);

      if (!res.ok) {
        console.log("[BusScanner] API ERROR:", out);
        throw new Error(out?.message || "Invalid QR code");
      }

      const obj = normalizeDriverFromApi(out);
      console.log("[BusScanner] Driver+Bus from API:", obj);

      setDriver(obj);
      setInfoOpen(true);
    } catch (err) {
      console.error("[BusScanner] handlePayload ERROR:", err);
      setError(err.message || "Scan failed. Try again.");

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

  // 🔹 Use same style as drivers page: SBT — Santander / Lilo-an Port — SBT
  const routeLine = useMemo(() => {
    if (!driver) return "—";
    return prettyRouteLabel(
      driver.forwardRoute,
      driver.returnRoute,
      driver.routeLabel
    );
  }, [driver]);

  /** =============================
   *   PERMISSION / LOADING STATES
   *  ============================= */

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
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={s.avatarCircle}>
                  <MaterialCommunityIcons
                    name="account"
                    size={22}
                    color={C.brand}
                  />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  {/* Name + status pill on the same row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Text style={s.infoTitle}>
                      {driver?.name ?? "Unknown Driver"}
                    </Text>
                    <View
                      style={[
                        s.statusPill,
                        {
                          marginLeft: 8,
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

                  {!!timeText && <Text style={s.infoSub}>{timeText}</Text>}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setInfoOpen(false);
                  resetScan();
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
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

            {/* Start Tracking button */}
            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 14 }]}
              onPress={() => {
                setInfoOpen(false);
                navigation.navigate("MapTracking", {
                  driver,
                  busNumber: driver?.busNumber,
                  plateNumber: driver?.plateNumber,
                });
              }}
            >
              <Text style={s.primaryBtnTxt}>Start Tracking</Text>
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
  topTitle: { fontWeight: "700", fontSize: 14, color: C.text },

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
  secondaryBtnTxt: { color: C.brand, fontSize: 13, fontWeight: "700" },

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
  infoTitle: { fontWeight: "700", fontSize: 15, color: C.text },
  infoSub: { color: C.sub, fontSize: 11, marginTop: 2 },

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
  badgeTxt: { fontSize: 11, fontWeight: "700" },

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
  },

  sectionTitle: { fontSize: 12, fontWeight: "700", color: C.text },

  label: { fontSize: 11, color: C.sub, marginTop: 2 },
  value: { fontSize: 13, fontWeight: "600", color: C.text, marginTop: 2 },

  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  hint: { color: C.hint, fontSize: 13, marginTop: 4 },
});
