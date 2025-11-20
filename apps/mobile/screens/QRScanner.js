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

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
  redDark: "#B91C1C",
};

const HEADER_H = 48;

export default function QRScanner({ navigation }) {
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

  /** Close modal and go back */
  const closeAndBack = useCallback(() => {
  setInfoOpen(false);
  setDriver(null);
  resetScan();
  navigation.goBack();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  /** ------------------------------
   *  NORMALIZATION HELPERS
   *  ------------------------------ */

  const normalizeBusType = (out) => {
    return (
      out.busType ??
      out.vehicleType ??
      out.bus?.type ??
      out.bus?.busType ??
      "—"
    );
  };

  /** Build driver object from API response */
  const normalizeDriverFromApi = (out) => {
    const driverProfileId =
      out.driverProfileId ??
      out.driverId ??
      out.id ??
      out.profileId ??
      null;

    const busId = out.busId ?? out.bus?.id ?? null;

    return {
      id: driverProfileId,
      driverProfileId,
      busId,

      name: out.name ?? out.fullName ?? "Unknown Driver",
      code:
        out.code ??
        out.driverCode ??
        out.driverId ??
        out.id ??
        "N/A",

      busNumber: out.busNumber ?? out.bus?.number ?? "—",
      plateNumber: out.plateNumber ?? out.bus?.plate ?? "—",

      busType: normalizeBusType(out),
      vehicleType: normalizeBusType(out),

      scannedAt: new Date(),
    };
  };

  /** Build driver object from JSON QR */
  const normalizeDriverFromJson = (parsed) => {
    const driverProfileId =
      parsed.driverProfileId ??
      parsed.driverId ??
      parsed.id ??
      null;

    const busId = parsed.busId ?? parsed.bus?.id ?? null;

    return {
      id: driverProfileId,
      driverProfileId,
      busId,

      name: parsed.name ?? "Unknown Driver",
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
      } catch {}

      // If QR contains embedded JSON (developer/test QR)
      if (parsed && (parsed.driverId || parsed.driverProfileId || parsed.name)) {
        const obj = normalizeDriverFromJson(parsed);
        console.log("[QRScanner] parsed embedded JSON:", obj);
        setDriver(obj);
        setInfoOpen(true);
        return;
      }

      /** Fallback: call API */
      setLoadingLookup(true);

      const token = await AsyncStorage.getItem("authToken");

      const res = await fetch(`${API_URL}/drivers/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ payload: data }),
      });

      const out = await res.json().catch(() => ({}));
      setLoadingLookup(false);

      if (!res.ok) {
        console.log("[QRScanner] API ERROR:", out);
        throw new Error(out?.message || "Invalid QR code");
      }

      const obj = normalizeDriverFromApi(out);
      console.log("[QRScanner] Driver from API:", obj);

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
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Scanned on ${date}, ${time}`;
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
      <View style={[s.topBar, { paddingTop: insets.top, height: HEADER_H + insets.top }]}>
        <TouchableOpacity style={s.iconBtn} onPress={closeAndBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Scan Driver QR</Text>
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
                <Text style={[s.hint, { marginTop: 8 }]}>Looking up driver…</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="qrcode-scan" size={34} color={C.hint} />
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

      {/* DRIVER INFO MODAL */}
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
            <View style={s.infoHeader}>
              <Text style={s.infoTitle}>Driver Information</Text>
              <TouchableOpacity onPress={() => setInfoOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            {!!timeText && <Text style={s.infoSub}>{timeText}</Text>}

            <View style={s.infoBox}>
              <View style={s.row}>
                <Text style={s.key}>{driver?.name ?? "—"}</Text>

                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{driver?.code ?? "—"}</Text>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={s.label}>Bus Number</Text>
                <Text style={s.value}>{driver?.busNumber ?? "—"}</Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={s.label}>Plate Number</Text>
                <Text style={s.value}>{driver?.plateNumber ?? "—"}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 14 }]}
              onPress={async () => {
                const normalized = {
                  ...driver,
                  driverProfileId:
                    driver?.driverProfileId ??
                    driver?.id ??
                    null,
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
              <Text style={s.primaryBtnTxt}>Proceed</Text>
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
  infoTitle: { fontWeight: "700", fontSize: 14, color: C.text },
  infoSub: { color: C.sub, fontSize: 12, marginTop: 4, marginBottom: 8 },

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

  key: { fontWeight: "700", color: C.text, fontSize: 13 },

  badge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  badgeTxt: { fontSize: 11, fontWeight: "700" },

  label: { fontSize: 11, color: C.sub },
  value: { fontSize: 12.5, fontWeight: "600", color: C.text },

  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
