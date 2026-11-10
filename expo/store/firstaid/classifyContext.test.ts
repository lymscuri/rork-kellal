// Tests du contexte de classification (2a) et du compte de mots (2b).
import { expect, test, describe } from 'bun:test';
import { buildClassifyContext, wordCount, CLASSIFY_CONTEXT_MAX } from './guided';

describe('buildClassifyContext — 3 derniers messages', () => {
  test('nouvelle conversation (vide) → contexte vide', () => {
    expect(buildClassifyContext([])).toBe('');
  });

  test('un seul message → ce message', () => {
    expect(buildClassifyContext(['je suis blessé'])).toBe('je suis blessé');
  });

  test('concaténation des 3 derniers dans l’ordre, séparés par « . »', () => {
    const ctx = buildClassifyContext(['je suis blessé', 'il saigne', 'de la jambe']);
    expect(ctx).toBe('je suis blessé. il saigne. de la jambe');
  });

  test('plus de 3 messages → seuls les 3 derniers', () => {
    const ctx = buildClassifyContext(['a', 'b', 'c', 'd', 'e']);
    expect(ctx).toBe('c. d. e');
  });

  test('messages vides ignorés', () => {
    expect(buildClassifyContext(['  ', 'il tousse', ''])).toBe('il tousse');
  });

  test('troncature à 1000 caractères : le plus ancien retiré d’abord', () => {
    const long = 'x'.repeat(600);
    const ctx = buildClassifyContext([long, long]); // 600 + 2 + 600 = 1202 > 1000
    // On retire le plus ancien → il reste un seul message de 600.
    expect(ctx.length).toBeLessThanOrEqual(CLASSIFY_CONTEXT_MAX);
    expect(ctx).toBe(long);
  });

  test('un seul message trop long → tronqué par la fin', () => {
    const huge = 'y'.repeat(1500);
    const ctx = buildClassifyContext([huge]);
    expect(ctx.length).toBe(CLASSIFY_CONTEXT_MAX);
    expect(ctx).toBe('y'.repeat(CLASSIFY_CONTEXT_MAX));
  });
});

describe('wordCount', () => {
  test('texte vide → 0', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
  });
  test('compte les mots (espaces multiples / Unicode)', () => {
    expect(wordCount('je suis blessé')).toBe(3);
    expect(wordCount('  il   saigne  ')).toBe(2);
    expect(wordCount('a')).toBe(1);
  });
  test('seuil : « il saigne beaucoup de la jambe » = 6 mots (< 8)', () => {
    expect(wordCount('il saigne beaucoup de la jambe')).toBe(6);
  });
});
