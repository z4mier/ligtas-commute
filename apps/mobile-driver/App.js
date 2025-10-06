// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import DriverDashboard from "./screens/DriverDashboard";
import CommuterDashboard from "./screens/CommuterDashboard";
import OtpVerifyScreen from "./screens/OtpVerifyScreen";
import SettingsScreen from "./screens/SettingsScreen"; // <-- add this

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        {/* Auth flow (dark) */}
        <Stack.Group screenOptions={{ contentStyle: { backgroundColor: "#0F172A" } }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
        </Stack.Group>

        {/* App flow (light) */}
        <Stack.Group screenOptions={{ contentStyle: { backgroundColor: "#F3F4F6" } }}>
          <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
          <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
