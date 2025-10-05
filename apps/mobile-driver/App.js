import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./screens/LoginScreen";
import { Text } from "react-native";

function DriverDashboard() {
  return <Text style={{ marginTop: 50, textAlign: "center" }}>🚍 Welcome Driver!</Text>;
}
function CommuterDashboard() {
  return <Text style={{ marginTop: 50, textAlign: "center" }}>👤 Welcome Commuter!</Text>;
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
        <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}