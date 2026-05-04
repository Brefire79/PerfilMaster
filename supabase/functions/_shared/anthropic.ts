const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

export async function callAnthropic(system: string, user: string, maxTokens = 2500) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}
