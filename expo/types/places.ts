// Types du contrat GET /api/v1/emergency/places/ (backend apps/urgences/places.py).
// Le tri-état (is_24h / has_emergency / has_maternity) est VOLONTAIRE : null =
// inconnu, jamais rendu « fermé » ou « non ». L'UI respecte ce tri-état.

export type PlaceKind = 'hospital' | 'clinic' | 'pharmacy' | 'health_center';

// origin : d'où vient la fiche. 'merged' = fiche du référentiel enrichie d'OSM.
export type PlaceOrigin = 'osm' | 'referential' | 'merged';

// source du lot : d'où viennent les données OSM (traçabilité, affichée en petit).
export type PlacesSource = 'db' | 'cache' | 'live' | 'stale' | 'referential_only';

export interface Place {
  id: string; // ex. "osm:node:123" | "ref:<uuid>"
  name: string; // toujours renseigné (nom générique localisé si OSM sans nom)
  kind: PlaceKind;
  lat: number;
  lon: number;
  distance_m: number; // distance au centre demandé, en mètres
  address: string | null;
  phone: string | null;
  is_24h: boolean | null; // null = horaires inconnus
  has_emergency: boolean | null; // null = inconnu
  has_maternity: boolean | null; // null = inconnu
  origin: PlaceOrigin;
}

export interface PlacesData {
  center: { lat: number; lon: number };
  radius: number;
  generated_at: string; // ISO 8601 UTC de la collecte OSM
  source: PlacesSource;
  places: Place[];
}

export interface PlacesEnvelope {
  success: boolean;
  data: PlacesData;
}

// Entrée de cache local, par cellule géographique.
export interface PlacesCacheEntry {
  data: PlacesData;
  fetchedAt: number; // ms epoch de la réception locale (pour « données du <date> »)
}
