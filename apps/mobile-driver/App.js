// App.js
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

// Better perf for native + web
enableScreens(true);

// === Screens ===
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OtpVerifyScreen from './screens/OtpVerifyScreen';
import DriverDashboard from './screens/DriverDashboard';
import CommuterDashboard from './screens/CommuterDashboard';
import SettingsScreen from './screens/SettingsScreen';
import QRScanner from './screens/QRScanner';

// Optional: dark-ish background so you see something immediately
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#0F1B2B' },
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={theme}
          onReady={() => console.log('Navigation ready')}
          onStateChange={() => {
            if (Platform.OS === 'web') console.log('Nav state changed');
          }}
        >
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            {/* ===== Auth ===== */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />

            {/* ===== Dashboards ===== */}
            <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
            <Stack.Screen name="CommuterDashboard" component={CommuterDashboard} />

            {/* ===== Settings ===== */}
            <Stack.Screen name="Settings" component={SettingsScreen} />

            {/* ===== QR Scanner ===== */}
            <Stack.Screen name="QRScanner" component={QRScanner} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
