// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import DriverDashboard from "./screens/DriverDashboard";
import CommuterDashboard from "./screens/CommuterDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0F1B2B" }, // dark bg everywhere
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
        <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
