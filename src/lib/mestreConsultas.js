// ─────────────────────────────────────────────────────────────────────────────
// Mestre v2 — consultas novas (dados + narrativa), 100% locais.
//   pendencias        quem não concluiu, ciclos vencidos/aguardando
//   abordagem_turma   próximo foco coletivo (motor de abordagem agregado)
//   abordagem_pessoa  perfil + próximo passo de UMA pessoa (citada pelo nome)
//   evolucao_pessoa   antes → depois (ciclos DISC/PQ + testes dirigidos)
//   ciclos            testes dirigidos: aguardando, concluídos, vencidos, por módulo
//
// Pessoas pelo nome: o facilitador já vê esses dados nas telas (mesma RLS); o
// chat só monta a narrativa no dispositivo — nada nominal sai para IA externa.
// Acesso a histórico individual registra `admin_viewed_history` (best-effort).
// ─────────────────────────────────────────────────────────────────────────────
import { getPessoas, getUsersByGroup, getProfilesByUids, getCiclosByAdmin, getGroupsByAdmin } from '@/firebase/firestore.js';
import { logAudit } from '@/firebase/functions.js';
import { sugerirAbordagem, sugerirAbordagemTurma } from '@/lib/abordagem.js';
import { getTesteDirigido } from '@/constants/testesDirigidos.js';
import { montarLinhaDoTempo } from '@/components/central/LinhaDoTempo.jsx';

const DISC_NOMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR'); };
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || 'a pessoa';

/** Catálogo de nomes do escopo para o interpretador (grupos + pessoas). */
export async function catalogoDoEscopo(adminUid) {
  const [grupos, res] = await Promise.all([
    getGroupsByAdmin(adminUid).catch(() => []),
    getPessoas(adminUid).catch(() => ({ pessoas: [] })),
  ]);
  return {
    grupos: grupos.map((g) => ({ id: g.id, nome: g.name || g.nome || '' })),
    pessoas: (res?.pessoas || []).map((p) => ({ id: p.id, nome: p.nome || '', _p: p })),
  };
}

// ── pendencias ───────────────────────────────────────────────────────────────
export async function dadosPendencias(adminUid) {
  const [res, ciclos] = await Promise.all([getPessoas(adminUid), getCiclosByAdmin(adminUid)]);
  const pessoas = res?.pessoas || [];
  const agora = Date.now();
  const semConcluir = pessoas.filter((p) => !p.concluiu).map((p) => ({ nome: p.nome, origem: p.origem.join('/') }));
  const aguardando = ciclos.filter((c) => c.status === 'aplicado');
  const vencidos = aguardando.filter((c) => c.prazoEm && new Date(c.prazoEm).getTime() < agora);
  const vencem7d = aguardando.filter((c) => c.prazoEm && new Date(c.prazoEm).getTime() >= agora && new Date(c.prazoEm).getTime() - agora < 7 * 864e5);
  return {
    consulta: 'pendencias',
    avaliacoes_em_aberto: semConcluir.length,
    pessoas_em_aberto: semConcluir.slice(0, 12),
    testes_aguardando: aguardando.length,
    testes_vencidos: vencidos.map((c) => ({ nome: c.pessoaNome, teste: getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo, prazo: c.prazoEm })),
    testes_vencem_7d: vencem7d.map((c) => ({ nome: c.pessoaNome, teste: getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo, prazo: c.prazoEm })),
  };
}

export function narrarPendencias(d) {
  const f = [];
  if (d.avaliacoes_em_aberto === 0 && d.testes_aguardando === 0) {
    return 'Nenhuma pendência: todo mundo concluiu a avaliação e não há testes dirigidos aguardando resposta.';
  }
  if (d.avaliacoes_em_aberto > 0) {
    const nomes = d.pessoas_em_aberto.map((p) => p.nome).join(', ');
    f.push(`${plural(d.avaliacoes_em_aberto, 'pessoa ainda não concluiu', 'pessoas ainda não concluíram')} a avaliação: ${nomes}${d.avaliacoes_em_aberto > d.pessoas_em_aberto.length ? '…' : ''}.`);
  }
  if (d.testes_aguardando > 0) {
    f.push(`${plural(d.testes_aguardando, 'teste dirigido aguarda', 'testes dirigidos aguardam')} resposta.`);
    if (d.testes_vencidos.length) f.push(`• Vencidos: ${d.testes_vencidos.map((t) => `${t.nome} (${t.teste}, ${fmt(t.prazo)})`).join('; ')}.`);
    if (d.testes_vencem_7d.length) f.push(`• Vencem em 7 dias: ${d.testes_vencem_7d.map((t) => `${t.nome} (${t.teste})`).join('; ')}.`);
  }
  f.push('Sugestão: um lembrete pelo WhatsApp para quem está em aberto costuma resolver a maior parte.');
  return f.join('\n');
}

// ── abordagem_turma ──────────────────────────────────────────────────────────
export async function dadosAbordagemTurma(adminUid, grupo) {
  const membros = await getUsersByGroup(grupo.id).catch(() => []);
  const perfis = await getProfilesByUids(membros.map((m) => m.uid || m.id)).catch(() => []);
  const concluidos = perfis.filter((p) => p?.scores);
  const agg = sugerirAbordagemTurma(concluidos, 2);
  const ciclos = (await getCiclosByAdmin(adminUid, { groupId: grupo.id }).catch(() => []));
  return {
    consulta: 'abordagem_turma',
    grupo: grupo.nome,
    membros: membros.length,
    concluidos: concluidos.length,
    agregado: agg,
    testes_aguardando: ciclos.filter((c) => c.status === 'aplicado').length,
    testes_concluidos: ciclos.filter((c) => c.status === 'concluido').length,
  };
}

export function narrarAbordagemTurma(d) {
  const f = [];
  if (d.concluidos === 0) return `Ninguém de "${d.grupo}" concluiu a avaliação ainda (${plural(d.membros, 'membro', 'membros')}). Quando os resultados entrarem eu sugiro o foco da turma.`;
  if (d.agregado.suppressed) return `"${d.grupo}" tem só ${d.concluidos} resultado — com 2 ou mais eu agrego o próximo foco da turma.`;
  const a = d.agregado;
  f.push(`Turma "${d.grupo}": ${plural(d.concluidos, 'pessoa concluiu', 'pessoas concluíram')} de ${d.membros}.`);
  f.push(`Próximo foco sugerido: ${a.modulo.titulo} (${a.modulo.codigo}) — ${a.justificativa}`);
  if (a.distribuicao.length > 1) f.push(`Distribuição: ${a.distribuicao.map((x) => `${x.titulo} ${x.pct}%`).join(' · ')}.`);
  if (a.alertaAquiescencia) f.push(`Cautela: ${a.alertaAquiescencia}`);
  if (d.testes_aguardando || d.testes_concluidos) f.push(`Testes dirigidos nesta turma: ${d.testes_aguardando} aguardando, ${d.testes_concluidos} concluído(s).`);
  f.push('Para aplicar a todos de uma vez: Grupos › a turma › aba Comparativo › "Próximo foco da turma".');
  return f.join('\n');
}

// ── abordagem_pessoa / evolucao_pessoa ───────────────────────────────────────
function perfilDaPessoa(p) {
  const diag = p.diagnostico;
  if (!diag) return null;
  return {
    scores: diag.scores,
    pqScore: diag.pqScore ?? null,
    saboteurScores: diag.saboteurScores || null,
    perfilPrimario: diag.perfilPrimario,
    perfilSecundario: diag.perfilSecundario,
  };
}

export async function dadosPessoa(adminUid, pessoaRef, modo) {
  const p = pessoaRef._p;
  logAudit({ action: 'admin_viewed_history', target_type: 'pessoa', target_id: p.id, metadata: { via: 'mestre', modo } });
  const perfil = perfilDaPessoa(p);
  const testes = [...(p.conta?.testes || []), ...(p.avaliacoes || []).flatMap((a) => a.testes || [])].filter((c) => c.status !== 'descartado');
  const jaAplicados = testes.map((c) => c.moduloCodigo);
  const sugestao = perfil ? sugerirAbordagem(perfil, { jaAplicados }) : null;
  const eventos = montarLinhaDoTempo(p).filter((e) => e.diagnostico);
  return {
    consulta: modo,
    nome: p.nome,
    concluiu: !!p.concluiu,
    perfil,
    sugestao,
    testes: testes.map((c) => ({ teste: getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo, status: c.status, geral: c.resultado?.geral ?? null, prazo: c.prazoEm, quando: c.concluidoEm || c.criadoEm })),
    ciclos: eventos.map((e) => ({ rotulo: e.rotulo, data: e.data, scores: e.diagnostico.scores, pq: e.diagnostico.pqScore, dominante: e.diagnostico.perfilPrimarioNome, delta: e.delta, migrado: !!e.migrado })),
  };
}

export function narrarAbordagemPessoa(d) {
  const nome = primeiroNome(d.nome);
  if (!d.concluiu || !d.perfil) return `${d.nome} ainda não concluiu a avaliação — sem resultado, não há abordagem a sugerir. Vale um lembrete pelo WhatsApp.`;
  const f = [];
  const s = d.perfil.scores;
  f.push(`${d.nome}: perfil ${DISC_NOMES[d.perfil.perfilPrimario] || d.perfil.perfilPrimario}${d.perfil.perfilSecundario ? ` / ${DISC_NOMES[d.perfil.perfilSecundario]}` : ''} (D ${s.D} · I ${s.I} · S ${s.S} · C ${s.C}${d.perfil.pqScore != null ? ` · PQ ${d.perfil.pqScore}` : ''}).`);
  if (d.sugestao?.modulo) {
    f.push(`Próximo passo sugerido para ${nome}: ${d.sugestao.modulo.titulo} — ${d.sugestao.foco}. Reavaliar em ~${d.sugestao.prazoDias} dias.`);
    for (const j of d.sugestao.justificativa) f.push(`• ${j}`);
    if (d.sugestao.alternativas.length) f.push(`Alternativas: ${d.sugestao.alternativas.map((a) => a.titulo).join(' · ')}.`);
  }
  if (d.testes.length) {
    f.push(`Testes dirigidos: ${d.testes.map((t) => `${t.teste} (${t.status === 'concluido' ? `concluído, geral ${t.geral}` : `aguardando${t.prazo ? `, prazo ${fmt(t.prazo)}` : ''}`})`).join('; ')}.`);
  }
  f.push(`Para aplicar: abra o Relatório Oficial de ${nome} › § 3.3 › "Aplicar".`);
  return f.join('\n');
}

export function narrarEvolucaoPessoa(d) {
  const nome = primeiroNome(d.nome);
  if (d.ciclos.length === 0) return `${d.nome} ainda não tem avaliação concluída.`;
  const f = [];
  const reais = d.ciclos.filter((c) => !c.migrado);
  if (reais.length < 2) {
    f.push(`${d.nome} tem ${plural(reais.length, 'avaliação concluída', 'avaliações concluídas')} (${reais.map((c) => `${c.dominante} em ${fmt(c.data)}`).join(', ')}) — ainda não dá para comparar antes e depois.`);
  } else {
    const ult = reais[reais.length - 1];
    const ant = reais[reais.length - 2];
    f.push(`${d.nome}: de ${ant.dominante} (${fmt(ant.data)}) para ${ult.dominante} (${fmt(ult.data)}).`);
    if (ult.delta) {
      const partes = ['D', 'I', 'S', 'C'].map((k) => `${DISC_NOMES[k]} ${ult.delta[k] > 0 ? '▲' : ult.delta[k] < 0 ? '▼' : '='} ${Math.abs(ult.delta[k])}`);
      if (ult.delta.pq != null) partes.push(`PQ ${ult.delta.pq > 0 ? '▲' : ult.delta.pq < 0 ? '▼' : '='} ${Math.abs(ult.delta.pq)}`);
      f.push(`Variação: ${partes.join(' · ')}.${ult.delta.mudouPerfil ? ' O perfil dominante mudou.' : ''}`);
    }
  }
  const concluidos = d.testes.filter((t) => t.status === 'concluido');
  if (concluidos.length) f.push(`Testes dirigidos concluídos: ${concluidos.map((t) => `${t.teste} (geral ${t.geral})`).join('; ')}.`);
  if (d.sugestao?.modulo) f.push(`Próximo passo: ${d.sugestao.modulo.titulo}.`);
  f.push(`A linha do tempo completa de ${nome} está em Central › Pessoas & Histórico.`);
  return f.join('\n');
}

// ── ciclos ───────────────────────────────────────────────────────────────────
export async function dadosCiclos(adminUid, dias = null) {
  const ciclos = await getCiclosByAdmin(adminUid);
  const agora = Date.now();
  const desde = dias ? agora - dias * 864e5 : null;
  const noPeriodo = desde ? ciclos.filter((c) => new Date(c.criadoEm || 0).getTime() >= desde) : ciclos;
  const porModulo = {};
  for (const c of noPeriodo) {
    const t = getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo;
    porModulo[t] = (porModulo[t] || 0) + 1;
  }
  const aguardando = noPeriodo.filter((c) => c.status === 'aplicado');
  const concluidos = noPeriodo.filter((c) => c.status === 'concluido');
  const geralMedio = concluidos.length ? Math.round(concluidos.reduce((a, c) => a + (Number(c.resultado?.geral) || 0), 0) / concluidos.length) : null;
  return {
    consulta: 'ciclos',
    janela_dias: dias,
    total: noPeriodo.length,
    aguardando: aguardando.map((c) => ({ nome: c.pessoaNome, teste: getTesteDirigido(c.moduloCodigo)?.titulo || c.moduloCodigo, prazo: c.prazoEm, vencido: !!(c.prazoEm && new Date(c.prazoEm).getTime() < agora) })),
    concluidos: concluidos.length,
    descartados: noPeriodo.filter((c) => c.status === 'descartado').length,
    geral_medio: geralMedio,
    por_modulo: porModulo,
  };
}

export function narrarCiclos(d) {
  const janela = d.janela_dias ? ` nos últimos ${d.janela_dias} dias` : '';
  if (d.total === 0) return `Nenhum teste dirigido aplicado${janela}. Para aplicar: Relatório Oficial › § 3.3, ou Grupos › Comparativo para a turma toda.`;
  const f = [];
  f.push(`${plural(d.total, 'teste dirigido aplicado', 'testes dirigidos aplicados')}${janela}: ${d.aguardando.length} aguardando resposta, ${d.concluidos} concluído(s)${d.descartados ? `, ${d.descartados} descartado(s)` : ''}.`);
  if (d.geral_medio != null) f.push(`Resultado geral médio dos concluídos: ${d.geral_medio}/100.`);
  const mods = Object.entries(d.por_modulo).sort((a, b) => b[1] - a[1]);
  if (mods.length) f.push(`Por teste: ${mods.map(([t, n]) => `${t} (${n})`).join(' · ')}.`);
  if (d.aguardando.length) {
    const venc = d.aguardando.filter((a) => a.vencido);
    f.push(`Aguardando: ${d.aguardando.slice(0, 10).map((a) => `${a.nome} — ${a.teste}${a.vencido ? ' (vencido)' : ''}`).join('; ')}${d.aguardando.length > 10 ? '…' : ''}.`);
    if (venc.length) f.push(`${plural(venc.length, 'prazo vencido', 'prazos vencidos')}: vale reenviar o link ou lembrar no app.`);
  }
  return f.join('\n');
}
