// Machine à états PURE du mode guidé dans le chat (sans React Native).
// Réutilise la logique d'arbre de logic.ts (ne la duplique pas). Produit des
// « bulles » à afficher et d'éventuels « effets » asynchrones laissés à l'écran
// (charger un protocole pour un switch_to). Aucun texte médical ici : il vient
// du protocole (API). Les phrases de l'assistant sont des clés de dictionnaire.
import type { UiLang } from '@/constants/i18n';
import type { Protocol, VariantKey } from '@/types/firstaid';
import {
  resolveAnswer,
  resolveBlockEnd,
  resolveBlockSteps,
  variantKeys,
  formatSource,
} from './logic';

export type TextKey =
  | 'noProtocol'
  | 'assistantUnavailable'
  | 'switchingTo'
  | 'notCovered'
  | 'reAsk'
  | 'notUnderstood' // intent unclear : « je n'ai pas compris »
  | 'tapButtons' // 503 en phase question : inviter à taper sur les boutons
  | 'chooseAge'
  | 'precisionQuestion'
  | 'protocolEnded';

// Nombre maximal de tours de clarification demandés au modèle (miroir backend).
export const CLARIFY_MAX_TURNS = 3;

// Compte les mots d'un texte (espaces Unicode).
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/u).length : 0;
}

// Longueur maximale du contexte envoyé au classifieur (2a).
export const CLASSIFY_CONTEXT_MAX = 1000;

// Construit le texte de contexte pour /classify/ : les 3 derniers messages
// utilisateur de la conversation (dans l'ordre), joints par « . », tronqués à
// CLASSIFY_CONTEXT_MAX caractères en retirant le plus ancien d'abord. Une
// conversation neuve (historique vide) classifie le seul message courant.
export function buildClassifyContext(userMessages: string[]): string {
  const recent = userMessages
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
    .slice(-3);
  // Retire le plus ancien tant que la concaténation dépasse la limite.
  while (recent.length > 1 && recent.join('. ').length > CLASSIFY_CONTEXT_MAX) {
    recent.shift();
  }
  let joined = recent.join('. ');
  if (joined.length > CLASSIFY_CONTEXT_MAX) {
    // Un seul message trop long : on tronque par la fin (on garde le début).
    joined = joined.slice(0, CLASSIFY_CONTEXT_MAX);
  }
  return joined;
}

export interface OptionButton {
  key: string;
  label: string;
}

export type GuidedBubble =
  | { kind: 'emergency'; number: string }
  | { kind: 'say'; textKey: TextKey }
  | {
      kind: 'prompt';
      choiceKind: 'variant' | 'question';
      refId: string;
      text?: string; // texte API (question) — verbatim
      textKey?: TextKey; // texte chrome (variante)
      options: OptionButton[];
    }
  | {
      kind: 'step';
      blockId: string;
      blockTitle: string;
      text: string;
      stepNumber: number;
      stepTotal: number;
      stepIndex: number;
      isLast: boolean;
      timerSeconds: number | null;
      source: string;
    }
  | { kind: 'protocols'; items: { id: string; title: string }[] }
  | { kind: 'callButton'; number: string }
  // Question de clarification du modèle (déjà validée par le backend) — SEUL
  // texte venant du serveur-modèle affiché tel quel.
  | { kind: 'modelText'; text: string }
  // Signe d'alerte reconnu dans un message libre : « Signe d'alerte : <label> ».
  | { kind: 'redFlag'; label: string };

export type GuidedPhase =
  | { kind: 'idle' }
  // Choix d'âge demandé AVANT d'entrer dans le bloc à variantes mémorisé.
  | { kind: 'variant'; pendingBlockId: string }
  | { kind: 'question'; qid: string }
  | { kind: 'block'; blockId: string; stepIndex: number }
  // Clarification menée par le modèle : on attend la réponse de l'utilisateur.
  | { kind: 'precision' }
  | { kind: 'end' }
  | { kind: 'no_protocol' };

export interface GuidedState {
  protocolId: string | null;
  variant: VariantKey | null;
  // L'âge n'est demandé qu'une fois par protocole : mémorisé ici.
  variantAsked: boolean;
  // Nombre de clarifications déjà posées dans la conversation (0..CLARIFY_MAX_TURNS).
  clarifyTurn: number;
  phase: GuidedPhase;
}

// Intention renvoyée par /intent/ pendant un protocole (résultat déjà résolu
// côté écran à partir du champ `target`). Aucun texte médical ici.
export type IntentOutcome =
  | { kind: 'answer'; key: string }
  | { kind: 'red_flag'; label: string; switchTo?: string }
  | { kind: 'switch'; id: string }
  | { kind: 'off_topic' }
  | { kind: 'unclear' };

export type GuidedEvent =
  | { type: 'classified'; protocol: Protocol | null }
  // Résultat de /clarify/ : une question (modèle) ou null → repli.
  | { type: 'clarified'; question: string | null }
  | { type: 'unavailable' } // 503 classifier_unavailable ou hors ligne (classify/clarify)
  | { type: 'chooseVariant'; variant: VariantKey }
  | { type: 'answer'; key: string } // clé d'option (tap bouton ou intent answer:)
  | { type: 'next' } // étape suivante / fin de bloc
  // Résultat de /intent/ (texte libre pendant un protocole).
  | { type: 'intent'; outcome: IntentOutcome }
  // 503/hors ligne pendant un protocole (phase question/block).
  | { type: 'intentUnavailable' }
  | { type: 'switchLoaded'; protocol: Protocol };

export type GuidedEffect = { type: 'loadProtocol'; id: string };

export interface GuidedCtx {
  lang: UiLang;
  emergencyNumber: string;
  protocols: { id: string; title: string }[]; // pour les boutons de repli
}

export interface GuidedResult {
  state: GuidedState;
  bubbles: GuidedBubble[];
  effect?: GuidedEffect;
}

export function initialGuided(): GuidedState {
  return {
    protocolId: null,
    variant: null,
    variantAsked: false,
    clarifyTurn: 0,
    phase: { kind: 'idle' },
  };
}

// Un bloc a-t-il besoin d'une variante (steps par âge) ?
function blockNeedsVariant(protocol: Protocol, blockId: string): boolean {
  const block = protocol.action_blocks[blockId];
  return !!block && !!block.variants;
}

// ---- Constructeurs de bulles ----
function emergencyBubble(number: string): GuidedBubble {
  return { kind: 'emergency', number };
}

function variantPrompt(protocol: Protocol, pendingBlockId: string): GuidedBubble {
  const options = variantKeys(protocol).map((k) => ({ key: k, label: protocol.variants[k] as string }));
  return { kind: 'prompt', choiceKind: 'variant', refId: pendingBlockId, textKey: 'chooseAge', options };
}

function questionPrompt(protocol: Protocol, qid: string): GuidedBubble {
  const q = protocol.decision_tree.questions[qid];
  const options = Object.entries(q.answers).map(([key, a]) => ({ key, label: a.label }));
  return { kind: 'prompt', choiceKind: 'question', refId: qid, text: q.text, options };
}

function stepBubble(
  protocol: Protocol,
  variant: VariantKey | null,
  blockId: string,
  stepIndex: number,
): GuidedBubble | null {
  const block = protocol.action_blocks[blockId];
  if (!block) return null;
  const steps = resolveBlockSteps(block, variant);
  const step = steps[stepIndex];
  if (!step) return null;
  return {
    kind: 'step',
    blockId,
    blockTitle: block.title,
    text: step.text,
    stepNumber: step.number,
    stepTotal: steps.length,
    stepIndex,
    isLast: stepIndex >= steps.length - 1,
    timerSeconds: step.timer_seconds,
    source: formatSource(step.source),
  };
}

// Démarre (ou redémarre) un protocole : bulle d'appel puis DIRECTEMENT la 1re
// question de l'arbre. La variante n'est jamais demandée à l'entrée.
// `variant`/`variantAsked` permettent de conserver l'âge lors d'un switch_to.
function startProtocol(
  protocol: Protocol,
  variant: VariantKey | null,
  variantAsked: boolean,
  clarifyTurn: number,
): GuidedResult {
  const entry = protocol.decision_tree.entry;
  return {
    state: {
      protocolId: protocol.id,
      variant,
      variantAsked,
      clarifyTurn,
      phase: { kind: 'question', qid: entry },
    },
    bubbles: [emergencyBubble(protocol.emergency_number), questionPrompt(protocol, entry)],
  };
}

// Question de clarification du modèle (déjà validée par le backend) : affichée
// telle quelle, phase precision, turn incrémenté. Ni bouton d'appel ni liste —
// le message suivant sera reclassifié avec le contexte.
function clarifyQuestion(state: GuidedState, question: string): GuidedResult {
  return {
    state: { ...state, protocolId: null, clarifyTurn: state.clarifyTurn + 1, phase: { kind: 'precision' } },
    bubbles: [{ kind: 'modelText', text: question }],
  };
}

function fallback(ctx: GuidedCtx, state: GuidedState, textKey: TextKey): GuidedResult {
  return {
    state: {
      protocolId: null,
      variant: null,
      variantAsked: false,
      clarifyTurn: state.clarifyTurn,
      phase: { kind: 'no_protocol' },
    },
    bubbles: [
      { kind: 'say', textKey },
      { kind: 'callButton', number: ctx.emergencyNumber },
      { kind: 'protocols', items: ctx.protocols },
    ],
  };
}

// Repose la bulle en cours (question ou étape de bloc) sans changer d'état.
function rePoseCurrent(protocol: Protocol, state: GuidedState): GuidedBubble[] {
  if (state.phase.kind === 'question') return [questionPrompt(protocol, state.phase.qid)];
  if (state.phase.kind === 'block') {
    const b = stepBubble(protocol, state.variant, state.phase.blockId, state.phase.stepIndex);
    return b ? [b] : [];
  }
  return [];
}

// Entre dans un bloc. Si le bloc a des variantes et que l'âge n'a pas encore été
// demandé pour ce protocole, on demande l'âge d'abord (une seule fois), en
// mémorisant le bloc cible. Sinon on affiche la 1re étape.
function enterBlock(protocol: Protocol, state: GuidedState, blockId: string): GuidedResult {
  if (blockNeedsVariant(protocol, blockId) && state.variant === null && !state.variantAsked) {
    return {
      state: { ...state, protocolId: protocol.id, phase: { kind: 'variant', pendingBlockId: blockId } },
      bubbles: [variantPrompt(protocol, blockId)],
    };
  }
  const bubble = stepBubble(protocol, state.variant, blockId, 0);
  if (bubble) {
    return {
      state: { ...state, protocolId: protocol.id, phase: { kind: 'block', blockId, stepIndex: 0 } },
      bubbles: [bubble],
    };
  }
  return applyTargetEnd(protocol, state, blockId);
}

function applyTargetEnd(protocol: Protocol, state: GuidedState, blockId: string): GuidedResult {
  const block = protocol.action_blocks[blockId];
  const end = resolveBlockEnd(block ?? { next_question: null });
  if (end.kind === 'question') {
    return {
      state: { ...state, protocolId: protocol.id, phase: { kind: 'question', qid: end.id } },
      bubbles: [questionPrompt(protocol, end.id)],
    };
  }
  return {
    state: { ...state, protocolId: protocol.id, phase: { kind: 'end' } },
    bubbles: [{ kind: 'say', textKey: 'protocolEnded' }],
  };
}

// Réducteur principal — pur et déterministe.
export function reduceGuided(
  ctx: GuidedCtx,
  state: GuidedState,
  event: GuidedEvent,
  protocol: Protocol | null,
): GuidedResult {
  switch (event.type) {
    case 'classified': {
      // Scénario reconnu : démarrage direct (jamais de variante à l'entrée). Le
      // cas null est traité par le flux via /clarify/ (événement 'clarified').
      if (event.protocol) return startProtocol(event.protocol, null, false, state.clarifyTurn);
      return fallback(ctx, state, 'noProtocol');
    }

    case 'clarified': {
      // Résultat de /clarify/. Une question valide → on la pose (turn+1), tant
      // qu'on n'a pas atteint CLARIFY_MAX_TURNS. Sinon (question null ou quota) →
      // repli « pas de protocole validé ».
      if (event.question !== null && state.clarifyTurn < CLARIFY_MAX_TURNS) {
        return clarifyQuestion(state, event.question);
      }
      return fallback(ctx, state, 'noProtocol');
    }

    case 'unavailable':
      return fallback(ctx, state, 'assistantUnavailable');

    case 'switchLoaded': {
      // Conserver l'âge si le protocole cible déclare la même variante, sinon redemander.
      const keep =
        state.variant !== null && variantKeys(event.protocol).includes(state.variant)
          ? state.variant
          : null;
      return startProtocol(event.protocol, keep, keep !== null, state.clarifyTurn);
    }

    case 'chooseVariant': {
      // Âge choisi : on entre enfin dans le bloc mémorisé, une fois pour toutes.
      if (!protocol || state.phase.kind !== 'variant') return { state, bubbles: [] };
      const pending = state.phase.pendingBlockId;
      return enterBlock(protocol, { ...state, variant: event.variant, variantAsked: true }, pending);
    }

    case 'answer': {
      if (!protocol || state.phase.kind !== 'question') return { state, bubbles: [] };
      const target = resolveAnswer(protocol, state.phase.qid, event.key);
      if (target.kind === 'switch') {
        return {
          state,
          bubbles: [{ kind: 'say', textKey: 'switchingTo' }],
          effect: { type: 'loadProtocol', id: target.to },
        };
      }
      if (target.kind === 'block') return enterBlock(protocol, state, target.id);
      if (target.kind === 'question') {
        return {
          state: { ...state, phase: { kind: 'question', qid: target.id } },
          bubbles: [questionPrompt(protocol, target.id)],
        };
      }
      return {
        state: { ...state, phase: { kind: 'end' } },
        bubbles: [{ kind: 'say', textKey: 'protocolEnded' }],
      };
    }

    case 'next': {
      if (!protocol || state.phase.kind !== 'block') return { state, bubbles: [] };
      const { blockId, stepIndex } = state.phase;
      const nextBubble = stepBubble(protocol, state.variant, blockId, stepIndex + 1);
      if (nextBubble) {
        return {
          state: { ...state, phase: { kind: 'block', blockId, stepIndex: stepIndex + 1 } },
          bubbles: [nextBubble],
        };
      }
      return applyTargetEnd(protocol, state, blockId);
    }

    case 'intent': {
      // Texte libre pendant un protocole (phase question/block). /intent/ a résolu
      // une intention parmi des options fixes. Aucun texte médical ici.
      if (!protocol) return { state, bubbles: [] };
      const o = event.outcome;
      switch (o.kind) {
        case 'answer':
          // Équivaut à un tap sur ce bouton : on réapplique la logique d'arbre.
          return reduceGuided(ctx, state, { type: 'answer', key: o.key }, protocol);
        case 'switch':
          return {
            state,
            bubbles: [{ kind: 'say', textKey: 'switchingTo' }],
            effect: { type: 'loadProtocol', id: o.id },
          };
        case 'red_flag': {
          // « Signe d'alerte : <label> » + 442. Si le red flag bascule vers un
          // autre protocole publiable, on l'annonce et on le charge.
          const bubbles: GuidedBubble[] = [
            { kind: 'redFlag', label: o.label },
            { kind: 'callButton', number: ctx.emergencyNumber },
          ];
          if (o.switchTo) {
            bubbles.push({ kind: 'say', textKey: 'switchingTo' });
            return { state, bubbles, effect: { type: 'loadProtocol', id: o.switchTo } };
          }
          // Pas de bascule : on repose la bulle en cours.
          return { state, bubbles: [...bubbles, ...rePoseCurrent(protocol, state)] };
        }
        case 'off_topic':
          // Hors sujet : « ce point n'est pas couvert » + 442, puis on repose.
          return {
            state,
            bubbles: [
              { kind: 'say', textKey: 'notCovered' },
              { kind: 'callButton', number: ctx.emergencyNumber },
              ...rePoseCurrent(protocol, state),
            ],
          };
        case 'unclear':
        default:
          // Pas tranché : « je n'ai pas compris » puis on repose.
          return {
            state,
            bubbles: [{ kind: 'say', textKey: 'notUnderstood' }, ...rePoseCurrent(protocol, state)],
          };
      }
    }

    case 'intentUnavailable': {
      // 503/hors ligne pendant un protocole. En phase question : les boutons
      // restent, on invite à taper dessus. En phase block : comme off_topic.
      if (!protocol) return { state, bubbles: [] };
      if (state.phase.kind === 'question') {
        return {
          state,
          bubbles: [{ kind: 'say', textKey: 'tapButtons' }, ...rePoseCurrent(protocol, state)],
        };
      }
      return {
        state,
        bubbles: [
          { kind: 'say', textKey: 'notCovered' },
          { kind: 'callButton', number: ctx.emergencyNumber },
          ...rePoseCurrent(protocol, state),
        ],
      };
    }

    default:
      return { state, bubbles: [] };
  }
}
