// The on-device Turkish voice (tts/speaker.ts) bundles its ONNX graphs as assets.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('onnx');

module.exports = config;
