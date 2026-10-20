// ============================================================================
// Central de Gestão — Módulo 4: motor LOCAL do chat "Mestre".
// Sem chamada a IA externa: a pergunta é roteada (mestreIntencao.rotear) para a
// base de conhecimento (mestreConhecimento.js) ou para uma das consultas fixas
// da camada semântica; os dados vêm dos mesmos RPCs
// escopados das outras abas da Central e a narrativa é montada aqui em PT-BR.
// A API de IA (DeepSeek) fica reservada à avaliação nos relatórios
// (insightPerfil / RelatorioOficial) e ao pipeline da avaliação.
// ============================================================================
import {
  getGroupInsights,
  getObservabilidadeData,
  getGroupsByAdmin,
  getStudentsByAdmin,
  getUsersByGroup,
  getAvaliadosByAdmin,
} from '@/firebase/firestore.js';
import { computeObservabilidade, formatMinutos } from '@/lib/observabilidade.js';
import { SABOTEUR_LABELS } from '@/lib/saboteurScoring.js';
import { logAudit } from '@/firebase/functions.js';
// Mestre v3: roteador por tipo de pergunta + base de conhecimento estruturada.
import { rotear } from '@/lib/mestreIntencao.js';
import { respostaDe } from '@/lib/mestreConhecimento.js';
import {
  catalogoDoEscopo,
  dadosPendencias, narrarPendencias,
  dadosAbordagemTurma, narrarAbordagemTurma,
  dadosPessoa, narrarAbordagemPessoa, narrarEvolucaoPessoa,
  dadosCiclos, narrarCiclos,
} from '@/lib/mestreConsultas.js';

const DISC_NOMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minúsculas sem acento, para casar palavras-chave. */
function normalizar(s) {
  const BASE = 0x0300; const FIM = 0x036f; // faixa de diacríticos combinantes
  const re = new RegExp(`[${String.fromCharCode(BASE)}-${String.fromCharCode(FIM)}]`, 'g');
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(re, '');
}

/** ISO de um campo de data cru ou wrapper {raw,toDate} (withDateWrapper). */
function isoOf(campo) {
  if (!campo) return null;
  const raw = typeof campo === 'object' && 'raw' in campo ? campo.raw : campo;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Roteamento e extração de período/entidades: src/lib/mestreIntencao.js (Mestre v2).

// ─── Consultas (mesmos RPCs escopados por RLS das outras abas) ──────────────

async function dadosGrupos(params) {
  const minN = Number(params.min_n) > 0 ? Math.floor(Number(params.min_n)) : 5;
  const rows = await getGroupInsights(minN);
  const linhas = rows.filter((l) => !l.suppressed);
  return {
    consulta: 'inteligencia_grupos',
    min_n: minN,
    grupos_exibidos: linhas.length,
    grupos_suprimidos: rows.length - linhas.length,
    grupos: linhas.map((l) => ({
      grupo: l.group_name,
      participantes: l.n_participantes,
      concluidas: l.n_concluidas,
      taxa_conclusao: l.taxa_conclusao,
      distribuicao_disc: l.disc_distribution,
      medias_disc: l.disc_scores_avg,
      pq_score_medio: l.pq_score_avg ?? null,
      sabotadores_medios: l.saboteurs_avg ?? null,
    })),
  };
}

async function dadosVisaoGeral(params) {
  const dias = Number(params.dias) > 0 ? Math.floor(Number(params.dias)) : null;
  const registros = await getObservabilidadeData({});
  const fromIso = dias ? new Date(Date.now() - dias * 864e5).toISOString() : null;
  const obs = computeObservabilidade(registros, { fromIso });
  return {
    consulta: 'visao_geral',
    janela_dias: dias,
    criadas: obs.totais.total,
    iniciadas: obs.totais.iniciadas,
    concluidas: obs.totais.concluidas,
    taxa_conclusao: obs.totais.taxaConclusao,
    tempo_medio_min: obs.tempoMedioMin,
  };
}

// Replica o cálculo do card "Total de Alunos" do Painel (Dashboard.jsx):
// membros de grupos (dedup por uid) + avaliados de sessão que não viraram
// conta contada — para o chat e o Painel mostrarem o MESMO número.
async function dadosContagem(adminUid) {
  const grupos = await getGroupsByAdmin(adminUid).catch(() => []);
  const membrosPorGrupo = await Promise.all(
    grupos.map((g) => getUsersByGroup(g.id).catch(() => []))
  );
  const uidsMembros = new Set();
  for (const membros of membrosPorGrupo) {
    for (const m of membros) uidsMembros.add(m.uid || m.id);
  }

  const avaliados = await getAvaliadosByAdmin(adminUid).catch(() => []);
  let avaliadosSessao = 0;
  for (const a of avaliados) {
    // DELTA 19: convertido em conta que já é membro não conta 2×.
    if (a.convertedUid && uidsMembros.has(a.convertedUid)) continue;
    if (!uidsMembros.has(a.id)) avaliadosSessao++;
  }

  // Contas avulsas (aluno sem grupo, vinculado por adminuid) — fora do card
  // do Painel, mas úteis de citar quando existirem.
  const students = await getStudentsByAdmin(adminUid).catch(() => []);
  const contasAvulsas = students.filter(
    (s) => !s.groupId && !uidsMembros.has(s.uid || s.id)
  ).length;

  return {
    consulta: 'contagem',
    alunos_total: uidsMembros.size + avaliadosSessao,
    contas_em_grupos: uidsMembros.size,
    avaliados_sessao: avaliadosSessao,
    contas_avulsas: contasAvulsas,
    grupos: grupos.length,
  };
}

async function dadosSaude(adminUid, contexto) {
  const agora = Date.now();
  const D7 = 7 * 864e5;
  const D14 = 14 * 864e5;

  const [registros, grupos, alunos] = await Promise.all([
    getObservabilidadeData({}),
    getGroupsByAdmin(adminUid).catch(() => []),
    getStudentsByAdmin(adminUid).catch(() => []),
  ]);

  const pendentes = registros.filter((r) => r.status === 'pendente').length;
  const emAndamento = registros.filter((r) => r.status === 'em_andamento').length;
  const concluidas = registros.filter((r) => r.status === 'concluido').length;
  const iniciadas = registros.filter((r) => r.status === 'em_andamento' || r.status === 'concluido' || isoOf(r.iniciadoEm)).length;
  const concluidas7d = registros.filter((r) => {
    const fim = isoOf(r.concluidoEm);
    return r.status === 'concluido' && fim && agora - new Date(fim).getTime() < D7;
  }).length;
  const paradas = registros.filter((r) => {
    if (r.status !== 'em_andamento') return false;
    const ini = isoOf(r.iniciadoEm) || isoOf(r.criadoEm);
    return ini && agora - new Date(ini).getTime() > D7;
  }).length;

  let ultima = 0;
  for (const r of registros) {
    for (const ts of [isoOf(r.concluidoEm), isoOf(r.iniciadoEm), isoOf(r.criadoEm)]) {
      if (ts) { const t = new Date(ts).getTime(); if (t > ultima) ultima = t; }
    }
  }

  const alunos7d = alunos.filter((u) => {
    const c = isoOf(u.createdAt);
    return c && agora - new Date(c).getTime() < D7;
  }).length;

  const taxa = iniciadas > 0 ? Math.round((concluidas / iniciadas) * 100) : 0;
  const diasSemAtividade = ultima ? Math.floor((agora - ultima) / 864e5) : null;

  const alertas = [];
  if (paradas > 0) alertas.push(`${paradas} avaliação(ões) iniciada(s) há mais de 7 dias sem conclusão.`);
  if (iniciadas >= 5 && taxa < 30) alertas.push(`Taxa de conclusão baixa (${taxa}%).`);
  if ((pendentes + emAndamento) > 0 && concluidas7d === 0) alertas.push('Nenhuma conclusão nos últimos 7 dias, mas há avaliações em aberto.');
  if (ultima && agora - ultima > D14) alertas.push(`Sem atividade há ${diasSemAtividade} dias.`);
  if (contexto.atualizacaoDisponivel) alertas.push('Há uma atualização do app disponível — recarregue para aplicar.');

  return {
    consulta: 'saude_status',
    app_version: contexto.appVersion || null,
    atualizacao_disponivel: !!contexto.atualizacaoDisponivel,
    grupos: grupos.length,
    alunos: alunos.length,
    alunos_novos_7d: alunos7d,
    avaliacoes: { pendentes, em_andamento: emAndamento, concluidas, concluidas_7d: concluidas7d },
    taxa_conclusao: taxa,
    avaliacoes_paradas: paradas,
    dias_sem_atividade: diasSemAtividade,
    alertas,
    status_geral: alertas.length === 0 ? 'saudavel' : (paradas > 0 || (iniciadas >= 5 && taxa < 30) ? 'atencao' : 'observar'),
  };
}

// ─── Narrativas (templates em PT-BR a partir dos números) ───────────────────

/** Plural simples: plural(1,'avaliação','avaliações') → "1 avaliação". */
function plural(n, singular, pluralForm) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function perfilPredominante(distribuicao) {
  if (!distribuicao || typeof distribuicao !== 'object') return null;
  let melhor = null;
  for (const [k, v] of Object.entries(distribuicao)) {
    const n = Number(v) || 0;
    if (!melhor || n > melhor.n) melhor = { k, n };
  }
  return melhor && melhor.n > 0 ? DISC_NOMES[melhor.k] || melhor.k : null;
}

function topSabotador(sabotadores) {
  if (!sabotadores || typeof sabotadores !== 'object') return null;
  let melhor = null;
  for (const [k, v] of Object.entries(sabotadores)) {
    const n = Number(v) || 0;
    if (!melhor || n > melhor.n) melhor = { k, n };
  }
  return melhor ? { nome: SABOTEUR_LABELS[melhor.k] || melhor.k, valor: Math.round(melhor.n) } : null;
}

function narrarGrupos(d) {
  if (d.grupos_exibidos === 0) {
    if (d.grupos_suprimidos > 0) {
      return `Todos os ${d.grupos_suprimidos} grupo(s) estão abaixo da amostra mínima de ${d.min_n} participantes, então os agregados ficam suprimidos por k-anonimato. Convém concluir mais avaliações nesses grupos antes de tirar conclusões.`;
    }
    return 'Ainda não há grupos com dados agregados para analisar. Crie um grupo em Grupos, convide os participantes e, quando as avaliações forem concluídas, eu trago os números aqui.';
  }

  const frases = [];
  frases.push(`Você tem ${d.grupos_exibidos} grupo(s) com amostra suficiente${d.grupos_suprimidos > 0 ? ` (e ${d.grupos_suprimidos} suprimido(s) por amostra menor que ${d.min_n})` : ''}.`);

  for (const g of d.grupos.slice(0, 6)) {
    const partes = [`${g.grupo}: ${g.participantes} participante(s), ${g.taxa_conclusao ?? 0}% de conclusão`];
    const pred = perfilPredominante(g.distribuicao_disc);
    if (pred) partes.push(`perfil predominante ${pred}`);
    if (g.pq_score_medio != null) partes.push(`PQ médio ${Math.round(g.pq_score_medio)}`);
    const sab = topSabotador(g.sabotadores_medios);
    if (sab) partes.push(`sabotador mais presente: ${sab.nome}`);
    frases.push(`• ${partes.join(' · ')}.`);
  }

  if (d.grupos.length > 1) {
    const ordenados = [...d.grupos].sort((a, b) => (b.taxa_conclusao ?? 0) - (a.taxa_conclusao ?? 0));
    const melhor = ordenados[0];
    const pior = ordenados[ordenados.length - 1];
    if ((melhor.taxa_conclusao ?? 0) !== (pior.taxa_conclusao ?? 0)) {
      frases.push(`Na conclusão, ${melhor.grupo} lidera (${melhor.taxa_conclusao}%) e ${pior.grupo} fica atrás (${pior.taxa_conclusao ?? 0}%). Vale um lembrete direcionado ao grupo com menor adesão.`);
    }
  }
  return frases.join('\n');
}

function narrarVisaoGeral(d) {
  const janela =
    d.janela_dias === 1 ? 'nas últimas 24 horas' :
    d.janela_dias ? `nos últimos ${d.janela_dias} dias` :
    'em todo o histórico';
  const frases = [];
  if (d.criadas === 0) {
    return `Não encontrei avaliações ${janela}. Para começar, use o botão "Avaliação avulsa" na aba Alunos ou convide participantes pelos Grupos.`;
  }
  const criadas = plural(d.criadas, 'avaliação foi criada', 'avaliações foram criadas');
  frases.push(`${janela.charAt(0).toUpperCase() + janela.slice(1)}, ${criadas}: ${plural(d.iniciadas, 'iniciada', 'iniciadas')} e ${plural(d.concluidas, 'concluída', 'concluídas')}, o que dá ${d.taxa_conclusao}% de conclusão.`);
  if (d.tempo_medio_min != null) frases.push(`Quem conclui leva em média ${formatMinutos(d.tempo_medio_min)}.`);
  if (d.iniciadas >= 5 && d.taxa_conclusao < 50) {
    frases.push('A taxa está baixa. Um lembrete pelo WhatsApp para quem começou e não terminou costuma resolver boa parte.');
  } else if (d.taxa_conclusao >= 80 && d.iniciadas > 0) {
    frases.push('Ótima adesão — o engajamento está saudável.');
  }
  return frases.join(' ');
}

function narrarContagem(d) {
  const frases = [];
  frases.push(`Você tem ${plural(d.alunos_total, 'pessoa', 'pessoas')} no total — o mesmo número do card "Total de Alunos" do Painel: ${plural(d.contas_em_grupos, 'conta de aluno em grupos', 'contas de aluno em grupos')} e ${plural(d.avaliados_sessao, 'avaliado de sessão (link WhatsApp, sem conta)', 'avaliados de sessão (link WhatsApp, sem conta)')}.`);
  if (d.contas_avulsas > 0) {
    frases.push(`Além dessas, há ${plural(d.contas_avulsas, 'conta avulsa', 'contas avulsas')} (aluno sem grupo) — essas não entram no card do Painel.`);
  }
  frases.push(`Grupos ativos: ${d.grupos}.`);
  return frases.join(' ');
}

function narrarSaude(d) {
  const frases = [];
  if (d.status_geral === 'saudavel') {
    frases.push('Está tudo saudável por aqui. Nenhuma anomalia nos seus dados de avaliação.');
  } else if (d.status_geral === 'atencao') {
    frases.push('Atenção: encontrei pontos que merecem ação.');
  } else {
    frases.push('No geral está bem, mas há itens para observar.');
  }
  frases.push(`Você tem ${d.grupos} grupo(s) e ${d.alunos} aluno(s)${d.alunos_novos_7d > 0 ? ` (${d.alunos_novos_7d} novo(s) na última semana)` : ''}. Avaliações: ${d.avaliacoes.concluidas} concluída(s), ${d.avaliacoes.em_andamento} em andamento e ${d.avaliacoes.pendentes} pendente(s), com ${d.taxa_conclusao}% de conclusão.`);
  for (const a of d.alertas) frases.push(`• ${a}`);
  if (d.avaliacoes_paradas > 0) frases.push('Sugestão: reenvie o link pelo WhatsApp para quem está com a avaliação parada.');
  frases.push('Lembrando: eu monitoro volume, conclusão e itens parados — não erros internos de código.');
  return frases.join('\n');
}

// ─── Miss-log: perguntas que o Mestre não entendeu (e erros de execução) ────
// Fica no localStorage do navegador onde o app roda. Serve de matéria-prima
// para enriquecer as palavras-chave e a base de conhecimento em atualizações.
// Ler no console: JSON.parse(localStorage.getItem('profileai.mestre.misslog'))

const MISS_KEY = 'profileai.mestre.misslog';
const MISS_MAX = 200;

export function getMissLog() {
  try { return JSON.parse(localStorage.getItem(MISS_KEY)) || []; } catch { return []; }
}

export function limparMissLog() {
  try { localStorage.removeItem(MISS_KEY); } catch { /* storage indisponível */ }
}

function registrarMiss(pergunta, tipo = 'sem_resposta', detalhe = null) {
  // Mestre v2: além do localStorage, manda para o audit_log (ação `mestre_miss`,
  // best-effort) — o superadmin enxerga os misses de TODOS os facilitadores na
  // aba Diagnóstico e evolui o vocabulário. Só a pergunta normalizada (≤ 200).
  logAudit({ action: 'mestre_miss', target_type: 'mestre', target_id: tipo, metadata: { pergunta: normalizar(pergunta).slice(0, 200), detalhe: detalhe ? String(detalhe).slice(0, 200) : null } });
  try {
    const log = getMissLog();
    const norm = normalizar(pergunta);
    const existente = log.find((e) => e.tipo === tipo && normalizar(e.pergunta) === norm);
    if (existente) {
      existente.vezes = (existente.vezes || 1) + 1;
      existente.quando = new Date().toISOString();
      if (detalhe) existente.detalhe = String(detalhe).slice(0, 200);
    } else {
      log.push({
        pergunta: String(pergunta).slice(0, 200),
        tipo, // 'sem_resposta' | 'erro'
        detalhe: detalhe ? String(detalhe).slice(0, 200) : null,
        vezes: 1,
        quando: new Date().toISOString(),
      });
    }
    while (log.length > MISS_MAX) log.shift();
    localStorage.setItem(MISS_KEY, JSON.stringify(log));
  } catch { /* storage indisponível — segue sem log */ }
}

/** Erros de execução do chat (falha de consulta etc.) entram no mesmo log. */
export function registrarErroMestre(pergunta, erro) {
  registrarMiss(pergunta, 'erro', erro?.message || String(erro));
}

// ─── Fallback com sugestões ─────────────────────────────────────────────────

function narrarFallback(tipo, sugestoes) {
  const exemplos = sugestoes.length
    ? sugestoes
    : tipo === 'como_fazer' || tipo === 'conceito'
      ? ['como crio um grupo?', 'como envio a avaliação?', 'o que é PQ Score?']
      : ['o que faço hoje?', 'quem ainda não concluiu?', 'o que fazer com [nome]?'];
  return `Não tenho certeza do que você quis dizer. Talvez seja uma destas:\n${exemplos.map((e) => `• "${e}"`).join('\n')}\nAnotei a pergunta para aprender esse assunto numa próxima atualização.`;
}

// ─── API principal ───────────────────────────────────────────────────────────

/**
 * responderMestre — responde a pergunta do facilitador localmente.
 * @param {{ pergunta:string, adminUid:string, contexto?:object }} args
 * @returns {Promise<{modo:'dado'|'conversa', narrativa:string, dados:object|null, queryUsada:string|null}>}
 */
export async function responderMestre({ pergunta, adminUid, contexto = {} }) {
  // Mestre v3: tipo da pergunta → base de conhecimento (mestreConhecimento.js)
  // ou intenção + entidades casadas com os nomes reais do escopo.
  const catalogo = await catalogoDoEscopo(adminUid).catch(() => ({ grupos: [], pessoas: [] }));
  const rota = rotear(pergunta, catalogo);

  if (rota.rota === 'kb') {
    return { modo: 'conversa', narrativa: respostaDe(rota.entrada), dados: null, queryUsada: null };
  }
  if (rota.rota === 'fallback') {
    registrarMiss(pergunta); // alimenta a evolução do vocabulário
    return { modo: 'conversa', narrativa: narrarFallback(rota.tipo, rota.sugestoes), dados: null, queryUsada: null };
  }

  const { intencao, entidades, faltando } = rota;

  // Slot-filling: falta a pessoa/turma → pergunta de volta, sem chutar.
  if (faltando.includes('pessoa_ambigua')) {
    const nomes = entidades.ambiguos.slice(0, 6).map((p) => p.nome).join(', ');
    return { modo: 'conversa', narrativa: `Encontrei mais de uma pessoa com esse nome: ${nomes}. De qual delas você fala? (Use o nome completo.)`, dados: null, queryUsada: null };
  }
  if (faltando.includes('pessoa')) {
    return { modo: 'conversa', narrativa: 'De quem você quer ver a evolução? Diga o nome da pessoa — por exemplo, "como a Claudia evoluiu?".', dados: null, queryUsada: null };
  }
  if (faltando.includes('pessoa|grupo')) {
    const gr = catalogo.grupos.slice(0, 5).map((g) => g.nome).join(', ');
    return { modo: 'conversa', narrativa: `Para quem? Diga o nome de uma pessoa ou de uma turma${gr ? ` (suas turmas: ${gr})` : ''}. Se a dúvida for sobre um perfil em geral, pergunte "como lidar com um perfil Analítico?".`, dados: null, queryUsada: null };
  }

  const params = { dias: entidades.dias, min_n: 5 };
  let dados;
  let narrativa;
  switch (intencao) {
    case 'pendencias':
      dados = await dadosPendencias(adminUid); narrativa = narrarPendencias(dados);
      if (rota.tipo === 'agenda') narrativa = `O que pede ação agora:\n${narrativa}`;
      break;
    case 'abordagem_turma':
      dados = await dadosAbordagemTurma(adminUid, entidades.grupo); narrativa = narrarAbordagemTurma(dados); break;
    case 'abordagem_pessoa':
      dados = await dadosPessoa(adminUid, entidades.pessoa, 'abordagem_pessoa'); narrativa = narrarAbordagemPessoa(dados); break;
    case 'evolucao_pessoa':
      dados = await dadosPessoa(adminUid, entidades.pessoa, 'evolucao_pessoa'); narrativa = narrarEvolucaoPessoa(dados); break;
    case 'ciclos':
      dados = await dadosCiclos(adminUid, entidades.dias); narrativa = narrarCiclos(dados); break;
    case 'inteligencia_grupos':
      dados = await dadosGrupos(params); narrativa = narrarGrupos(dados); break;
    case 'visao_geral':
      dados = await dadosVisaoGeral(params); narrativa = narrarVisaoGeral(dados); break;
    case 'contagem':
      dados = await dadosContagem(adminUid); narrativa = narrarContagem(dados); break;
    default:
      dados = await dadosSaude(adminUid, contexto); narrativa = narrarSaude(dados);
  }

  return { modo: 'dado', narrativa, dados, queryUsada: intencao };
}
