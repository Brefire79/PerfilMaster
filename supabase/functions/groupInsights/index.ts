import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, isGroupAdmin } from '../_shared/auth.ts';

function buildSystemPrompt(language?: string) {
  return `Você é um especialista em dinâmica de grupos, psicologia organizacional e desenvolvimento de equipes.
Analisa distribuições de perfis comportamentais (D=Dominante, I=Influente, S=Estável, C=Analítico) em grupos.
Identifica dinâmicas, potenciais de conflito, forças coletivas e oportunidades de desenvolvimento.
Baseie-se nos frameworks DiSC, Social Style e OCAI.
Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

function buildUserMessage(profiles: any[], groupName?: string, moduleObjective?: string) {
  const counts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const p of profiles) {
    if (p?.dominantProfile && counts[p.dominantProfile] !== undefined) counts[p.dominantProfile] += 1;
  }
  const total = profiles.length || 1;
  const distribution = {
    D: Math.round((counts.D / total) * 100),
    I: Math.round((counts.I / total) * 100),
    S: Math.round((counts.S / total) * 100),
    C: Math.round((counts.C / total) * 100),
  };

  const profilesSummary = profiles
    .map((p, i) => {
      const scores = p.scores
        ? `D:${p.scores.D ?? '?'} I:${p.scores.I ?? '?'} S:${p.scores.S ?? '?'} C:${p.scores.C ?? '?'}`
        : 'scores não disponíveis';
      const strengths = (p.strengths || []).slice(0, 2).join(', ');
      return `${i + 1}. Perfil: ${p.dominantProfile || '?'} | Pontuações: ${scores}${strengths ? ` | Forças: ${strengths}` : ''}`;
    })
    .join('\n');

  return `Analise a dinâmica coletiva do grupo "${groupName || 'Grupo'}" com ${total} participantes.

Objetivo: ${moduleObjective || 'Avaliação comportamental coletiva'}

Distribuição de perfis:
D (Dominante): ${counts.D} pessoas (${distribution.D}%)
I (Influente): ${counts.I} pessoas (${distribution.I}%)
S (Estável): ${counts.S} pessoas (${distribution.S}%)
C (Analítico): ${counts.C} pessoas (${distribution.C}%)

Perfis individuais:
${profilesSummary}

Retorne SOMENTE o seguinte JSON:
{
  "teamDynamics": "<análise da dinâmica geral da equipe, 2-3 parágrafos>",
  "collaborationTips": ["<dica 1>", "<dica 2>", "<dica 3>", "<dica 4>"],
  "conflictRisks": ["<risco 1>", "<risco 2>", "<risco 3>"],
  "recommendedRoles": {
    "Leadership": "<nomes ou perfis mais indicados para liderança>",
    "Execution": "<nomes ou perfis mais indicados para execução>",
    "Creativity": "<nomes ou perfis mais indicados para criatividade>",
    "Quality": "<nomes ou perfis mais indicados para qualidade>"
  },
  "groupStrengths": ["<força coletiva 1>", "<força 2>", "<força 3>", "<força 4>"],
  "groupBlindSpots": ["<ponto cego 1>", "<ponto cego 2>", "<ponto cego 3>"],
  "aiInsight": "<insight especial sobre padrões únicos desse grupo, 1-2 parágrafos>",
  "balanceAnalysis": "<análise de equilíbrio/desequilíbrio dos perfis e implicações práticas>",
  "developmentPriorities": ["<prioridade 1>", "<prioridade 2>"]
}`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) {
      return jsonResponse({ error: 'unauthorized' }, 401, req);
    }

    const { profiles, groupName, groupId, moduleObjective, language } = await req.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return jsonResponse({ error: 'profiles must be a non-empty array' }, 400, req);
    }
    if (!groupId) {
      return jsonResponse({ error: 'groupId is required for authorization' }, 400, req);
    }
    if (profiles.length > 100) {
      return jsonResponse({ error: 'profiles array too large (max 100)' }, 400, req);
    }

    const isAdmin = await isGroupAdmin(caller.id, groupId);
    if (!isAdmin) {
      return jsonResponse({ error: 'forbidden — caller is not admin of this group' }, 403, req);
    }

    const insights = await callAnthropic(
      buildSystemPrompt(language),
      buildUserMessage(profiles, groupName, moduleObjective),
      2500
    );
    return jsonResponse(insights, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'groupInsights failed' }, 500, req);
  }
});
