import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// P1-3: usa CORS centralizado de _shared/response.ts (alinhado com PRD §4.4)
import { handleCors, jsonResponse } from '../_shared/response.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);
const QUESTIONS = [
  { id: 'q_d_01', dimension: 'D', type: 'likert5', weight: 1.0 }, { id: 'q_d_02', dimension: 'D', type: 'likert5', weight: 1.0 },
  { id: 'q_d_03', dimension: 'D', type: 'forced_choice', weight: 1.2 }, { id: 'q_d_04', dimension: 'D', type: 'likert5', weight: 1.1 },
  { id: 'q_d_05', dimension: 'D', type: 'scenario', weight: 1.5 }, { id: 'q_d_06', dimension: 'D', type: 'likert5', weight: 1.5 },
  { id: 'q_i_01', dimension: 'I', type: 'likert5', weight: 1.0 }, { id: 'q_i_02', dimension: 'I', type: 'likert5', weight: 1.0 },
  { id: 'q_i_03', dimension: 'I', type: 'forced_choice', weight: 1.2 }, { id: 'q_i_04', dimension: 'I', type: 'likert5', weight: 1.1 },
  { id: 'q_i_05', dimension: 'I', type: 'scenario', weight: 1.5 }, { id: 'q_i_06', dimension: 'I', type: 'likert5', weight: 1.5 },
  { id: 'q_s_01', dimension: 'S', type: 'likert5', weight: 1.0 }, { id: 'q_s_02', dimension: 'S', type: 'likert5', weight: 1.0 },
  { id: 'q_s_03', dimension: 'S', type: 'forced_choice', weight: 1.2 }, { id: 'q_s_04', dimension: 'S', type: 'likert5', weight: 1.1 },
  { id: 'q_s_05', dimension: 'S', type: 'scenario', weight: 1.5 }, { id: 'q_s_06', dimension: 'S', type: 'likert5', weight: 1.5 },
  { id: 'q_c_01', dimension: 'C', type: 'likert5', weight: 1.0 }, { id: 'q_c_02', dimension: 'C', type: 'likert5', weight: 1.0 },
  { id: 'q_c_03', dimension: 'C', type: 'forced_choice', weight: 1.2 }, { id: 'q_c_04', dimension: 'C', type: 'likert5', weight: 1.1 },
  { id: 'q_c_05', dimension: 'C', type: 'scenario', weight: 1.5 }, { id: 'q_c_06', dimension: 'C', type: 'likert5', weight: 1.5 },
  // DELTA 8: questões *_07 existem em sampleQuestions.js e eram respondidas
  // mas IGNORADAS no cálculo — agora pontuam com o mesmo peso do front (1.1)
  { id: 'q_d_07', dimension: 'D', type: 'likert5', weight: 1.1 }, { id: 'q_i_07', dimension: 'I', type: 'likert5', weight: 1.1 },
  { id: 'q_s_07', dimension: 'S', type: 'likert5', weight: 1.1 }, { id: 'q_c_07', dimension: 'C', type: 'likert5', weight: 1.1 },
];
const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));
function calcularPerfil(respostas: Record<string, number>) {
  const acumulado = { D: 0, I: 0, S: 0, C: 0 };
  const pesosTotal = { D: 0, I: 0, S: 0, C: 0 };
  for (const [questionId, valor] of Object.entries(respostas || {})) {
    const q = QUESTION_MAP.get(questionId);
    if (!q) continue;
    const range = q.type === 'likert5' ? 4 : 3;
    const normalizado = Math.max(0, Math.min(1, (Number(valor) - 1) / range));
    acumulado[q.dimension] += normalizado * q.weight;
    pesosTotal[q.dimension] += q.weight;
  }
  const scores = {
    D: pesosTotal.D > 0 ? Math.round((acumulado.D / pesosTotal.D) * 100) : 0,
    I: pesosTotal.I > 0 ? Math.round((acumulado.I / pesosTotal.I) * 100) : 0,
    S: pesosTotal.S > 0 ? Math.round((acumulado.S / pesosTotal.S) * 100) : 0,
    C: pesosTotal.C > 0 ? Math.round((acumulado.C / pesosTotal.C) * 100) : 0,
  };
  const ordenado = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const perfilPrimario = ordenado[0]?.[0] || 'D';
  const perfilSecundario = ordenado[1] && ordenado[1][1] >= Number(ordenado[0][1]) * 0.8 ? ordenado[1][0] : undefined;
  return { dominante: scores.D, influente: scores.I, estavel: scores.S, analitico: scores.C, perfilPrimario, perfilSecundario };
}
const TRANSICOES_VALIDAS: Record<string, string[]> = {
  pendente: ['em_andamento', 'concluido'],
  em_andamento: ['em_andamento', 'concluido'],
  concluido: [],
};

// DELTA 7: validação de CPF no servidor (mesma regra da lib do front)
function cpfDigitsOnly(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}
function isValidCpfServer(v: unknown): boolean {
  const cpf = cpfDigitsOnly(v);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const { token, novoStatus, respostas, cpf, cpfConsent } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 100)
      return jsonResponse({ error: 'token inválido' }, 400, req);
    if (!novoStatus) return jsonResponse({ error: 'novoStatus is required' }, 400, req);
    const { data: avaliado, error: avaliadoError } = await supabase
      .from('app_avaliados').select('*').eq('token', token).single();
    if (avaliadoError || !avaliado)
      return jsonResponse({ error: 'Token inválido ou expirado.' }, 404, req);
    const statusAtual = avaliado.status;
    if (!TRANSICOES_VALIDAS[statusAtual]?.includes(novoStatus))
      return jsonResponse({ error: `Transição inválida: ${statusAtual} -> ${novoStatus}` }, 400, req);
    const agora = new Date().toISOString();
    const payload: Record<string, unknown> = { status: novoStatus, atualizadoem: agora };
    if (novoStatus === 'em_andamento') payload.iniciadoem = agora;

    // DELTA 7: CPF opcional informado pelo avaliado na avaliação pública.
    // Só grava se for válido E o avaliado ainda NÃO tiver CPF (não sobrescreve
    // o que o admin já registrou). cpfConsent implícito: avaliado preencheu.
    if (cpf && !avaliado.cpf && isValidCpfServer(cpf) && cpfConsent === true) {
      payload.cpf = cpfDigitsOnly(cpf);
      payload.cpf_consent = true;
      payload.cpf_consent_at = agora;
    }
    let perfil: Record<string, unknown> | null = null;
    if (novoStatus === 'concluido') {
      if (!respostas || typeof respostas !== 'object' || Object.keys(respostas).length === 0)
        return jsonResponse({ error: 'respostas are required to conclude' }, 400, req);
      perfil = calcularPerfil(respostas);
      payload.respostas = respostas;
      payload.perfil = perfil;
      payload.concluidoem = agora;
      await supabase.from('app_sessao_respostas').insert({
        avaliadoid: avaliado.id || avaliado.token,
        sessaoid: avaliado.sessaoid,
        respostas,
        submissaoem: agora,
      });
    }
    await supabase.from('app_avaliados').update(payload).eq('token', token);
    return jsonResponse({ success: true, ...(perfil ? { perfil } : {}) }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'atualizarStatus failed' }, 500, req);
  }
});
