// Assets texte embarqués (Leaflet vendored) : résolus par Metro comme des
// assets (voir metro.config.js, assetExts += "txt"). require() renvoie l'id de
// module d'asset, consommable par expo-asset.
declare module '*.txt' {
  const asset: number;
  export default asset;
}
