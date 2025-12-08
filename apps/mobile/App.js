// apps/mobile/App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

// Auth
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import OtpVerifyScreen from "./screens/OtpVerifyScreen";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import RecentTrips from "./screens/RecentTrips";

// Driver
import DriverDashboard from "./screens/DriverDashboard";
import DriverSettingsScreen from "./screens/DriverSettingsScreen";
import DriverTracking from "./screens/DriverTracking";
import DriverRatings from "./screens/DriverRatings";
import DriverReports from "./screens/DriverReports";
import DriverTripHistory from "./screens/DriverTripHistory";

// Commuter
import CommuterDashboard from "./screens/CommuterDashboard";
import SettingsScreen from "./screens/SettingsScreen";
import Notifications from "./screens/Notifications";
import MapTracking from "./screens/MapTracking";

// Scanner + trip details
import BusScanner from "./screens/BusScanner";
import TripDetails from "./screens/TripDetails";

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
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            <Stack.Screen name="RecentTrips" component={RecentTrips} />
            <Stack.Screen name="BusScanner" component={BusScanner} />
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />

            <Stack.Screen
              name="DriverSettings"
              component={DriverSettingsScreen}
              options={{ headerShown: true, title: "Settings" }}
            />
            <Stack.Screen name="DriverTracking" component={DriverTracking} />
            <Stack.Screen name="DriverRatings" component={DriverRatings} />
            <Stack.Screen name="DriverReports" component={DriverReports} />
            <Stack.Screen
              name="DriverTripHistory"
              component={DriverTripHistory}
            />

            <Stack.Screen
              name="CommuterDashboard"
              component={CommuterDashboard}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="MapTracking" component={MapTracking} />

            <Stack.Screen
              name="TripDetails"
              component={TripDetails}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
