import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

const API_URL = "http://192.168.245.171:4000"; // your LAN IP

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
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set a new password</Text>
      <TextInput
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrent}
        placeholder="Current password"
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNew}
        placeholder="New password (min 6)"
        secureTextEntry
      />
      <Button title="Update Password" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 12, borderRadius: 6 },
});
