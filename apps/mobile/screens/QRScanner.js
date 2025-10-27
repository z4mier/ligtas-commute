// apps/mobile-driver/screens/QRScanner.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // Permissions via expo-camera
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = !!permission?.granted;
  const canAskAgain = !!permission?.canAskAgain;

  const [scanning, setScanning] = useState(true);
  const scanLock = useRef(false);

  const [driver, setDriver] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [error, setError] = useState("");

  // Ask once on mount if status is undetermined
  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const resetScan = useCallback(() => {
    scanLock.current = false;
    setScanning(true);
    setError("");
  }, []);

  const closeAndBack = useCallback(() => {
    setInfoOpen(false);
    setDriver(null);
    resetScan();
    navigation.goBack();
  }, [navigation, resetScan]);

  const handlePayload = async (data) => {
    try {
      // 1) Accept JSON embedded in QR
      let parsed = null;
      try {
        parsed = JSON.parse(String(data));
      } catch {}

      if (parsed && (parsed.driverId || parsed.name || parsed.code)) {
        const busType =
          parsed.busType ?? parsed.vehicleType ?? parsed.vehicle ?? "—";
        const obj = {
          name: parsed.name ?? "Unknown Driver",
          code: parsed.code ?? parsed.driverId ?? "N/A",
          busType,
          // backward-compat so any old screen using 'vehicleType' still works
          vehicleType: busType,
          busNumber: parsed.busNumber ?? parsed.bus ?? "—",
          plateNumber: parsed.plateNumber ?? parsed.plate ?? "—",
          scannedAt: new Date(),
        };
        setDriver(obj);
        setInfoOpen(true);
        return;
      }

      // 2) Ask API to resolve arbitrary payload
      setLoadingLookup(true);
      const res = await fetch(`${API_URL}/drivers/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: data }),
      });
      const out = await res.json().catch(() => ({}));
      setLoadingLookup(false);

      if (!res.ok) throw new Error(out?.message || "Driver not found for this QR.");

      const busType = out.busType ?? out.vehicleType ?? "—";
      const obj = {
        name: out.name ?? "Unknown Driver",
        code: out.code ?? "N/A",
        busType,
        // backward-compat alias
        vehicleType: busType,
        busNumber: out.busNumber ?? "—",
        plateNumber: out.plateNumber ?? out.plate ?? "—",
        scannedAt: new Date(),
      };
      setDriver(obj);
      setInfoOpen(true);
    } catch (e) {
      setError(e.message || "Scan failed. Try again.");
      // allow re-scan shortly after an error
      setTimeout(() => {
        scanLock.current = false;
        setScanning(true);
      }, 1500);
    } finally {
      setLoadingLookup(false);
    }
  };

  const onBarcodeScanned = ({ data /*, type*/ }) => {
    if (!scanning || scanLock.current || infoOpen) return;
    scanLock.current = true;
    setScanning(false);
    setError("");
    handlePayload(data);
  };

  const timeText = useMemo(() => {
    if (!driver?.scannedAt) return "";
    const d = driver.scannedAt;
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Scanned on ${date}, ${time}`;
  }, [driver]);

  // --- WEB FALLBACK ---
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={[s.screen, s.center]} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <MaterialCommunityIcons name="web" size={34} color={C.hint} />
        <Text style={[s.title, { marginTop: 8 }]}>QR Scanner not available on Web Dev</Text>
        <Text style={s.hint}>Use Expo Go on a real phone (or an emulator) to test the camera scanner.</Text>
        <TouchableOpacity style={[s.primaryBtn, { marginTop: 14 }]} onPress={() => navigation.goBack()}>
          <Text style={s.primaryBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={[s.screen, s.center]} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator />
        <Text style={s.hint}>Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={[s.screen, s.center]} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <MaterialCommunityIcons name="camera-off-outline" size={34} color={C.hint} />
        <Text style={[s.title, { marginTop: 8 }]}>Camera permission needed</Text>
        <Text style={s.hint}>Please enable camera access in your phone settings.</Text>

        {canAskAgain ? (
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 14 }]} onPress={requestPermission}>
            <Text style={s.primaryBtnTxt}>Request Again</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 14 }]} onPress={() => navigation.goBack()}>
            <Text style={s.primaryBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header (safe-area aware) */}
      <View
        style={[
          s.topBar,
          {
            paddingTop: insets.top,
            height: insets.top + HEADER_H,
          },
        ]}
      >
        <TouchableOpacity style={s.iconBtn} onPress={closeAndBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Scan Driver QR Code</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.cameraWrap}>
        {scanning ? (
          <CameraView
            style={s.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcodeScanned}
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
                <Text style={[s.hint, { marginTop: 8 }]}>{error ? error : "Hold on…"}</Text>
              </>
            )}
          </View>
        )}

        {/* Overlay */}
        <View pointerEvents="none" style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.overlayHint}>Position the QR code within the frame to scan</Text>
        </View>
      </View>

      <View style={[s.actionsRow, { paddingBottom: 14 + insets.bottom }]}>
        <TouchableOpacity style={s.secondaryBtn} onPress={resetScan}>
          <MaterialCommunityIcons name="reload" size={18} color={C.brand} />
          <Text style={s.secondaryBtnTxt}>Rescan</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Info Modal */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onShow={() => setScanning(false)} // pause scanning while modal is visible
        onRequestClose={() => {
          setInfoOpen(false);
          // allow rescan after closing
          setTimeout(() => {
            scanLock.current = false;
            setScanning(true);
          }, 200);
        }}
      >
        <View style={s.modalBg} />
        <View style={s.infoCardWrap} pointerEvents="box-none">
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

              {/* Row: Bus Type + Bus Number */}
              <View style={s.pair}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Bus Type</Text>
                  <Text style={s.value}>{driver?.busType ?? "—"}</Text>
                </View>
                <View style={{ width: 18 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Bus Number</Text>
                  <Text style={s.value}>{driver?.busNumber ?? "—"}</Text>
                </View>
              </View>

              {/* Row: Plate Number */}
              <View style={{ marginTop: 10 }}>
                <Text style={s.label}>Plate Number</Text>
                <Text style={s.value}>{driver?.plateNumber ?? "—"}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 14 }]}
              onPress={() => {
                setInfoOpen(false);
                // include busType and the old vehicleType alias for compatibility
                navigation.navigate("MapTracking", {
                  driver: {
                    ...driver,
                    vehicleType: driver?.busType ?? driver?.vehicleType ?? "—",
                  },
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
    backgroundColor: "#000",
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
    paddingBottom: 20,
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
  secondaryBtnTxt: { color: C.brand, fontWeight: "700", fontSize: 13 },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.18)" },
  infoCardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  infoCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoTitle: { fontWeight: "700", fontSize: 14, color: C.text },
  infoSub: { color: C.sub, fontSize: 12, marginBottom: 10 },

  infoBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  key: { fontWeight: "700", color: C.text, fontSize: 13 },
  badge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeTxt: { fontWeight: "700", fontSize: 11, color: C.text },

  pair: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  label: { color: C.sub, fontSize: 11, marginBottom: 4 },
  value: { color: C.text, fontSize: 12.5, fontWeight: "600" },

  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  title: { fontWeight: "700", fontSize: 14, color: C.text },
  hint: { color: C.hint, fontSize: 12, textAlign: "center", paddingHorizontal: 16 },
});
