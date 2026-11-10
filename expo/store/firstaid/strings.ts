// Libellés de l'INTERFACE du chat (chrome), bilingues fr/en.
// Ce ne sont PAS des contenus de protocole : le texte médical vient toujours
// de l'API, tel quel. Ici uniquement les mots de l'app (boutons, phrases de
// l'assistant qui ne proviennent pas du modèle).
import type { UiLang } from '@/constants/i18n';

export interface ChatStrings {
  next: string;
  finish: string;
  redFlags: string;
  doNot: string;
  callEmergency: string;
  chooseSituation: string;
  chooseAge: string;
  precisionQuestion: string; // question de précision fixe quand le scénario est null
  noProtocol: string; // « je n'ai pas de protocole validé pour cette situation »
  assistantUnavailable: string; // 503 / hors ligne
  switchingTo: string; // annonce de bascule switch_to (une phrase, pas le modèle)
  notCovered: string; // message libre hors question pendant le mode guidé
  reAsk: string; // « je repose la question »
  stepLabel: (n: number, total: number) => string;
  protocolEnded: string;
  testBanner: string;
  placeholder: string;
  headerTitle: string;
  headerSubtitle: string;
  intro: string;
}

const EMERGENCY_PLACEHOLDER = '{n}';

export const STRINGS: Record<UiLang, ChatStrings> = {
  fr: {
    next: 'Suivant',
    finish: 'Terminer',
    redFlags: "Signes d'alerte",
    doNot: 'À ne pas faire',
    callEmergency: `Appeler les secours · ${EMERGENCY_PLACEHOLDER}`,
    chooseSituation: 'Choisissez la situation :',
    chooseAge: "Quel est l'âge de la personne ?",
    precisionQuestion:
      'Pour vous guider, dites-moi : la personne est-elle consciente ? Respire-t-elle normalement ? Y a-t-il du sang ?',
    noProtocol: "Je n'ai pas de protocole validé pour cette situation.",
    assistantUnavailable: "Assistant indisponible. Choisissez une situation dans la liste.",
    switchingTo: 'Je bascule sur le protocole adapté.',
    notCovered: `Ce point n'est pas couvert par le protocole, appelez le ${EMERGENCY_PLACEHOLDER}.`,
    reAsk: 'Je repose la question.',
    stepLabel: (n, total) => `Étape ${n} / ${total}`,
    protocolEnded: 'Fin du protocole.',
    testBanner: 'Données de test, non validées médicalement',
    placeholder: "Décrivez la situation d'urgence…",
    headerTitle: 'Assistant Urgence',
    headerSubtitle: 'Premiers secours',
    intro: "Décrivez la situation d'urgence. Je lance le protocole adapté.",
  },
  en: {
    next: 'Next',
    finish: 'Finish',
    redFlags: 'Warning signs',
    doNot: 'What not to do',
    callEmergency: `Call emergency services · ${EMERGENCY_PLACEHOLDER}`,
    chooseSituation: 'Choose the situation:',
    chooseAge: 'How old is the person?',
    precisionQuestion:
      'To guide you, tell me: is the person conscious? Are they breathing normally? Is there any blood?',
    noProtocol: "I don't have a validated protocol for this situation.",
    assistantUnavailable: 'Assistant unavailable. Pick a situation from the list.',
    switchingTo: 'Switching to the appropriate protocol.',
    notCovered: `This point is not covered by the protocol, call ${EMERGENCY_PLACEHOLDER}.`,
    reAsk: 'Let me ask again.',
    stepLabel: (n, total) => `Step ${n} / ${total}`,
    protocolEnded: 'End of protocol.',
    testBanner: 'Test data, not medically validated',
    placeholder: 'Describe the emergency…',
    headerTitle: 'Emergency Assistant',
    headerSubtitle: 'First aid',
    intro: 'Describe the emergency. I will start the right protocol.',
  },
};

// Insère le numéro d'urgence dans un libellé qui contient le marqueur {n}.
export function withNumber(label: string, emergencyNumber: string): string {
  return label.replace(EMERGENCY_PLACEHOLDER, emergencyNumber);
}
