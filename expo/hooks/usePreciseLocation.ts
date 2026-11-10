// Hook de géolocalisation précise, honnête et jamais bloquante.
// - permission refusée  -> état 'denied' (l'écran affiche un bandeau + réglages),
//   JAMAIS de repli silencieux sur une ville.
// - services désactivés -> état 'disabled'.
// - première position rapide : getLastKnownPositionAsync puis
//   getCurrentPositionAsync(Balanced) avec timeout 5 s, marquée « approximative ».
// - affinage continu : watchPositionAsync(Highest, 5 m / 2 s) tant que l'écran est
//   monté ; on garde la meilleure position (shouldReplaceFix).
// Toute la décision (meilleure position, seuils, états) est dans geo.ts, testée.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { shouldReplaceFix, type GeoFix, type LocationStatus } from '@/store/firstaid/geo';

const QUICK_TIMEOUT_MS = 5000;

interface UsePreciseLocation {
  status: LocationStatus;
  fix: GeoFix | null;
  refresh: () => void;
  openSettings: () => void;
}

export function usePreciseLocation(): UsePreciseLocation {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [fix, setFix] = useState<GeoFix | null>(null);
  const fixRef = useRef<GeoFix | null>(null);
  const watchRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);

  // Applique un candidat seulement s'il améliore la position courante.
  const applyCandidate = useCallback((candidate: GeoFix) => {
    if (!mountedRef.current) return;
    if (shouldReplaceFix(fixRef.current, candidate)) {
      fixRef.current = candidate;
      setFix(candidate);
    }
  }, []);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const start = useCallback(async () => {
    // Web : géolocalisation navigateur, best-effort, sans repli silencieux.
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setStatus('granted');
            applyCandidate({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              timestamp: Date.now(),
              approximate: false,
            });
          },
          () => setStatus('denied'),
          { enableHighAccuracy: true, timeout: QUICK_TIMEOUT_MS },
        );
      } else {
        setStatus('denied');
      }
      return;
    }

    try {
      const Location = await import('expo-location');

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        if (mountedRef.current) setStatus('disabled');
        return;
      }

      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        if (mountedRef.current) setStatus('denied');
        return;
      }
      if (!mountedRef.current) return;
      setStatus('unknown'); // accordée mais pas encore de position

      // 1) Dernière position connue : immédiate, approximative.
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          applyCandidate({
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
            accuracy: last.coords.accuracy ?? null,
            timestamp: last.timestamp ?? Date.now(),
            approximate: true,
          });
          if (mountedRef.current) setStatus('granted');
        }
      } catch {
        /* pas de dernière position : on continue */
      }

      // 2) Fix rapide Balanced avec garde-temps 5 s (jamais bloquant).
      try {
        const quick = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), QUICK_TIMEOUT_MS)),
        ]);
        if (quick) {
          applyCandidate({
            latitude: quick.coords.latitude,
            longitude: quick.coords.longitude,
            accuracy: quick.coords.accuracy ?? null,
            timestamp: quick.timestamp ?? Date.now(),
            approximate: true,
          });
          if (mountedRef.current) setStatus('granted');
        }
      } catch {
        /* le watch prendra le relais */
      }

      // 3) Affinage continu Highest tant que l'écran est monté.
      if (!mountedRef.current) return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 5, timeInterval: 2000 },
        (pos) => {
          applyCandidate({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            timestamp: pos.timestamp ?? Date.now(),
            approximate: false,
          });
          if (mountedRef.current) setStatus('granted');
        },
      );
      if (!mountedRef.current) {
        sub.remove();
        return;
      }
      watchRef.current = sub;
    } catch {
      if (mountedRef.current) setStatus('unknown');
    }
  }, [applyCandidate]);

  const refresh = useCallback(() => {
    stopWatch();
    void start();
  }, [start, stopWatch]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void start();
    return () => {
      mountedRef.current = false;
      stopWatch();
    };
  }, [start, stopWatch]);

  return { status, fix, refresh, openSettings };
}
