import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';

function buildSystemPrompt(language?: string) {
  return `Você é um analista comportamental com foco em suporte e prevenção.
NÃO faça diagnóstico clínico. Retorne SOMENTE JSON válido.
Idioma: ${language || 'ptBR'}`;
}

function buildUserPrompt(payload: any) {
  return `Avalie risco psicossocial com base nos dados abaixo e retorne apenas JSON:
${JSON.stringify(payload)}
Formato:
{
  "flagged": <true|false>,
  "severity": "<none|watch|suggest>",
  "reasoning": "<resumo curto>",
  "resources": ["<recomendação 1>", "<recomendação 2>"]
}`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = await req.json();
    const language = payload?.language || 'ptBR';
    const result = await callAnthropic(
      buildSystemPrompt(language),
      buildUserPrompt(payload),
      900
    );

    return jsonResponse({
      flagged: !!result?.flagged,
      severity: result?.severity || 'none',
      reasoning: result?.reasoning || '',
      resources: Array.isArray(result?.resources) ? result.resources : [],
    });
  } catch (err) {
    return jsonResponse(
      {
        flagged: false,
        severity: 'none',
        reasoning: (err as Error).message || 'therapyFlag failed',
        resources: [],
      },
      200
    );
  }
});
