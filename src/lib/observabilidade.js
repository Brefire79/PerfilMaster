// ============================================================================
// Central de Gestão — Módulo 1 (Visão Geral / Observabilidade)
// Funções PURAS de agregação. Recebem as linhas de app_avaliados (já escopadas
// por RLS) e produzem os datasets dos gráficos. Sem PII nos resultados.
// ============================================================================

/** Extrai um ISO string de um campo de data (cru ou wrapper {raw,toDate}). */
function isoOf(campo) {
  if (!campo) return null;
  const raw = typeof campo === 'object' && 'raw' in campo ? campo.raw : campo;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Chave de dia (YYYY-MM-DD) a partir de um campo de data. */
function diaOf(campo) {
  const iso = isoOf(campo);
  return iso ? iso.slice(0, 10) : null;
}

// Status reais do fluxo público (atualizarStatus): 'pendente' → 'em_andamento'
// → 'concluido'. iniciadoEm é gravado ao entrar em 'em_andamento'.
const foiIniciada = (a) =>
  a?.status === 'em_andamento' || a?.status === 'concluido' || !!isoOf(a?.iniciadoEm);
const foiConcluida = (a) => a?.status === 'concluido';

/**
 * Filtra avaliados pela janela [fromIso, toIso] usando criadoEm.
 * Datas nulas passam pelo filtro só quando não há janela definida.
 */
function dentroDaJanela(a, fromIso, toIso) {
  if (!fromIso && !toIso) return true;
  const iso = isoOf(a?.criadoEm);
  if (!iso) return false;
  if (fromIso && iso < fromIso) return false;
  if (toIso && iso > toIso) return false;
  return true;
}

/**
 * computeObservabilidade — datasets do Módulo 1.
 * @param {Array} avaliados - linhas de app_avaliados (getAvaliadosByAdmin).
 * @param {{fromIso?:string, toIso?:string}} janela
 */
export function computeObservabilidade(avaliados = [], { fromIso = null, toIso = null } = {}) {
  const rows = avaliados.filter((a) => dentroDaJanela(a, fromIso, toIso));

  // ── Totais e taxa de conclusão ──────────────────────────────────────────
  const iniciadas = rows.filter(foiIniciada).length;
  const concluidas = rows.filter(foiConcluida).length;
  const total = rows.length;
  const taxaConclusao = iniciadas > 0 ? Math.round((concluidas / iniciadas) * 100) : 0;

  // ── Funil de status (proxy do abandono no fluxo público DISC) ────────────
  // O fluxo público grava só o status macro (pendente→iniciado→concluído); não
  // há rastro por etapa do wizard (DISC vs. Sabotadores) — ver placeholder na UI.
  const pendentes = rows.filter((a) => a.status === 'pendente').length;
  const emAndamento = rows.filter((a) => a.status === 'em_andamento').length;
  const funil = [
    { etapa: 'Criadas', valor: total },
    { etapa: 'Iniciadas', valor: iniciadas },
    { etapa: 'Concluídas', valor: concluidas },
  ];
  const abandono = { pendentes, emAndamento, concluidas };

  // ── Série temporal por dia (criadas vs. concluídas) ──────────────────────
  const porDia = new Map();
  const garanteDia = (dia) => {
    if (!porDia.has(dia)) porDia.set(dia, { dia, criadas: 0, concluidas: 0 });
    return porDia.get(dia);
  };
  for (const a of rows) {
    const dc = diaOf(a.criadoEm);
    if (dc) garanteDia(dc).criadas += 1;
    if (foiConcluida(a)) {
      const df = diaOf(a.concluidoEm) || dc;
      if (df) garanteDia(df).concluidas += 1;
    }
  }
  const serie = Array.from(porDia.values()).sort((x, y) => (x.dia < y.dia ? -1 : 1));

  // ── Tempo médio até concluir (iniciadoEm → concluidoEm) ──────────────────
  let somaMin = 0;
  let nTempo = 0;
  for (const a of rows) {
    if (!foiConcluida(a)) continue;
    const ini = isoOf(a.iniciadoEm) || isoOf(a.criadoEm);
    const fim = isoOf(a.concluidoEm);
    if (!ini || !fim) continue;
    const diffMs = new Date(fim).getTime() - new Date(ini).getTime();
    if (diffMs > 0) {
      somaMin += diffMs / 60000;
      nTempo += 1;
    }
  }
  const tempoMedioMin = nTempo > 0 ? Math.round(somaMin / nTempo) : null;

  return {
    totais: { total, iniciadas, concluidas, taxaConclusao },
    funil,
    abandono,
    serie,
    tempoMedioMin,
    amostraTempo: nTempo,
  };
}

/** Formata minutos em texto humano (ex.: "1 h 12 min"). */
export function formatMinutos(min) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
