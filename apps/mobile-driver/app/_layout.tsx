import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
<Stack.Screen name="change-password" options={{ title: "Change Password" }} />
<Stack.Screen name="driver-dashboard" options={{ title: "Driver" }} />
<Stack.Screen name="commuter-dashboard" options={{ title: "Commuter" }} />

    </Stack>
  );
}
