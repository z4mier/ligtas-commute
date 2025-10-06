import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

export default function CommuterDashboard() {
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [safetyData] = useState([]);
  const [communityData] = useState([]);

  useEffect(() => {
    // Example API logic here
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <MaterialCommunityIcons name="shield-check" size={22} color="#111827" />
          <Text style={s.headerTitle}>LigtasCommute</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContainer}
      >
        {/* 🟠 Safety Insights */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={20}
                color="#FF5C5C"
                style={{ marginRight: 6 }}
              />
              <Text style={s.cardTitle}>Safety Insights</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {safetyData.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No recent safety alerts</Text>
            </View>
          ) : (
            safetyData.map((item) => (
              <View key={item.id} style={s.alertBox}>
                <Text style={s.alertMessage}>{item.message}</Text>
                <Text style={s.alertTime}>{item.time}</Text>
              </View>
            ))
          )}
        </View>

        {/* 👥 Community Section */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={20}
                color="#111827"
                style={{ marginRight: 6 }}
              />
              <Text style={s.cardTitle}>Community</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={s.buttonRow}>
            <TouchableOpacity style={s.yellowBtn}>
              <Text style={s.btnTextDark}>Rate Your Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.redBtn}>
              <Text style={s.btnTextLight}>Report Incident</Text>
            </TouchableOpacity>
          </View>

          {communityData.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No recent community activities</Text>
            </View>
          ) : (
            communityData.map((item) => (
              <View key={item.id} style={s.communityItem}>
                <View>
                  <Text style={s.communityName}>{item.name}</Text>
                  <Text style={s.communityBus}>{item.bus}</Text>
                </View>
                <View style={s.rating}>
                  <MaterialCommunityIcons
                    name="star"
                    color="#FFD700"
                    size={18}
                  />
                  <Text style={s.ratingText}>{item.rating}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ⚫ Bottom Navigation */}
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem}>
          <MaterialCommunityIcons name="home" size={22} color="#111827" />
          <Text style={[s.navText, s.activeNavText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem}>
          <MaterialCommunityIcons name="qrcode-scan" size={22} color="#6B7280" />
          <Text style={s.navText}>QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navItem}
          onPress={() => navigation.navigate("Settings")} // ✅ GO TO SETTINGS
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color="#6B7280" />
          <Text style={s.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 🎨 Styles
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#111827",
    marginLeft: 6,
  },

  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#111827",
  },
  viewAll: {
    color: "#555",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  alertBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  alertMessage: {
    fontFamily: "Poppins_400Regular",
    color: "#111827",
    fontSize: 13.5,
  },
  alertTime: {
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },

  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    fontSize: 13.5,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  yellowBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 6,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  redBtn: {
    backgroundColor: "#FF5C5C",
    borderRadius: 6,
    paddingVertical: 8,
    flex: 1,
    alignItems: "center",
  },
  btnTextDark: {
    fontFamily: "Poppins_600SemiBold",
    color: "#000",
    fontSize: 13,
  },
  btnTextLight: {
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
    fontSize: 13,
  },

  communityItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  communityName: {
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    fontSize: 13.5,
  },
  communityBus: {
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    fontSize: 12,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 3,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    fontSize: 13,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#D1D5DB",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  activeNavText: {
    color: "#111827",
  },
});
