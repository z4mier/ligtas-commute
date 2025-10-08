// screens/QRScanner.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "../constants/config";

// UI
import ScanDriverQRModal from "../components/ScanDriverQRModal";
import DriverInfoModal from "../components/DriverInfoModal";

const C = {
  bg: "#F3F4F6",
  text: "#111827",
  hint: "#6B7280",
  card: "#FFFFFF",
  border: "#E5E7EB",
  brand: "#0F172A",
};

export default function QRScanner({ navigation }) {
  const [hasPerm, setHasPerm] = useState(null);
  const [scanOpen, setScanOpen] = useState(true);
  const [driver, setDriver] = useState(null);
  const [scanned, setScanned] = useState(false);

  // ask for camera permission when screen focuses
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        if (mounted) setHasPerm(status === "granted");
      })();
      return () => { mounted = false; };
    }, [])
  );

  // Handle QR payload -> fetch driver
  const onScan = useCallback(async (payload) => {
    if (scanned) return;
    setScanned(true);
    try {
      // Accept either a JSON payload or a plain code (e.g., "DRV-12345")
      let code = payload?.data || "";
      try {
        const parsed = JSON.parse(code);
        if (parsed && parsed.type === "driver" && parsed.id) code = parsed.id;
      } catch { /* not JSON, keep raw */ }

      // token is optional; include if your API needs it
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`${API_URL}/drivers/lookup?code=${encodeURIComponent(code)}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) {
        throw new Error(`Lookup failed (${res.status})`);
      }
      const info = await res.json();

      // Shape the details used by the modal (fallbacks to keep it robust)
      setDriver({
        scannedAt: new Date(),
        fullName: info?.fullName || info?.name || "Unknown Driver",
        driverId: info?.driverId || info?.code || code,
        vehicleType: info?.vehicleType || "—",
        busNumber: info?.busNumber || info?.busNo || "—",
        route: info?.route || [info?.origin, info?.destination].filter(Boolean).join(" - ") || "—",
      });
      setScanOpen(false);
    } catch (e) {
      Alert.alert("QR Error", e.message || "Could not read the driver information.");
      // allow another scan
      setScanned(false);
    }
  }, [scanned]);

  const closeAll = () => {
    setScanOpen(false);
    setDriver(null);
    setScanned(false);
    navigation.goBack();
  };

  const restartScan = () => {
    setDriver(null);
    setScanOpen(true);
    setScanned(false);
  };

  // Basic screen wrapper (keeps status bar nice behind modals)
  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {/* Top bar with back */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={closeAll} style={s.backBtn} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Scan Driver</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Modals */}
      <ScanDriverQRModal
        open={scanOpen}
        hasPerm={hasPerm}
        onClose={closeAll}
        onScan={onScan}
        disabled={scanned}
      />

      <DriverInfoModal
        open={!!driver}
        details={driver}
        onProceed={() => {
          // TODO: navigate to next flow (e.g., Rate / Report / Live Trip)
          closeAll();
        }}
        onClose={closeAll}
        onRescan={restartScan}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 8 : 10,
    paddingBottom: 8,
  },
  backBtn: {
    width: 26, height: 26, alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16, color: C.text, fontWeight: "700" },
});
