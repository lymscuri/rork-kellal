// Types du module « Premiers secours » (API /firstaid/).
// Calqués strictement sur la forme renvoyée par le backend Railway.
// Aucun texte n'est défini ici : tout le contenu affiché vient de l'API.

export type VariantKey = 'adult' | 'child' | 'infant';

export interface FirstAidMeta {
  emergency_number: string;
  languages: string[];
  protocol_count: number;
  lang: string;
}

// Élément de la liste /firstaid/protocols/ (status renvoyé par l'API, même
// valeur que dans le détail).
export interface ProtocolSummary {
  id: string;
  title: string;
  description: string;
  version: number;
  updated_at: string;
  status: string;
  variants: Partial<Record<VariantKey, string>>;
}

export interface SourceRef {
  key: string;
  page: number | null;
}

export interface ActionStep {
  number: number;
  text: string;
  visual: string;
  timer_seconds: number | null;
  source: SourceRef;
}

// Un bloc porte SOIT des steps par variante, SOIT une liste steps plate.
export interface ActionBlock {
  id: string;
  title: string;
  next_question: string | null;
  variants?: Partial<Record<VariantKey, ActionStep[]>>;
  steps?: ActionStep[];
}

export interface TreeAnswer {
  label: string;
  next_question: string | null;
  action_block: string | null;
  switch_to: string | null;
}

export interface TreeQuestion {
  text: string;
  answers: Record<string, TreeAnswer>;
}

export interface DecisionTree {
  entry: string;
  questions: Record<string, TreeQuestion>;
}

export interface RedFlag {
  text: string;
  source: SourceRef;
  switch_to: string | null;
}

export interface DoNotItem {
  text: string;
  source: SourceRef;
}

export interface SourceEntry {
  key: string;
  organisation: string;
  title: string;
  edition: string;
  url: string;
  licence: string;
  role: string;
  pages: number[];
}

export interface Protocol {
  id: string;
  lang: string;
  title: string;
  description: string;
  version: number;
  updated_at: string;
  status: string; // 'validated' | 'draft_unvalidated' | ...
  call_emergency_first: boolean;
  variants: Partial<Record<VariantKey, string>>;
  decision_tree: DecisionTree;
  action_blocks: Record<string, ActionBlock>;
  red_flags: RedFlag[];
  do_not: DoNotItem[];
  sources: SourceEntry[];
  validated_by: unknown[];
  emergency_number: string;
}

// ---- Enveloppes HTTP ----
export interface MetaEnvelope {
  success: boolean;
  message?: string;
  data: FirstAidMeta;
}

export interface ProtocolsEnvelope {
  success: boolean;
  count: number;
  results: ProtocolSummary[];
}

export interface ProtocolEnvelope {
  success: boolean;
  message?: string;
  data: Protocol;
}

// ---- Entrées de cache local (persistées) ----
export interface CacheEntry<T> {
  etag: string | null;
  version: number | null;
  data: T;
  fetchedAt: string;
}

export interface FirstAidCache {
  meta: Record<string, CacheEntry<FirstAidMeta>>; // clé = lang
  list: Record<string, CacheEntry<ProtocolSummary[]>>; // clé = lang
  protocols: Record<string, CacheEntry<Protocol>>; // clé = `${id}:${lang}`
}
