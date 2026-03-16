import Constants from 'expo-constants';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GROQ_API_KEY || process.env.EXPO_PUBLIC_GROQ_API_KEY;

export type OrdinogrammeModule = 'triage' | 'maternity' | 'general' | 'vaccination';

export type OrdinogrammeQuestion = {
  type: 'question';
  question: string;
  options: string[];
};

export type OrdinogrammeResult = {
  type: 'result';
  diagnosis: string;
  protocol: string[];
  medications: string[];
  urgency: 'faible' | 'modérée' | 'élevée' | 'critique';
  referral: boolean;
};

export type OrdinogrammeResponse = OrdinogrammeQuestion | OrdinogrammeResult;

const SYSTEM_PROMPT = `Tu es un assistant médical expert pour les médecins en Guinée. Tu guides le médecin avec un ordinogramme clinique structuré.

Pour chaque étape tu dois retourner un JSON avec :
- Si type='question': { type: 'question', question: string, options: string[] (max 4 options) }
- Si type='result': { type: 'result', diagnosis: string, protocol: string[], medications: string[], urgency: 'faible' | 'modérée' | 'élevée' | 'critique', referral: boolean }

Contexte guinéen : ressources limitées, paludisme fréquent, malnutrition, accès limité aux spécialistes.
Utilise les protocoles OMS adaptés à l'Afrique de l'Ouest.

IMPORTANT : Réponds UNIQUEMENT en JSON valide, pas de texte avant ou après le JSON.

Voici les règles par module :

TRIAGE URGENCES :
- Première question : "Quel est le motif d'urgence principal ?" Options: ["Détresse respiratoire", "Hémorragie", "Perte de conscience", "Convulsions", "Autre urgence"]
- Pose 3-5 questions pour évaluer la gravité
- Détermine l'urgence (faible/modérée/élevée/critique)

COMPLICATIONS MATERNITÉ :
- Première question : "Quel est le terme de la grossesse ?" Options: ["< 20 SA", "20-28 SA", "28-36 SA", "> 36 SA", "Post-partum"]
- Pose 3-5 questions sur les symptômes et signes
- Identifie les complications obstétricales

DIAGNOSTIC GÉNÉRAL :
- Première question : "Quel est le symptôme principal ?" Options: ["Fièvre", "Douleur abdominale", "Toux/Difficultés respiratoires", "Céphalées", "Autre symptôme"]
- Pose 3-5 questions de diagnostic différentiel
- Considère paludisme, infections courantes

CALENDRIER VACCINAL :
- Première question : "Quel est l'âge de l'enfant ?" Options: ["Naissance", "6 semaines", "10 semaines", "14 semaines", "9 mois", "18 mois", "> 2 ans"]
- Indique les vaccins dus selon PEV Guinée
- Vérifie les contre-indications`;

const MODULE_CONTEXTS = {
  triage: 'Module Triage Urgences - Évaluation rapide de la gravité',
  maternity: 'Module Complications Maternité - Dépistage des urgences obstétricales',
  general: 'Module Diagnostic Général - Diagnostic différentiel pathologies courantes',
  vaccination: 'Module Calendrier Vaccinal - Programme Élargi de Vaccination (PEV) Guinée',
};

export class OrdinogrammeService {
  private conversationHistory: Array<{ role: string; content: string }> = [];

  /**
   * Démarre une nouvelle session d'ordinogramme
   */
  async startSession(module: OrdinogrammeModule): Promise<OrdinogrammeQuestion> {
    this.conversationHistory = [];

    const moduleContext = MODULE_CONTEXTS[module];
    const userMessage = `Démarre le module: ${moduleContext}. Pose la première question.`;

    return this.sendMessage(userMessage) as Promise<OrdinogrammeQuestion>;
  }

  /**
   * Envoie une réponse du médecin et obtient la question suivante ou le résultat
   */
  async sendAnswer(answer: string): Promise<OrdinogrammeResponse> {
    const userMessage = `Réponse du médecin: "${answer}". ${
      this.conversationHistory.length < 10
        ? 'Pose la question suivante ou donne le résultat final si tu as assez d\'informations.'
        : 'Donne maintenant le résultat final avec le diagnostic et le protocole.'
    }`;

    return this.sendMessage(userMessage);
  }

  /**
   * Envoie un message à l'API Groq et parse la réponse
   */
  private async sendMessage(userMessage: string): Promise<OrdinogrammeResponse> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY non configurée');
    }

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      console.log('[Ordinogramme] Envoi requête à Groq:', userMessage);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            ...this.conversationHistory,
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Ordinogramme] Erreur API Groq:', response.status, errorText);
        throw new Error(`Erreur API Groq: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      console.log('[Ordinogramme] Réponse IA:', aiMessage);

      this.conversationHistory.push({
        role: 'assistant',
        content: aiMessage,
      });

      // Parser le JSON
      const parsed = JSON.parse(aiMessage);

      // Valider la structure
      if (parsed.type === 'question') {
        if (!parsed.question || !Array.isArray(parsed.options)) {
          throw new Error('Réponse IA invalide pour une question');
        }
        return parsed as OrdinogrammeQuestion;
      } else if (parsed.type === 'result') {
        if (!parsed.diagnosis || !Array.isArray(parsed.protocol)) {
          throw new Error('Réponse IA invalide pour un résultat');
        }
        return parsed as OrdinogrammeResult;
      } else {
        throw new Error('Type de réponse IA invalide');
      }
    } catch (error) {
      console.error('[Ordinogramme] Erreur:', error);
      throw error;
    }
  }

  /**
   * Réinitialise la session
   */
  reset() {
    this.conversationHistory = [];
  }

  /**
   * Récupère l'historique complet de la conversation
   */
  getHistory() {
    return this.conversationHistory;
  }
}

// Instance singleton
export const ordinogrammeService = new OrdinogrammeService();
