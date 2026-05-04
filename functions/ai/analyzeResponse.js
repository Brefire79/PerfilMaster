/**
 * analyzeResponse — Firebase Callable Function
 *
 * Receives: { answers, moduleObjective, language }
 * Returns:  full behavioral profile JSON from Claude
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Build the system prompt in Portuguese, with final language instruction
 * @param {string} language
 * @returns {string}
 */
function buildSystemPrompt(language) {
  return `Você é um especialista em psicologia organizacional e avaliação comportamental.
Analisa respostas de questionários usando o modelo de 4 perfis comportamentais:
D = Dominante (Executor), I = Influente (Comunicador), S = Estável (Colaborador), C = Analítico (Conforme).
Esses perfis são baseados nos frameworks DiSC, Social Style e OCAI.
Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

/**
 * Build the user message with the answers array
 * @param {Array} answers
 * @param {string} moduleObjective
 * @returns {string}
 */
function buildUserMessage(answers, moduleObjective) {
  return `Analise as seguintes respostas de um questionário comportamental e retorne um perfil completo.

Objetivo do módulo: ${moduleObjective || 'Avaliação comportamental geral'}

Respostas do participante:
${answers.map((a, i) => `${i + 1}. Pergunta: "${a.question || a.questionText || ''}" | Resposta: "${a.answer || a.selectedOption || a.value || ''}" | Peso da opção: ${a.weight ?? a.score ?? 'N/A'}`).join('\n')}

Retorne SOMENTE o seguinte JSON, preenchendo todos os campos com base nas respostas:
{
  "scores": {
    "D": <número 0-100, representando % de dominância>,
    "I": <número 0-100, representando % de influência>,
    "S": <número 0-100, representando % de estabilidade>,
    "C": <número 0-100, representando % de conformidade/análise>
  },
  "dominantProfile": "<D|I|S|C>",
  "dominantProfileName": "<Dominante|Influente|Estável|Analítico>",
  "secondaryProfile": "<D|I|S|C>",
  "secondaryProfileName": "<Dominante|Influente|Estável|Analítico>",
  "summary": "<3 parágrafos descrevendo o perfil comportamental da pessoa>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>", "<ponto forte 4>"],
  "challenges": ["<desafio 1>", "<desafio 2>", "<desafio 3>"],
  "roleRecommendation": "<descrição de papéis/funções que se alinham bem com esse perfil>",
  "workStyleRecommendation": "<como essa pessoa trabalha melhor>",
  "teamBehavior": "<como essa pessoa se comporta em equipes>",
  "communicationTips": "<dicas de como comunicar-se melhor com esse perfil>",
  "saboteurPatterns": ["<padrão sabotador 1>", "<padrão sabotador 2>"],
  "derailmentRisks": ["<risco de derailment 1>", "<risco de derailment 2>"],
  "therapyIndicator": {
    "flagged": <true|false>,
    "level": "<none|watch|suggest>",
    "note": "<observação discreta e não diagnóstica, ou string vazia se não flagged>"
  }
}`;
}

/**
 * Call the Anthropic Claude API
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<object>}
 */
async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
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

  // Strip any markdown code fences if present
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  return JSON.parse(cleaned);
}

// ─── Firebase Callable Export ────────────────────────────────────────────────
module.exports = onCall(
  { region: 'us-central1', enforceAppCheck: false },
  async (request) => {
    const { answers, moduleObjective, language } = request.data || {};

    // Validate inputs
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw new HttpsError('invalid-argument', 'O campo "answers" é obrigatório e deve ser um array não vazio.');
    }

    try {
      const systemPrompt = buildSystemPrompt(language);
      const userMessage = buildUserMessage(answers, moduleObjective);
      const profile = await callClaude(systemPrompt, userMessage);

      // Normalize scores to ensure they are numbers 0-100
      if (profile.scores) {
        for (const key of ['D', 'I', 'S', 'C']) {
          const val = Number(profile.scores[key]);
          profile.scores[key] = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
        }
      }

      return profile;
    } catch (err) {
      console.error('[analyzeResponse] Error:', err);
      return { error: true, message: err.message || 'Erro ao analisar respostas.' };
    }
  }
);
