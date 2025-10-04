import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";

const API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) || "http://192.168.245.171:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");

      // Save token in local storage if you want persistent sessions later
      // await AsyncStorage.setItem("token", data.token);

      if (data.mustChangePassword === true) {
        // send them to change-password page, pass token
        router.replace({
          pathname: "/change-password",
          params: { token: data.token },
        });
        return;
      }

      if (data.role === "DRIVER") {
        router.replace("/driver-dashboard");
      } else if (data.role === "COMMUTER") {
        router.replace("/commuter-dashboard");
      } else {
        throw new Error("Not a driver/commuter account");
      }
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert("Login Failed", err.message);
      } else {
        Alert.alert("Login Failed", String(err));
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚍 Driver / Commuter Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
});
