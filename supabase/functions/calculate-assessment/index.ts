/**
 * ProfileAI — AMB FUSI | "Damos vida à inovação"
 * Edge Function: calculate-assessment
 * Recebe respostas brutas → calcula scores DISC + Sabotadores + PQ Score → salva no banco
 * Runtime: Deno (Supabase Edge Functions)
 * Versão: 1.0 | Abril 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// TIPOS
// ============================================================

type LikertScale = 1 | 2 | 3 | 4 | 5;
type DISCCode = 'D' | 'I' | 'S' | 'C';
type SaboteurCode =
  | 'judge' | 'stickler' | 'pleaser' | 'hyperAchiever' | 'victim'
  | 'hyperRational' | 'hyperVigilant' | 'restless' | 'controller' | 'avoider';

type DISCSubtype =
  | 'DC' | 'D' | 'Di' | 'iD' | 'i' | 'iS'
  | 'Si' | 'S' | 'SC' | 'CS' | 'C' | 'CD';

interface RequestBody {
  respostas: Record<string, LikertScale>;
  assessment_type: 'disc' | 'saboteurs' | 'full';
}

interface DISCScores {
  dominante: number;
  influente: number;
  estavel: number;
  analitico: number;
}

interface SaboteurScores {
  judge: number;
  stickler: number;
  pleaser: number;
  hyperAchiever: number;
  victim: number;
  hyperRational: number;
  hyperVigilant: number;
  restless: number;
  controller: number;
  avoider: number;
}

// ============================================================
// MAPEAMENTO: code do sabotador → coluna no banco
// ============================================================
const SABOTEUR_TO_COLUMN: Record<SaboteurCode, string> = {
  judge:          'score_juiz',
  stickler:       'score_insistente',
  pleaser:        'score_prestativo',
  hyperAchiever:  'score_hiper_realizador',
  victim:         'score_vitima',
  hyperRational:  'score_hiper_racional',
  hyperVigilant:  'score_hiper_vigilante',
  restless:       'score_inquieto',
  controller:     'score_controlador',
  avoider:        'score_esquivo',
};

// ============================================================
// MAPEAMENTO: code do perfil DISC → coluna no banco
// ============================================================
const DISC_TO_COLUMN: Record<DISCCode, string> = {
  D: 'score_dominante',
  I: 'score_influente',
  S: 'score_estavel',
  C: 'score_analitico',
};

// ============================================================
// LÓGICA: determinar subtipo DISC
// Seção 2.6 do documento de referência
// ============================================================
function determinarSubtipo(primario: DISCCode, secundario: DISCCode): DISCSubtype {
  // Perfis puros: quando a diferença entre primário e secundário é grande (>= 1.5)
  // neste contexto já temos primário e secundário, então mapeamos a combinação
  const mapa: Record<string, DISCSubtype> = {
    'D_C': 'DC', 'D_D': 'D',  'D_I': 'Di',
    'I_D': 'iD', 'I_I': 'i',  'I_S': 'iS',
    'S_I': 'Si', 'S_S': 'S',  'S_C': 'SC',
    'C_S': 'CS', 'C_C': 'C',  'C_D': 'CD',
  };
  const chave = `${primario}_${secundario}`;
  return mapa[chave] ?? (primario as DISCSubtype);
}

// ============================================================
// LÓGICA: nível DISC baseado no score 1–5
// Seção 2.7 do documento de referência
// ============================================================
function nivelDISC(score: number): string {
  if (score <= 2.0) return 'baixo';
  if (score <= 3.0) return 'moderado';
  if (score <= 4.0) return 'alto';
  return 'dominante';
}

// ============================================================
// LÓGICA: intensidade do sabotador baseada no score 1–10
// Seção 1.5 do documento de referência
// ============================================================
function intensidadeSabotador(score: number): string {
  if (score <= 3.0) return 'baixa';
  if (score <= 5.0) return 'moderada';
  if (score <= 7.0) return 'alta';
  return 'muito_alta';
}

// ============================================================
// LÓGICA: calcular PQ Score
// Fórmula: 100 - (média dos top 3 scores brutos 1–5 × 10)
// Seção 1.5 do documento de referência
// ============================================================
function calcularPQScore(scoresBrutos: Record<SaboteurCode, number>): number {
  const valores = Object.values(scoresBrutos).sort((a, b) => b - a);
  const top3 = valores.slice(0, 3);
  const mediaTop3 = top3.reduce((acc, v) => acc + v, 0) / 3;
  return Math.max(0, Math.min(100, Math.round(100 - mediaTop3 * 10)));
}

// ============================================================
// LÓGICA: normalizar score de sabotador de 1–5 para 1–10
// ============================================================
function normalizarSabotador(media: number): number {
  return Math.round(media * 2 * 10) / 10;
}

// ============================================================
// LÓGICA: calcular média das respostas por categoria
// ============================================================
function calcularMedia(
  respostas: Record<string, LikertScale>,
  questoesDaCategoria: { id: string }[]
): number {
  if (questoesDaCategoria.length === 0) return 0;

  const soma = questoesDaCategoria.reduce((acc, q) => {
    const resposta = respostas[q.id] ?? 0;
    return acc + resposta;
  }, 0);

  return Math.round((soma / questoesDaCategoria.length) * 100) / 100;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
serve(async (req: Request) => {
  // Tratar preflight CORS
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

  // Autenticação via JWT do Supabase
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Token de autenticação ausente.' }, 401);
  }

  // Inicializar cliente Supabase com token do usuário (respeita RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Validar sessão do usuário
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ success: false, error: 'Usuário não autenticado.' }, 401);
  }

  // Parsear body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Body inválido. Envie JSON.' }, 400);
  }

  const { respostas, assessment_type } = body;

  if (!respostas || typeof respostas !== 'object') {
    return jsonResponse({ success: false, error: 'Campo "respostas" é obrigatório.' }, 400);
  }

  // ---- Buscar todas as perguntas do banco ----
  const { data: perguntas, error: errPerguntas } = await supabase
    .from('assessment_questions')
    .select('id, assessment_type, categoria')
    .eq('ativo', true);

  if (errPerguntas || !perguntas) {
    console.error('[calculate-assessment] Erro ao buscar perguntas:', errPerguntas);
    return jsonResponse({ success: false, error: 'Erro ao buscar perguntas.' }, 500);
  }

  // ---- Separar perguntas por tipo e categoria ----
  const discQuestions = perguntas.filter(q => q.assessment_type === 'disc');
  const saboteurQuestions = perguntas.filter(q => q.assessment_type === 'saboteurs');

  // ============================================================
  // CALCULAR SCORES DISC (7 perguntas por perfil)
  // Seção 2.7 do documento de referência
  // ============================================================
  const discCodes: DISCCode[] = ['D', 'I', 'S', 'C'];
  const discScoresRaw: Record<DISCCode, number> = {} as Record<DISCCode, number>;

  for (const code of discCodes) {
    const questoesDoPerfil = discQuestions.filter(q => q.categoria === code);
    discScoresRaw[code] = calcularMedia(respostas, questoesDoPerfil);
  }

  // Determinar perfil primário e secundário (maior e segundo maior score)
  const discOrdenado = discCodes
    .map(code => ({ code, score: discScoresRaw[code] }))
    .sort((a, b) => b.score - a.score);

  const perfilPrimario   = discOrdenado[0].code;
  const perfilSecundario = discOrdenado[1].code;
  const subtipoDISC      = determinarSubtipo(perfilPrimario, perfilSecundario);

  const discScores: DISCScores = {
    dominante: discScoresRaw['D'],
    influente:  discScoresRaw['I'],
    estavel:    discScoresRaw['S'],
    analitico:  discScoresRaw['C'],
  };

  // ============================================================
  // CALCULAR SCORES SABOTADORES (5 perguntas por sabotador)
  // Seção 1.5 do documento de referência
  // ============================================================
  const saboteurCodes: SaboteurCode[] = [
    'judge', 'stickler', 'pleaser', 'hyperAchiever', 'victim',
    'hyperRational', 'hyperVigilant', 'restless', 'controller', 'avoider',
  ];

  // Scores brutos 1–5 (para o cálculo do PQ Score)
  const saboteurScoresBrutos: Record<SaboteurCode, number> = {} as Record<SaboteurCode, number>;
  // Scores normalizados 1–10 (para exibição)
  const saboteurScoresNorm: SaboteurScores = {} as SaboteurScores;

  for (const code of saboteurCodes) {
    const questoesDoSabotador = saboteurQuestions.filter(q => q.categoria === code);
    const media = calcularMedia(respostas, questoesDoSabotador);
    saboteurScoresBrutos[code] = media;
    saboteurScoresNorm[code] = normalizarSabotador(media);
  }

  // Top 3 sabotadores (maior intensidade — pelo score normalizado)
  const topSabotadores = (Object.entries(saboteurScoresNorm) as [SaboteurCode, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([code]) => code);

  // Intensidade de cada sabotador
  const intensidades = Object.fromEntries(
    saboteurCodes.map(code => [code, intensidadeSabotador(saboteurScoresNorm[code])])
  );

  // ============================================================
  // CALCULAR PQ SCORE
  // Fórmula: 100 - (média dos top 3 scores brutos × 10)
  // ============================================================
  const pqScore = calcularPQScore(saboteurScoresBrutos);

  // ============================================================
  // SALVAR NO BANCO (tabela: assessment_results)
  // ============================================================
  const dadosParaSalvar = {
    user_id:           user.id,
    assessment_type:   assessment_type ?? 'full',
    respostas_brutas:  respostas,

    // DISC
    score_dominante:   discScores.dominante,
    score_influente:   discScores.influente,
    score_estavel:     discScores.estavel,
    score_analitico:   discScores.analitico,
    perfil_primario:   perfilPrimario,
    perfil_secundario: perfilSecundario,
    subtipo_disc:      subtipoDISC,

    // Sabotadores (normalizados 1–10)
    score_juiz:              saboteurScoresNorm.judge,
    score_insistente:        saboteurScoresNorm.stickler,
    score_prestativo:        saboteurScoresNorm.pleaser,
    score_hiper_realizador:  saboteurScoresNorm.hyperAchiever,
    score_vitima:            saboteurScoresNorm.victim,
    score_hiper_racional:    saboteurScoresNorm.hyperRational,
    score_hiper_vigilante:   saboteurScoresNorm.hyperVigilant,
    score_inquieto:          saboteurScoresNorm.restless,
    score_controlador:       saboteurScoresNorm.controller,
    score_esquivo:           saboteurScoresNorm.avoider,
    pq_score:                pqScore,
    top_sabotadores:         topSabotadores,

    completed_at: new Date().toISOString(),
  };

  const { data: resultado, error: errInsert } = await supabase
    .from('assessment_results')
    .insert(dadosParaSalvar)
    .select('id, proxima_avaliacao')
    .single();

  if (errInsert || !resultado) {
    console.error('[calculate-assessment] Erro ao salvar resultado:', errInsert);
    return jsonResponse({ success: false, error: 'Erro ao salvar resultado no banco.' }, 500);
  }

  // ============================================================
  // RESPOSTA DE SUCESSO
  // ============================================================
  return jsonResponse({
    success: true,
    assessment_result_id: resultado.id,
    disc: {
      ...discScores,
      perfil_primario:   perfilPrimario,
      perfil_secundario: perfilSecundario,
      subtipo:           subtipoDISC,
      nivel: {
        D: nivelDISC(discScores.dominante),
        I: nivelDISC(discScores.influente),
        S: nivelDISC(discScores.estavel),
        C: nivelDISC(discScores.analitico),
      },
    },
    saboteurs: {
      ...saboteurScoresNorm,
      top_sabotadores: topSabotadores,
      intensidade: intensidades,
    },
    pq_score:          pqScore,
    proxima_avaliacao: resultado.proxima_avaliacao,
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
