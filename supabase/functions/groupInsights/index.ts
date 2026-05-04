import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';

function buildSystemPrompt(language?: string) {
  return `Você é um especialista em dinâmica de grupos e desenvolvimento de equipes.
Analise perfis D, I, S e C e responda SOMENTE com JSON válido.
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

  return `Analise o grupo "${groupName || 'Grupo'}".
Objetivo do módulo: ${moduleObjective || 'Avaliação comportamental coletiva'}
Distribuição: D ${distribution.D}%, I ${distribution.I}%, S ${distribution.S}%, C ${distribution.C}%.
Retorne JSON com: distribution, teamDynamics, collaborationTips, conflictRisks, recommendedRoles, groupStrengths, groupBlindSpots, aiInsight, balanceAnalysis, developmentPriorities.`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { profiles, groupName, moduleObjective, language } = await req.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return jsonResponse({ error: 'profiles must be a non-empty array' }, 400);
    }

    const insights = await callAnthropic(
      buildSystemPrompt(language),
      buildUserMessage(profiles, groupName, moduleObjective),
      2500
    );
    return jsonResponse(insights);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'groupInsights failed' }, 500);
  }
});
