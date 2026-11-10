// Filet de sécurité « réponse libre » par le modèle Groq, CONSERVÉ mais DÉSACTIVÉ.
// Le flux premiers secours ne doit pas en dépendre : le modèle ne sert qu'à
// reconnaître (classify/answer côté backend). Cette réponse libre ne s'exécute
// que si ASSISTANT_FREE_ANSWERS est passé à true, et seulement après le message
// « pas de protocole validé », dans la langue détectée, sans Markdown.
import type { UiLang } from '@/constants/i18n';

export const ASSISTANT_FREE_ANSWERS = false;

// Prompt système : interdit explicitement le Markdown et impose la langue.
export function buildFreeAnswerPrompt(lang: UiLang): string {
  if (lang === 'en') {
    return [
      'You are a first-aid assistant for Guinea (emergency number 442).',
      'Answer in English only. Plain text only: no Markdown, no asterisks, no headings,',
      'no bullet characters, no code. Be short, calm and practical.',
      'If the situation is life-threatening, tell the person to call 442 immediately.',
    ].join(' ');
  }
  return [
    'Tu es un assistant de premiers secours pour la Guinée (numéro d’urgence 442).',
    'Réponds uniquement en français. Texte brut seulement : pas de Markdown, pas',
    'd’astérisques, pas de titres, pas de puces, pas de code. Sois bref, calme et pratique.',
    'Si la situation menace la vie, dis d’appeler le 442 immédiatement.',
  ].join(' ');
}

// Filet de sécurité de rendu : retire le Markdown courant si le modèle en met malgré tout.
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // blocs de code
    .replace(/`([^`]+)`/g, '$1') // code en ligne
    .replace(/^#{1,6}\s+/gm, '') // titres
    .replace(/^\s*[-*+]\s+/gm, '') // puces
    .replace(/^\s*\d+\.\s+/gm, '') // listes numérotées
    .replace(/\*\*([^*]+)\*\*/g, '$1') // gras
    .replace(/\*([^*]+)\*/g, '$1') // italique *
    .replace(/_([^_]+)_/g, '$1') // italique _
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // liens
    .replace(/^\s*>\s?/gm, '') // citations
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
