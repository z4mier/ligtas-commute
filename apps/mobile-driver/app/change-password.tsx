import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) || "http://192.168.245.171:4000";

const C = {
  bg: "#0F1B2B",
  card: "#14243A",
  border: "#2A3B52",
  text: "#EAF2F8",
  sub: "#B8C7D4",
  accent: "#2078A7",
};

export default function ChangePassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [currentPassword, setCurrent] = useState("driver123");
  const [newPassword, setNew] = useState("");

  async function submit() {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");
      Alert.alert("Success", "Password updated");
      router.replace("/driver-dashboard");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 18 }}>
      <Text style={{ color: C.text, fontSize: 20, marginBottom: 12, fontFamily: "Poppins_700Bold" }}>
        Set a new password
      </Text>

      <View style={{ backgroundColor: C.card, padding: 16, borderRadius: 14 }}>
        <Text style={{ color: "#CDD9E3", fontSize: 12, marginBottom: 6, fontFamily: "Poppins_600SemiBold" }}>
          Current Password
        </Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#7A8792" />
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={C.sub}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrent}
          />
        </View>

        <Text style={{ color: "#CDD9E3", fontSize: 12, marginTop: 14, marginBottom: 6, fontFamily: "Poppins_600SemiBold" }}>
          New Password
        </Text>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons name="lock-check-outline" size={20} color="#7A8792" />
          <TextInput
            style={styles.input}
            placeholder="New password (min 6)"
            placeholderTextColor={C.sub}
            secureTextEntry
            value={newPassword}
            onChangeText={setNew}
          />
        </View>

        <Pressable style={styles.btn} onPress={submit}>
          <Text style={{ color: "#fff", fontFamily: "Poppins_600SemiBold" }}>Update Password</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#2A3B52",
    backgroundColor: "#0F1B2B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, color: "#EAF2F8", paddingVertical: 8, fontFamily: "Poppins_400Regular" },
  btn: {
    marginTop: 16,
    backgroundColor: "#2078A7",
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
