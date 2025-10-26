// ErrorBoundary.js
import React from "react";
import { View, Text } from "react-native";

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.log("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "#0F1B2B",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            ⚠️ App crashed
          </Text>
          <Text style={{ color: "#fff" }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
