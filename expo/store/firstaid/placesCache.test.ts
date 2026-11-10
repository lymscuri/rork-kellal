// Tests de la logique de cache géographique (sélection par cellule, hors ligne).
import { expect, test, describe } from 'bun:test';
import { cellKey, selectCacheEntry } from './geo';

interface Entry { data: { source: string }; fetchedAt: number }

const RADIUS = 5000;

describe('cache par cellule', () => {
  test('lecture par voisinage : un point proche lit la même entrée écrite', () => {
    const cache: Record<string, Entry> = {};
    // Écriture à la position A.
    cache[cellKey(9.5370, -13.6785, RADIUS)] = { data: { source: 'live' }, fetchedAt: 111 };
    // Lecture à ~20 m de A : même cellule → même entrée.
    const got = selectCacheEntry(cache, 9.5371, -13.6784, RADIUS);
    expect(got?.fetchedAt).toBe(111);
  });

  test('cellule absente → null', () => {
    const cache: Record<string, Entry> = {};
    cache[cellKey(9.53, -13.67, RADIUS)] = { data: { source: 'live' }, fetchedAt: 1 };
    // Position à ~5 km : cellule différente → rien.
    expect(selectCacheEntry(cache, 9.58, -13.67, RADIUS)).toBeNull();
  });

  test('hors ligne : le cache reste servi (l’entrée existe), source du dernier lot', () => {
    const cache: Record<string, Entry> = {};
    const key = cellKey(9.5370, -13.6785, RADIUS);
    cache[key] = { data: { source: 'stale' }, fetchedAt: 999 };
    // Simule un démarrage hors ligne : on relit le cache, il doit servir.
    const served = selectCacheEntry(cache, 9.5370, -13.6785, RADIUS);
    expect(served).not.toBeNull();
    expect(served?.data.source).toBe('stale');
    expect(served?.fetchedAt).toBe(999);
  });

  test('écriture puis relecture exacte → cohérence de la clé', () => {
    const cache: Record<string, Entry> = {};
    const lat = 9.5412, lon = -13.6701;
    cache[cellKey(lat, lon, RADIUS)] = { data: { source: 'cache' }, fetchedAt: 42 };
    expect(selectCacheEntry(cache, lat, lon, RADIUS)?.fetchedAt).toBe(42);
  });
});
