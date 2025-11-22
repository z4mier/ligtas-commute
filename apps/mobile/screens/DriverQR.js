// apps/mobile/screens/DriverQR.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { API_URL } from "../constants/config";

/* ---------- Colors (match dashboard) ---------- */
const C = {
  bgOverlay: "rgba(15,23,42,0.85)",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  brand: "#0B132B",
};

function pick(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export default function DriverQR({ navigation, onClose }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [driverName, setDriverName] = useState("Driver");
  const [error, setError] = useState("");

  const loadQR = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token =
        (await AsyncStorage.getItem("driverToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        setError("Not logged in.");
        setLoading(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${API_URL}/users/me`, { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.log("[DriverQR] /users/me error:", json);
        setError(json.message || "Unable to load profile.");
        setLoading(false);
        return;
      }

      const data = json?.data ?? json;
      console.log("[DriverQR] /users/me data:", JSON.stringify(data, null, 2));

      const driverObj = data.driver ?? {};
      const fullName =
        pick(data, ["fullName", "name"]) ||
        pick(driverObj, ["fullName", "name"]) ||
        "Driver";
      setDriverName(fullName);

      const rawQr =
        pick(driverObj, ["qrUrl", "qrCodeUrl", "qrCodeImage"]) ||
        pick(data, ["driverQrUrl", "qrUrl", "qrCodeUrl", "qrCodeImage"]);

      console.log("[DriverQR] raw QR value:", rawQr);

      if (!rawQr) {
        setError("QR code not found. Please contact your admin.");
        setQrUrl(null);
      } else {
        let finalQr = rawQr;
        if (typeof rawQr === "string" && !/^https?:\/\//i.test(rawQr)) {
          const base = API_URL.replace(/\/api\/?$/i, "");
          const path = rawQr.startsWith("/") ? rawQr : `/${rawQr}`;
          finalQr = `${base}${path}`;
        }

        console.log("[DriverQR] final QR URL:", finalQr);
        setQrUrl(finalQr);
      }
    } catch (e) {
      console.log("[DriverQR] load error", e);
      setError("Something went wrong. Please try again.");
      setQrUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQR();
  }, [loadQR]);

  const handleDownload = useCallback(async () => {
    if (!qrUrl) return;

    try {
      setSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo access to save your QR code."
        );
        setSaving(false);
        return;
      }

      const baseDir =
        (FileSystem || {})["documentDirectory"] ||
        (FileSystem || {})["cacheDirectory"];

      if (!baseDir) {
        Alert.alert("Error", "Storage directory not available.");
        setSaving(false);
        return;
      }

      const fileName = `ligtascommute-driver-qr-${Date.now()}.png`;
      const fileUri = baseDir + fileName;

      const downloadRes = await FileSystem.downloadAsync(qrUrl, fileUri);
      if (downloadRes.status !== 200) {
        throw new Error("Download failed");
      }

      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      Alert.alert("Saved", "QR code saved to your photos.");
    } catch (e) {
      console.log("[DriverQR] download error", e);
      Alert.alert("Error", "Could not save QR code. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [qrUrl]);

  if (!fontsLoaded || (loading && !qrUrl && !error)) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StatusBar style="light" />
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  const closeHandler = () => {
    if (typeof onClose === "function") onClose();
    else navigation?.goBack?.();
  };

  return (
    <SafeAreaView style={styles.overlay}>
      <StatusBar style="light" />

      {/* "Modal" card */}
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color={C.brand}
              />
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.title}>My QR Code</Text>
              <Text style={styles.subtitle}>Show this before boarding.</Text>
            </View>
          </View>

          <TouchableOpacity onPress={closeHandler} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Driver name */}
        <Text style={styles.driverName}>{driverName}</Text>

        {/* QR Code area */}
        <View style={styles.qrWrap}>
          {qrUrl ? (
            <Image source={{ uri: qrUrl }} style={styles.qrImage} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <MaterialCommunityIcons
                name="qrcode-off"
                size={32}
                color={C.sub}
              />
              <Text style={styles.placeholderText}>
                {error || "QR code not available.\nPlease contact your admin."}
              </Text>
            </View>
          )}
        </View>

        {/* Error (if any but QR still null) */}
        {error && !qrUrl ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={loadQR}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.brand} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="reload"
                  size={16}
                  color={C.brand}
                />
                <Text style={styles.secondaryText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.primaryBtn,
              (!qrUrl || saving) && { opacity: 0.7 },
            ]}
            onPress={handleDownload}
            disabled={!qrUrl || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="download"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>
          Generated by admin and linked to your driver account.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.bgOverlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: C.bgOverlay,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: C.text,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  driverName: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: C.text,
  },
  qrWrap: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 18,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  placeholderText: {
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: C.sub,
  },
  errorText: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#DC2626",
  },
  btnRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtn: {
    backgroundColor: C.brand,
  },
  primaryText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: "#F3F4F6",
  },
  secondaryText: {
    fontFamily: "Poppins_600SemiBold",
    color: C.brand,
    fontSize: 13,
  },
  hintText: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: C.sub,
  },
});
