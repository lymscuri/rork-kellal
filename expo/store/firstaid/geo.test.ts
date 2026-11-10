// Tests de la logique PURE de géolocalisation (sans React Native).
import { expect, test, describe } from 'bun:test';
import {
  haversineM,
  shouldReplaceFix,
  cellKey,
  needsRefetch,
  effectivePosition,
  GUINEA_LAT,
  GUINEA_LON,
  MOVE_REPLACE_M,
  type GeoFix,
} from './geo';

const base = (over: Partial<GeoFix> = {}): GeoFix => ({
  latitude: 9.5370,
  longitude: -13.6785,
  accuracy: 50,
  timestamp: 1000,
  approximate: false,
  ...over,
});

describe('haversineM', () => {
  test('0 m sur le même point', () => {
    expect(haversineM(9.5, -13.6, 9.5, -13.6)).toBe(0);
  });
  test('~111 km pour 1° de latitude', () => {
    const d = haversineM(9.0, -13.6, 10.0, -13.6);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('shouldReplaceFix — meilleure position gardée', () => {
  test('null courant → toujours remplacer', () => {
    expect(shouldReplaceFix(null, base())).toBe(true);
  });

  test('un fix précis remplace un fix approximatif', () => {
    const cur = base({ approximate: true, accuracy: 20 });
    const cand = base({ approximate: false, accuracy: 80 });
    expect(shouldReplaceFix(cur, cand)).toBe(true);
  });

  test('un approximatif ne remplace pas un précis', () => {
    const cur = base({ approximate: false, accuracy: 80 });
    const cand = base({ approximate: true, accuracy: 20 });
    expect(shouldReplaceFix(cur, cand)).toBe(false);
  });

  test('meilleure précision gagne au même emplacement', () => {
    const cur = base({ accuracy: 50 });
    const cand = base({ accuracy: 10 });
    expect(shouldReplaceFix(cur, cand)).toBe(true);
  });

  test('précision moins bonne au même emplacement → on garde', () => {
    const cur = base({ accuracy: 10 });
    const cand = base({ accuracy: 50 });
    expect(shouldReplaceFix(cur, cand)).toBe(false);
  });

  test('déplacement > 30 m → on remplace même si précision égale', () => {
    const cur = base({ accuracy: 20 });
    // ~40 m plus au nord (1 m ≈ 1/111320 °).
    const cand = base({ accuracy: 20, latitude: 9.5370 + 40 / 111_320 });
    const moved = haversineM(cur.latitude, cur.longitude, cand.latitude, cand.longitude);
    expect(moved).toBeGreaterThan(MOVE_REPLACE_M);
    expect(shouldReplaceFix(cur, cand)).toBe(true);
  });

  test('déplacement < 30 m et précision égale → on garde', () => {
    const cur = base({ accuracy: 20 });
    const cand = base({ accuracy: 20, latitude: 9.5370 + 10 / 111_320 });
    expect(shouldReplaceFix(cur, cand)).toBe(false);
  });

  test('accuracy inconnue (null) ne déloge pas une accuracy connue', () => {
    const cur = base({ accuracy: 100 });
    const cand = base({ accuracy: null });
    expect(shouldReplaceFix(cur, cand)).toBe(false);
  });
});

describe('cellKey — cellule ~1 km (0,01°)', () => {
  test('deux points dans la même cellule → même clé', () => {
    expect(cellKey(9.5370, -13.6785, 5000)).toBe(cellKey(9.5372, -13.6783, 5000));
  });
  test('cellules différentes → clés différentes', () => {
    expect(cellKey(9.53, -13.67, 5000)).not.toBe(cellKey(9.55, -13.67, 5000));
  });
  test('le rayon fait partie de la clé', () => {
    expect(cellKey(9.53, -13.67, 5000)).not.toBe(cellKey(9.53, -13.67, 10000));
  });
});

describe('needsRefetch — seuil 500 m', () => {
  test('aucun centre connu → true', () => {
    expect(needsRefetch(null, { lat: 9.5, lon: -13.6 })).toBe(true);
  });
  test('déplacement < 500 m → false', () => {
    const center = { lat: 9.5370, lon: -13.6785 };
    const here = { lat: 9.5370 + 200 / 111_320, lon: -13.6785 };
    expect(needsRefetch(center, here)).toBe(false);
  });
  test('déplacement > 500 m → true', () => {
    const center = { lat: 9.5370, lon: -13.6785 };
    const here = { lat: 9.5370 + 800 / 111_320, lon: -13.6785 };
    expect(needsRefetch(center, here)).toBe(true);
  });
});

describe('effectivePosition — honnête', () => {
  test('fix présent → position connue', () => {
    const p = effectivePosition(base({ latitude: 9.5, longitude: -13.6, accuracy: 12 }), null);
    expect(p).toEqual({ lat: 9.5, lon: -13.6, accuracy: 12, known: true, approximate: false });
  });

  test('pas de fix mais dernier connu → connu mais approximatif', () => {
    const last = base({ latitude: 9.4, longitude: -13.5, accuracy: 30 });
    const p = effectivePosition(null, last);
    expect(p.lat).toBe(9.4);
    expect(p.known).toBe(true);
    expect(p.approximate).toBe(true); // servi seul = approximatif
  });

  test('aucune position → repli Guinée, non connu', () => {
    const p = effectivePosition(null, null);
    expect(p).toEqual({ lat: GUINEA_LAT, lon: GUINEA_LON, accuracy: null, known: false, approximate: true });
  });
});
