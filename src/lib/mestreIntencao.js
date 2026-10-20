// ─────────────────────────────────────────────────────────────────────────────
// Mestre v3 — roteador: TIPO da pergunta → base de conhecimento ou INTENÇÃO
// + ENTIDADES (puro, sem I/O, sem `@/`).
//
// v2 decidia "qual consulta" pela primeira regex que casava; palavras soltas
// como "grupo", "pq" ou "avaliação" sequestravam perguntas de "como faço"
// (ex.: "como crio um grupo?" virava a tabela DISC). Agora:
//   1. classificarTipo: como_fazer | conceito | orientacao | agenda | dado
//   2. como_fazer/conceito nunca viram consulta de dado: ou a base responde,
//      ou cai no fallback com sugestões;
//   3. intenções de dado são escolhidas por PONTUAÇÃO (soma de pesos), não
//      pela primeira que casa.
// O grupo, a pessoa, o período e o sabotador citados são casados com os nomes
// reais do escopo (`catalogo`). Faltou entidade obrigatória → `faltando`, e o
// motor pergunta de volta (slot-filling) em vez de chutar.
//
// Travado por scripts/verify-mestre-contract.mjs + scripts/mestre-golden.json.
// ─────────────────────────────────────────────────────────────────────────────
import { buscarConhecimento, sugerirProximas } from './mestreConhecimento.js';

const RE_DIACRITICOS = /[̀-ͯ]/g;

export function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(RE_DIACRITICOS, '').replace(/\s+/g, ' ').trim();
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'grupo', 'turma', 'equipe', 'time', 'classe']);

function tokens(s) {
  return normalizar(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOP.has(t));
}

/**
 * Casa um nome (grupo/pessoa) na pergunta. Estratégias, em ordem:
 *  1. nome completo normalizado contido na pergunta;
 *  2. todos os tokens significativos do nome presentes;
 *  3. ≥ 1 token de ≥ 4 letras presente E único entre os candidatos (ex.: "Claudia").
 * Retorna { item, forca } ou null. Ambíguo (vários no nível 3) → { ambiguos }.
 */
export function casarNome(perguntaNorm, candidatos, nomeDe = (c) => c.nome) {
  const pt = new Set(tokens(perguntaNorm));
  const comNome = candidatos.map((c) => ({ c, nome: normalizar(nomeDe(c)), toks: tokens(nomeDe(c)) })).filter((x) => x.nome);

  const completos = comNome.filter((x) => x.nome.length >= 3 && perguntaNorm.includes(x.nome));
  if (completos.length === 1) return { item: completos[0].c, forca: 3 };
  if (completos.length > 1) return { item: completos.sort((a, b) => b.nome.length - a.nome.length)[0].c, forca: 3 };

  const todos = comNome.filter((x) => x.toks.length > 0 && x.toks.every((t) => pt.has(t)));
  if (todos.length === 1) return { item: todos[0].c, forca: 2 };
  if (todos.length > 1) return { ambiguos: todos.map((x) => x.c) };

  const parcial = comNome.filter((x) => x.toks.some((t) => t.length >= 4 && pt.has(t)));
  if (parcial.length === 1) return { item: parcial[0].c, forca: 1 };
  if (parcial.length > 1) return { ambiguos: parcial.map((x) => x.c) };
  return null;
}

export function detectarDias(p) {
  const m = p.match(/(\d+)\s*dias?/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  if (/24\s*h(oras)?\b/.test(p) || /\b(hoje|ontem)\b/.test(p)) return 1;
  if (/\bsemana\b/.test(p)) return 7;
  if (/\bquinzena\b/.test(p)) return 15;
  if (/\bmes(es)?\b/.test(p)) return 30;
  if (/\btrimestre\b/.test(p)) return 90;
  return null;
}

// ─── 1. Tipo da pergunta ─────────────────────────────────────────────────────

const VERBOS_FAZER = 'faco|faz|fazer|crio|criar|cria|envio|enviar|mando|mandar|reenvio|reenviar|mudo|mudar|troco|trocar|altero|alterar|aplico|aplicar|exporto|exportar|convido|convidar|adiciono|adicionar|cadastro|cadastrar|vejo|ver|acesso|acessar|uso|usar|comeco|comecar|inicio|iniciar|configuro|configurar|removo|remover|excluo|excluir|apago|apagar|redefino|redefinir|gero|gerar|abro|abrir|cobro|cobrar|coloco|colocar|incluo|incluir|edito|editar|imprimo|imprimir|baixo|baixar|transformo|transformar|converto|converter|pauso|pausar|encerro|encerrar|marco|marcar';

const RE_ORIENTACAO = /\bcomo (devo )?(lidar|abordar|tratar|conduzir|liderar|motivar|comunicar|me comunicar|falar|conversar|trabalhar|desenvolver|dar (a |uma )?(devolutiva|feedback))\b|\bdevolutiva\b|\bdar feedback\b|\bo que (fazer|trabalhar|faco) com\b/;
const RE_CONCEITO = /\bo que (e|eh|sao|significa|significam|quer dizer)\b|\bsignifica\b|\bexplica\w*\b|\bdiferenca\b|\bpra que serve\b|\bpara que serve\b|\bdefinicao\b|\bo que mede\b/;
const RE_COMO_FAZER = new RegExp(`\\bcomo (eu )?(${VERBOS_FAZER})\\b|\\bonde (eu )?(vejo|fica|ficam|encontro|esta|estao|acho|clico)\\b|\\bpasso a passo\\b|\\b(posso|consigo|da pra|tem como|e possivel) (${VERBOS_FAZER})\\b|\\bpor onde (comeco|comecar)\\b`);
const RE_AGENDA = /\bo que (eu )?(faco|fazer|devo fazer|tenho (que|pra) fazer)( (hoje|agora|primeiro|essa semana|esta semana))?\??$|\bproximos passos\b|\bminhas? (prioridades|agenda|tarefas)\b|\bo que (esta )?pendente pra mim\b|\bo que precisa de (mim|atencao)\b/;

export function classificarTipo(p) {
  if (RE_ORIENTACAO.test(p)) return 'orientacao';
  if (RE_COMO_FAZER.test(p)) return 'como_fazer';
  if (RE_CONCEITO.test(p)) return 'conceito';
  if (RE_AGENDA.test(p)) return 'agenda';
  return 'dado';
}

// ─── 2. Intenções de dado (pontuação) ────────────────────────────────────────
// `sinais` = [regex, peso]; vence a maior soma; empate → a que vem primeiro.
// `precisa` = entidades obrigatórias.
const INTENCOES = [
  { id: 'saude_status', sinais: [
    [/\b(saude|status do app|versao|atualizacao|funcionando|anormal|travad\w*|diagnostico|erros?|bugs?)\b|tudo (certo|bem|ok)/, 3],
    [/\b(parad\w*|problemas?)\b/, 1],
  ] },
  { id: 'pendencias', sinais: [
    [/\b(pendenc\w*|pendentes?|atrasad\w*|venc\w*|prazos?|em aberto|nao concluid\w*)\b|quem (ainda )?nao (concluiu|terminou|respondeu|fez)|falta\w* (concluir|responder|terminar)/, 3],
    [/\bnao (respond|conclu|termin|fez)\w*/, 2],
  ] },
  { id: 'ciclos', sinais: [
    [/\b(ciclos?|testes? dirigid\w*|reavalia\w*|aguardando resposta)\b/, 3],
    [/\baplicad\w*\b/, 1],
    [/\btestes?\b/, 1],
  ] },
  { id: 'evolucao_pessoa', precisa: ['pessoa'], sinais: [
    [/\b(evolu\w*|mudou|antes e depois|progresso|melhorou|piorou|historico d[aeo])\b/, 3],
  ] },
  { id: 'abordagem_pessoa', precisa: ['pessoa|grupo'], sinais: [
    [/\b(o que (fazer|trabalhar)|como (abordar|trabalhar|lidar)|proxim[oa] (passo|foco|teste|abordagem)|sugest\w*|recomend\w*|abordagem|foco)\b/, 3],
  ] },
  { id: 'contagem', sinais: [
    [/\b(quant[oa]s?|total|numero)\b.*\b(alun\w*|pesso\w*|grup\w*|turmas?|contas?|membros?|participantes?)\b/, 4],
  ] },
  { id: 'inteligencia_grupos', sinais: [
    [/\b(grupos?|turmas?|equipes?|times?)\b/, 1],
    [/\b(disc|predominante\w*|dominante\w*|influente\w*|estave\w*|estavel|analitico\w*|sabotador\w*|pq|perfil|perfis|compar\w*)\b/, 2],
  ] },
  { id: 'visao_geral', sinais: [
    [/\b(taxa|conclusao|conclu(i|id)\w*|iniciad\w*|periodo|semana|mes(es)?|trimestre|volume|engajamento|tempo medio|avaliac\w*|resumo|movimento)\b/, 2],
    [/\b(dias?|quant[ao]s?)\b/, 1],
  ] },
];

function pontuar(p) {
  let melhor = null;
  for (const it of INTENCOES) {
    const pontos = it.sinais.reduce((s, [re, peso]) => s + (re.test(p) ? peso : 0), 0);
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { id: it.id, pontos };
  }
  return melhor?.id || null;
}

/**
 * @param {string} pergunta
 * @param {{ grupos?: {id,nome}[], pessoas?: {id,nome}[] }} catalogo  nomes reais do escopo
 * @returns {{ intencao: string|null, entidades: { grupo, pessoa, dias, ambiguos }, faltando: string[] }}
 */
export function interpretar(pergunta, catalogo = {}) {
  const p = normalizar(pergunta);
  const entidades = { grupo: null, pessoa: null, dias: detectarDias(p), ambiguos: null };

  const g = casarNome(p, catalogo.grupos || []);
  if (g?.item) entidades.grupo = g.item;
  const pe = casarNome(p, catalogo.pessoas || []);
  if (pe?.item) entidades.pessoa = pe.item;
  else if (pe?.ambiguos) entidades.ambiguos = pe.ambiguos;

  let intencao = pontuar(p);
  // Pessoa citada + pergunta sobre ela sem verbo de intenção explícito → abordagem/evolução.
  if (entidades.pessoa && (!intencao || ['inteligencia_grupos', 'visao_geral', 'contagem'].includes(intencao))) {
    intencao = /\b(evolu\w*|mudou|antes|progresso|historico)\b/.test(p) ? 'evolucao_pessoa' : 'abordagem_pessoa';
  }
  if (entidades.grupo && !entidades.pessoa && (intencao === 'inteligencia_grupos' || intencao === null) && /\b(o que|como|foco|abordagem|trabalhar|sugest\w*|proxim\w*)\b/.test(p)) {
    intencao = 'abordagem_turma';
  }
  if (intencao === 'abordagem_pessoa' && !entidades.pessoa && entidades.grupo) intencao = 'abordagem_turma';

  // Slot-filling
  const faltando = [];
  const spec = INTENCOES.find((i) => i.id === intencao);
  for (const req of spec?.precisa || []) {
    if (req === 'pessoa' && !entidades.pessoa) faltando.push('pessoa');
    if (req === 'pessoa|grupo' && !entidades.pessoa && !entidades.grupo) faltando.push('pessoa|grupo');
  }
  if (entidades.ambiguos && !entidades.pessoa && ['abordagem_pessoa', 'evolucao_pessoa'].includes(intencao)) faltando.push('pessoa_ambigua');

  return { intencao, entidades, faltando };
}

// ─── 3. Roteador ─────────────────────────────────────────────────────────────

/**
 * Decide o caminho da pergunta, sem I/O.
 * @returns
 *   { rota: 'kb', tipo, entrada }                        resposta da base de conhecimento
 *   { rota: 'consulta', tipo, intencao, entidades, faltando }
 *   { rota: 'fallback', tipo, sugestoes: string[] }
 */
export function rotear(pergunta, catalogo = {}) {
  const p = normalizar(pergunta);
  const tipo = classificarTipo(p);
  const interp = interpretar(pergunta, catalogo);
  const { entidades } = interp;
  const temAlvo = !!(entidades.pessoa || entidades.grupo || entidades.ambiguos);

  // Orientação sobre alguém/uma turma do escopo → motor de abordagem, não o guia genérico.
  if (tipo === 'orientacao' && temAlvo) {
    const intencao = interp.intencao === 'evolucao_pessoa' ? 'evolucao_pessoa' : (entidades.pessoa || entidades.ambiguos ? 'abordagem_pessoa' : 'abordagem_turma');
    const faltando = entidades.ambiguos && !entidades.pessoa ? ['pessoa_ambigua'] : [];
    return { rota: 'consulta', tipo, intencao, entidades, faltando };
  }

  const entrada = buscarConhecimento(p, tipo);
  if (entrada) return { rota: 'kb', tipo, entrada };

  // "Onde vejo quem não respondeu?" é um pedido de dado disfarçado de "como faço".
  if (tipo === 'como_fazer' && interp.intencao && /\b(vejo|ver|encontro|acho|sei|descubro)\b/.test(p)) {
    return { rota: 'consulta', tipo, ...interp };
  }

  // "Como faço"/"o que é" nunca viram consulta de dado: sem resposta na base, sugere.
  if (tipo === 'como_fazer' || tipo === 'conceito') {
    return { rota: 'fallback', tipo, sugestoes: sugerirProximas(p) };
  }

  // Agenda ("o que faço hoje?") sem alvo → o que pede ação agora (pendências).
  if (tipo === 'agenda' && !temAlvo) {
    return { rota: 'consulta', tipo, intencao: 'pendencias', entidades, faltando: [] };
  }

  // Orientação sem alvo e sem perfil/sabotador citado → pergunta para quem.
  if (tipo === 'orientacao' && !interp.intencao) {
    return { rota: 'consulta', tipo, intencao: 'abordagem_pessoa', entidades, faltando: ['pessoa|grupo'] };
  }

  if (!interp.intencao) return { rota: 'fallback', tipo, sugestoes: sugerirProximas(p) };
  return { rota: 'consulta', tipo, ...interp };
}
