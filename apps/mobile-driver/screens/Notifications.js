// screens/Notifications.js
import React, { useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
};

export default function Notifications({ route, navigation }) {
  const initial = Array.isArray(route.params?.items) ? route.params.items : [];
  const [items, setItems] = useState(initial);

  // ✅ Remove default stack header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <View style={s.screen}>
      {/* Custom Header */}
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={C.text} />
          </TouchableOpacity>
          <Text style={s.title}>All Notifications</Text>
        </View>

        <TouchableOpacity onPress={markAllRead} style={{ paddingHorizontal: 6 }}>
          <Text style={s.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={s.scroll}>
        {items.length === 0 ? (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="bell-off-outline" size={32} color={C.hint} />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptySub}>{"You're all set — nothing new right now."}</Text>
          </View>
        ) : (
          items.map(n => (
            <View key={String(n.id)} style={s.card}>
              <Text style={s.cardTitle}>{n.title}</Text>
              {!!n.body && <Text style={s.cardBody}>{n.body}</Text>}
              {!!n.timeAgo && <Text style={s.cardTime}>{n.timeAgo}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 12 : 18,
    paddingBottom: 8,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 16,
    marginLeft: 4,
  },
  markAll: {
    color: C.brand,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },

  scroll: { padding: 12, paddingBottom: 40 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 13 },
  cardBody: { fontFamily: "Poppins_400Regular", color: C.sub, fontSize: 11.5, marginTop: 2 },
  cardTime: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 6 },

  emptyWrap: { alignItems: "center", paddingTop: 40, gap: 6 },
  emptyTitle: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 14 },
  emptySub: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 12, textAlign: "center" },
});
