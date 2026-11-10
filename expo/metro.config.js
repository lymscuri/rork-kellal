const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Leaflet est embarqué dans l'app (assets/leaflet/*.txt) pour que la carte
// s'ouvre hors ligne : on traite .txt comme un asset binaire lisible par
// expo-asset, pas comme du code source à bundler.
config.resolver.assetExts = Array.from(new Set([...config.resolver.assetExts, "txt"]));

module.exports = config;
