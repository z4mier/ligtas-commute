import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notify from "../lib/notify";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
};

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export default function Notifications({ navigation }) {
  const [items, setItems] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await Notify.load();
      if (mounted) setItems(list);
    })();
    const unsub = Notify.onChange(async () => setItems(await Notify.load()));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const markAllRead = async () => {
    const updated = await Notify.markAllRead();
    setItems(updated);
  };

  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 6 }}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color={C.text}
            />
          </TouchableOpacity>
          <Text style={s.title}>Notifications</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} style={{ paddingHorizontal: 6 }}>
          <Text style={s.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {items.length === 0 ? (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons
              name="bell-off-outline"
              size={30}
              color={C.hint}
            />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptySub}>
              {"You're all caught up. We'll notify you here."}
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <View key={String(n.id)} style={s.card}>
              <Text style={s.cardTitle}>{n.title}</Text>
              {!!n.body && <Text style={s.cardBody}>{n.body}</Text>}
              <Text style={s.cardTime}>{timeAgo(n.timestamp)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 10 : 16,
    paddingBottom: 6,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 12,
    marginLeft: 4,
  },
  markAll: {
    color: C.brand,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  scroll: { padding: 10, paddingBottom: 32 },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 12,
  },
  cardBody: {
    fontFamily: "Poppins_400Regular",
    color: C.sub,
    fontSize: 11,
    marginTop: 2,
  },
  cardTime: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 10,
    marginTop: 6,
  },
  emptyWrap: { alignItems: "center", paddingTop: 32, gap: 6 },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 12,
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 11,
    textAlign: "center",
  },
});
