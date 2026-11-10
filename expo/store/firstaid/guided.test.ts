// Tests de la machine à états du mode guidé (bun test).
// Couvre : classify → variante → question → bloc → next_question → switch_to → fin ;
// message libre hors question → rappel 442 SANS effet (aucun appel modèle) ; 503 → repli.
import { expect, test, describe } from 'bun:test';
import { reduceGuided, initialGuided, type GuidedCtx, type GuidedBubble } from './guided';
import type { Protocol, SourceRef } from '@/types/firstaid';

const SRC: SourceRef = { key: 'ifrc_2025_en', page: 162 };
const step = (n: number, text: string) => ({ number: n, text, visual: '', timer_seconds: null, source: SRC });

const CARDIAC = {
  id: 'cardiac_arrest',
  lang: 'fr',
  title: 'Arrêt cardiaque',
  description: 'desc',
  version: 4,
  updated_at: '2026-11-09',
  status: 'draft_unvalidated',
  call_emergency_first: true,
  variants: { adult: 'Adulte', child: 'Enfant', infant: 'Nourrisson' },
  decision_tree: {
    entry: 'q_breathing',
    questions: {
      q_breathing: {
        text: 'La personne respire-t-elle normalement ?',
        answers: {
          yes: { label: 'Oui', next_question: null, action_block: null, switch_to: 'unconscious_breathing' },
          no: { label: 'Non', next_question: 'q_breaths', action_block: null, switch_to: null },
        },
      },
      q_breaths: {
        text: 'Insufflations ?',
        answers: {
          yes: { label: 'Oui', next_question: null, action_block: 'cpr', switch_to: null },
          no: { label: 'Non', next_question: null, action_block: 'compressions', switch_to: null },
        },
      },
      q_aed: {
        text: 'Défibrillateur disponible ?',
        answers: {
          yes: { label: 'Oui', next_question: null, action_block: 'aed', switch_to: null },
          no: { label: 'Non', next_question: null, action_block: 'cont', switch_to: null },
        },
      },
    },
  },
  action_blocks: {
    cpr: {
      id: 'cpr',
      title: 'RCP avec insufflations',
      next_question: 'q_aed',
      variants: { adult: [step(1, 'Compressions'), step(2, 'Insufflations')], child: [step(1, 'C')], infant: [step(1, 'I')] },
    },
    compressions: { id: 'compressions', title: 'Compressions seules', next_question: 'q_aed', steps: [step(1, 'Pousser fort')] },
    aed: { id: 'aed', title: 'Défibrillateur', next_question: null, variants: { adult: [step(1, 'Collez les électrodes')] } },
    cont: { id: 'cont', title: 'Poursuivre', next_question: null, steps: [step(1, 'Continuez la RCP')] },
  },
  red_flags: [{ text: 'Reprise de la respiration', source: SRC, switch_to: 'unconscious_breathing' }],
  do_not: [{ text: 'Ne cherchez pas le pouls', source: SRC }],
  sources: [],
  validated_by: [],
  emergency_number: '442',
} as unknown as Protocol;

const UNCONSCIOUS = {
  ...CARDIAC,
  id: 'unconscious_breathing',
  title: 'Inconsciente qui respire',
  variants: {},
  decision_tree: {
    entry: 'q_u',
    questions: {
      q_u: { text: 'Hémorragie visible ?', answers: { yes: { label: 'Oui', next_question: null, action_block: 'pls', switch_to: null }, no: { label: 'Non', next_question: null, action_block: 'pls', switch_to: null } } },
    },
  },
  action_blocks: { pls: { id: 'pls', title: 'PLS', next_question: null, steps: [step(1, 'Mettez en PLS')] } },
} as unknown as Protocol;

const CTX: GuidedCtx = {
  lang: 'fr',
  emergencyNumber: '442',
  protocols: [
    { id: 'cardiac_arrest', title: 'Arrêt cardiaque' },
    { id: 'unconscious_breathing', title: 'Inconsciente qui respire' },
  ],
};

const kinds = (bubbles: GuidedBubble[]) => bubbles.map((b) => b.kind);

describe('parcours complet classify → variante → question → bloc → next_question → fin', () => {
  test('classify avec protocole → appel + choix de variante', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['emergency', 'prompt']);
    expect(r.state.phase).toEqual({ kind: 'variant' });
    const prompt = r.bubbles[1];
    expect(prompt.kind === 'prompt' && prompt.choiceKind).toBe('variant');
    expect(prompt.kind === 'prompt' && prompt.options.map((o) => o.key)).toEqual(['adult', 'child', 'infant']);
  });

  test('variante → première question de l\'arbre', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    const r = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_breathing' });
    expect(r.state.variant).toBe('adult');
    const p = r.bubbles[0];
    expect(p.kind === 'prompt' && p.text).toBe('La personne respire-t-elle normalement ?');
  });

  test('question → bloc → next (étape 2) → next_question → bloc plat → fin', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state;
    // réponse "non" → q_breaths
    let r = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_breaths' });
    s = r.state;
    // "oui" → bloc cpr, étape 1/2
    r = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'block', blockId: 'cpr', stepIndex: 0 });
    const st0 = r.bubbles[0];
    expect(st0.kind === 'step' && st0.stepTotal).toBe(2);
    expect(st0.kind === 'step' && st0.text).toBe('Compressions');
    s = r.state;
    // next → étape 2/2 (isLast)
    r = reduceGuided(CTX, s, { type: 'next' }, CARDIAC);
    const st1 = r.bubbles[0];
    expect(st1.kind === 'step' && st1.stepIndex).toBe(1);
    expect(st1.kind === 'step' && st1.isLast).toBe(true);
    s = r.state;
    // next (dernière) → next_question q_aed
    r = reduceGuided(CTX, s, { type: 'next' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_aed' });
    s = r.state;
    // "non" → bloc cont (plat, 1 étape, isLast) puis next → fin
    r = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'block', blockId: 'cont', stepIndex: 0 });
    s = r.state;
    r = reduceGuided(CTX, s, { type: 'next' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'end' });
    expect(kinds(r.bubbles)).toEqual(['say']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('protocolEnded');
  });
});

describe('switch_to', () => {
  test('réponse → effet loadProtocol + annonce, puis switchLoaded repart sur l\'autre protocole', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state;
    const r = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC); // q_breathing "oui" → switch
    expect(r.effect).toEqual({ type: 'loadProtocol', id: 'unconscious_breathing' });
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('switchingTo');
    // chargement effectué par l'écran :
    const r2 = reduceGuided(CTX, r.state, { type: 'switchLoaded', protocol: UNCONSCIOUS }, UNCONSCIOUS);
    expect(r2.state.protocolId).toBe('unconscious_breathing');
    // pas de variantes → directement la question d'entrée
    expect(r2.state.phase).toEqual({ kind: 'question', qid: 'q_u' });
    expect(kinds(r2.bubbles)).toEqual(['emergency', 'prompt']);
  });

  test('red flag avec switch_to : la cible est bien portée par le protocole', () => {
    expect(CARDIAC.red_flags[0].switch_to).toBe('unconscious_breathing');
  });
});

describe('message libre hors question (bloc) → rappel 442, AUCUN appel modèle', () => {
  test('freeOutOfContext ne produit aucun effet et repose la bulle courante', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC).state; // bloc cpr
    const r = reduceGuided(CTX, s, { type: 'freeOutOfContext' }, CARDIAC);
    expect(r.effect).toBeUndefined(); // aucun appel réseau/modèle
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'step']); // 442 + repose l'étape
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('notCovered');
    expect(r.state.phase.kind).toBe('block'); // phase inchangée
  });
});

describe('repli', () => {
  test('503 / indisponible → message + appel + liste des protocoles', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'unavailable' }, null);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'protocols']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('assistantUnavailable');
    expect(r.state.phase).toEqual({ kind: 'no_protocol' });
    const protos = r.bubbles[2];
    expect(protos.kind === 'protocols' && protos.items.length).toBe(2);
  });

  test('scenario null → « pas de protocole validé » + appel + liste', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: null }, null);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'protocols']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('noProtocol');
  });

  test('answerUnresolved → repose la question', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state;
    const r = reduceGuided(CTX, s, { type: 'answerUnresolved' }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say', 'prompt']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('reAsk');
  });
});
