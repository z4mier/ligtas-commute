// components/ScanDriverQRModal.js
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import HybridQRScanner from "./HybridQRScanner"; // ✅ hybrid scanner for web + mobile

const C = {
  dim: "rgba(0,0,0,0.45)",
  card: "#FFFFFF",
  text: "#111827",
  hint: "#6B7280",
  border: "#E5E7EB",
};

export default function ScanDriverQRModal({
  open,
  hasPerm,
  onClose,
  onScan,
  disabled,
}) {
  async function requestAgain() {
    try {
      // Only relevant on mobile
      if (Platform.OS !== "web") {
        const { BarCodeScanner } = require("expo-barcode-scanner");
        await BarCodeScanner.requestPermissionsAsync();
      }
    } catch (e) {
      console.warn("Permission request failed", e);
    }
  }

  return (
    <Modal visible={open} animationType="fade" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* ===== Header ===== */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Scan Driver QR Code</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* ===== Scanner Area ===== */}
          <View style={s.scanWrap}>
            {/* If permission denied (mobile only) */}
            {Platform.OS !== "web" && hasPerm === false ? (
              <View style={[s.frame, s.center]}>
                <Text style={s.permTxt}>Camera permission is required.</Text>

                <TouchableOpacity
                  onPress={requestAgain}
                  style={s.permBtn}
                  activeOpacity={0.9}
                >
                  <Text style={s.permBtnTxt}>Allow Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => Linking.openSettings()}>
                  <Text style={s.settingsTxt}>Open device Settings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ✅ Use hybrid scanner (mobile or web)
              <HybridQRScanner onScan={onScan} disabled={disabled} />
            )}
          </View>

          <Text style={s.hint}>
            Position the QR code within the frame to scan
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.dim,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  card: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: C.card,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 14.5, fontWeight: "700", color: C.text },
  scanWrap: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  hint: { textAlign: "center", color: C.hint, fontSize: 12, marginTop: 6 },
  permTxt: { color: C.hint, fontSize: 12, marginBottom: 8 },
  permBtn: {
    marginTop: 2,
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  permBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  settingsTxt: {
    marginTop: 8,
    color: C.hint,
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
