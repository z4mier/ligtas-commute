// apps/mobile/metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// ✅ Make Metro aware of the monorepo root (prevents duplicate module resolution issues)
config.watchFolders = [workspaceRoot];

// ✅ Prefer node_modules from THIS app first, then fallback to monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// ✅ Force SINGLE copies of react + react-native to avoid "Invalid hook call"
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),

  // 🧩 Keep your shim for react-native-worklets
  "react-native-worklets": path.resolve(
    projectRoot,
    "shims/react-native-worklets.js"
  ),
};

module.exports = config;
