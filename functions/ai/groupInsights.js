/**
 * groupInsights — Firebase Callable Function
 *
 * Receives: { profiles, groupName, moduleObjective, language }
 * Returns:  collective group analysis JSON from Claude
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function buildSystemPrompt(language) {
  return `Você é um especialista em dinâmica de grupos, psicologia organizacional e desenvolvimento de equipes.
Analisa distribuições de perfis comportamentais (D=Dominante, I=Influente, S=Estável, C=Analítico) em grupos.
Você identifica dinâmicas, potenciais de conflito, forças coletivas e oportunidades de desenvolvimento.
Baseie-se nos frameworks DiSC, Social Style e OCAI.
Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

function buildUserMessage(profiles, groupName, moduleObjective) {
  // Calculate distribution
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  for (const p of profiles) {
    if (p.dominantProfile && counts[p.dominantProfile] !== undefined) {
      counts[p.dominantProfile]++;
    }
  }
  const total = profiles.length;
  const distribution = {};
  for (const key of ['D', 'I', 'S', 'C']) {
    distribution[key] = total > 0 ? Math.round((counts[key] / total) * 100) : 0;
  }

  const profilesSummary = profiles
    .map((p, i) => {
      const scoreStr = p.scores
        ? `D:${p.scores.D ?? '?'} I:${p.scores.I ?? '?'} S:${p.scores.S ?? '?'} C:${p.scores.C ?? '?'}`
        : 'scores não disponíveis';
      return `${i + 1}. ${p.name || 'Participante'} | Perfil dominante: ${p.dominantProfile || '?'} | Pontuações: ${scoreStr} | Forças: ${(p.strengths || []).slice(0, 2).join(', ')}`;
    })
    .join('\n');

  return `Analise a dinâmica coletiva do grupo "${groupName || 'Grupo'}" com ${total} participantes.

Objetivo do módulo: ${moduleObjective || 'Avaliação comportamental coletiva'}

Distribuição de perfis:
D (Dominante): ${counts.D} pessoas (${distribution.D}%)
I (Influente): ${counts.I} pessoas (${distribution.I}%)
S (Estável): ${counts.S} pessoas (${distribution.S}%)
C (Analítico): ${counts.C} pessoas (${distribution.C}%)

Perfis individuais:
${profilesSummary}

Retorne SOMENTE o seguinte JSON com análise coletiva aprofundada:
{
  "distribution": {
    "D": { "count": ${counts.D}, "percentage": ${distribution.D} },
    "I": { "count": ${counts.I}, "percentage": ${distribution.I} },
    "S": { "count": ${counts.S}, "percentage": ${distribution.S} },
    "C": { "count": ${counts.C}, "percentage": ${distribution.C} }
  },
  "teamDynamics": "<análise da dinâmica geral da equipe, 2-3 parágrafos>",
  "collaborationTips": ["<dica de colaboração 1>", "<dica 2>", "<dica 3>", "<dica 4>"],
  "conflictRisks": ["<risco de conflito 1>", "<risco 2>", "<risco 3>"],
  "recommendedRoles": {
    "D": "<papéis recomendados para os perfis D do grupo>",
    "I": "<papéis recomendados para os perfis I do grupo>",
    "S": "<papéis recomendados para os perfis S do grupo>",
    "C": "<papéis recomendados para os perfis C do grupo>"
  },
  "groupStrengths": ["<força coletiva 1>", "<força 2>", "<força 3>", "<força 4>"],
  "groupBlindSpots": ["<ponto cego coletivo 1>", "<ponto cego 2>", "<ponto cego 3>"],
  "aiInsight": "<insight especial da IA sobre esse grupo específico, observando padrões únicos, 1-2 parágrafos>",
  "balanceAnalysis": "<análise de equilíbrio/desequilíbrio dos perfis e implicações práticas>",
  "developmentPriorities": ["<prioridade de desenvolvimento 1>", "<prioridade 2>"]
}`;
}

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text || '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

module.exports = onCall(
  { region: 'us-central1', enforceAppCheck: false },
  async (request) => {
    const { profiles, groupName, moduleObjective, language } = request.data || {};

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      throw new HttpsError('invalid-argument', 'O campo "profiles" é obrigatório e deve ser um array não vazio.');
    }

    try {
      const systemPrompt = buildSystemPrompt(language);
      const userMessage = buildUserMessage(profiles, groupName, moduleObjective);
      const insights = await callClaude(systemPrompt, userMessage);
      return insights;
    } catch (err) {
      console.error('[groupInsights] Error:', err);
      return { error: true, message: err.message || 'Erro ao gerar insights do grupo.' };
    }
  }
);
