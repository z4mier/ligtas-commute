// components/DriverInfoModal.js
import React, { useMemo } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
  dim: "rgba(0,0,0,0.45)",
  card: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  border: "#E5E7EB",
  btn: "#111827",
};

function fmtDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return String(d || ""); }
}

export default function DriverInfoModal({ open, details, onProceed, onClose, onRescan }) {
  const scannedAt = useMemo(() => fmtDate(details?.scannedAt), [details]);

  return (
    <Modal visible={open} animationType="fade" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* header */}
          <View style={s.header}>
            <Text style={s.title}>Driver Information</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <Text style={s.scanned}>Scanned on {scannedAt}</Text>

          {/* info box */}
          <View style={s.infoBox}>
            <View style={s.row}>
              <Text style={s.label}> {details?.fullName || "—"} </Text>
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{details?.driverId || "—"}</Text>
              </View>
            </View>

            <View style={s.kv}>
              <Text style={s.k}>Vehicle Type</Text>
              <Text style={s.v}>{details?.vehicleType || "—"}</Text>
            </View>

            <View style={s.kv}>
              <Text style={s.k}>Bus Number</Text>
              <Text style={s.v}>{details?.busNumber || "—"}</Text>
            </View>

            <View style={[s.kv, { marginBottom: 0 }]}>
              <Text style={s.k}>Route</Text>
              <Text style={s.v}>{details?.route || "—"}</Text>
            </View>
          </View>

          {/* actions */}
          <TouchableOpacity style={s.primary} onPress={onProceed} activeOpacity={0.9}>
            <Text style={s.primaryTxt}>Proceed</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onRescan} style={s.rescan}>
            <Text style={s.rescanTxt}>Scan another QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.dim, alignItems: "center", justifyContent: "center", padding: 14 },
  card: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: C.card,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 14.5, fontWeight: "700", color: C.text },
  scanned: { color: C.sub, fontSize: 12, marginTop: 4, marginBottom: 10 },

  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 14,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "700", color: C.text },
  badge: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTxt: { fontSize: 11, color: C.text, fontWeight: "700" },
  kv: { marginBottom: 10 },
  k: { fontSize: 12, color: C.sub, marginBottom: 2 },
  v: { fontSize: 13.5, color: C.text, fontWeight: "600" },

  primary: { backgroundColor: C.btn, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rescan: { alignItems: "center", marginTop: 10 },
  rescanTxt: { color: C.sub, fontSize: 12 },
});
