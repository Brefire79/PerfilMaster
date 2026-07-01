// ============================================================================
// Central de Gestão — Módulo 4: motor LOCAL do chat "Mestre".
// Sem chamada a IA externa: a pergunta é roteada por palavras-chave para uma
// das consultas fixas da camada semântica, os dados vêm dos mesmos RPCs
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

/** Extrai a janela em dias da pergunta ("últimos 30 dias", "semana", "mês"…). */
function detectarDias(p) {
  const m = p.match(/(\d+)\s*dias?/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  if (/24\s*h(oras)?\b/.test(p)) return 1;
  if (/\bhoje\b/.test(p)) return 1;
  if (/\bsemana\b/.test(p)) return 7;
  if (/\bquinzena\b/.test(p)) return 15;
  if (/\bmes(es)?\b/.test(p)) return 30;
  if (/\btrimestre\b/.test(p)) return 90;
  return null;
}

// ─── Roteamento (camada semântica fixa, sem IA) ─────────────────────────────

function rotear(perguntaNorm) {
  // Saúde/status do app tem precedência (pega "está tudo certo?", "versão"…).
  if (/\b(saude|status|versao|atualizacao|funcionando|anormal|normal|parad\w*|travad\w*|problema|diagnostico)\b/.test(perguntaNorm) ||
      /tudo (certo|bem|ok)/.test(perguntaNorm)) {
    return { query: 'saude_status', params: {} };
  }
  // Contagem de pessoas/grupos ("quantos alunos tenho", "total de alunos") —
  // usa a MESMA fonte do card do Painel, para os números baterem.
  if (/\b(quant[oa]s?|total|numero|n[º°])\b/.test(perguntaNorm) &&
      /\b(alun\w*|pesso\w*|grup\w*|contas?|membros?)\b/.test(perguntaNorm)) {
    return { query: 'contagem', params: {} };
  }
  // Grupos / DISC / Sabotadores → inteligência de grupos.
  if (/\b(grupos?|disc|predominante|dominante|influente|estavel|analitico|sabotador\w*|pq)\b/.test(perguntaNorm)) {
    return { query: 'inteligencia_grupos', params: { min_n: 5 } };
  }
  // Período / volume / conclusão → visão geral.
  if (/\b(taxa|conclusao|conclu(i|id)\w*|iniciad\w*|periodo|dias?|semana|mes(es)?|trimestre|volume|engajamento|quant[ao]s?|tempo medio|avaliac\w*)\b/.test(perguntaNorm)) {
    return { query: 'visao_geral', params: { dias: detectarDias(perguntaNorm) } };
  }
  return { query: null, params: {} };
}

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

// ─── Modo conversa: respostas com informações do app (sem IA) ───────────────

const CONVERSAS = [
  {
    // "que dia é hoje", "que data é hoje", "que horas são" — responde local,
    // sem cair na consulta de período (a palavra "dia" enganava o roteador).
    re: /\bque (dia|data)\b.*\b(hoje|agora)\b|\bdata de hoje\b|\bque dia (e|eh)\b|dia estamos|\bque horas\b|hora atual|hoje e que dia/,
    resposta: () => {
      const agora = new Date();
      const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `Hoje é ${data}, ${hora} no seu dispositivo. Se quiser, pergunte "qual a taxa de conclusão nas últimas 24 horas?" que eu trago o movimento do dia.`;
    },
  },
  {
    re: /\b(oi|ola|bom dia|boa tarde|boa noite|e ai|eai|hey|hello)\b/,
    soCurta: true, // saudação só vale sozinha — não pode sequestrar "olá, como está X?"
    resposta: 'Olá! Eu sou o Mestre, o assistente da Central. Respondo com os números do seu escopo: distribuição DISC e sabotadores por grupo, taxa de conclusão por período e a saúde geral do app. Pergunte, por exemplo: "Como está a distribuição DISC dos meus grupos?".',
  },
  {
    re: /(o que (voce|vc) (faz|sabe)|como (voce|vc) funciona|\bajuda\b|\bhelp\b|o que (posso|da pra) perguntar)/,
    resposta: 'Posso te ajudar com três recortes de dados, sempre agregados e sem expor ninguém:\n• Inteligência de grupos — distribuição DISC, PQ e sabotadores médios, conclusão por grupo.\n• Visão geral — avaliações criadas, iniciadas e concluídas num período (ex.: "últimos 30 dias").\n• Saúde do app — status geral, itens parados e alertas.\nTambém explico como usar o Perfil Master (avaliação avulsa, convites, senha, relatórios).',
  },
  {
    re: /o que (e|significa) (o )?disc|\bmetodologia disc\b/,
    resposta: 'DISC é a metodologia comportamental usada nas avaliações do Perfil Master. Ela mapeia quatro perfis: Dominante (foco em resultado e decisão), Influente (comunicação e entusiasmo), Estável (consistência e harmonia) e Analítico (precisão e qualidade). Cada avaliação de 78 questões calcula os quatro eixos e aponta o perfil primário.',
  },
  {
    re: /o que (e|sao|significa) (os )?sabotador/,
    resposta: 'Os Sabotadores (metodologia PQ) são padrões mentais que atrapalham a performance: Juiz, Controlador, Hiper-Realizador, Hiper-Racional, Hiper-Vigilante, Insistente, Prestativo, Esquivo, Inquieto e Vítima. A avaliação completa mede a intensidade de cada um e calcula o PQ Score (quanto maior, menor a interferência dos sabotadores). Veja os agregados por grupo na aba Inteligência de Grupos.',
  },
  {
    re: /avaliacao (avulsa|esporadica|sem conta)|whatsapp.*avalia|link.*avalia/,
    resposta: 'Para uma avaliação avulsa (sem conta): vá em Alunos e clique em "Avaliação avulsa", ou em Grupos › Membros use "Avaliação avulsa (WhatsApp)". O app gera um link único por pessoa para enviar no WhatsApp; ela responde as 78 questões sem login e você acompanha o resultado no Relatório Oficial.',
  },
  {
    re: /\bconvite|convidar|adicionar aluno|cadastrar aluno/,
    resposta: 'Para convidar alguém com conta: crie ou abra um grupo em Grupos e gere o link de convite — a pessoa se cadastra por ele e já entra no grupo. Para vínculo sem grupo, gere um convite avulso. Convites de admin (equipe) também existem, gerenciados em Configurações.',
  },
  {
    re: /\bsenha|resetar? .*acesso|esqueceu/,
    resposta: 'Para redefinir a senha de um aluno: na aba Alunos, clique no botão "Senha" do aluno. O app gera um link de redefinição para você enviar pelo WhatsApp — sem depender de e-mail. A pessoa abre o link e define a nova senha em /reset-password.',
  },
  {
    re: /converter|tornar conta|virar conta/,
    resposta: 'Para converter um avaliado de sessão (link WhatsApp) em conta de aluno: na aba Alunos, use o botão "Tornar conta". O perfil DISC já respondido migra junto, e você recebe um link de senha para enviar à pessoa.',
  },
  {
    re: /\brelatorio|exportar|pdf/,
    resposta: 'O Relatório Oficial de cada pessoa fica em Alunos (ou pelo link do avaliado) e é onde a análise de IA é gerada — é o único lugar do chat/relatórios que consulta a API de IA. Minhas respostas aqui você pode exportar em PDF pelo botão "Exportar PDF" quando trago dados.',
  },
  {
    re: /quem (e|sao) (voce|vc|o mestre)|\bseu nome\b|voce e uma ia/,
    resposta: 'Sou o Mestre, o assistente da Central do Perfil Master. Funciono localmente, dentro do app: leio só números agregados do seu escopo (nunca nome, e-mail ou CPF) e não envio nada para IA externa — a IA é usada apenas na análise do Relatório Oficial.',
  },
  {
    re: /\b(obrigad[oa]|valeu|show|perfeito|otimo|top|legal)\b/,
    soCurta: true,
    resposta: 'De nada! Estou por aqui quando precisar — é só clicar no botão do Mestre no Painel.',
  },
  {
    re: /\b(privacidade|anonim\w*|lgpd|pii|dados pessoais|k-?anonimato)\b/,
    resposta: 'Privacidade aqui é regra: eu só trabalho com números agregados do seu escopo, com k-anonimato nos grupos (amostras pequenas ficam suprimidas). CPF é opcional, com consentimento LGPD, e nunca aparece em respostas — nem para mim. Nenhum dado seu sai do app pelo chat.',
  },
  {
    re: /\bcentral (de gestao)?\b|\bauditoria\b|\btrilha\b|\bobservabilidade\b/,
    resposta: 'A Central de Gestão (aba Central de Gestão) tem três painéis: Visão Geral (volume e conclusão do período), Pessoas & Histórico (status real de cada pessoa + trilha de auditoria) e Inteligência de Grupos (DISC, PQ e sabotadores agregados por grupo). Eu respondo com os mesmos dados desses painéis, aqui no chat.',
  },
  {
    re: /\bmodulos?\b|social style|\bocai\b/,
    resposta: 'Em Módulos você monta avaliações personalizadas por grupo. Hoje o motor de cálculo e relatório cobre o modelo DiSC; Social Style, OCAI e Custom aparecem como "em breve". A avaliação principal (78 questões DISC + Sabotadores) não depende de módulo.',
  },
  {
    re: /\bnotificac\w*|aviso sonoro|\bbeep\b|\bsom\b/,
    resposta: 'As preferências de notificação (som e avisos) ficam em Configurações. Com o app aberto, você recebe aviso de atividade dos avaliados; quando eu respondo com a aba em segundo plano, também aviso por notificação, se estiver habilitado.',
  },
];

/** Resposta da base de conhecimento, ou null se nenhum padrão casar. */
function conversaMatch(perguntaNorm) {
  for (const c of CONVERSAS) {
    if (c.soCurta && perguntaNorm.length >= 25) continue;
    if (c.re.test(perguntaNorm)) {
      return typeof c.resposta === 'function' ? c.resposta() : c.resposta;
    }
  }
  return null;
}

const FALLBACK =
  'Ainda não sei responder essa. Posso trazer a distribuição DISC e sabotadores dos grupos, a taxa de conclusão de um período ("últimos 30 dias") ou a saúde do app, e explico fluxos como avaliação avulsa, convites e redefinição de senha. Anotei sua pergunta para aprender esse assunto numa próxima atualização.';

// ─── API principal ───────────────────────────────────────────────────────────

/**
 * responderMestre — responde a pergunta do facilitador localmente.
 * @param {{ pergunta:string, adminUid:string, contexto?:object }} args
 * @returns {Promise<{modo:'dado'|'conversa', narrativa:string, dados:object|null, queryUsada:string|null}>}
 */
export async function responderMestre({ pergunta, adminUid, contexto = {} }) {
  const perguntaNorm = normalizar(pergunta);

  // Base de conhecimento primeiro: "como faço X" / conceitos ("o que é DISC")
  // são mais específicos que os gatilhos de métrica e não devem virar consulta.
  const conhecimento = conversaMatch(perguntaNorm);
  if (conhecimento) {
    return { modo: 'conversa', narrativa: conhecimento, dados: null, queryUsada: null };
  }

  const { query, params } = rotear(perguntaNorm);
  if (!query) {
    registrarMiss(pergunta); // alimenta a evolução do vocabulário
    return { modo: 'conversa', narrativa: FALLBACK, dados: null, queryUsada: null };
  }

  let dados;
  if (query === 'inteligencia_grupos') dados = await dadosGrupos(params);
  else if (query === 'visao_geral') dados = await dadosVisaoGeral(params);
  else if (query === 'contagem') dados = await dadosContagem(adminUid);
  else dados = await dadosSaude(adminUid, contexto);

  const narrativa =
    query === 'inteligencia_grupos' ? narrarGrupos(dados) :
    query === 'visao_geral' ? narrarVisaoGeral(dados) :
    query === 'contagem' ? narrarContagem(dados) :
    narrarSaude(dados);

  return { modo: 'dado', narrativa, dados, queryUsada: query };
}
