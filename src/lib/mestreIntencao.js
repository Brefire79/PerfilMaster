// ─────────────────────────────────────────────────────────────────────────────
// Mestre v2 — interpretador de INTENÇÃO + ENTIDADES (puro, sem I/O, sem `@/`).
//
// Substitui o roteador por regex plano: além de decidir "qual consulta", extrai
// da pergunta o grupo, a pessoa, o período e o sabotador citados, casando com
// os nomes reais do escopo do facilitador (passados em `catalogo`). Quando a
// intenção precisa de uma entidade que não veio, devolve `faltando` para o
// motor perguntar de volta (slot-filling) em vez de chutar.
//
// Travado por scripts/verify-mestre-contract.mjs.
// ─────────────────────────────────────────────────────────────────────────────

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
  if (/24\s*h(oras)?\b/.test(p) || /\bhoje\b/.test(p)) return 1;
  if (/\bsemana\b/.test(p)) return 7;
  if (/\bquinzena\b/.test(p)) return 15;
  if (/\bmes(es)?\b/.test(p)) return 30;
  if (/\btrimestre\b/.test(p)) return 90;
  return null;
}

// Intenções, da mais específica para a mais genérica. `precisa` = entidades obrigatórias.
const INTENCOES = [
  { id: 'saude_status',      re: /\b(saude|status do app|versao|atualizacao|funcionando|anormal|parad\w*|travad\w*|problema|diagnostico)\b|tudo (certo|bem|ok)/ },
  { id: 'pendencias',        re: /\b(pendenc\w*|pendente\w*|quem (ainda )?nao (concluiu|terminou|respondeu|fez)|falta\w* (concluir|responder|terminar)|em aberto|nao concluid\w*|atrasad\w*|vencend\w*|vence\w*|prazo\w*)\b/ },
  { id: 'ciclos',            re: /\b(ciclos?|testes? dirigid\w*|reavalia\w*|em reavaliacao|aplicad\w*|aguardando resposta)\b/ },
  { id: 'evolucao_pessoa',   re: /\b(evolu\w*|evoluiu|mudou|antes e depois|progresso|melhorou|piorou|historico d[aeo])\b/, precisa: ['pessoa'] },
  { id: 'abordagem_pessoa',  re: /\b(o que (fazer|trabalhar)|como (abordar|trabalhar|lidar)|proxim[oa] (passo|foco|teste|abordagem)|sugest\w*|recomend\w*|abordagem|foco)\b/, precisa: ['pessoa|grupo'] },
  { id: 'contagem',          re: /\b(quant[oa]s?|total|numero|n[º°])\b.*\b(alun\w*|pesso\w*|grup\w*|contas?|membros?)\b/ },
  { id: 'inteligencia_grupos', re: /\b(grupos?|disc|predominante|dominante|influente|estavel|analitico|sabotador\w*|pq)\b/ },
  { id: 'visao_geral',       re: /\b(taxa|conclusao|conclu(i|id)\w*|iniciad\w*|periodo|dias?|semana|mes(es)?|trimestre|volume|engajamento|quant[ao]s?|tempo medio|avaliac\w*)\b/ },
];

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

  // Pessoa citada + pergunta sobre ela sem verbo de intenção explícito → abordagem/evolução.
  let intencao = null;
  for (const it of INTENCOES) {
    if (it.re.test(p)) { intencao = it.id; break; }
  }
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
