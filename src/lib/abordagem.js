// ─────────────────────────────────────────────────────────────────────────────
// Motor de abordagem — "o que trabalhar a seguir e com qual teste"
// (Fase 2 do PLANO-EVOLUCAO-2026-09-19.md)
//
// Determinístico, local e AUDITÁVEL: cada sugestão sai com `regraId` +
// `versao`, para dar para responder um ano depois "por que este teste foi
// sugerido em tal data". A IA (insightPerfil) pode REDIGIR a justificativa a
// partir do que sai daqui, mas nunca decide sozinha.
//
// Entrada (normalizada por normalizarPerfil): scores DISC 0–100, pqScore,
// saboteurScores 0–100 por chave canônica (saboteurScoring.js) e, opcional,
// os códigos de testes já aplicados (para rodar o foco).
// ─────────────────────────────────────────────────────────────────────────────

import { TESTES_POR_CODIGO } from '../constants/testesDirigidos.js';
import { SABOTEUR_LABELS } from './saboteurScoring.js';

export const ABORDAGEM_VERSAO = 1;

// Limiares — mudar aqui sobe a versão.
export const LIMIARES = {
  sabotadorAlto: 65,     // intensidade 0–100 a partir da qual o sabotador vira foco
  pqBaixo: 60,           // PQ abaixo disto → fundamentos antes de qualquer foco específico
  discAlto: 75,
  discBaixo: 40,
  aquiescenciaDims: 3,   // ≥ N dimensões DISC ≥ 70 → leitura com cautela
  aquiescenciaCorte: 70,
};

// Sabotador → teste dirigido. Ordem = desempate quando dois têm a mesma intensidade.
const SABOTADOR_PARA_TESTE = [
  ['pleaser',       'TD-ASSERTIVIDADE', 'Prestativo alto: tendência a ceder para não desagradar'],
  ['controller',    'TD-DELEGACAO',     'Controlador alto: dificuldade de soltar e ouvir'],
  ['hyperAchiever', 'TD-EQUILIBRIO',    'Hiper-Realizador alto: valor pessoal preso ao resultado'],
  ['avoider',       'TD-DECISAO',       'Esquivo alto: adia decisões e conversas difíceis'],
  ['restless',      'TD-FOCO',          'Inquieto alto: começa muito e conclui pouco'],
  ['judge',         'TD-FEEDBACK',      'Juiz alto: autocrítica severa e julgamento dos outros'],
  ['stickler',      'TD-DELEGACAO',     'Insistente alto: perfeccionismo que impede delegar'],
  ['hyperRational', 'TD-DELEGACAO',     'Hiper-Racional alto: escuta pouco o lado humano'],
  ['victim',        'TD-FEEDBACK',      'Vítima alto: o erro vira ferida em vez de dado'],
  ['hyperVigilant', 'TD-PQ-BASE',       'Hiper-Vigilante alto: ansiedade de base pede fundamentos'],
];

// Fallback só com DISC (perfis antigos, sem sabotadores).
const DISC_PARA_TESTE = [
  { quando: (s) => s.D <= LIMIARES.discBaixo, codigo: 'TD-DECISAO',       motivo: 'Dominância baixa: decidir e enfrentar' },
  { quando: (s) => s.D >= LIMIARES.discAlto,  codigo: 'TD-DELEGACAO',     motivo: 'Dominância alta: delegar e ouvir' },
  { quando: (s) => s.S >= LIMIARES.discAlto,  codigo: 'TD-ASSERTIVIDADE', motivo: 'Estabilidade alta: sustentar posição' },
  { quando: (s) => s.I >= LIMIARES.discAlto,  codigo: 'TD-FOCO',          motivo: 'Influência alta: foco e conclusão' },
  { quando: (s) => s.C >= LIMIARES.discAlto,  codigo: 'TD-FEEDBACK',      motivo: 'Analítico alto: autocrítica e feedback' },
];

const n = (v) => Math.round(Number(v) || 0);

/**
 * Aceita o perfil em qualquer um dos formatos que o app usa:
 *  - app_profiles achatado: { scores:{D,I,S,C}, pqScore, saboteurScores }
 *  - RelatorioOficial: { dominante, influente, estavel, analitico, pqScore, saboteurScores }
 *  - diagnostico da Central: { scores, pqScore }
 */
export function normalizarPerfil(p = {}) {
  const s = p.scores || {};
  return {
    scores: {
      D: n(s.D ?? p.dominante),
      I: n(s.I ?? p.influente),
      S: n(s.S ?? p.estavel),
      C: n(s.C ?? p.analitico),
    },
    pqScore: p.pqScore != null ? n(p.pqScore) : null,
    saboteurScores: p.saboteurScores && typeof p.saboteurScores === 'object' ? p.saboteurScores : null,
  };
}

function modulo(codigo) {
  const t = TESTES_POR_CODIGO[codigo];
  return t ? { codigo: t.codigo, titulo: t.titulo, foco: t.foco, prazoDias: t.prazoDias, versao: t.versao } : null;
}

/**
 * Sugere a próxima abordagem para UMA pessoa.
 * @param {object} perfil  ver normalizarPerfil
 * @param {{ jaAplicados?: string[] }} opts  códigos de testes já aplicados (rotação)
 * @returns {{ versao, regraId, foco, modulo, prazoDias, justificativa: string[], alternativas: object[], alertas: string[] } | null}
 */
export function sugerirAbordagem(perfil, opts = {}) {
  const p = normalizarPerfil(perfil);
  const jaAplicados = new Set(opts.jaAplicados || []);
  const alertas = [];
  const candidatos = []; // { codigo, motivo, regraId, peso }

  const temDisc = Object.values(p.scores).some((v) => v > 0);
  if (!temDisc && !p.saboteurScores) return null;

  // R1 — aquiescência: leitura com cautela (não muda a sugestão, marca o alerta).
  const dimsAltas = Object.values(p.scores).filter((v) => v >= LIMIARES.aquiescenciaCorte).length;
  if (dimsAltas >= LIMIARES.aquiescenciaDims) {
    alertas.push('aquiescencia');
  }

  // R2 — PQ baixo: fundamentos antes de qualquer foco específico.
  if (p.pqScore != null && p.pqScore < LIMIARES.pqBaixo) {
    candidatos.push({ codigo: 'TD-PQ-BASE', motivo: `PQ Score ${p.pqScore} (abaixo de ${LIMIARES.pqBaixo}): fortalecer a base antes de um foco específico`, regraId: 'R2-PQ-BAIXO', peso: 1000 });
  }

  // R3 — sabotadores acima do limiar, do mais intenso ao menos intenso.
  if (p.saboteurScores) {
    const ordem = new Map(SABOTADOR_PARA_TESTE.map(([k], i) => [k, i]));
    const altos = Object.entries(p.saboteurScores)
      .map(([k, v]) => [k, n(v)])
      .filter(([k, v]) => v >= LIMIARES.sabotadorAlto && ordem.has(k))
      .sort((a, b) => (b[1] - a[1]) || (ordem.get(a[0]) - ordem.get(b[0])));
    for (const [k, v] of altos) {
      const [, codigo, motivo] = SABOTADOR_PARA_TESTE[ordem.get(k)];
      candidatos.push({ codigo, motivo: `${motivo} (${SABOTEUR_LABELS[k] || k} ${v})`, regraId: `R3-SAB-${k.toUpperCase()}`, peso: v });
    }
  }

  // R4 — só DISC (sem sabotadores ou nenhum acima do limiar).
  if (candidatos.length === 0 && temDisc) {
    for (const r of DISC_PARA_TESTE) {
      if (r.quando(p.scores)) candidatos.push({ codigo: r.codigo, motivo: r.motivo, regraId: 'R4-DISC', peso: 10 });
    }
  }

  // R5 — nada disparou: fundamentos como ponto de partida.
  if (candidatos.length === 0) {
    candidatos.push({ codigo: 'TD-PQ-BASE', motivo: 'Perfil equilibrado: fundamentos de inteligência positiva como ponto de partida', regraId: 'R5-PADRAO', peso: 1 });
  }

  // Dedup por código (mantém o de maior peso) e rotação do que já foi aplicado.
  const porCodigo = new Map();
  for (const c of candidatos.sort((a, b) => b.peso - a.peso)) {
    if (!porCodigo.has(c.codigo)) porCodigo.set(c.codigo, c);
  }
  let lista = [...porCodigo.values()];
  const pendentes = lista.filter((c) => !jaAplicados.has(c.codigo));
  let regraRotacao = null;
  if (pendentes.length > 0 && pendentes[0] !== lista[0]) regraRotacao = 'R6-ROTACAO';
  if (pendentes.length > 0) lista = [...pendentes, ...lista.filter((c) => jaAplicados.has(c.codigo))];

  const escolhido = lista[0];
  const mod = modulo(escolhido.codigo);
  const justificativa = [escolhido.motivo];
  if (regraRotacao) justificativa.push('Rotação: o foco anterior já foi aplicado; passa ao próximo sinal mais forte.');
  if (alertas.includes('aquiescencia')) {
    justificativa.push(`Cautela: ${dimsAltas} dimensões DISC acima de ${LIMIARES.aquiescenciaCorte} — o DISC pode estar inflado por concordância; o teste dirigido tem itens invertidos e ajuda a calibrar.`);
  }

  return {
    versao: ABORDAGEM_VERSAO,
    regraId: regraRotacao ? `${escolhido.regraId}+${regraRotacao}` : escolhido.regraId,
    foco: mod?.foco || null,
    modulo: mod,
    prazoDias: mod?.prazoDias ?? 60,
    justificativa,
    alternativas: lista.slice(1, 3).map((c) => ({ ...modulo(c.codigo), motivo: c.motivo, regraId: c.regraId })),
    alertas,
  };
}

/**
 * Sugestão coletiva para uma turma, com k-anonimato: só devolve agregados
 * quando há pelo menos `minN` perfis concluídos.
 * @param {object[]} perfis  perfis concluídos (qualquer formato aceito por normalizarPerfil)
 * @returns {{ suppressed: boolean, n: number, distribuicao?: {codigo,titulo,n,pct}[], modulo?: object, justificativa?: string }}
 */
export function sugerirAbordagemTurma(perfis = [], minN = 5) {
  const sugestoes = perfis.map((p) => sugerirAbordagem(p)).filter(Boolean);
  const total = sugestoes.length;
  if (total < minN) return { suppressed: true, n: total, minN };

  const cont = new Map();
  for (const s of sugestoes) {
    const c = s.modulo?.codigo;
    if (!c) continue;
    cont.set(c, (cont.get(c) || 0) + 1);
  }
  const distribuicao = [...cont.entries()]
    .map(([codigo, qtd]) => ({ ...modulo(codigo), n: qtd, pct: Math.round((qtd / total) * 100) }))
    .sort((a, b) => b.n - a.n);
  const top = distribuicao[0];
  const comAlerta = sugestoes.filter((s) => s.alertas.includes('aquiescencia')).length;

  return {
    suppressed: false,
    n: total,
    minN,
    versao: ABORDAGEM_VERSAO,
    distribuicao,
    modulo: top ? modulo(top.codigo) : null,
    justificativa: top
      ? `${top.pct}% da turma (${top.n} de ${total}) tem como próximo foco "${top.titulo}".`
      : null,
    alertaAquiescencia: comAlerta > 0 ? `${comAlerta} de ${total} perfis com DISC possivelmente inflado por concordância.` : null,
  };
}
