import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular } from "@expo-google-fonts/poppins";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_700Bold,
    Poppins_600SemiBold,
    Poppins_400Regular,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return <View />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0F1B2B" },
        headerTintColor: "#EAF2F8",
        headerTitleStyle: { fontFamily: "Poppins_600SemiBold" },
        contentStyle: { backgroundColor: "#0F1B2B" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Login", headerShown: false }} />
      <Stack.Screen name="change-password" options={{ title: "Change Password" }} />
      <Stack.Screen name="driver-dashboard" options={{ title: "Driver" }} />
      <Stack.Screen name="commuter-dashboard" options={{ title: "Commuter" }} />
    </Stack>
  );
}
