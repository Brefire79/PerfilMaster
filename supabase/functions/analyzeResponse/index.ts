import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';

function buildSystemPrompt(language?: string) {
  return `Você é um especialista em psicologia organizacional e avaliação comportamental.
Analisa respostas de questionários usando o modelo de 4 perfis comportamentais:
D = Dominante (Executor), I = Influente (Comunicador), S = Estável (Colaborador), C = Analítico (Conforme).
Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

function buildUserMessage(answers: any[], moduleObjective?: string) {
  return `Analise as seguintes respostas de um questionário comportamental e retorne um perfil completo.
Objetivo do módulo: ${moduleObjective || 'Avaliação comportamental geral'}
Respostas do participante:
${answers.map((a, i) => `${i + 1}. Pergunta: "${a.question || a.questionText || ''}" | Resposta: "${a.answer || a.selectedOption || a.value || ''}" | Peso: ${a.weight ?? a.score ?? 'N/A'}`).join('\n')}
Retorne SOMENTE JSON com os campos: scores, dominantProfile, secondaryProfile, summary, strengths, challenges, roleRecommendation, workStyleRecommendation, teamBehavior, communicationTips, saboteurPatterns, derailmentRisks, therapyIndicator.`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) {
      return jsonResponse({ error: 'unauthorized' }, 401, req);
    }

    const { answers, moduleObjective, language } = await req.json();
    if (!Array.isArray(answers) || answers.length === 0) {
      return jsonResponse({ error: 'answers must be a non-empty array' }, 400, req);
    }
    if (answers.length > 200) {
      return jsonResponse({ error: 'answers array too large (max 200)' }, 400, req);
    }

    const profile = await callAnthropic(
      buildSystemPrompt(language),
      buildUserMessage(answers, moduleObjective),
      2048
    );

    if (profile?.scores) {
      for (const key of ['D', 'I', 'S', 'C']) {
        const val = Number(profile.scores[key]);
        profile.scores[key] = Number.isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
      }
    }

    return jsonResponse(profile, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'analyzeResponse failed' }, 500, req);
  }
});
