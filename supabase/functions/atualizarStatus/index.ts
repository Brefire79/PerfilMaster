import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// P1-3: usa CORS centralizado de _shared/response.ts (alinhado com PRD §4.4)
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { logAuditEvent } from '../_shared/audit.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);
// FIX (auditoria 07/07/2026): TODAS as 28 questões DISC são likert5 em
// sampleQuestions.js — os types antigos forced_choice/scenario (range 3)
// distorciam _03/_05 (respostas 4 e 5 normalizavam ambas para 1.0).
// Espelho de src/lib/discScoring.js — mudou lá, mude aqui (e vice-versa).
const QUESTIONS = [
  { id: 'q_d_01', dimension: 'D', type: 'likert5', weight: 1.0 }, { id: 'q_d_02', dimension: 'D', type: 'likert5', weight: 1.0 },
  { id: 'q_d_03', dimension: 'D', type: 'likert5', weight: 1.2 }, { id: 'q_d_04', dimension: 'D', type: 'likert5', weight: 1.1 },
  { id: 'q_d_05', dimension: 'D', type: 'likert5', weight: 1.5 }, { id: 'q_d_06', dimension: 'D', type: 'likert5', weight: 1.5 },
  { id: 'q_i_01', dimension: 'I', type: 'likert5', weight: 1.0 }, { id: 'q_i_02', dimension: 'I', type: 'likert5', weight: 1.0 },
  { id: 'q_i_03', dimension: 'I', type: 'likert5', weight: 1.2 }, { id: 'q_i_04', dimension: 'I', type: 'likert5', weight: 1.1 },
  { id: 'q_i_05', dimension: 'I', type: 'likert5', weight: 1.5 }, { id: 'q_i_06', dimension: 'I', type: 'likert5', weight: 1.5 },
  { id: 'q_s_01', dimension: 'S', type: 'likert5', weight: 1.0 }, { id: 'q_s_02', dimension: 'S', type: 'likert5', weight: 1.0 },
  { id: 'q_s_03', dimension: 'S', type: 'likert5', weight: 1.2 }, { id: 'q_s_04', dimension: 'S', type: 'likert5', weight: 1.1 },
  { id: 'q_s_05', dimension: 'S', type: 'likert5', weight: 1.5 }, { id: 'q_s_06', dimension: 'S', type: 'likert5', weight: 1.5 },
  { id: 'q_c_01', dimension: 'C', type: 'likert5', weight: 1.0 }, { id: 'q_c_02', dimension: 'C', type: 'likert5', weight: 1.0 },
  { id: 'q_c_03', dimension: 'C', type: 'likert5', weight: 1.2 }, { id: 'q_c_04', dimension: 'C', type: 'likert5', weight: 1.1 },
  { id: 'q_c_05', dimension: 'C', type: 'likert5', weight: 1.5 }, { id: 'q_c_06', dimension: 'C', type: 'likert5', weight: 1.5 },
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
// ── Sabotadores (PQ) no fluxo público (avaliação avulsa é sempre Completa/78) ──
// Espelha src/lib/saboteurScoring.js. As 50 questões q_sab_<slug>_NN (likert 1-5)
// mapeiam para 10 chaves canônicas. PQ Score = 100 - (média top-3 brutos × 10).
const SAB_SLUG_TO_KEY: Record<string, string> = {
  judge: 'judge', avoider: 'avoider', controller: 'controller',
  hyperach: 'hyperAchiever', hyperrat: 'hyperRational', hypervig: 'hyperVigilant',
  pleaser: 'pleaser', restless: 'restless', stickler: 'stickler', victim: 'victim',
};
const SAB_KEYS = Object.values(SAB_SLUG_TO_KEY);

// ── A3 (auditoria 27/07/2026): allowlist de ids aceitos ───────────────────────
// Antes, `payload.respostas = respostas` gravava o objeto CRU do cliente:
// chaves desconhecidas viravam lixo no banco e valores fora de 1-5 passavam
// (calcularPerfil clampa, calcularSabotadores NÃO — `valor: 500` gerava score
// acima de 100 e contaminava central_group_insights).
const SAB_IDS = Object.keys(SAB_SLUG_TO_KEY).flatMap((slug) =>
  ['01', '02', '03', '04', '05'].map((n) => `q_sab_${slug}_${n}`)
);
const DISC_IDS = QUESTIONS.map((q) => q.id);
const IDS_VALIDOS = new Set<string>([...DISC_IDS, ...SAB_IDS]);

// Quantos itens de cada bloco precisam existir para o resultado valer.
// Margem pequena de tolerância: uma questão perdida não invalida a avaliação,
// mas concluir com meia dúzia de respostas, sim.
const MIN_DISC = 26; // de 28
const MIN_SAB = 45;  // de 50
const MAX_RESPOSTAS = 200; // teto defensivo (78 legítimas)

/**
 * sanitizarRespostas — descarta o que não é questão conhecida e força os
 * valores para inteiros 1..5. Devolve também o que foi rejeitado, para log.
 */
function sanitizarRespostas(bruto: Record<string, unknown>) {
  const limpo: Record<string, number> = {};
  const ignorados: string[] = [];
  for (const [id, valor] of Object.entries(bruto || {})) {
    if (!IDS_VALIDOS.has(id)) { ignorados.push(id); continue; }
    const v = Math.round(Number(valor));
    if (!Number.isFinite(v) || v < 1 || v > 5) { ignorados.push(id); continue; }
    limpo[id] = v;
  }
  return { limpo, ignorados };
}

/** A1 — cobertura por bloco. Sabotadores só são exigidos se vier algum. */
function avaliarCobertura(respostas: Record<string, number>) {
  const disc = DISC_IDS.filter((id) => respostas[id] != null).length;
  const sab = SAB_IDS.filter((id) => respostas[id] != null).length;
  const faltaDisc = disc < MIN_DISC;
  // sab === 0 → avaliado DISC-only (link antigo, pré-DELTA 19): segue válido.
  const faltaSab = sab > 0 && sab < MIN_SAB;
  return { disc, sab, completo: !faltaDisc && !faltaSab, faltaDisc, faltaSab };
}

function calcularSabotadores(respostas: Record<string, number>) {
  const acc: Record<string, number[]> = {};
  for (const [id, valor] of Object.entries(respostas || {})) {
    const m = /^q_sab_([a-z]+)_\d+$/.exec(id);
    if (!m) continue;
    const key = SAB_SLUG_TO_KEY[m[1]];
    if (!key) continue;
    const v = Number(valor);
    // A3: clamp explícito — o front já sanitiza, mas esta função também é o
    // ponto de entrada de um cliente que não seja o nosso.
    if (Number.isFinite(v)) (acc[key] ||= []).push(Math.max(1, Math.min(5, v)));
  }
  if (Object.keys(acc).length === 0) return null;

  const raw: Record<string, number> = {};
  const scores: Record<string, number> = {};
  for (const key of SAB_KEYS) {
    const arr = acc[key];
    if (!arr || arr.length === 0) { raw[key] = 0; scores[key] = 0; continue; }
    const media = arr.reduce((s, v) => s + v, 0) / arr.length;
    raw[key] = Math.round(media * 100) / 100;
    scores[key] = Math.round((media / 5) * 100);
  }
  const top3 = Object.entries(raw).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const top3Avg = top3.reduce((s, k) => s + (raw[k] || 0), 0) / (top3.length || 1);
  const pqScore = Math.max(0, Math.min(100, Math.round(100 - top3Avg * 10)));
  return { saboteurScores: scores, saboteurTop3: top3, pqScore };
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
    // O body só pode ser lido UMA vez (stream).
    const body = await req.json();
    const { token, novoStatus, cpf, cpfConsent } = body;
    // `respostas` é reatribuído após a sanitização (A3) — daí o `let`.
    let respostas = body.respostas;
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
      if (!respostas || typeof respostas !== 'object' || Array.isArray(respostas))
        return jsonResponse({ error: 'respostas are required to conclude' }, 400, req);

      // A3: teto defensivo antes de qualquer processamento.
      if (Object.keys(respostas).length > MAX_RESPOSTAS)
        return jsonResponse({ error: 'Payload de respostas fora do esperado.' }, 400, req);

      const { limpo, ignorados } = sanitizarRespostas(respostas as Record<string, unknown>);
      if (ignorados.length > 0) {
        console.warn(
          `[atualizarStatus] ${ignorados.length} resposta(s) descartada(s) (id desconhecido ou valor fora de 1-5):`,
          ignorados.slice(0, 10).join(', '),
        );
      }

      // A1: antes, UMA resposta bastava para concluir a avaliação, gerar perfil
      // oficial, disparar assessment_completed e entrar na Inteligência de
      // Grupos. Agora exigimos cobertura mínima por bloco.
      const cobertura = avaliarCobertura(limpo);
      if (!cobertura.completo) {
        const faltando = [
          ...DISC_IDS.filter((id) => limpo[id] == null),
          ...(cobertura.faltaSab ? SAB_IDS.filter((id) => limpo[id] == null) : []),
        ];
        return jsonResponse(
          {
            error: 'Avaliação incompleta. Responda todas as questões antes de concluir.',
            code: 'assessment/incomplete',
            cobertura: { disc: cobertura.disc, sabotadores: cobertura.sab },
            faltando: faltando.slice(0, 50),
          },
          422,
          req,
        );
      }

      // A partir daqui só circula o objeto sanitizado.
      respostas = limpo;
      perfil = calcularPerfil(respostas);
      // Avaliação avulsa é sempre Completa (78): calcula PQ Score + Sabotadores
      // a partir das q_sab_* e funde no mesmo objeto perfil. Se as respostas não
      // trouxerem sabotadores (avaliados antigos), calcularSabotadores retorna null.
      const sab = calcularSabotadores(respostas);
      if (sab) perfil = { ...perfil, ...sab };
      payload.respostas = respostas;
      payload.perfil = perfil;
      payload.concluidoem = agora;
      // C3 (auditoria 27/07/2026): o erro do insert era IGNORADO — a função
      // respondia success:true com o perfil na tela e nada era gravado.
      const { error: respostasError } = await supabase.from('app_sessao_respostas').insert({
        avaliadoid: avaliado.id || avaliado.token,
        sessaoid: avaliado.sessaoid,
        respostas,
        submissaoem: agora,
      });
      if (respostasError) {
        console.error('[atualizarStatus] falha ao gravar app_sessao_respostas:', respostasError.message);
        return jsonResponse(
          { error: 'Não foi possível salvar suas respostas. Tente novamente.' },
          500,
          req,
        );
      }
    }
    // C3: idem para o update — sem esta checagem, uma falha de RLS/constraint
    // devolvia "sucesso" ao avaliado com o banco intacto.
    const { error: updateError } = await supabase
      .from('app_avaliados').update(payload).eq('token', token);
    if (updateError) {
      console.error('[atualizarStatus] falha ao atualizar app_avaliados:', updateError.message);
      return jsonResponse(
        { error: 'Não foi possível concluir a avaliação. Tente novamente.' },
        500,
        req,
      );
    }

    // Trilha de auditoria (DELTA 14): registra a conclusão explicitamente.
    // best-effort — não bloqueia a resposta ao avaliado.
    if (novoStatus === 'concluido' && avaliado.adminuid) {
      await logAuditEvent({
        adminuid: avaliado.adminuid,
        action: 'assessment_completed',
        actor_id: null,            // fluxo público (avaliado anônimo via token)
        actor_role: 'anon',
        target_type: 'avaliado',
        target_id: token,
        metadata: {
          sessaoid: avaliado.sessaoid ?? null,
          perfilPrimario: (perfil as Record<string, unknown>)?.perfilPrimario ?? null,
        },
      });
    }

    return jsonResponse({ success: true, ...(perfil ? { perfil } : {}) }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'atualizarStatus failed' }, 500, req);
  }
});
