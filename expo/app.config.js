// Superpose la configuration de app.json en ajoutant conditionnellement
// le plugin expo-build-properties avec usesCleartextTraffic=true.
// N'est activé que lorsque EXPO_ALLOW_CLEARTEXT=1 (profils dev/local).
module.exports = ({ config }) => {
  if (process.env.EXPO_ALLOW_CLEARTEXT !== '1') {
    return config;
  }

  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  plugins.push([
    'expo-build-properties',
    {
      android: {
        usesCleartextTraffic: true,
      },
    },
  ]);

  return {
    ...config,
    plugins,
  };
};
