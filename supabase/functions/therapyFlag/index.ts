import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';

function buildSystemPrompt(language?: string) {
  return `Você é um especialista em bem-estar organizacional e psicologia positiva.
Sua função é identificar, de forma discreta e não diagnóstica, padrões que possam indicar que um participante se beneficiaria de suporte adicional — como coaching, mentoria ou apoio profissional.

REGRAS ABSOLUTAS:
- NUNCA faça diagnósticos clínicos ou médicos
- NUNCA use linguagem alarmista ou terminologia psiquiátrica
- SEMPRE use linguagem de suporte, desenvolvimento e bem-estar
- Esta análise é EXCLUSIVAMENTE para o instrutor/administrador
- Em caso de dúvida, prefira NÃO sinalizar (flagged: false)
- Apenas sinalize quando houver padrões claros e consistentes

Responda SOMENTE em JSON válido, sem texto adicional.
Idioma: ${language || 'ptBR'}`;
}

function buildUserPrompt(payload: any) {
  const answers = payload?.answers || [];
  const profile = payload?.profileData;

  const answersText = answers.length > 0
    ? answers.map((a: any, i: number) =>
        `${i + 1}. "${a.question || a.questionText || ''}" → "${a.answer || a.selectedOption || a.value || ''}"`
      ).join('\n')
    : 'Respostas não disponíveis';

  const profileContext = profile
    ? `Perfil dominante: ${profile.dominantProfile || 'N/A'} | D:${profile.scores?.D ?? '?'} I:${profile.scores?.I ?? '?'} S:${profile.scores?.S ?? '?'} C:${profile.scores?.C ?? '?'}`
    : 'Perfil não disponível';

  return `Analise discretamente os dados abaixo e identifique se o participante pode se beneficiar de suporte adicional.

Contexto do perfil: ${profileContext}

Respostas do participante:
${answersText}

Procure padrões como: sobrecarga, esgotamento, desmotivação, dificuldades persistentes de relacionamento, isolamento ou alta pressão emocional.

Retorne SOMENTE o seguinte JSON:
{
  "flagged": <true|false — true apenas se há padrões claros e consistentes>,
  "level": "<none|watch|suggest>",
  "note": "<se flagged: nota interna discreta orientada ao bem-estar, máx 200 palavras. Se não flagged: string vazia>"
}

Critérios de nível:
- none: sem padrões identificados (flagged: false)
- watch: padrões sutis que merecem atenção do instrutor
- suggest: padrões mais evidentes onde suporte seria benéfico`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) {
      return jsonResponse({ flagged: false, level: 'none', note: '' }, 401, req);
    }

    const payload = await req.json();
    const language = payload?.language || 'ptBR';
    const result = await callAnthropic(
      buildSystemPrompt(language),
      buildUserPrompt(payload),
      600
    );

    const safeResult = {
      flagged: result?.flagged === true,
      level: ['none', 'watch', 'suggest'].includes(result?.level) ? result.level : 'none',
      note: typeof result?.note === 'string' ? result.note : '',
    };

    if (!safeResult.flagged) {
      safeResult.level = 'none';
      safeResult.note = '';
    }

    return jsonResponse(safeResult, 200, req);
  } catch (err) {
    return jsonResponse({ flagged: false, level: 'none', note: '' }, 200, req);
  }
});
