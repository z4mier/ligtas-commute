import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:4000";
// ⚠️ Replace with your LAN IP so mobile can reach backend

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Login failed");

      if (data.role === "DRIVER") {
        navigation.replace("DriverDashboard");
      } else if (data.role === "COMMUTER") {
        navigation.replace("CommuterDashboard");
      } else {
        Alert.alert("Error", "Not a driver or commuter account.");
      }
    } catch (err) {
      Alert.alert("Login Failed", err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver / Commuter Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
});
