// apps/mobile/App.js
import "./i18n/i18n";

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import OtpVerifyScreen from "./screens/OtpVerifyScreen";
import DriverDashboard from "./screens/DriverDashboard";
import CommuterDashboard from "./screens/CommuterDashboard";
import SettingsScreen from "./screens/SettingsScreen";
import QRScanner from "./screens/QRScanner";
import Notifications from "./screens/Notifications";
import SafetyInsightsList from "./screens/SafetyInsightsList";
import CommunityList from "./screens/CommunityList";
import MapTracking from "./screens/MapTracking";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
            <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="QRScanner" component={QRScanner} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="SafetyInsightsList" component={SafetyInsightsList} />
            <Stack.Screen name="CommunityList" component={CommunityList} />
            <Stack.Screen name="MapTracking" component={MapTracking}/>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
