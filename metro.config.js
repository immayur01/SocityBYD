const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-keyboard-controller") {
    if (process.env.EXPO_USE_NATIVE_KEYBOARD === "1") {
      return context.resolveRequest(context, moduleName, platform);
    }
    return {
      filePath: path.resolve(__dirname, "src/shims/keyboard-controller.tsx"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
