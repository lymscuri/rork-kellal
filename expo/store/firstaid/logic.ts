// Logique pure du module « Premiers secours ».
// Aucune dépendance React Native / axios / AsyncStorage : testable sous `bun test`.

import type {
  ActionBlock,
  ActionStep,
  CacheEntry,
  Protocol,
  ProtocolSummary,
  VariantKey,
} from '@/types/firstaid';

export const VALIDATED_STATUS = 'validated';

// Traçabilité : « ifrc_2025_en » + page 162 -> « IFRC 2025 EN p.162 ».
// Transformation déterministe de la valeur API (clé + page), pas de texte inventé.
export function formatSource(src: { key: string; page: number | null } | null | undefined): string {
  if (!src || !src.key) return '';
  const label = src.key.replace(/_/g, ' ').toUpperCase();
  return src.page != null ? `${label} p.${src.page}` : label;
}

// Un protocole est « de test » tant que son status n'est pas exactement 'validated'.
export function isUnvalidated(status: string | null | undefined): boolean {
  return status !== VALIDATED_STATUS;
}

// Liste ordonnée des variantes disponibles d'un protocole (adult/child/infant).
export function variantKeys(protocol: Pick<Protocol, 'variants'>): VariantKey[] {
  const order: VariantKey[] = ['adult', 'child', 'infant'];
  return order.filter((k) => protocol.variants && protocol.variants[k] != null);
}

// Variante par défaut : la première déclarée, ou null si le protocole n'a pas de variantes.
export function defaultVariant(protocol: Pick<Protocol, 'variants'>): VariantKey | null {
  const ks = variantKeys(protocol);
  return ks.length > 0 ? ks[0] : null;
}

// Steps d'un bloc : soit par variante, soit la liste plate `steps`.
export function resolveBlockSteps(block: ActionBlock, variant: VariantKey | null): ActionStep[] {
  if (block.variants) {
    if (variant && block.variants[variant]) return block.variants[variant] as ActionStep[];
    // Variante absente : repli sur la première variante disponible du bloc.
    const first = (['adult', 'child', 'infant'] as VariantKey[]).find((k) => block.variants?.[k]);
    return first ? (block.variants[first] as ActionStep[]) : [];
  }
  return block.steps ?? [];
}

// Résolution d'une réponse de l'arbre vers la cible suivante.
export type AnswerTarget =
  | { kind: 'question'; id: string }
  | { kind: 'block'; id: string }
  | { kind: 'switch'; to: string }
  | { kind: 'end' };

export function resolveAnswer(
  protocol: Pick<Protocol, 'decision_tree'>,
  questionId: string,
  answerKey: string,
): AnswerTarget {
  const q = protocol.decision_tree.questions[questionId];
  const ans = q?.answers[answerKey];
  if (!ans) return { kind: 'end' };
  if (ans.switch_to) return { kind: 'switch', to: ans.switch_to };
  if (ans.action_block) return { kind: 'block', id: ans.action_block };
  if (ans.next_question) return { kind: 'question', id: ans.next_question };
  return { kind: 'end' };
}

// Après un bloc terminé : enchaîner sur next_question si présent, sinon fin.
export function resolveBlockEnd(block: Pick<ActionBlock, 'next_question'>): AnswerTarget {
  return block.next_question ? { kind: 'question', id: block.next_question } : { kind: 'end' };
}

// Un protocole de la liste est-il non validé ? (status ABSENT de la liste côté API :
// on s'appuie sur les détails déjà en cache, clés `${id}:${lang}`.)
export function anyUnvalidatedFromCache(
  summaries: ProtocolSummary[],
  cachedProtocols: Record<string, CacheEntry<Protocol>>,
  lang: string,
): boolean {
  return summaries.some((s) => {
    const entry = cachedProtocols[`${s.id}:${lang}`];
    return entry ? isUnvalidated(entry.data.status) : false;
  });
}

// Décision de rafraîchissement HTTP conditionnel.
// 200 -> remplacer le cache ; 304 -> conserver ; échec réseau -> conserver + hors ligne.
export type RefreshOutcome<T> =
  | { kind: 'updated'; entry: CacheEntry<T> }
  | { kind: 'not_modified' }
  | { kind: 'offline' };

export function buildCacheEntry<T>(
  data: T,
  etag: string | null,
  version: number | null,
  now: string,
): CacheEntry<T> {
  return { etag, version, data, fetchedAt: now };
}

// À partir d'un status HTTP + corps éventuel, décider de l'issue du rafraîchissement.
export function interpretRefresh<T>(
  status: number,
  data: T | undefined,
  etag: string | null,
  version: number | null,
  now: string,
): RefreshOutcome<T> {
  if (status === 304) return { kind: 'not_modified' };
  if (status >= 200 && status < 300 && data !== undefined) {
    return { kind: 'updated', entry: buildCacheEntry(data, etag, version, now) };
  }
  // Tout le reste (y compris absence de réponse) est traité comme hors ligne côté appelant.
  return { kind: 'offline' };
}
