// metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// 🧩 Tell Metro to redirect imports for "react-native-worklets"
// to your shim file inside /shims
config.resolver.extraNodeModules = {
  ...(config.resolver?.extraNodeModules || {}),
  "react-native-worklets": path.resolve(
    __dirname,
    "shims/react-native-worklets.js"
  ),
};

module.exports = config;
