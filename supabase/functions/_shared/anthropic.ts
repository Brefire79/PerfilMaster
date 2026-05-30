const GEMINI_MODEL    = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function cleanGeminiError(status: number, body: string): string {
  if (status === 429) {
    return 'Cota da API gratuita esgotada. Acesse Configurações → Integrações de IA e adicione sua chave do Google AI Studio.';
  }
  if (status === 400) return 'Requisição inválida para a API de IA (400).';
  if (status === 403) return 'Chave de API inválida ou sem permissão (403). Verifique em Configurações.';
  if (status === 503) return 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.';
  // Tenta extrair mensagem curta do JSON de erro
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || parsed?.error?.status || '';
    if (msg) return `Erro da API de IA: ${msg.slice(0, 160)}`;
  } catch { /* ignora */ }
  return `Erro da API de IA (${status}). Verifique sua chave em Configurações.`;
}

/**
 * callAnthropic (usa Google Gemini internamente)
 * @param userKey Chave do usuário — se fornecida, tem prioridade sobre a env var
 */
export async function callAnthropic(
  system: string,
  user: string,
  maxTokens = 2500,
  userKey?: string | null
) {
  const apiKey = userKey || Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Chave de API não configurada. Acesse Configurações → Integrações de IA e adicione sua chave do Google AI Studio (AIza...).'
    );
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(cleanGeminiError(response.status, errorBody));
  }

  const data = await response.json();
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!cleaned) throw new Error('Resposta vazia da API de IA. Tente novamente.');
  return JSON.parse(cleaned);
}
