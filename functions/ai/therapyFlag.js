/**
 * therapyFlag — Firebase Callable Function (ADMIN ONLY)
 *
 * Discrete analysis that checks for patterns suggesting the person may
 * benefit from professional support. NEVER diagnostic. ALWAYS supportive.
 *
 * Receives: { profileId, answers, language }
 * Returns:  { flagged: bool, level: 'none'|'watch'|'suggest', note: string }
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function buildSystemPrompt(language) {
  return `Você é um especialista em bem-estar organizacional e psicologia positiva.
Sua função é identificar, de forma discreta e não diagnóstica, padrões nas respostas de avaliações comportamentais que possam indicar que um participante se beneficiaria de suporte adicional — como coaching, mentoria ou apoio profissional.

REGRAS ABSOLUTAS:
- NUNCA faça diagnósticos clínicos ou médicos de qualquer tipo
- NUNCA use linguagem alarmista ou terminologia psiquiátrica/psicológica clínica
- SEMPRE use linguagem de suporte, desenvolvimento e bem-estar
- Esta análise é EXCLUSIVAMENTE para o instrutor/administrador, nunca para o participante
- O objetivo é apoiar, não rotular
- Em caso de dúvida, prefira NÃO sinalizar (flagged: false)
- Apenas sinalize quando houver padrões claros e consistentes nas respostas
- Idioma da resposta: ${language || 'ptBR'}

Responda SOMENTE em JSON válido, sem texto adicional.`;
}

function buildUserMessage(answers, profileData) {
  const answersText = (answers || [])
    .map((a, i) => `${i + 1}. "${a.question || a.questionText || ''}" → "${a.answer || a.selectedOption || a.value || ''}"`)
    .join('\n');

  const profileContext = profileData
    ? `Perfil dominante: ${profileData.dominantProfile || 'N/A'} | Pontuações: D:${profileData.scores?.D ?? '?'} I:${profileData.scores?.I ?? '?'} S:${profileData.scores?.S ?? '?'} C:${profileData.scores?.C ?? '?'}`
    : 'Perfil não disponível';

  return `Analise discretamente as respostas abaixo para identificar se o participante pode se beneficiar de suporte adicional.

Contexto do perfil: ${profileContext}

Respostas do participante:
${answersText || 'Respostas não disponíveis'}

Procure padrões como (mas não se limite a):
- Expressões consistentes de sobrecarga, esgotamento ou desmotivação
- Dificuldades persistentes de relacionamento interpessoal
- Sinais de isolamento ou conflitos frequentes
- Respostas que sugerem alta pressão ou dificuldade de gestão emocional

Retorne SOMENTE o seguinte JSON:
{
  "flagged": <true|false — true apenas se há padrões claros e consistentes>,
  "level": "<none|watch|suggest — use 'watch' para padrões sutis, 'suggest' para padrões mais evidentes>",
  "note": "<se flagged: nota interna discreta (máx 200 palavras), orientada ao bem-estar, sem diagnósticos. Se não flagged: string vazia>"
}

Critérios de nível:
- none: sem padrões identificados (flagged: false)
- watch: padrões sutis que merecem atenção do instrutor (flagged: true)
- suggest: padrões mais evidentes onde suporte seria claramente benéfico (flagged: true)`;
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
      max_tokens: 512,
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
    const { profileId, answers, language } = request.data || {};

    // Verify the caller is an admin
    const callerRole = request.auth?.token?.role;
    if (callerRole !== 'admin') {
      throw new HttpsError('permission-denied', 'Acesso restrito a administradores.');
    }

    if (!profileId) {
      throw new HttpsError('invalid-argument', 'profileId é obrigatório.');
    }

    const db = admin.firestore();

    try {
      // Fetch profile from Firestore for additional context
      let profileData = null;
      try {
        const profileDoc = await db.collection('profiles').doc(profileId).get();
        if (profileDoc.exists) {
          profileData = profileDoc.data();
        }
      } catch (_) {
        // Non-fatal: proceed without profile data
      }

      // If no answers passed, try to get from associated assessment
      let effectiveAnswers = answers;
      if ((!effectiveAnswers || effectiveAnswers.length === 0) && profileData?.assessmentId) {
        try {
          const assessmentDoc = await db.collection('assessments').doc(profileData.assessmentId).get();
          if (assessmentDoc.exists) {
            effectiveAnswers = assessmentDoc.data().answers || [];
          }
        } catch (_) {
          // Non-fatal
        }
      }

      const systemPrompt = buildSystemPrompt(language);
      const userMessage = buildUserMessage(effectiveAnswers, profileData);
      const result = await callClaude(systemPrompt, userMessage);

      // Validate structure
      const safeResult = {
        flagged: result.flagged === true,
        level: ['none', 'watch', 'suggest'].includes(result.level) ? result.level : 'none',
        note: typeof result.note === 'string' ? result.note : '',
      };

      // If not flagged, ensure level is none and note is empty
      if (!safeResult.flagged) {
        safeResult.level = 'none';
        safeResult.note = '';
      }

      // Optionally persist the indicator to the profile (admin-only subcollection)
      if (profileId) {
        try {
          await db
            .collection('profiles')
            .doc(profileId)
            .collection('adminOnly')
            .doc('therapyIndicator')
            .set({
              ...safeResult,
              analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
              analyzedBy: request.auth?.uid || 'system',
            });
        } catch (_) {
          // Non-fatal: still return result even if persistence fails
        }
      }

      return safeResult;
    } catch (err) {
      console.error('[therapyFlag] Error:', err);
      if (err instanceof HttpsError) throw err;
      return { error: true, message: err.message || 'Erro ao analisar indicadores.' };
    }
  }
);
