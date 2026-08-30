const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_MODEL_FAST = process.env.EXPO_PUBLIC_GROQ_MODEL_FAST || 'openai/gpt-oss-20b';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function checkApiKey(): void {
  if (!GROQ_API_KEY) {
    throw new Error('IA non configurée : EXPO_PUBLIC_GROQ_API_KEY absente du .env.');
  }
}

export async function generateText({ messages }: { messages: Message[] }): Promise<string> {
  checkApiKey();
  let systemPrompt = '';
  let conversationMessages = messages;

  if (messages.length > 0 && messages[0].role === 'assistant') {
    systemPrompt = messages[0].content;
    conversationMessages = messages.slice(1);
  }

  const formattedMessages: Message[] = [];

  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  conversationMessages.forEach(m => {
    if (m.role === 'user' || m.role === 'assistant') {
      formattedMessages.push(m);
    }
  });

  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL_FAST,
        max_tokens: 1024,
        messages: formattedMessages,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    console.error('[ai] Panne réseau vers Groq:', err);
    throw new Error('IA injoignable : problème réseau.');
  }

  if (!response.ok) {
    const raw = await response.text();
    console.error(`[ai] Groq ${response.status}:`, raw);

    let providerCode = '';
    try {
      providerCode = JSON.parse(raw)?.error?.code || '';
    } catch {}

    if (response.status === 401 || response.status === 403) {
      throw new Error('IA refuse la clé : EXPO_PUBLIC_GROQ_API_KEY invalide ou révoquée.');
    }
    if (response.status === 429) {
      throw new Error('IA saturée : quota ou rate-limit Groq atteint.');
    }
    if (providerCode === 'model_not_found' || response.status === 404) {
      throw new Error(`IA : le modèle "${GROQ_MODEL_FAST}" n'existe plus. Mettez à jour EXPO_PUBLIC_GROQ_MODEL_FAST.`);
    }
    if (response.status >= 500) {
      throw new Error('IA en panne côté fournisseur (Groq). Réessayez plus tard.');
    }
    throw new Error(`IA a refusé la requête (HTTP ${response.status}).`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
