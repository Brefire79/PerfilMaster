import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, canAccessAssessment } from '../_shared/auth.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

function buildSystemPrompt(language?: string) {
  return `Você é um especialista sênior em psicologia organizacional, avaliação comportamental e desenvolvimento humano.
Analisa avaliações comportamentais completas usando o modelo de 4 perfis:
D = Dominante (Executor), I = Influente (Comunicador), S = Estável (Colaborador), C = Analítico (Conforme).
Baseie-se nos frameworks DiSC, Social Style e OCAI.

DIRETRIZES PARA O CAMPO adminStrategy (uso EXCLUSIVO do instrutor/coach):
- Tom profissional, concreto e acionável — pense como um psicólogo organizacional escrevendo um briefing pré-1:1
- coachingQuestions: perguntas abertas e poderosas que provocam reflexão (não perguntas fechadas)
- redFlags: sinais comportamentais observáveis, não diagnósticos
- actionPlan: ações específicas, mensuráveis e com cadência (ex: "Reunião semanal de 30min sobre prioridades")
- compatibilityMap: descreva sinergias e pontos de atenção em cada combinação DISC
- executiveBrief: deve permitir ao instrutor entender em 60 segundos como conduzir uma conversa eficaz

Nos textos gerados, use SEMPRE a nomenclatura em português do Brasil como primária.
Responda SOMENTE em JSON válido, sem texto adicional.
Idioma da resposta: ${language || 'ptBR'}`;
}

function buildUserMessage(assessment: any, user: any) {
  const answers = assessment?.answers || {};
  const answerList = Object.entries(answers)
    .map(([k, v]: [string, any], i) => `${i + 1}. ${k}: ${JSON.stringify(v)}`)
    .join('\n');

  return `Construa um perfil comportamental completo e aprofundado com base nos dados abaixo.

Participante: ${user?.displayname || user?.displayName || user?.name || user?.email || 'Participante'}
Objetivo: ${assessment?.moduleObjective || assessment?.objective || 'Avaliação comportamental'}

Respostas da avaliação:
${answerList || 'Sem respostas disponíveis'}

Retorne SOMENTE o seguinte JSON:
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
  "teamBehavior": "<comportamento em equipe>",
  "communicationTips": "<como se comunicar com esse perfil>",
  "saboteurPatterns": ["<padrão 1>", "<padrão 2>", "<padrão 3>"],
  "derailmentRisks": ["<risco 1>", "<risco 2>", "<risco 3>"],
  "developmentAreas": ["<área 1>", "<área 2>"],
  "evolutionNotes": "<observações sobre crescimento potencial>",
  "leadershipStyle": "<estilo de liderança natural>",
  "conflictStyle": "<como lida com conflitos>",
  "motivators": ["<motivador 1>", "<motivador 2>", "<motivador 3>"],
  "stressors": ["<estressor 1>", "<estressor 2>"],
  "therapyIndicator": {
    "flagged": <true|false>,
    "level": "<none|watch|suggest>",
    "note": "<nota discreta não diagnóstica, ou string vazia se não flagged>"
  },
  "adminStrategy": {
    "executiveBrief": "<briefing estratégico de 2-3 parágrafos que o instrutor deve ler antes de uma conversa 1:1 com este participante. Foco em insights acionáveis>",
    "approachStyle": "<como abordar este participante em conversas 1:1 — tom, ritmo, abertura, fechamento>",
    "coachingQuestions": ["<pergunta poderosa 1>", "<pergunta 2>", "<pergunta 3>", "<pergunta 4>", "<pergunta 5>"],
    "feedbackApproach": "<como dar feedback eficaz para este perfil — formato, momento, linguagem>",
    "motivationLevers": ["<alavanca motivacional 1>", "<alavanca 2>", "<alavanca 3>"],
    "redFlags": ["<sinal de alerta 1 que o instrutor deve monitorar>", "<sinal 2>", "<sinal 3>"],
    "nextAssessmentFocus": "<o que o instrutor deve observar e medir até a próxima avaliação para acompanhar evolução>",
    "actionPlan": ["<ação concreta 1 — sugestão de prática semanal/mensal>", "<ação 2>", "<ação 3>", "<ação 4>"],
    "compatibilityMap": {
      "D": "<como este perfil interage com Dominantes — sinergias e atritos>",
      "I": "<como interage com Influentes>",
      "S": "<como interage com Estáveis>",
      "C": "<como interage com Analíticos>"
    },
    "delegationGuide": "<que tipo de tarefa delegar a este participante e que tipo evitar>",
    "stretchAreas": ["<área de desafio para crescimento 1>", "<área 2>", "<área 3>"]
  }
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

    const { assessmentId, uid, language } = await req.json();
    if (!assessmentId || !uid) {
      return jsonResponse({ error: 'assessmentId and uid are required' }, 400, req);
    }

    const allowed = await canAccessAssessment(caller.id, assessmentId);
    if (!allowed) {
      return jsonResponse({ error: 'forbidden — caller cannot access this assessment' }, 403, req);
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('app_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();
    if (assessmentError || !assessment) {
      return jsonResponse({ error: 'assessment not found' }, 404, req);
    }

    const { data: user } = await supabase
      .from('app_users')
      .select('*')
      .eq('uid', uid)
      .single();

    // Scores DISC determinísticos já calculados pelo wizard são a FONTE DA VERDADE.
    // A IA enriquece texto, NÃO recalcula scores. Lê o profile existente p/ preservar.
    const { data: existingProfile } = await supabase
      .from('app_profiles')
      .select('scores, dominantprofile, secondaryprofile')
      .eq('uid', uid)
      .single();
    const scoresValidos = (s) => s && ['D','I','S','C'].some((k) => Number(s[k]) > 0);
    const existingScores = existingProfile?.scores;

    const profileData = await callAnthropic(
      buildSystemPrompt(language),
      buildUserMessage(assessment, user || {}),
      6000
    );

    if (profileData?.scores) {
      for (const key of ['D', 'I', 'S', 'C']) {
        const val = Number(profileData.scores[key]);
        profileData.scores[key] = Number.isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
      }
    }

    // Preserva os scores reais do wizard se a IA não trouxer scores válidos.
    const finalScores = scoresValidos(profileData?.scores)
      ? profileData.scores
      : (scoresValidos(existingScores) ? existingScores : (profileData?.scores || {}));
    // Idem para o perfil dominante/secundário — não sobrescrever com vazio
    const finalDominant = profileData?.dominantProfile || existingProfile?.dominantprofile || null;
    const finalSecondary = profileData?.secondaryProfile || existingProfile?.secondaryprofile || null;

    const now = new Date().toISOString();

    const dbPayload = {
      uid,
      assessmentid: assessmentId,
      scores: finalScores,
      dominantprofile: finalDominant,
      secondaryprofile: finalSecondary,
      aisummary: {
        summary: profileData.summary,
        strengths: profileData.strengths,
        challenges: profileData.challenges,
        roleRecommendation: profileData.roleRecommendation,
        careerRecommendation: profileData.roleRecommendation,
        motivators: profileData.motivators || [],
        stressors: profileData.stressors || [],
        adminStrategy: profileData.adminStrategy || null,
      },
      rolerecommendation: profileData.roleRecommendation,
      workstylerecommendation: profileData.workStyleRecommendation,
      teambehavior: profileData.teamBehavior,
      communicationtips: profileData.communicationTips,
      saboteurpatterns: profileData.saboteurPatterns,
      derailmentrisks: profileData.derailmentRisks,
      developmentareas: profileData.developmentAreas,
      evolutionnotes: profileData.evolutionNotes,
      leadershipstyle: profileData.leadershipStyle,
      conflictstyle: profileData.conflictStyle,
      therapyindicator: profileData.therapyIndicator,
      updatedat: now,
    };

    await supabase.from('app_profiles').upsert(dbPayload, { onConflict: 'uid' });
    await supabase
      .from('app_assessments')
      .update({ profilebuilt: true, profilebuiltat: now })
      .eq('id', assessmentId);

    return jsonResponse({ profile: profileData }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'buildProfile failed' }, 500, req);
  }
});
