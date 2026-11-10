// Détection de langue SANS modèle — port TS fidèle de apps/firstaid/lang.py.
// 'fr' | 'en' | null. null si le texte est vide ou indécidable (égalité ou zéro indice) :
// on ne devine jamais, l'appelant garde alors la langue courante.
import type { UiLang } from '@/constants/i18n';

// Mots communs aux deux langues (« a », « on », « plus »…) volontairement exclus.
const FR_WORDS = new Set(
  `le la les un une des du de et ou est sont il elle ils elles je tu nous vous
   ne pas mais que qui quoi dans sur avec pour sans sa ses mon ma mes ton ta tes
   ce cette ces cet au aux se lui leur très bien oui non depuis chez où comme
   tout tous toute toutes après avant encore aussi fait faut peut va vais suis
   ai été être avoir quand parce car donc alors déjà ici là moi toi ouais`
    .split(/\s+/)
    .filter(Boolean),
);

const EN_WORDS = new Set(
  `the an and or is are was were be been being he she it they we you i my his
   her their our your not no yes but with for from this that these those there
   here has have had do does did can cannot could will would should of in at to
   into what who which when how very just still now while because then nope yep yeah nah`
    .split(/\s+/)
    .filter(Boolean),
);

const FR_ACCENTS = new Set('àâäéèêëîïôöùûüçœ');

// Élisions françaises en début de mot : j'ai, l'enfant, qu'il, n'est…
const FR_ELISION = /(?<![\p{L}])(?:j|l|d|n|c|m|t|s|qu)['’](?=\p{L})/giu;
// Contractions anglaises en fin de mot : isn't, he's, I'm, we're, they've, I'll
const EN_CONTRACTION = /\p{L}(?:n['’]t|['’](?:s|m|re|ve|ll|d))\b/giu;
const WORD = /\p{L}+/gu;

const MAX_LEN = 1000; // même plafond que les endpoints

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

function scores(text: string): [number, number] {
  const sliced = text.slice(0, MAX_LEN).normalize('NFC');
  const lowered = sliced.toLowerCase();
  const tokens = lowered.match(WORD) ?? [];
  let fr = tokens.reduce((n, t) => (FR_WORDS.has(t) ? n + 1 : n), 0);
  let en = tokens.reduce((n, t) => (EN_WORDS.has(t) ? n + 1 : n), 0);
  for (const ch of lowered) if (FR_ACCENTS.has(ch)) fr += 1;
  fr += countMatches(sliced, FR_ELISION);
  en += countMatches(sliced, EN_CONTRACTION);
  return [fr, en];
}

export function detectLang(text: string | null | undefined): UiLang | null {
  if (!text || !text.trim()) return null;
  const [fr, en] = scores(text);
  if (fr === en) return null;
  return fr > en ? 'fr' : 'en';
}
