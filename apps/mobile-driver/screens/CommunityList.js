import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const C = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  brand: "#0B132B",
  star: "#F59E0B",
};

export default function CommunityList({ navigation, route }) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const incoming = Array.isArray(route?.params?.items) ? route.params.items : [];
  const [items] = useState(incoming);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.9} style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{item?.name || "Commuter"}</Text>
        <Text style={s.rowSub}>{item?.bus || "—"}</Text>
      </View>
      {item?.stars > 0 ? (
        <View style={s.starWrap}>
          <MaterialCommunityIcons name="star" size={16} color={C.star} />
          <Text style={s.starTxt}>
            {item.stars?.toFixed ? item.stars.toFixed(1) : String(item.stars)}
          </Text>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.hint} />
      )}
    </TouchableOpacity>
  );

  const Empty = () => (
    <View style={s.empty}>
      <MaterialCommunityIcons name="account-multiple-outline" size={36} color={C.hint} />
      <Text style={s.emptyTitle}>No recent community activity</Text>
      <Text style={s.emptySub}>Ratings and reports will appear here when available.</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Community</Text>
        <View style={s.headerBtn} />
      </View>

      <FlatList
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        data={items}
        keyExtractor={(it, idx) => String(it?.id ?? idx)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Empty />}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "android" ? 6 : 10,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  headerBtn: { width: 44, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: C.text,
  },
  row: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: { fontFamily: "Poppins_600SemiBold", color: C.text, fontSize: 13 },
  rowSub: { fontFamily: "Poppins_400Regular", color: C.hint, fontSize: 11, marginTop: 2 },
  starWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  starTxt: { fontFamily: "Poppins_700Bold", color: C.text, fontSize: 12 },
  empty: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    color: C.text,
    fontSize: 13,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    color: C.hint,
    fontSize: 11,
    textAlign: "center",
  },
});
