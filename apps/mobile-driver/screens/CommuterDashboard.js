import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CommuterDashboard() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Commuter Dashboard</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0F1B2B", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
