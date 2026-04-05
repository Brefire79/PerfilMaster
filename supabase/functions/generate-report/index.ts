/**
 * ProfileAI — AMB FUSI | "Damos vida à inovação"
 * Edge Function: generate-report
 * Integra resultados do assessment com a Anthropic API (Claude)
 * para gerar um relatório personalizado em português brasileiro.
 * Runtime: Deno (Supabase Edge Functions)
 * Versão: 1.0 | Abril 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Gemini API — sem SDK externo, usa fetch nativo do Deno

// ============================================================
// CONSTANTES — Nomenclatura PT-BR (obrigatória no app)
// ============================================================

const DISC_NOMES: Record<string, string> = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

const DISC_DESCRICOES: Record<string, string> = {
  D: 'orientado a resultados, assertivo, decisivo, focado em controle e eficiência',
  I: 'comunicativo, entusiasta, sociável, orientado a pessoas e reconhecimento',
  S: 'calmo, leal, colaborativo, orientado à harmonia e estabilidade',
  C: 'analítico, preciso, detalhista, orientado à qualidade e lógica',
};

const SABOTEUR_NOMES: Record<string, string> = {
  judge:         'Juiz',
  stickler:      'Insistente',
  pleaser:       'Prestativo',
  hyperAchiever: 'Hiper-Realizador',
  victim:        'Vítima',
  hyperRational: 'Hiper-Racional',
  hyperVigilant: 'Hiper-Vigilante',
  restless:      'Inquieto',
  controller:    'Controlador',
  avoider:       'Esquivo',
};

const SABOTEUR_DESCRICOES: Record<string, string> = {
  judge:         'critica a si mesmo, aos outros e às circunstâncias; gera culpa e arrependimento',
  stickler:      'perfeccionismo e necessidade de ordem extremos; rigidez e dificuldade de delegar',
  pleaser:       'busca aceitação ajudando/agradando; coloca necessidades alheias acima das próprias',
  hyperAchiever: 'autoestima atrelada ao desempenho; burnout pela busca incessante de conquistas',
  victim:        'usa emoções para obter atenção; sente-se incompreendido e sobrecarregado',
  hyperRational: 'foco exclusivo na lógica; negligencia emoções e conexão humana',
  hyperVigilant: 'ansiedade constante sobre perigos; dificuldade de confiar e relaxar',
  restless:      'busca constante por novidade; dificuldade de aprofundar em projetos',
  controller:    'necessidade de controlar situações e pessoas; impaciência quando não está no comando',
  avoider:       'evita conflitos e tarefas difíceis; procrastina problemas desconfortáveis',
};

const SABOTEUR_CORRELACOES: Record<string, string[]> = {
  D: ['controller', 'hyperAchiever', 'judge'],
  I: ['pleaser', 'avoider', 'restless'],
  S: ['pleaser', 'avoider', 'victim'],
  C: ['stickler', 'hyperRational', 'hyperVigilant'],
};

// ============================================================
// HELPER: formatação de score para exibição no prompt
// ============================================================
function formatarIntensidade(score: number): string {
  if (score <= 3.0) return 'baixa (1.0–3.0)';
  if (score <= 5.0) return 'moderada (3.1–5.0)';
  if (score <= 7.0) return 'alta (5.1–7.0)';
  return 'muito alta (7.1–10.0)';
}

function formatarNivelDISC(score: number): string {
  if (score <= 2.0) return 'baixo';
  if (score <= 3.0) return 'moderado';
  if (score <= 4.0) return 'alto';
  return 'dominante';
}

// ============================================================
// CONSTRUÇÃO DO PROMPT para a Anthropic API
// Incorpora seção 3.1 do documento de referência (correlações)
// ============================================================
function construirPrompt(resultado: Record<string, unknown>): string {
  const primario   = resultado.perfil_primario as string;
  const secundario = resultado.perfil_secundario as string;
  const subtipo    = resultado.subtipo_disc as string;
  const pqScore    = resultado.pq_score as number;
  const topSabs    = (resultado.top_sabotadores as string[]) ?? [];

  // Sabotadores correlatos do perfil primário (seção 3.1)
  const sabsCorrelatos = SABOTEUR_CORRELACOES[primario] ?? [];
  const sabsPresentes  = topSabs.filter(s => sabsCorrelatos.includes(s));

  const scoresDISC = `
  - ${DISC_NOMES['D']} (D): ${resultado.score_dominante} / 5.0 — nível ${formatarNivelDISC(resultado.score_dominante as number)}
  - ${DISC_NOMES['I']} (I): ${resultado.score_influente} / 5.0 — nível ${formatarNivelDISC(resultado.score_influente as number)}
  - ${DISC_NOMES['S']} (S): ${resultado.score_estavel} / 5.0 — nível ${formatarNivelDISC(resultado.score_estavel as number)}
  - ${DISC_NOMES['C']} (C): ${resultado.score_analitico} / 5.0 — nível ${formatarNivelDISC(resultado.score_analitico as number)}`;

  const scoresSabs = topSabs.map(code => {
    const coluna = SCORE_COLUMNS[code];
    const score  = resultado[coluna] as number ?? 0;
    return `  - ${SABOTEUR_NOMES[code]}: ${score} / 10.0 — intensidade ${formatarIntensidade(score)} — ${SABOTEUR_DESCRICOES[code]}`;
  }).join('\n');

  return `Você é um especialista em comportamento humano, coaching executivo e inteligência positiva, trabalhando para a plataforma ProfileAI da AMB FUSI.

Analise o perfil comportamental do usuário a seguir e gere um relatório personalizado COMPLETO, PROFUNDO e ACIONÁVEL. Todo o conteúdo deve estar em PORTUGUÊS BRASILEIRO.

========================================
PERFIL DISC DO USUÁRIO
========================================
Perfil Primário: ${DISC_NOMES[primario]} (${primario}) — ${DISC_DESCRICOES[primario]}
Perfil Secundário: ${DISC_NOMES[secundario]} (${secundario}) — ${DISC_DESCRICOES[secundario]}
Subtipo DISC: ${subtipo}

Scores DISC (escala 1.0–5.0):
${scoresDISC}

========================================
TOP 3 SABOTADORES DO USUÁRIO
========================================
${scoresSabs}

PQ Score: ${pqScore}/100 (${pqScore >= 75 ? 'Excelente — acima do ponto crítico de desempenho ótimo' : pqScore >= 63 ? 'Bom — acima da média da população' : pqScore >= 51 ? 'Médio — dentro da faixa populacional' : 'Abaixo da média — sabotadores têm alta influência'})

========================================
CORRELAÇÕES RELEVANTES (framework PQ + DISC)
========================================
Para o perfil ${DISC_NOMES[primario]}, os sabotadores mais comuns são: ${sabsCorrelatos.map(c => SABOTEUR_NOMES[c]).join(', ')}.
${sabsPresentes.length > 0
  ? `O usuário confirma os seguintes sabotadores correlatos: ${sabsPresentes.map(c => SABOTEUR_NOMES[c]).join(', ')}.`
  : 'O usuário não confirmou fortemente os sabotadores correlatos típicos do seu perfil.'}

========================================
ESTRUTURA DO RELATÓRIO SOLICITADO
========================================

Gere o relatório na seguinte estrutura JSON (responda APENAS com o JSON, sem texto adicional):

{
  "resumo_perfil": "2 a 3 parágrafos descrevendo o perfil comportamental completo do usuário, integrando DISC primário, secundário e subtipo. Seja específico, profundo e personalizado.",

  "impacto_sabotadores": "1 a 2 parágrafos explicando como os top 3 sabotadores afetam especificamente este perfil DISC. Use as correlações do framework para conectar padrões comportamentais com padrões mentais sabotadores.",

  "recomendacoes": [
    "Recomendação prática 1 — específica e acionável",
    "Recomendação prática 2 — específica e acionável",
    "Recomendação prática 3 — específica e acionável",
    "Recomendação prática 4 — específica e acionável",
    "Recomendação prática 5 — específica e acionável"
  ],

  "focos_mentoria": [
    "Foco de mentoria prioritário 1 — com justificativa",
    "Foco de mentoria prioritário 2 — com justificativa",
    "Foco de mentoria prioritário 3 — com justificativa"
  ],

  "pontos_fortes": [
    "Ponto forte 1 a potencializar",
    "Ponto forte 2 a potencializar",
    "Ponto forte 3 a potencializar"
  ]
}

DIRETRIZES:
- Todo o texto deve ser 100% em português brasileiro
- Use linguagem profissional mas acessível
- Seja específico ao perfil — evite generalidades
- Conecte sempre o DISC com os sabotadores nas análises
- As recomendações devem ser práticas e implementáveis no dia a dia profissional
- Os focos de mentoria devem ser priorizados pela combinação de impacto e urgência
- Não mencione o framework pelo nome técnico (não diga "Positive Intelligence" ou "DISC") — escreva naturalmente`;
}

// Mapeia code do sabotador para coluna no banco
const SCORE_COLUMNS: Record<string, string> = {
  judge:         'score_juiz',
  stickler:      'score_insistente',
  pleaser:       'score_prestativo',
  hyperAchiever: 'score_hiper_realizador',
  victim:        'score_vitima',
  hyperRational: 'score_hiper_racional',
  hyperVigilant: 'score_hiper_vigilante',
  restless:      'score_inquieto',
  controller:    'score_controlador',
  avoider:       'score_esquivo',
};

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Método não permitido.' }, 405);
  }

  // Autenticação
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Token de autenticação ausente.' }, 401);
  }

  // Inicializar Supabase com token do usuário (respeita RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Validar usuário
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ success: false, error: 'Usuário não autenticado.' }, 401);
  }

  // Parsear body
  let body: { assessment_result_id: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Body inválido. Envie JSON.' }, 400);
  }

  const { assessment_result_id } = body;
  if (!assessment_result_id) {
    return jsonResponse({ success: false, error: 'Campo "assessment_result_id" é obrigatório.' }, 400);
  }

  // ---- Buscar resultado do assessment ----
  const { data: resultado, error: errResult } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('id', assessment_result_id)
    .eq('user_id', user.id)  // RLS extra: garante que o resultado é do usuário
    .single();

  if (errResult || !resultado) {
    return jsonResponse({ success: false, error: 'Resultado não encontrado ou acesso negado.' }, 404);
  }

  // ---- Verificar se já existe relatório para este assessment ----
  const { data: relatorioExistente } = await supabase
    .from('user_reports')
    .select('id, resumo_perfil, impacto_sabotadores, recomendacoes, focos_mentoria, pontos_fortes, relatorio_completo')
    .eq('assessment_result_id', assessment_result_id)
    .single();

  if (relatorioExistente) {
    // Retornar relatório já gerado sem chamar a API novamente
    return jsonResponse({
      success: true,
      report_id:           relatorioExistente.id,
      resumo_perfil:       relatorioExistente.resumo_perfil,
      impacto_sabotadores: relatorioExistente.impacto_sabotadores ?? '',
      recomendacoes:       relatorioExistente.recomendacoes,
      focos_mentoria:      relatorioExistente.focos_mentoria,
      pontos_fortes:       relatorioExistente.pontos_fortes,
      relatorio_completo:  relatorioExistente.relatorio_completo,
      tokens_usados:       0,
      cached:              true,
    }, 200);
  }

  // ---- Construir prompt e chamar Gemini API ----
  const prompt = construirPrompt(resultado);

  let iaResposta: string | null = null;
  let tokensUsados = 0;
  let modeloUsado = 'fallback';

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

  // Tenta múltiplos modelos em ordem de disponibilidade no free tier
  const MODELOS_GEMINI = [
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
  ];

  for (const model of MODELOS_GEMINI) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      });
      const geminiData = await geminiRes.json();
      if (geminiRes.ok && geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        iaResposta   = geminiData.candidates[0].content.parts[0].text;
        tokensUsados = geminiData.usageMetadata?.totalTokenCount ?? 0;
        modeloUsado  = model;
        break;
      }
      console.warn(`[generate-report] Modelo ${model} falhou (${geminiData?.error?.code ?? geminiRes.status}):`, geminiData?.error?.message?.substring(0, 100));
    } catch (e) {
      console.warn(`[generate-report] Erro com modelo ${model}:`, e);
    }
  }

  // ---- Fallback: relatório estático se todos os modelos falharem ----
  if (!iaResposta) {
    const p  = resultado.perfil_primario as string;
    const s  = resultado.perfil_secundario as string;
    const pq = resultado.pq_score as number;
    const topSabs = (resultado.top_sabotadores as string[]) ?? [];
    iaResposta = JSON.stringify({
      resumo_perfil: `Seu perfil comportamental predominante é ${DISC_NOMES[p] ?? p}${s ? ` com influência ${DISC_NOMES[s] ?? s}` : ''}. Este perfil combina características distintas que moldam sua forma de tomar decisões, interagir com pessoas e conduzir projetos. A análise detalhada dos seus resultados revela padrões comportamentais consistentes que, quando bem compreendidos, se tornam ferramentas poderosas de autodesenvolvimento e liderança.`,
      impacto_sabotadores: `Seus principais padrões mentais limitantes — ${topSabs.map(c => SABOTEUR_NOMES[c] ?? c).join(', ')} — interagem diretamente com seu perfil ${DISC_NOMES[p] ?? p}. Esses padrões podem reduzir sua eficácia em situações de pressão e impactar suas relações profissionais. Reconhecê-los é o primeiro passo para transformá-los em aliados.`,
      recomendacoes: [
        `Pratique pausas conscientes antes de tomar decisões importantes para reduzir o impacto dos seus padrões limitantes.`,
        `Invista em comunicação assertiva, especialmente em situações que ativam seus sabotadores predominantes.`,
        `Estabeleça rotinas de autoavaliação semanal focadas nos seus pontos de desenvolvimento identificados.`,
        `Busque feedback estruturado de colegas e mentores sobre seus comportamentos em situações de pressão.`,
        `Desenvolva rituais de recuperação emocional para manter seu PQ Score (${pq}/100) em crescimento constante.`,
      ],
      focos_mentoria: [
        `Reconhecimento e neutralização dos padrões: ${topSabs.map(c => SABOTEUR_NOMES[c] ?? c).join(' e ')}.`,
        `Potencialização das forças do perfil ${DISC_NOMES[p] ?? p} em contextos de alta complexidade.`,
        `Desenvolvimento da inteligência emocional e relacionamentos mais equilibrados no ambiente profissional.`,
      ],
      pontos_fortes: [
        `Clareza de estilo comportamental — saber quem você é facilita alinhamento com times e projetos certos.`,
        `Consciência dos seus padrões — já identificados, eles podem ser trabalhados intencionalmente.`,
        `PQ Score de ${pq}/100 como ponto de partida mensurável para seu desenvolvimento contínuo.`,
      ],
    });
    modeloUsado = 'fallback-estatico';
    console.log('[generate-report] Usando relatório fallback estático (Gemini indisponível).');
  }

  // ---- Parsear JSON retornado pela IA ----
  let analise: {
    resumo_perfil: string;
    impacto_sabotadores: string;
    recomendacoes: string[];
    focos_mentoria: string[];
    pontos_fortes: string[];
  };

  try {
    // Extrair JSON da resposta (a IA pode retornar apenas o JSON ou com markdown ```json)
    const jsonMatch = iaResposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nenhum JSON encontrado na resposta da IA.');
    analise = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn('[generate-report] Erro ao parsear resposta da IA — usando fallback estático:', e);
    // Recai no fallback estático em vez de retornar erro
    const pFb  = resultado.perfil_primario as string;
    const sFb  = resultado.perfil_secundario as string;
    const pqFb = resultado.pq_score as number;
    const topSabsFb = (resultado.top_sabotadores as string[]) ?? [];
    analise = JSON.parse(JSON.stringify({
      resumo_perfil: `Seu perfil comportamental predominante é ${DISC_NOMES[pFb] ?? pFb}${sFb ? ` com influência ${DISC_NOMES[sFb] ?? sFb}` : ''}. Este perfil combina características distintas que moldam sua forma de tomar decisões, interagir com pessoas e conduzir projetos. A análise dos seus resultados revela padrões comportamentais consistentes que, quando compreendidos, tornam-se ferramentas poderosas de autodesenvolvimento.`,
      impacto_sabotadores: `Seus principais padrões mentais limitantes — ${topSabsFb.map(c => SABOTEUR_NOMES[c] ?? c).join(', ')} — interagem com seu perfil ${DISC_NOMES[pFb] ?? pFb}. Reconhecê-los é o primeiro passo para transformá-los em aliados.`,
      recomendacoes: [
        'Pratique pausas conscientes antes de tomar decisões importantes para reduzir o impacto dos seus padrões limitantes.',
        'Invista em comunicação assertiva, especialmente em situações que ativam seus sabotadores predominantes.',
        'Estabeleça rotinas de autoavaliação semanal focadas nos seus pontos de desenvolvimento identificados.',
        'Busque feedback estruturado de colegas e mentores sobre seus comportamentos em situações de pressão.',
        `Desenvolva rituais de recuperação emocional para manter seu PQ Score (${pqFb}/100) em crescimento constante.`,
      ],
      focos_mentoria: [
        `Reconhecimento e neutralização dos padrões: ${topSabsFb.map(c => SABOTEUR_NOMES[c] ?? c).join(' e ')}.`,
        `Potencialização das forças do perfil ${DISC_NOMES[pFb] ?? pFb} em contextos de alta complexidade.`,
        'Desenvolvimento da inteligência emocional e relacionamentos mais equilibrados no ambiente profissional.',
      ],
      pontos_fortes: [
        'Clareza de estilo comportamental — saber quem você é facilita alinhamento com times e projetos certos.',
        'Consciência dos seus padrões — já identificados, eles podem ser trabalhados intencionalmente.',
        `PQ Score de ${pqFb}/100 como ponto de partida mensurável para seu desenvolvimento contínuo.`,
      ],
    }));
    modeloUsado = 'fallback-parse-error';
  }

  // Validar campos obrigatórios (garante que fallback também está completo)
  if (!analise.resumo_perfil || !analise.recomendacoes || !analise.focos_mentoria) {
    return jsonResponse({ success: false, error: 'Resposta da IA incompleta.' }, 500);
  }

  // ---- Montar relatório completo em Markdown ----
  const perfilPrimario   = resultado.perfil_primario as string;
  const perfilSecundario = resultado.perfil_secundario as string;
  const subtipo          = resultado.subtipo_disc as string;
  const pqScore          = resultado.pq_score as number;
  const topSabs          = (resultado.top_sabotadores as string[]) ?? [];

  const relatorioCompleto = `# Relatório de Perfil Comportamental
**ProfileAI · AMB FUSI · ${new Date().toLocaleDateString('pt-BR')}**

---

## Seu Perfil: ${DISC_NOMES[perfilPrimario]}${perfilSecundario ? ` + ${DISC_NOMES[perfilSecundario]}` : ''} (${subtipo})

${analise.resumo_perfil}

---

## Como seus padrões mentais afetam seu perfil

${analise.impacto_sabotadores}

---

## Seus 3 principais padrões limitantes

${topSabs.map((code, i) => {
  const coluna = SCORE_COLUMNS[code];
  const score  = resultado[coluna] as number ?? 0;
  return `### ${i + 1}. ${SABOTEUR_NOMES[code]} (${score.toFixed(1)}/10)\n${SABOTEUR_DESCRICOES[code].charAt(0).toUpperCase() + SABOTEUR_DESCRICOES[code].slice(1)}.`;
}).join('\n\n')}

---

## 5 Recomendações Práticas de Desenvolvimento

${analise.recomendacoes.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}

---

## 3 Focos Prioritários de Mentoria

${analise.focos_mentoria.map((f, i) => `**${i + 1}. ${f}**`).join('\n\n')}

---

## Pontos Fortes a Potencializar

${analise.pontos_fortes.map(p => `- ${p}`).join('\n')}

---

## Seu PQ Score: ${pqScore}/100

${pqScore >= 75
  ? '✅ Seu PQ Score está acima do ponto crítico de 75. Você tem uma boa proporção de estados mentais positivos.'
  : pqScore >= 63
    ? '⚡ Seu PQ Score está acima da média, mas ainda há espaço para reduzir a influência dos seus sabotadores.'
    : '⚠️ Seu PQ Score indica que os padrões mentais limitantes têm impacto significativo. Este é o principal foco de desenvolvimento.'}

---

*Relatório gerado por ProfileAI · AMB FUSI — "Damos vida à inovação"*
*Frameworks: Positive Intelligence (Shirzad Chamine) + DISC (William M. Marston)*`;

  // ---- Salvar relatório no banco ----
  const { data: relatorioSalvo, error: errRelatorio } = await supabase
    .from('user_reports')
    .insert({
      user_id:              user.id,
      assessment_result_id: assessment_result_id,
      resumo_perfil:        analise.resumo_perfil,
      impacto_sabotadores:  analise.impacto_sabotadores,
      recomendacoes:        analise.recomendacoes,
      focos_mentoria:       analise.focos_mentoria,
      pontos_fortes:        analise.pontos_fortes,
      relatorio_completo:   relatorioCompleto,
      modelo_ia:            modeloUsado,
      tokens_usados:        tokensUsados,
    })
    .select('id')
    .single();

  if (errRelatorio || !relatorioSalvo) {
    console.error('[generate-report] Erro ao salvar relatório:', errRelatorio);
    return jsonResponse({ success: false, error: 'Erro ao salvar relatório no banco.' }, 500);
  }

  return jsonResponse({
    success:             true,
    report_id:           relatorioSalvo.id,
    resumo_perfil:       analise.resumo_perfil,
    impacto_sabotadores: analise.impacto_sabotadores,
    recomendacoes:       analise.recomendacoes,
    focos_mentoria:      analise.focos_mentoria,
    pontos_fortes:       analise.pontos_fortes,
    relatorio_completo:  relatorioCompleto,
    tokens_usados:       tokensUsados,
  }, 200);
});

// ============================================================
// HELPER: retornar JSON com headers CORS
// ============================================================
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
