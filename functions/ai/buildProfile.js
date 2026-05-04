/**
 * buildProfile — Firebase Callable Function
 *
 * Receives: { assessmentId, userId, groupId, moduleId, language }
 * Fetches the assessment from Firestore, calls Claude for a deeper analysis,
 * saves the result to /profiles/{profileId}, and returns the profile object.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Build the system prompt
 * @param {string} language
 * @returns {string}
 */
function buildSystemPrompt(language) {
  return `Você é um especialista sênior em psicologia organizacional, avaliação comportamental e desenvolvimento humano.
Você analisa avaliações comportamentais completas usando o modelo de 4 perfis:
D = Dominante (Executor), I = Influente (Comunicador), S = Estável (Colaborador), C = Analítico (Conforme).
Esses perfis são baseados nos frameworks DiSC, Social Style e OCAI.
Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Você cria perfis detalhados com insights profundos, orientados ao desenvolvimento pessoal e profissional.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

/**
 * Build the deep-analysis user message
 * @param {object} assessment
 * @param {object} user
 * @returns {string}
 */
function buildUserMessage(assessment, user) {
  const answers = assessment.answers || [];
  const scores = assessment.scores || {};
  const moduleObjective = assessment.moduleObjective || assessment.objective || 'Avaliação comportamental';

  return `Construa um perfil comportamental completo e aprofundado com base nos dados abaixo.

Participante: ${user?.displayName || user?.name || 'Participante'}
Objetivo do módulo: ${moduleObjective}

Pontuações já calculadas:
D (Dominante): ${scores.D ?? 'N/A'}
I (Influente): ${scores.I ?? 'N/A'}
S (Estável): ${scores.S ?? 'N/A'}
C (Analítico): ${scores.C ?? 'N/A'}

Respostas originais:
${answers.map((a, i) => `${i + 1}. "${a.question || a.questionText || ''}" → "${a.answer || a.selectedOption || a.value || ''}"`).join('\n')}

Retorne SOMENTE o seguinte JSON com análise profunda e evolutiva:
{
  "scores": { "D": <0-100>, "I": <0-100>, "S": <0-100>, "C": <0-100> },
  "dominantProfile": "<D|I|S|C>",
  "dominantProfileName": "<Dominante|Influente|Estável|Analítico>",
  "secondaryProfile": "<D|I|S|C>",
  "secondaryProfileName": "<Dominante|Influente|Estável|Analítico>",
  "summary": "<3 parágrafos ricos descrevendo o perfil>",
  "strengths": ["<força 1>", "<força 2>", "<força 3>", "<força 4>", "<força 5>"],
  "challenges": ["<desafio 1>", "<desafio 2>", "<desafio 3>", "<desafio 4>"],
  "roleRecommendation": "<papéis e funções ideais>",
  "workStyleRecommendation": "<estilo de trabalho e ambiente ideal>",
  "teamBehavior": "<comportamento em equipe e dinâmicas>",
  "communicationTips": "<como se comunicar efetivamente com esse perfil>",
  "saboteurPatterns": ["<padrão sabotador 1>", "<padrão sabotador 2>", "<padrão sabotador 3>"],
  "derailmentRisks": ["<risco 1>", "<risco 2>", "<risco 3>"],
  "developmentAreas": ["<área de desenvolvimento 1>", "<área de desenvolvimento 2>"],
  "evolutionNotes": "<observações sobre possível evolução e crescimento do perfil ao longo do tempo>",
  "leadershipStyle": "<estilo de liderança natural desse perfil>",
  "conflictStyle": "<como esse perfil lida com conflitos>",
  "motivators": ["<motivador 1>", "<motivador 2>", "<motivador 3>"],
  "stressors": ["<estressor 1>", "<estressor 2>"],
  "therapyIndicator": {
    "flagged": <true|false>,
    "level": "<none|watch|suggest>",
    "note": "<observação de suporte discreta e não diagnóstica, ou string vazia>"
  }
}`;
}

/**
 * Call Claude API
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<object>}
 */
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
      max_tokens: 3000,
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

// ─── Firebase Callable Export ────────────────────────────────────────────────
module.exports = onCall(
  { region: 'us-central1', enforceAppCheck: false },
  async (request) => {
    const { assessmentId, userId, groupId, moduleId, language } = request.data || {};

    if (!assessmentId || !userId) {
      throw new HttpsError('invalid-argument', 'assessmentId e userId são obrigatórios.');
    }

    const db = admin.firestore();

    try {
      // Fetch assessment document
      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();
      if (!assessmentDoc.exists) {
        throw new HttpsError('not-found', `Avaliação ${assessmentId} não encontrada.`);
      }
      const assessment = { id: assessmentDoc.id, ...assessmentDoc.data() };

      // Fetch user document
      const userDoc = await db.collection('users').doc(userId).get();
      const user = userDoc.exists ? userDoc.data() : {};

      // Call Claude for deep analysis
      const systemPrompt = buildSystemPrompt(language);
      const userMessage = buildUserMessage(assessment, user);
      const profileData = await callClaude(systemPrompt, userMessage);

      // Normalize scores
      if (profileData.scores) {
        for (const key of ['D', 'I', 'S', 'C']) {
          const val = Number(profileData.scores[key]);
          profileData.scores[key] = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
        }
      }

      // Build profile document
      const profileId = `${userId}_${assessmentId}`;
      const profile = {
        id: profileId,
        userId,
        assessmentId,
        groupId: groupId || assessment.groupId || null,
        moduleId: moduleId || assessment.moduleId || null,
        moduleTitle: assessment.moduleTitle || assessment.title || null,
        completedAt: assessment.completedAt || admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        language: language || 'ptBR',
        ...profileData,
      };

      // Save profile to Firestore
      await db.collection('profiles').doc(profileId).set(profile, { merge: true });

      // Update assessment with profile reference
      await db.collection('assessments').doc(assessmentId).update({
        profileId,
        profileBuilt: true,
        profileBuiltAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return profile;
    } catch (err) {
      console.error('[buildProfile] Error:', err);
      if (err instanceof HttpsError) throw err;
      return { error: true, message: err.message || 'Erro ao construir perfil.' };
    }
  }
);
