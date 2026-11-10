// Logique PURE de géolocalisation et de cache géographique (sans React Native).
// Tout ce qui est testable isolément vit ici : choix de la meilleure position,
// seuil de remplacement, états de permission, cellule de cache, seuil de
// rafraîchissement. L'écran et le hook ne font qu'orchestrer ces fonctions.

export type LocationStatus =
  | 'idle' // pas encore demandé
  | 'granted' // permission accordée, position (approx. ou précise) disponible
  | 'denied' // permission refusée par l'utilisateur
  | 'disabled' // services de localisation désactivés sur l'appareil
  | 'unknown'; // accordée mais aucune position encore (ou échec de lecture)

// Position retenue. `accuracy` en mètres (rayon du cercle d'incertitude) ;
// null = inconnue (ex. dernière position connue sans précision fournie).
export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number; // ms epoch
  approximate: boolean; // true tant qu'on n'a qu'un fix rapide/last-known
}

// Centre de repli : Guinée (centroïde approx.), jamais présenté comme la
// position réelle de l'utilisateur — l'écran affiche « position inconnue ».
export const GUINEA_LAT = 9.9456;
export const GUINEA_LON = -9.6966;

// Seuils (mètres).
export const MOVE_REPLACE_M = 30; // on remplace si on a bougé de plus de 30 m
export const REFRESH_MOVE_M = 500; // on refait un appel /places si > 500 m du centre du lot
export const CELL_DEG = 0.01; // cellule de cache ~1 km (comme le backend)

// Distance haversine en mètres entre deux points.
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Faut-il remplacer la position courante par une candidate ?
// Règle : on garde toujours la meilleure précision (plus petite accuracy) ; si
// la candidate est meilleure OU si on a bougé de plus de MOVE_REPLACE_M, elle
// gagne. Un fix précis remplace toujours un fix approximatif. Une accuracy
// inconnue (null) ne déloge jamais une accuracy connue.
export function shouldReplaceFix(current: GeoFix | null, candidate: GeoFix): boolean {
  if (current === null) return true;
  // Un fix précis l'emporte sur un approximatif.
  if (current.approximate && !candidate.approximate) return true;
  if (!current.approximate && candidate.approximate) return false;

  const moved = haversineM(current.latitude, current.longitude, candidate.latitude, candidate.longitude);
  if (moved > MOVE_REPLACE_M) return true;

  // Sinon on départage par précision.
  if (candidate.accuracy === null) return false;
  if (current.accuracy === null) return true;
  return candidate.accuracy < current.accuracy;
}

// Cellule de cache : lat/lon arrondis à CELL_DEG (comme le backend, 0,01°).
export function cellKey(lat: number, lon: number, radius: number): string {
  const q = (v: number) => (Math.round(v / CELL_DEG) * CELL_DEG).toFixed(2);
  return `${q(lat)}:${q(lon)}:${radius}`;
}

// Faut-il relancer un appel /places ? Oui si aucun lot connu, ou si la position
// s'est éloignée de plus de REFRESH_MOVE_M du centre du dernier lot.
export function needsRefetch(
  lastCenter: { lat: number; lon: number } | null,
  current: { lat: number; lon: number },
): boolean {
  if (lastCenter === null) return true;
  return haversineM(lastCenter.lat, lastCenter.lon, current.lat, current.lon) > REFRESH_MOVE_M;
}

// Position effective à afficher : le fix s'il existe, sinon le dernier fix connu
// (cache), sinon le repli Guinée. `known` dit si c'est une vraie position de
// l'utilisateur (pour afficher ou non « position inconnue »).
export interface EffectivePosition {
  lat: number;
  lon: number;
  accuracy: number | null;
  known: boolean;
  approximate: boolean;
}

// Sélection pure d'une entrée de cache par cellule : rend l'entrée et un
// drapeau « servie hors ligne » (vrai quand on sert le cache sans réseau frais).
export function selectCacheEntry<T>(
  cache: Record<string, T>,
  lat: number,
  lon: number,
  radius: number,
): T | null {
  return cache[cellKey(lat, lon, radius)] ?? null;
}

export function effectivePosition(fix: GeoFix | null, lastKnown: GeoFix | null): EffectivePosition {
  const f = fix ?? lastKnown;
  if (f) {
    return {
      lat: f.latitude,
      lon: f.longitude,
      accuracy: f.accuracy,
      known: true,
      approximate: f.approximate || fix === null, // un last-known servi seul est approximatif
    };
  }
  return { lat: GUINEA_LAT, lon: GUINEA_LON, accuracy: null, known: false, approximate: true };
}
