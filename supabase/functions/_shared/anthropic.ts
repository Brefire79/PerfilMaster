/**
 * IA compartilhada das Edge Functions — agora usa DeepSeek (OpenAI-compatible).
 * Nome do arquivo/função mantido (callAnthropic) por compatibilidade com os callers.
 *
 * Chave: Deno.env.get('AI_API_KEY') nos Supabase Secrets (ou DEEPSEEK_API_KEY).
 * A chave NUNCA é exposta ao cliente — roda só no servidor (Edge Function).
 */

const DEFAULT_AI_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_AI_MODEL = 'deepseek-chat';

function cleanAiError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return 'Chave de IA inválida ou ausente no servidor. Configure AI_API_KEY nos secrets do Supabase.';
  }
  if (status === 429) return 'Cota da API de IA esgotada. Tente novamente em instantes.';
  if (status === 400) return 'Requisição inválida para a API de IA (400).';
  if (status === 503) return 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.';
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || parsed?.error?.type || '';
    if (msg) return `Erro da API de IA: ${String(msg).slice(0, 160)}`;
  } catch { /* ignora */ }
  return `Erro da API de IA (${status}).`;
}

/**
 * callAnthropic — chama a IA (DeepSeek) e retorna JSON parseado.
 * A chave vem SOMENTE dos Secrets do servidor (AI_API_KEY / DEEPSEEK_API_KEY);
 * o cliente nunca fornece chave.
 */
export async function callAnthropic(
  system: string,
  user: string,
  maxTokens = 2500
) {
  const apiKey = Deno.env.get('AI_API_KEY') || Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('Serviço de IA não configurado no servidor (AI_API_KEY ausente nos secrets).');
  }

  const apiUrl = Deno.env.get('AI_API_URL') || DEFAULT_AI_URL;
  const model = Deno.env.get('AI_MODEL') || DEFAULT_AI_MODEL;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(cleanAiError(response.status, errorBody));
  }

  const data = await response.json();
  const rawText: string = data.choices?.[0]?.message?.content ?? '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!cleaned) throw new Error('Resposta vazia da API de IA. Tente novamente.');
  return JSON.parse(cleaned);
}
