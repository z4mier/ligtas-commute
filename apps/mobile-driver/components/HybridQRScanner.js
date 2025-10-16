import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function HybridQRScanner({ onScan, disabled }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [QrReader, setQrReader] = useState(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const lastRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === "granted");
      })();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    (async () => {
      try {
        const mod = await import("react-qr-scanner");
        if (mod.default) setQrReader(() => mod.default);
      } catch (_) {
        setError("Unable to load web QR library");
      }
    })();
  }, []);

  const handleScan = useCallback(
    (res) => {
      const text = res && (res.text || res.data || res);
      if (!text || disabled) return;
      if (text !== lastRef.current) {
        lastRef.current = text;
        onScan?.({ data: text });
      }
    },
    [disabled, onScan]
  );

  if (Platform.OS === "web") {
    if (!QrReader) {
      return (
        <View style={[s.frame, s.center]}>
          <Text style={s.msg}>{error || "Loading camera..."}</Text>
        </View>
      );
    }
    return (
      <View style={s.frame}>
        {!active ? (
          <View style={[s.center, { flex: 1 }]}>
            <TouchableOpacity style={s.btn} onPress={() => setActive(true)}>
              <Text style={s.btnTxt}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <QrReader
            delay={300}
            style={{ width: "100%", height: "100%" }}
            onScan={handleScan}
            onError={(_) => setError("Camera error")}
          />
        )}
      </View>
    );
  }

  if (hasPermission === null)
    return (
      <View style={[s.frame, s.center]}>
        <Text style={s.msg}>Requesting camera permission...</Text>
      </View>
    );

  if (hasPermission === false)
    return (
      <View style={[s.frame, s.center]}>
        <Text style={s.msg}>No access to camera</Text>
      </View>
    );

  return (
    <View style={s.frame}>
      <BarCodeScanner
        onBarCodeScanned={disabled ? undefined : handleScan}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  center: { alignItems: "center", justifyContent: "center" },
  msg: { color: "#fff", fontSize: 13 },
  btn: {
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnTxt: { color: "#fff", fontWeight: "600" },
});
