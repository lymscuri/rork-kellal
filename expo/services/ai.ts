const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function checkApiKey(): void {
  if (!GROQ_API_KEY) {
    throw new Error('La clé API Groq n\'est pas configurée. Veuillez définir EXPO_PUBLIC_GROQ_API_KEY dans votre fichier .env');
  }
}

export async function generateText({ messages }: { messages: Message[] }): Promise<string> {
  checkApiKey();
  // Extraire le system prompt (premier message assistant)
  let systemPrompt = '';
  let conversationMessages = messages;

  if (messages.length > 0 && messages[0].role === 'assistant') {
    systemPrompt = messages[0].content;
    conversationMessages = messages.slice(1);
  }

  // Construire les messages au format OpenAI (compatible Groq)
  const formattedMessages: Message[] = [];

  // Ajouter le system prompt
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  // Ajouter les messages de la conversation
  conversationMessages.forEach(m => {
    if (m.role === 'user' || m.role === 'assistant') {
      formattedMessages.push(m);
    }
  });

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Gratuit, rapide, bon en français
      max_tokens: 1024,
      messages: formattedMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API error: ${response.status} — ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}