const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [
  ...new Set([...config.resolver.assetExts, "glb", "gltf"]),
];
config.resolver.blockList = [/[/\\]\.tools[/\\].*/];
module.exports = config;
