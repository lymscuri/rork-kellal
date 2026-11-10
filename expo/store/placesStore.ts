// Store « lieux d'urgence » (zustand + persist AsyncStorage, comme firstaidStore).
// Rôle : couche de données uniquement — cache par cellule géographique + dernier
// lot + état hors ligne. Le choix de refaire un appel (seuil 500 m) est délégué
// à store/firstaid/geo.ts (needsRefetch). L'écran orchestre.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { emergencyAPI } from './api';
import { cellKey, selectCacheEntry } from './firstaid/geo';
// cellKey : clé d'écriture du cache ; selectCacheEntry : lecture par cellule.
import type { PlacesCacheEntry, PlacesData, PlacesEnvelope } from '@/types/places';

const RADIUS = 5000;

interface PlacesState {
  // Cache par cellule (clé = cellKey(lat,lon,radius)).
  cache: Record<string, PlacesCacheEntry>;
  // Centre du dernier lot servi (pour le seuil de rafraîchissement 500 m).
  lastCenter: { lat: number; lon: number } | null;
  isOffline: boolean;
  isHydrated: boolean;

  // Lecture synchrone du cache pour une position (sert l'UI immédiatement).
  getCached: (lat: number, lon: number) => PlacesCacheEntry | null;
  // Rafraîchissement réseau ; en cas d'échec, marque hors ligne et renvoie null.
  fetchPlaces: (lat: number, lon: number) => Promise<PlacesData | null>;
  reset: () => void;
}

export const usePlacesStore = create<PlacesState>()(
  persist(
    (set, get) => ({
      cache: {},
      lastCenter: null,
      isOffline: false,
      isHydrated: false,

      getCached: (lat, lon) => selectCacheEntry(get().cache, lat, lon, RADIUS),

      fetchPlaces: async (lat, lon) => {
        const key = cellKey(lat, lon, RADIUS);
        try {
          const res = await emergencyAPI.places(lat, lon, RADIUS, 'fr');
          const env = res.data as PlacesEnvelope;
          if (!env?.success || !env.data) {
            set({ isOffline: true });
            return null;
          }
          const entry: PlacesCacheEntry = { data: env.data, fetchedAt: Date.now() };
          set((s) => ({
            cache: { ...s.cache, [key]: entry },
            lastCenter: { lat: env.data.center.lat, lon: env.data.center.lon },
            isOffline: false,
          }));
          return env.data;
        } catch {
          // Réseau indisponible : on reste sur le cache et on signale hors ligne.
          set({ isOffline: true });
          return null;
        }
      },

      reset: () => set({ cache: {}, lastCenter: null, isOffline: false }),
    }),
    {
      name: 'kendeya-places-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ cache: s.cache, lastCenter: s.lastCenter }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
