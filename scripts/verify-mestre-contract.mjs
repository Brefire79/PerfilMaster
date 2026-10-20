// Contrato do Mestre v2 — interpretador de intenção + entidades (19/09/2026).
// Roda offline: só o módulo puro src/lib/mestreIntencao.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretar, casarNome, normalizar, rotear } from '../src/lib/mestreIntencao.js';
import { CONHECIMENTO } from '../src/lib/mestreConhecimento.js';

const catalogo = {
  grupos: [{ id: 'g1', nome: 'Turma Piloto' }, { id: 'g2', nome: 'Grupo Empresarial' }, { id: 'g3', nome: 'Alunos Avulsos' }],
  pessoas: [
    { id: 'p1', nome: 'Claudia Cavalcanti' },
    { id: 'p2', nome: 'Jennifer Nicoly Caldas Cavalcanti' },
    { id: 'p3', nome: 'Casa TvBox' },
    { id: 'p4', nome: 'Breno Luis' },
  ],
};

const i = (q) => interpretar(q, catalogo);

// Entidades
assert.equal(i('o que trabalhar com a turma piloto?').entidades.grupo?.id, 'g1');
assert.equal(i('como está o grupo empresarial').entidades.grupo?.id, 'g2');
assert.equal(i('como o Breno evoluiu?').entidades.pessoa?.id, 'p4');
assert.equal(i('qual o próximo passo da Casa TvBox').entidades.pessoa?.id, 'p3');
// "Cavalcanti" sozinho é ambíguo (2 pessoas) → pede desambiguação
let r = i('o que fazer com a Cavalcanti?');
assert.equal(r.entidades.pessoa, null); assert.ok(r.entidades.ambiguos?.length === 2); assert.ok(r.faltando.includes('pessoa_ambigua'));
// nome completo resolve
assert.equal(i('o que fazer com a Claudia Cavalcanti?').entidades.pessoa?.id, 'p1');
// acentos/maiúsculas não importam
assert.equal(i('COMO ESTÁ A CLÁUDIA CAVALCANTI').entidades.pessoa?.id, 'p1');

// Intenções
assert.equal(i('quem ainda não concluiu a avaliação?').intencao, 'pendencias');
assert.equal(i('tem alguma pendência?').intencao, 'pendencias');
assert.equal(i('quem está em reavaliação?').intencao, 'ciclos');
assert.equal(i('quantos testes dirigidos foram aplicados este mês?').intencao, 'ciclos');
assert.equal(i('o que trabalhar com a turma piloto?').intencao, 'abordagem_turma');
assert.equal(i('qual o próximo foco do grupo empresarial').intencao, 'abordagem_turma');
assert.equal(i('o que fazer com o Breno Luis?').intencao, 'abordagem_pessoa');
assert.equal(i('como o Breno evoluiu?').intencao, 'evolucao_pessoa');
assert.equal(i('me fala da Casa TvBox').intencao, 'abordagem_pessoa'); // pessoa citada sem verbo → abordagem
assert.equal(i('quantos alunos tenho?').intencao, 'contagem');
assert.equal(i('qual a taxa de conclusão nos últimos 30 dias?').intencao, 'visao_geral');
assert.equal(i('qual a taxa de conclusão nos últimos 30 dias?').entidades.dias, 30);
assert.equal(i('distribuição disc dos grupos').intencao, 'inteligencia_grupos');
assert.equal(i('está tudo certo?').intencao, 'saude_status');
assert.equal(i('xyz qwerty').intencao, null); // saudações são resolvidas antes, pela base de conhecimento

// Slot-filling
r = i('o que fazer agora?');
assert.equal(r.intencao, 'abordagem_pessoa'); assert.ok(r.faltando.includes('pessoa|grupo'));
r = i('como evoluiu?');
assert.equal(r.intencao, 'evolucao_pessoa'); assert.ok(r.faltando.includes('pessoa'));

// casarNome direto
assert.equal(casarNome(normalizar('turma piloto'), catalogo.grupos)?.item?.id, 'g1');
assert.equal(casarNome(normalizar('nada a ver'), catalogo.grupos), null);

// ── Mestre v3: base de conhecimento ──────────────────────────────────────────
const ids = CONHECIMENTO.map((e) => e.id);
assert.equal(new Set(ids).size, ids.length, 'ids duplicados na base de conhecimento');
for (const e of CONHECIMENTO) {
  assert.ok(e.re instanceof RegExp, `${e.id}: sem regex`);
  const txt = typeof e.resposta === 'function' ? e.resposta() : e.resposta;
  assert.ok(typeof txt === 'string' && txt.length > 20, `${e.id}: resposta vazia`);
  assert.ok(!/undefined|\[object/.test(txt), `${e.id}: resposta com campo faltando`);
}
// Perfis e sabotadores gerados a partir de localEngine.js (4 + 4 + 10).
assert.equal(ids.filter((id) => /^(perfil|lidar)_[DISC]$/.test(id)).length, 8);
assert.equal(ids.filter((id) => id.startsWith('sab_')).length, 10);

// ── Mestre v3: roteador + conjunto-ouro ──────────────────────────────────────
const rotaDe = (q) => {
  const r = rotear(q, catalogo);
  if (r.rota === 'kb') return `kb:${r.entrada.id}`;
  if (r.rota === 'fallback') return 'fallback';
  if (r.faltando?.length) return `slot:${r.faltando[0]}`;
  return `consulta:${r.intencao}`;
};

const golden = JSON.parse(readFileSync(new URL('./mestre-golden.json', import.meta.url), 'utf8')).casos;
const atuais = golden.filter((c) => !c.fase || c.fase <= 1);
const futuros = golden.filter((c) => c.fase > 1);
const erros = atuais.map((c) => ({ ...c, obtido: rotaDe(c.q) })).filter((c) => c.obtido !== c.espera);
if (erros.length) {
  for (const e of erros) console.error(`  ✖ "${e.q}" → ${e.obtido} (esperado ${e.espera})`);
  assert.fail(`${erros.length} de ${atuais.length} perguntas do conjunto-ouro com rota errada.`);
}
// "Como faço"/"o que é" nunca podem virar consulta de dado — exceto "onde/como
// vejo X", que é um pedido de dado ("onde vejo quem não respondeu?").
for (const c of atuais) {
  const r = rotear(c.q, catalogo);
  const pedeVer = /\b(vejo|ver|encontro|acho|sei|descubro)\b/.test(normalizar(c.q));
  if ((r.tipo === 'como_fazer' && !pedeVer) || r.tipo === 'conceito') assert.notEqual(r.rota, 'consulta', `"${c.q}" (${r.tipo}) virou consulta`);
}
const futurosOk = futuros.filter((c) => rotaDe(c.q) === c.espera).length;

console.log(`Contrato do Mestre validado: intenções + entidades + slot-filling; conjunto-ouro ${atuais.length}/${atuais.length}${futuros.length ? ` (fases seguintes: ${futurosOk}/${futuros.length})` : ''}.`);
