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
  | 'chooseAge'
  | 'protocolEnded';

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
  | { kind: 'callButton'; number: string };

export type GuidedPhase =
  | { kind: 'idle' }
  // Choix d'âge demandé AVANT d'entrer dans le bloc à variantes mémorisé.
  | { kind: 'variant'; pendingBlockId: string }
  | { kind: 'question'; qid: string }
  | { kind: 'block'; blockId: string; stepIndex: number }
  | { kind: 'end' }
  | { kind: 'no_protocol' };

export interface GuidedState {
  protocolId: string | null;
  variant: VariantKey | null;
  // L'âge n'est demandé qu'une fois par protocole : mémorisé ici.
  variantAsked: boolean;
  phase: GuidedPhase;
}

export type GuidedEvent =
  | { type: 'classified'; protocol: Protocol | null }
  | { type: 'unavailable' } // 503 classifier_unavailable ou hors ligne
  | { type: 'chooseVariant'; variant: VariantKey }
  | { type: 'answer'; key: string } // clé d'option (bouton ou /answer/ résolu)
  | { type: 'answerUnresolved' } // /answer/ a renvoyé null → reposer
  | { type: 'next' } // étape suivante / fin de bloc
  | { type: 'freeOutOfContext' } // message libre hors question (bloc/fin)
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
  return { protocolId: null, variant: null, variantAsked: false, phase: { kind: 'idle' } };
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
): GuidedResult {
  const entry = protocol.decision_tree.entry;
  return {
    state: { protocolId: protocol.id, variant, variantAsked, phase: { kind: 'question', qid: entry } },
    bubbles: [emergencyBubble(protocol.emergency_number), questionPrompt(protocol, entry)],
  };
}

function fallback(ctx: GuidedCtx, textKey: TextKey): GuidedResult {
  return {
    state: { protocolId: null, variant: null, variantAsked: false, phase: { kind: 'no_protocol' } },
    bubbles: [
      { kind: 'say', textKey },
      { kind: 'callButton', number: ctx.emergencyNumber },
      { kind: 'protocols', items: ctx.protocols },
    ],
  };
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
    case 'classified':
      // Jamais de variante à l'entrée : directement la 1re question.
      if (event.protocol) return startProtocol(event.protocol, null, false);
      return fallback(ctx, 'noProtocol');

    case 'unavailable':
      return fallback(ctx, 'assistantUnavailable');

    case 'switchLoaded': {
      // Conserver l'âge si le protocole cible déclare la même variante, sinon redemander.
      const keep =
        state.variant !== null && variantKeys(event.protocol).includes(state.variant)
          ? state.variant
          : null;
      return startProtocol(event.protocol, keep, keep !== null);
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

    case 'answerUnresolved': {
      // /answer/ n'a pas tranché : on repose la question (ou l'âge).
      if (!protocol) return { state, bubbles: [] };
      if (state.phase.kind === 'question') {
        return { state, bubbles: [{ kind: 'say', textKey: 'reAsk' }, questionPrompt(protocol, state.phase.qid)] };
      }
      if (state.phase.kind === 'variant') {
        return {
          state,
          bubbles: [{ kind: 'say', textKey: 'reAsk' }, variantPrompt(protocol, state.phase.pendingBlockId)],
        };
      }
      return { state, bubbles: [] };
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

    case 'freeOutOfContext': {
      // Message libre hors question (phase bloc/fin) : rappel 442, AUCUN appel au modèle,
      // puis on repose la bulle en cours.
      const bubbles: GuidedBubble[] = [
        { kind: 'say', textKey: 'notCovered' },
        { kind: 'callButton', number: ctx.emergencyNumber },
      ];
      if (protocol && state.phase.kind === 'block') {
        const b = stepBubble(protocol, state.variant, state.phase.blockId, state.phase.stepIndex);
        if (b) bubbles.push(b);
      } else if (protocol && state.phase.kind === 'question') {
        bubbles.push(questionPrompt(protocol, state.phase.qid));
      }
      return { state, bubbles };
    }

    default:
      return { state, bubbles: [] };
  }
}
