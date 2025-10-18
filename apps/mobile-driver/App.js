import React, { useMemo } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { I18nProvider } from "./i18n/i18n";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import OtpVerifyScreen from "./screens/OtpVerifyScreen";
import DriverDashboard from "./screens/DriverDashboard";
import CommuterDashboard from "./screens/CommuterDashboard";
import SettingsScreen from "./screens/SettingsScreen";
import Notifications from "./screens/Notifications";
import SafetyInsightsList from "./screens/SafetyInsightsList";
import CommunityList from "./screens/CommunityList";

enableScreens(true);
const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { mode, theme } = useTheme();

  const navTheme = useMemo(
    () => ({
      dark: mode === "dark",
      colors: {
        primary: theme.brand,
        background: theme.page,
        card: theme.card,
        text: theme.text,
        border: theme.border,
        notification: theme.yellow,
      },
    }),
    [mode, theme]
  );

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <NavigationContainer theme={navTheme} onReady={() => {}} onStateChange={() => { if (Platform.OS === "web") {} }}>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
          <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="SafetyInsightsList" component={SafetyInsightsList} />
          <Stack.Screen name="CommunityList" component={CommunityList} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
