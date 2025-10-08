// components/HybridQRScanner.js
import React, { useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet, TouchableOpacity } from "react-native";

let QrReader;
if (Platform.OS === "web") {
  try {
    // react-qr-reader v3 exports { QrReader }
    QrReader = require("react-qr-reader").QrReader;
  } catch {}
}

import { BarCodeScanner } from "expo-barcode-scanner";

export default function HybridQRScanner({ onScan, disabled }) {
  // ---------- WEB ----------
  const [webActive, setWebActive] = useState(false);
  const [webError, setWebError] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [facing, setFacing] = useState("environment");

  const enableWebcam = async () => {
    if (Platform.OS !== "web") return;
    setWebError("");

    try {
      const tryOnce = (video) =>
        navigator.mediaDevices.getUserMedia({ video, audio: false });

      let stream;
      try {
        stream = await tryOnce({ facingMode: { exact: "environment" } });
        setFacing("environment");
      } catch {
        try {
          stream = await tryOnce({ facingMode: "environment" });
          setFacing("environment");
        } catch {
          try {
            stream = await tryOnce({ facingMode: "user" });
            setFacing("user");
          } catch {
            // last resort
            stream = await tryOnce(true);
            setFacing("user");
          }
        }
      }

      // list cameras
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      if (cams.length && !deviceId) setDeviceId(cams[0].deviceId);

      // we only probed; release the temporary stream
      stream.getTracks().forEach((t) => t.stop());

      setWebActive(true);
    } catch (err) {
      const n = err?.name || "";
      setWebActive(false);
      setWebError(
        n === "NotAllowedError"
          ? "Camera permission is blocked. Click the lock/camera icon near the address bar, set Camera to Allow, then reload."
          : n === "NotFoundError"
          ? "No camera device found."
          : n === "NotReadableError"
          ? "Camera is busy (used by another app). Close Zoom/Meet/etc and try again."
          : err?.message || "Unable to access the camera."
      );
    }
  };

  // ✅ NEW: auto-request camera on mount (web)
  useEffect(() => {
    if (Platform.OS === "web" && navigator.mediaDevices) {
      enableWebcam(); // this triggers the browser prompt and populates device list
    }
  }, []);

  // If permission is already granted (user previously allowed), keep your fast path
  useEffect(() => {
    if (Platform.OS === "web" && navigator.mediaDevices && !webActive) {
      navigator.permissions?.query({ name: "camera" }).then((res) => {
        if (res.state === "granted") setWebActive(true);
      }).catch(() => {});
    }
  }, [webActive]);

  if (Platform.OS === "web") {
    if (!webActive) {
      return (
        <View style={[styles.frame, styles.center]}>
          <Text style={styles.msg}>Click below to enable your webcam.</Text>
          <TouchableOpacity onPress={enableWebcam} style={styles.btn} activeOpacity={0.9}>
            <Text style={styles.btnTxt}>Enable Camera</Text>
          </TouchableOpacity>
          {!!webError && <Text style={[styles.err, { marginTop: 8 }]}>{webError}</Text>}
          <Text style={styles.tip}>
            If no prompt appears, click the lock/camera icon in the address bar and switch Camera to “Allow”, then reload.
            On iOS/Safari use HTTPS: <Text style={{ fontWeight: "700" }}>npx expo start --https</Text>.
          </Text>
        </View>
      );
    }

    if (!QrReader) {
      return (
        <View style={[styles.frame, styles.center]}>
          <Text style={styles.err}>Web QR scanner library didn’t load.</Text>
        </View>
      );
    }

    // Pass MediaTrackConstraints directly to react-qr-reader
    const constraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: facing };

    return (
      <View style={styles.webContainer}>
        {devices.length > 1 && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLbl}>Camera:</Text>
            {devices.map((d) => (
              <TouchableOpacity
                key={d.deviceId}
                onPress={() => setDeviceId(d.deviceId)}
                style={[
                  styles.switchBtn,
                  deviceId === d.deviceId && styles.switchBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.switchTxt,
                    deviceId === d.deviceId && styles.switchTxtActive,
                  ]}
                >
                  {d.label || "Camera"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <QrReader
          constraints={constraints}
          containerStyle={styles.webReaderContainer}
          videoStyle={styles.webReaderVideo}
          onResult={(result, error) => {
            if (result && !disabled) onScan({ data: result.text });
          }}
        />

        {!!webError && <Text style={[styles.err, { marginTop: 8 }]}>{webError}</Text>}
      </View>
    );
  }

  // ---------- MOBILE (Expo) ----------
  return (
    <View style={styles.mobileFrame}>
      <BarCodeScanner
        onBarCodeScanned={disabled ? undefined : onScan}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    padding: 12,
  },
  center: { alignItems: "center", justifyContent: "center" },
  msg: {
    color: "#111827",
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 8,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 6,
  },
  btn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  tip: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 6,
  },
  err: { color: "#b91c1c", fontSize: 12, textAlign: "center" },

  webContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  webReaderContainer: {
    width: "100%",
    height: 360,
    backgroundColor: "#000",
  },
  webReaderVideo: { width: "100%", height: "100%", objectFit: "cover" },

  mobileFrame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  switchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#11182710",
  },
  switchLbl: { color: "#111827", fontSize: 12, marginRight: 4 },
  switchBtn: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#e5e7eb",
  },
  switchBtnActive: { backgroundColor: "#111827" },
  switchTxt: { color: "#111827", fontSize: 12 },
  switchTxtActive: { color: "#fff", fontWeight: "700" },
});
