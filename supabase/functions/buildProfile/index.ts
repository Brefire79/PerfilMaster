import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

function buildSystemPrompt(language?: string) {
  return `Você é especialista sênior em avaliação comportamental.
Responda SOMENTE em JSON válido com análise profunda de perfil DISC.
Idioma da resposta: ${language || 'ptBR'}`;
}

function buildUserMessage(assessment: any, user: any) {
  const answers = assessment?.answers || {};
  const answerList = Object.entries(answers)
    .map(([k, v]: [string, any], i) => `${i + 1}. ${k}: ${JSON.stringify(v)}`)
    .join('\n');

  return `Construa perfil comportamental completo.
Participante: ${user?.displayName || user?.name || user?.email || 'Participante'}
Respostas:
${answerList}
Retorne JSON com: scores, dominantProfile, secondaryProfile, summary, strengths, challenges, roleRecommendation, workStyleRecommendation, teamBehavior, communicationTips, saboteurPatterns, derailmentRisks, developmentAreas, evolutionNotes, leadershipStyle, conflictStyle, motivators, stressors, therapyIndicator.`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { assessmentId, uid, language } = await req.json();
    if (!assessmentId || !uid) {
      return jsonResponse({ error: 'assessmentId and uid are required' }, 400);
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('app_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();
    if (assessmentError || !assessment) {
      return jsonResponse({ error: 'assessment not found' }, 404);
    }

    const { data: user } = await supabase
      .from('app_users')
      .select('*')
      .eq('uid', uid)
      .single();

    const profileData = await callAnthropic(
      buildSystemPrompt(language),
      buildUserMessage(assessment, user || {}),
      3000
    );

    if (profileData?.scores) {
      for (const key of ['D', 'I', 'S', 'C']) {
        const val = Number(profileData.scores[key]);
        profileData.scores[key] = Number.isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
      }
    }

    const payload = {
      uid,
      assessmentId,
      ...profileData,
      updatedAt: new Date().toISOString(),
    };

    await supabase.from('app_profiles').upsert(payload, { onConflict: 'uid' });
    await supabase
      .from('app_assessments')
      .update({ profileBuilt: true, profileBuiltAt: new Date().toISOString() })
      .eq('id', assessmentId);

    return jsonResponse({ profile: payload });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'buildProfile failed' }, 500);
  }
});
