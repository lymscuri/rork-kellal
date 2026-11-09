// Tests de la logique pure « Premiers secours » (bun test).
// Couvre : rafraîchissement conditionnel (200/304/offline), résolution switch_to,
// steps par variante, formatage source, et la décision de bandeau « non validé ».
import { expect, test, describe } from 'bun:test';
import {
  interpretRefresh,
  resolveAnswer,
  resolveBlockEnd,
  resolveBlockSteps,
  formatSource,
  isUnvalidated,
  variantKeys,
  defaultVariant,
  anyUnvalidatedFromCache,
} from './logic';
import type { Protocol, ActionBlock, CacheEntry, ProtocolSummary } from '@/types/firstaid';

const NOW = '2026-11-09T00:00:00.000Z';

describe('interpretRefresh', () => {
  test('200 -> cache remplacé par la nouvelle entrée', () => {
    const r = interpretRefresh(200, { v: 1 }, '"etag-a"', 4, NOW);
    expect(r.kind).toBe('updated');
    if (r.kind === 'updated') {
      expect(r.entry.etag).toBe('"etag-a"');
      expect(r.entry.version).toBe(4);
      expect(r.entry.data).toEqual({ v: 1 });
    }
  });

  test('304 -> rien à faire, le cache est servi inchangé', () => {
    const r = interpretRefresh(304, undefined, null, null, NOW);
    expect(r.kind).toBe('not_modified');
  });

  test('erreur (5xx / pas de corps) -> hors ligne', () => {
    expect(interpretRefresh(500, undefined, null, null, NOW).kind).toBe('offline');
  });
});

describe('résolution de l\'arbre (switch_to inclus)', () => {
  const protocol = {
    decision_tree: {
      entry: 'q1',
      questions: {
        q1: {
          text: 'Respire ?',
          answers: {
            yes: { label: 'Oui', next_question: null, action_block: null, switch_to: 'other_proto' },
            no: { label: 'Non', next_question: 'q2', action_block: null, switch_to: null },
          },
        },
        q2: {
          text: 'Insufflations ?',
          answers: {
            a: { label: 'Oui', next_question: null, action_block: 'blk', switch_to: null },
          },
        },
      },
    },
  } as unknown as Protocol;

  test('switch_to prioritaire -> bascule de protocole', () => {
    expect(resolveAnswer(protocol, 'q1', 'yes')).toEqual({ kind: 'switch', to: 'other_proto' });
  });
  test('next_question -> question suivante', () => {
    expect(resolveAnswer(protocol, 'q1', 'no')).toEqual({ kind: 'question', id: 'q2' });
  });
  test('action_block -> bloc', () => {
    expect(resolveAnswer(protocol, 'q2', 'a')).toEqual({ kind: 'block', id: 'blk' });
  });
  test('réponse inconnue -> fin', () => {
    expect(resolveAnswer(protocol, 'q1', 'zzz')).toEqual({ kind: 'end' });
  });
  test('fin de bloc enchaîne sur next_question', () => {
    expect(resolveBlockEnd({ next_question: 'q2' })).toEqual({ kind: 'question', id: 'q2' });
    expect(resolveBlockEnd({ next_question: null })).toEqual({ kind: 'end' });
  });
});

describe('steps de bloc', () => {
  const variantBlock = {
    id: 'b',
    title: 'RCP',
    next_question: null,
    variants: {
      adult: [{ number: 1, text: 'A', visual: '', timer_seconds: null, source: { key: 'ifrc_2025_en', page: 162 } }],
      child: [{ number: 1, text: 'C', visual: '', timer_seconds: null, source: { key: 'ifrc_2025_en', page: 188 } }],
    },
  } as unknown as ActionBlock;

  const flatBlock = {
    id: 'f',
    title: 'Suite',
    next_question: null,
    steps: [{ number: 1, text: 'X', visual: '', timer_seconds: null, source: { key: 'ifrc_2025_en', page: 188 } }],
  } as unknown as ActionBlock;

  test('bloc à variantes -> steps de la variante demandée', () => {
    expect(resolveBlockSteps(variantBlock, 'child')[0].text).toBe('C');
  });
  test('bloc à variantes, variante absente -> repli sur la première', () => {
    expect(resolveBlockSteps(variantBlock, 'infant')[0].text).toBe('A');
  });
  test('bloc plat -> steps', () => {
    expect(resolveBlockSteps(flatBlock, null)[0].text).toBe('X');
  });
});

describe('formatSource (traçabilité)', () => {
  test('clé + page -> « IFRC 2025 EN p.162 »', () => {
    expect(formatSource({ key: 'ifrc_2025_en', page: 162 })).toBe('IFRC 2025 EN p.162');
  });
  test('sans page', () => {
    expect(formatSource({ key: 'ifrc_2025_en', page: null })).toBe('IFRC 2025 EN');
  });
  test('vide', () => {
    expect(formatSource(null)).toBe('');
  });
});

describe('variantes et validation', () => {
  const proto = { variants: { adult: 'Adulte', infant: 'Nourrisson' } } as unknown as Protocol;
  test('variantKeys garde l\'ordre adult/child/infant', () => {
    expect(variantKeys(proto)).toEqual(['adult', 'infant']);
  });
  test('defaultVariant = première disponible', () => {
    expect(defaultVariant(proto)).toBe('adult');
  });
  test('isUnvalidated vrai si status != validated', () => {
    expect(isUnvalidated('draft_unvalidated')).toBe(true);
    expect(isUnvalidated('validated')).toBe(false);
  });

  test('bandeau « non validé » déduit du cache des détails', () => {
    const summaries: ProtocolSummary[] = [
      { id: 'p1', title: '', description: '', version: 1, updated_at: '', variants: {} },
      { id: 'p2', title: '', description: '', version: 1, updated_at: '', variants: {} },
    ];
    const entry = (status: string): CacheEntry<Protocol> => ({
      etag: null,
      version: 1,
      fetchedAt: NOW,
      data: { status } as unknown as Protocol,
    });
    // p1 non validé en cache -> bandeau
    expect(anyUnvalidatedFromCache(summaries, { 'p1:fr': entry('draft_unvalidated') }, 'fr')).toBe(true);
    // tous validés -> pas de bandeau
    expect(
      anyUnvalidatedFromCache(summaries, { 'p1:fr': entry('validated'), 'p2:fr': entry('validated') }, 'fr'),
    ).toBe(false);
    // rien en cache -> pas de bandeau (statut inconnu, non inventé)
    expect(anyUnvalidatedFromCache(summaries, {}, 'fr')).toBe(false);
  });
});
