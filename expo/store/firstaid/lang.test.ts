// Port TS de la détection de langue — mêmes cas que le backend (apps/firstaid/tests.py).
import { expect, test, describe } from 'bun:test';
import { detectLang } from './lang';

describe('detectLang (parité backend)', () => {
  test('français', () => {
    expect(detectLang('mon frère est tombé, il ne répond pas mais il respire')).toBe('fr');
    expect(detectLang("j'ai mal à la tête depuis ce matin")).toBe('fr');
    expect(detectLang('Oui, elle réagit')).toBe('fr');
  });

  test('anglais', () => {
    expect(detectLang('my father collapsed, he is not breathing')).toBe('en');
    expect(detectLang("he isn't moving and there is blood")).toBe('en');
    expect(detectLang('No, no reaction')).toBe('en');
  });

  test('indécidable → null', () => {
    for (const t of ['', '   ', null, 'ok', '442', 'OK!!!', '...']) {
      expect(detectLang(t)).toBeNull();
    }
  });

  test('mélange à égalité → null (on ne devine pas)', () => {
    expect(detectLang('il respire he breathes')).toBeNull();
  });
});
