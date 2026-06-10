/**
 * Netlify Function — Proxy seguro para a API de IA (DeepSeek)
 * A chave (DEEPSEEK_API_KEY) NUNCA sai do servidor — fica só em process.env.
 *
 * POST /.netlify/functions/generate-profile-analysis
 * (ou /api/generate-profile-analysis via redirect no netlify.toml)
 *
 * DeepSeek é OpenAI-compatible (/chat/completions + messages), então o mesmo
 * código serve. Provider configurável por env para trocar sem mexer no código:
 *   AI_API_URL   (default: DeepSeek)
 *   AI_API_KEY   (chave secreta — preferida; cai p/ DEEPSEEK_API_KEY / XAI_API_KEY)
 *   AI_MODEL     (default: deepseek-chat)
 */

const DEFAULT_AI_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_AI_MODEL = 'deepseek-chat';

const SYSTEM_PROMPT =
  'Você é um especialista em análise comportamental baseada no modelo DISC e Positive Intelligence (PQ). ' +
  'Analise os dados fornecidos e gere insights personalizados e aprofundados. ' +
  'IMPORTANTE: não faça diagnóstico psicológico, não use linguagem médica e não afirme que o resultado é definitivo. ' +
  'Responda sempre em português do Brasil com linguagem profissional, empática e motivadora.';

// ─── Labels ───────────────────────────────────────────────────────────────────
const DISC_LABELS = {
  D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade',
};
const SAB_LABELS = {
  judge: 'Juiz', stickler: 'Insistente', pleaser: 'Agradador',
  hyperAchiever: 'Hiper-Realizador', victim: 'Vítima',
  hyperRational: 'Hiper-Racional', hyperVigilant: 'Hiper-Vigilante',
  restless: 'Inquieto', controller: 'Controlador', avoider: 'Esquivo',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildUserPrompt(discScores, sabScores, localAnalysis) {
  const discFormatted = Object.entries(discScores)
    .map(([k, v]) => `${DISC_LABELS[k] || k} (${k}): ${Number(v).toFixed(1)}/5`)
    .join(', ');

  const sabFormatted = Object.entries(sabScores)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5)
    .map(([k, v]) => `${SAB_LABELS[k] || k}: ${Number(v).toFixed(1)}/10`)
    .join(', ');

  const disc = localAnalysis.disc ?? {};
  const sab  = localAnalysis.sabotadores ?? {};

  return `Analise este perfil comportamental DISC + PQ Sabotadores:

**Scores DISC:** ${discFormatted}
**Perfil Primário:** ${DISC_LABELS[disc.primary] || ''} (${disc.primary || ''})
**Perfil Secundário:** ${DISC_LABELS[disc.secondary] || ''} (${disc.secondary || ''})
**Subtipo:** ${disc.subtype || ''}

**Top 5 Sabotadores:** ${sabFormatted}
**PQ Score:** ${sab.pqScore ?? 0}/100

**Análise base calculada:** ${localAnalysis.summary ?? ''}

Gere uma análise personalizada e aprofundada baseada nesses dados.
Responda APENAS com JSON válido (sem markdown, sem texto antes ou depois) neste formato exato:
{"enrichedSummary":"Parágrafo de 150-200 palavras sobre o perfil completo, empático e profissional","deepInsights":["Insight 1 sobre a combinação DISC específica","Insight 2 sobre sabotadores em contexto profissional","Insight 3 sobre padrões sob pressão","Insight 4 sobre relacionamentos e comunicação","Insight 5 sobre liderança ou potencial"],"personalizedRecommendations":[{"category":"Autogestão","action":"ação concreta e específica","priority":"alta"},{"category":"Comunicação","action":"ação concreta e específica","priority":"média"},{"category":"Desenvolvimento","action":"ação concreta e específica","priority":"média"},{"category":"Relacionamentos","action":"ação concreta e específica","priority":"baixa"},{"category":"Carreira","action":"ação concreta e específica","priority":"baixa"}],"coachingQuestions":["Pergunta reflexiva sobre autoconhecimento","Pergunta sobre padrões limitantes","Pergunta sobre pontos cegos","Pergunta sobre potencial de crescimento"]}

Não use linguagem médica. Não faça diagnóstico. Seja empático, específico e motivador.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Chave secreta no servidor (Netlify env). Aceita nomes alternativos p/ migração.
  const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Serviço de IA não configurado no servidor.' }),
    };
  }

  const apiUrl = process.env.AI_API_URL || DEFAULT_AI_URL;
  const model = process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_AI_MODEL;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido no body.' }) };
  }

  const { discScores, sabScores, localAnalysis } = body;
  if (!discScores || !sabScores || !localAnalysis) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Campos obrigatórios: discScores, sabScores, localAnalysis.' }),
    };
  }

  const userPrompt = buildUserPrompt(discScores, sabScores, localAnalysis);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1800,
        // DeepSeek suporta modo JSON nativo — reduz respostas fora do formato
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[AI Function] HTTP error:', res.status, errText.slice(0, 300));
      throw new Error(`Provedor de IA retornou ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    let parsed;
    try {
      const cleaned = content.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Se a IA não retornou JSON puro, empacota o texto como enrichedSummary
      parsed = { enrichedSummary: content };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, analysis: parsed, model }),
    };

  } catch (err) {
    console.error('[generate-profile-analysis]', err.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: err.message || 'Serviço de IA temporariamente indisponível.',
      }),
    };
  }
};
