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
  variants: { adult: 'Adulte', child: 'Enfant', infant: 'Nourrisson' },
  decision_tree: {
    entry: 'q_u',
    questions: {
      q_u: { text: 'Hémorragie visible ?', answers: { yes: { label: 'Oui', next_question: null, action_block: 'pls', switch_to: null }, no: { label: 'Non', next_question: null, action_block: 'pls', switch_to: null } } },
    },
  },
  action_blocks: { pls: { id: 'pls', title: 'PLS', next_question: null, steps: [step(1, 'Mettez en PLS')] } },
} as unknown as Protocol;

// Variante sans « adult » : sert à vérifier qu'un switch depuis adult redemande l'âge.
const NOADULT = {
  ...UNCONSCIOUS,
  id: 'noadult',
  variants: { child: 'Enfant', infant: 'Nourrisson' },
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

describe('entrée directe sur l\'arbre, âge demandé au 1er bloc à variantes', () => {
  test('classify → appel + PREMIÈRE QUESTION (pas de variante à l\'entrée)', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['emergency', 'prompt']);
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_breathing' });
    expect(r.state.variant).toBeNull();
    expect(r.state.variantAsked).toBe(false);
    const p = r.bubbles[1];
    expect(p.kind === 'prompt' && p.choiceKind).toBe('question');
    expect(p.kind === 'prompt' && p.text).toBe('La personne respire-t-elle normalement ?');
  });

  test('« no » → question suivante, PUIS entrée cpr → bulle d\'âge', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    // "non" → q_breaths (rescue breaths), toujours aucune variante demandée
    let r = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_breaths' });
    expect(r.state.variantAsked).toBe(false);
    s = r.state;
    // "oui" → bloc cpr (à variantes) → on demande l'âge AVANT d'entrer
    r = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'variant', pendingBlockId: 'cpr' });
    const prompt = r.bubbles[0];
    expect(prompt.kind === 'prompt' && prompt.choiceKind).toBe('variant');
    expect(prompt.kind === 'prompt' && prompt.options.map((o) => o.key)).toEqual(['adult', 'child', 'infant']);
    s = r.state;
    // âge choisi → on entre enfin dans cpr, étape 1/2
    r = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'block', blockId: 'cpr', stepIndex: 0 });
    expect(r.state.variant).toBe('adult');
    expect(r.state.variantAsked).toBe(true);
    const st0 = r.bubbles[0];
    expect(st0.kind === 'step' && st0.text).toBe('Compressions');
  });

  test('âge demandé une seule fois : le 2e bloc à variantes (aed) ne redemande pas', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC).state; // q_breaths
    s = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC).state; // variant{cpr}
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state; // cpr step0
    s = reduceGuided(CTX, s, { type: 'next' }, CARDIAC).state; // cpr step1
    let r = reduceGuided(CTX, s, { type: 'next' }, CARDIAC); // fin cpr → next_question q_aed
    expect(r.state.phase).toEqual({ kind: 'question', qid: 'q_aed' });
    s = r.state;
    // "oui" → bloc aed (à variantes) mais variantAsked=true → PAS de nouvelle bulle d'âge
    r = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC);
    expect(r.state.phase).toEqual({ kind: 'block', blockId: 'aed', stepIndex: 0 });
    expect(r.bubbles[0].kind).toBe('step');
  });

  test('protocole sans variantes (bloc plat) : aucune bulle d\'âge', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC).state; // q_breaths
    const r = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC); // → bloc compressions (plat)
    expect(r.state.phase).toEqual({ kind: 'block', blockId: 'compressions', stepIndex: 0 });
    expect(r.bubbles[0].kind).toBe('step');
  });
});

describe('switch_to', () => {
  test('réponse → effet loadProtocol + annonce, puis switchLoaded repart sur l\'autre protocole', () => {
    const s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    const r = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC); // q_breathing "oui" → switch
    expect(r.effect).toEqual({ type: 'loadProtocol', id: 'unconscious_breathing' });
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('switchingTo');
    const r2 = reduceGuided(CTX, r.state, { type: 'switchLoaded', protocol: UNCONSCIOUS }, UNCONSCIOUS);
    expect(r2.state.protocolId).toBe('unconscious_breathing');
    expect(r2.state.phase).toEqual({ kind: 'question', qid: 'q_u' });
    expect(kinds(r2.bubbles)).toEqual(['emergency', 'prompt']);
  });

  test('switch_to CONSERVE la variante si le protocole cible la déclare', () => {
    const s = { protocolId: 'cardiac_arrest', variant: 'adult' as const, variantAsked: true, clarifyTurn: 0, phase: { kind: 'question' as const, qid: 'q_breathing' } };
    const r = reduceGuided(CTX, s, { type: 'switchLoaded', protocol: UNCONSCIOUS }, UNCONSCIOUS);
    expect(r.state.variant).toBe('adult');
    expect(r.state.variantAsked).toBe(true);
  });

  test('switch_to REDEMANDE l\'âge si la variante n\'existe pas dans la cible', () => {
    const s = { protocolId: 'cardiac_arrest', variant: 'adult' as const, variantAsked: true, clarifyTurn: 0, phase: { kind: 'question' as const, qid: 'q_breathing' } };
    const r = reduceGuided(CTX, s, { type: 'switchLoaded', protocol: NOADULT }, NOADULT);
    expect(r.state.variant).toBeNull();
    expect(r.state.variantAsked).toBe(false);
  });

  test('red flag avec switch_to : la cible est bien portée par le protocole', () => {
    expect(CARDIAC.red_flags[0].switch_to).toBe('unconscious_breathing');
  });
});

describe('texte libre hors sujet pendant un bloc → rappel 442, on repose l’étape', () => {
  test('intent off_topic en phase block : 442 + repose l’étape, phase inchangée', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC).state; // q_breaths
    s = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC).state; // variant{cpr}
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state; // bloc cpr
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'off_topic' } }, CARDIAC);
    expect(r.effect).toBeUndefined();
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'step']); // 442 + repose l'étape
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('notCovered');
    expect(r.state.phase.kind).toBe('block'); // phase inchangée
  });

  test('intentUnavailable en phase block → comme off_topic', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'answer', key: 'yes' }, CARDIAC).state;
    s = reduceGuided(CTX, s, { type: 'chooseVariant', variant: 'adult' }, CARDIAC).state;
    const r = reduceGuided(CTX, s, { type: 'intentUnavailable' }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'step']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('notCovered');
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

  test('scenario null (classified) → repli direct « pas de protocole validé »', () => {
    // La boucle de clarification est pilotée par le flux (événement clarified) ;
    // un classified null isolé retombe sur le repli.
    const r = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: null }, null);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'protocols']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('noProtocol');
  });
});

describe('clarification (clarify) en boucle', () => {
  test('tour 1 : question du modèle → bulle modelText, phase precision, turn=1', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'clarified', question: 'La personne respire-t-elle ?' }, null);
    expect(kinds(r.bubbles)).toEqual(['modelText']);
    expect(r.bubbles[0].kind === 'modelText' && r.bubbles[0].text).toBe('La personne respire-t-elle ?');
    expect(r.state.phase).toEqual({ kind: 'precision' });
    expect(r.state.clarifyTurn).toBe(1);
  });

  test('null → clarify 1 → clarify 2 → clarify 3 → repli', () => {
    let s = reduceGuided(CTX, initialGuided(), { type: 'clarified', question: 'Q1 ?' }, null).state;
    expect(s.clarifyTurn).toBe(1);
    s = reduceGuided(CTX, s, { type: 'clarified', question: 'Q2 ?' }, null).state;
    expect(s.clarifyTurn).toBe(2);
    // 3e question : turn passe à 3 (dernière question permise).
    const r3 = reduceGuided(CTX, s, { type: 'clarified', question: 'Q3 ?' }, null);
    expect(kinds(r3.bubbles)).toEqual(['modelText']);
    expect(r3.state.clarifyTurn).toBe(3);
    // 4e clarification demandée alors que turn=3 → repli (quota atteint).
    const r4 = reduceGuided(CTX, r3.state, { type: 'clarified', question: 'Q4 ?' }, null);
    expect(kinds(r4.bubbles)).toEqual(['say', 'callButton', 'protocols']);
    expect(r4.bubbles[0].kind === 'say' && r4.bubbles[0].textKey).toBe('noProtocol');
  });

  test('question null → repli immédiat', () => {
    const r = reduceGuided(CTX, initialGuided(), { type: 'clarified', question: null }, null);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'protocols']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('noProtocol');
  });

  test('clarifyTurn conservé quand on finit par démarrer un protocole', () => {
    const s = reduceGuided(CTX, initialGuided(), { type: 'clarified', question: 'Q1 ?' }, null).state;
    const r = reduceGuided(CTX, s, { type: 'classified', protocol: CARDIAC }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['emergency', 'prompt']);
    expect(r.state.clarifyTurn).toBe(1);
    expect(r.state.phase.kind).toBe('question');
  });
});

// Protocole minimal pour tester /intent/ : une question d'entrée + un bloc +
// un red flag qui bascule, dans un contexte à deux protocoles publiables.
function intentFixture() {
  // On réutilise CARDIAC (phase question à l'entrée). On construit des états.
  const entry = reduceGuided(CTX, initialGuided(), { type: 'classified', protocol: CARDIAC }, CARDIAC);
  return entry.state; // phase question q_breathing
}

describe('texte libre pendant un protocole (intent)', () => {
  test('answer: → même effet qu’un tap sur le bouton (avance dans l’arbre)', () => {
    const s = intentFixture();
    const viaIntent = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'answer', key: 'no' } }, CARDIAC);
    const viaTap = reduceGuided(CTX, s, { type: 'answer', key: 'no' }, CARDIAC);
    expect(kinds(viaIntent.bubbles)).toEqual(kinds(viaTap.bubbles));
    expect(viaIntent.state.phase).toEqual(viaTap.state.phase);
  });

  test('red_flag sans bascule → bulle redFlag + 442 + on repose la question', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'red_flag', label: 'Lèvres bleues' } }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['redFlag', 'callButton', 'prompt']);
    expect(r.bubbles[0].kind === 'redFlag' && r.bubbles[0].label).toBe('Lèvres bleues');
    expect(r.state.phase).toEqual(s.phase); // inchangé
  });

  test('red_flag avec switch → bulle redFlag + 442 + annonce + effet loadProtocol', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'red_flag', label: 'X', switchTo: 'unconscious' } }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['redFlag', 'callButton', 'say']);
    expect(r.bubbles[2].kind === 'say' && r.bubbles[2].textKey).toBe('switchingTo');
    expect(r.effect).toEqual({ type: 'loadProtocol', id: 'unconscious' });
  });

  test('switch: → annonce + effet loadProtocol', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'switch', id: 'unconscious' } }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say']);
    expect(r.effect).toEqual({ type: 'loadProtocol', id: 'unconscious' });
  });

  test('off_topic → « pas couvert » + 442 + on repose', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'off_topic' } }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say', 'callButton', 'prompt']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('notCovered');
  });

  test('unclear → « je n’ai pas compris » + on repose', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intent', outcome: { kind: 'unclear' } }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say', 'prompt']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('notUnderstood');
  });

  test('intentUnavailable en phase question → inviter à taper sur les boutons + repose', () => {
    const s = intentFixture();
    const r = reduceGuided(CTX, s, { type: 'intentUnavailable' }, CARDIAC);
    expect(kinds(r.bubbles)).toEqual(['say', 'prompt']);
    expect(r.bubbles[0].kind === 'say' && r.bubbles[0].textKey).toBe('tapButtons');
  });
});

describe('reset (nouvelle conversation)', () => {
  test('initialGuided remet tout à zéro', () => {
    const s = reduceGuided(CTX, initialGuided(), { type: 'clarified', question: 'Q ?' }, null).state;
    expect(s.clarifyTurn).toBe(1);
    const fresh = initialGuided();
    expect(fresh).toEqual({
      protocolId: null, variant: null, variantAsked: false, clarifyTurn: 0, phase: { kind: 'idle' },
    });
  });
});
