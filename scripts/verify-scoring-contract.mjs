import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SAMPLE_QUESTIONS } from '../src/constants/sampleQuestions.js';
import { calcularPerfilDisc, DISC_VERSAO } from '../src/lib/discScoring.js';
import { computeSaboteurs, SAB_DIMENSION_TO_KEY } from '../src/lib/saboteurScoring.js';

const disc = SAMPLE_QUESTIONS.filter((q) => ['D', 'I', 'S', 'C'].includes(q.dimension));
const sabotadores = SAMPLE_QUESTIONS.filter((q) => String(q.dimension).startsWith('SAB_'));
assert.equal(SAMPLE_QUESTIONS.length, 78, 'O questionário completo deve ter 78 questões.');
assert.equal(disc.length, 28, 'O bloco DISC deve ter 28 questões.');
assert.equal(sabotadores.length, 50, 'O bloco de Sabotadores deve ter 50 questões.');
assert.equal(new Set(SAMPLE_QUESTIONS.map((q) => q.id)).size, 78, 'IDs de questões devem ser únicos.');
assert.ok(disc.every((q) => q.type === 'likert5'), 'Todas as questões DISC devem ser Likert 1-5.');

const allMin = Object.fromEntries(SAMPLE_QUESTIONS.map((q) => [q.id, 1]));
const allMax = Object.fromEntries(SAMPLE_QUESTIONS.map((q) => [q.id, 5]));
// DISC-V2 (19/09/2026): 8 itens invertidos (2 por dimensão) — extremos agora são
// "melhor resposta" (5 nos diretos, 1 nos invertidos) → 100 e o oposto → 0.
const invertidos = disc.filter((q) => q.invertido);
assert.equal(invertidos.length, 8, 'DISC-V2 exige 8 itens invertidos.');
for (const dim of ['D', 'I', 'S', 'C']) {
  assert.equal(invertidos.filter((q) => q.dimension === dim).length, 2, `Dimensão ${dim} precisa de 2 itens invertidos.`);
}
assert.equal(DISC_VERSAO, 2, 'DISC_VERSAO deve ser 2 com itens invertidos.');
const melhor = Object.fromEntries(disc.map((q) => [q.id, q.invertido ? 1 : 5]));
const pior = Object.fromEntries(disc.map((q) => [q.id, q.invertido ? 5 : 1]));
assert.deepEqual(calcularPerfilDisc(melhor).scores, { D: 100, I: 100, S: 100, C: 100 });
assert.deepEqual(calcularPerfilDisc(pior).scores, { D: 0, I: 0, S: 0, C: 0 });
assert.equal(calcularPerfilDisc(melhor).discVersao, 2);
// Aquiescência: concordar com tudo NÃO pode mais dar 100 em nenhuma dimensão.
const tudo5 = calcularPerfilDisc(allMax).scores;
for (const dim of ['D', 'I', 'S', 'C']) assert.ok(tudo5[dim] < 80, `Concordar com tudo ainda infla ${dim} (${tudo5[dim]}).`);
assert.equal(computeSaboteurs(allMin, sabotadores)?.pqScore, 90);
assert.equal(computeSaboteurs(allMax, sabotadores)?.pqScore, 50);

const edgeSource = await readFile(new URL('../supabase/functions/atualizarStatus/index.ts', import.meta.url), 'utf8');
const sharedSource = await readFile(new URL('../supabase/functions/_shared/disc.ts', import.meta.url), 'utf8');
for (const question of disc) {
  const expected = `id: '${question.id}'`;
  assert.ok(edgeSource.includes(expected), `${question.id} ausente em atualizarStatus.`);
  assert.ok(sharedSource.includes(expected), `${question.id} ausente em _shared/disc.ts.`);
  const inv = question.invertido ? ', invertido: true' : '';
  const w = `${question.weight}(\.0)?`; // 1 no JS é '1.0' no TS
  const edgePattern = new RegExp(`id: '${question.id}'[^}]+type: 'likert5'[^}]+weight: ${w}${inv} \}`);
  assert.ok(edgePattern.test(edgeSource), `${question.id} diverge no motor público (peso/invertido).`);
  const sharedPattern = new RegExp(`id: '${question.id}'[^}]+weight: ${w}${inv} \}`);
  assert.ok(sharedPattern.test(sharedSource), `${question.id} diverge no motor compartilhado (peso/invertido).`);
}
// Os dois espelhos precisam aplicar 6 − valor e carimbar a versão.
for (const [nome, src] of [['atualizarStatus', edgeSource], ['_shared/disc.ts', sharedSource]]) {
  assert.ok(/6 - bruto/.test(src), `${nome} não aplica a inversão (6 − valor) do DISC-V2.`);
  assert.ok(/DISC_VERSAO = 2/.test(src), `${nome} não carimba DISC_VERSAO = 2.`);
}

// ── M5 (auditoria 27/07/2026): Sabotadores do Edge ───────────────────────────
// O front deriva a chave do sabotador pelo campo `dimension` da questão; o Edge
// deriva por REGEX no id (/^q_sab_([a-z]+)_\d+$/) + o mapa SAB_SLUG_TO_KEY.
// Se um id mudar de padrão, o Edge ignora a questão EM SILÊNCIO e as duas
// fontes divergem sem erro. Este bloco trava esse acoplamento.

const EDGE_SAB_REGEX = /^q_sab_([a-z]+)_\d+$/;

// Extrai o mapa SAB_SLUG_TO_KEY do source do Edge (slug → chave canônica).
const mapaBloco = /const SAB_SLUG_TO_KEY[^=]*=\s*\{([\s\S]*?)\}/.exec(edgeSource);
assert.ok(mapaBloco, 'SAB_SLUG_TO_KEY ausente em atualizarStatus.');
const edgeSlugToKey = Object.fromEntries(
  [...mapaBloco[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
);
assert.equal(
  Object.keys(edgeSlugToKey).length, 10,
  'O Edge precisa mapear exatamente os 10 sabotadores.'
);

for (const q of sabotadores) {
  const m = EDGE_SAB_REGEX.exec(q.id);
  assert.ok(m, `${q.id} não casa com o regex de sabotador do Edge — seria ignorado no fluxo público.`);
  const chaveEdge = edgeSlugToKey[m[1]];
  assert.ok(chaveEdge, `Slug "${m[1]}" (${q.id}) não existe em SAB_SLUG_TO_KEY do Edge.`);
  const chaveFront = SAB_DIMENSION_TO_KEY[q.dimension];
  assert.ok(chaveFront, `Dimensão ${q.dimension} (${q.id}) não existe em SAB_DIMENSION_TO_KEY.`);
  assert.equal(
    chaveEdge, chaveFront,
    `${q.id}: Edge mapeia para "${chaveEdge}" e o front para "${chaveFront}".`
  );
}

// A allowlist do Edge é gerada por slug × _01.._05; precisa cobrir os 50 ids reais.
const idsEdgeEsperados = new Set(
  Object.keys(edgeSlugToKey).flatMap((slug) =>
    ['01', '02', '03', '04', '05'].map((n) => `q_sab_${slug}_${n}`)
  )
);
for (const q of sabotadores) {
  assert.ok(
    idsEdgeEsperados.has(q.id),
    `${q.id} fora da allowlist gerada pelo Edge (slug × _01.._05) — seria descartado ao concluir.`
  );
}
assert.equal(idsEdgeEsperados.size, 50, 'A allowlist de sabotadores do Edge deve ter 50 ids.');

// Mesmo vetor de respostas → mesmo PQ nos dois lados (a fórmula é duplicada).
// Valor varia POR SABOTADOR (não dentro dele), senão todas as médias empatam
// em 3 e o teste passaria mesmo com o mapeamento trocado.
const vetor = Object.fromEntries(
  sabotadores.map((q, i) => [q.id, (Math.floor(i / 5) % 5) + 1])
);
const pqFront = computeSaboteurs(vetor, sabotadores)?.pqScore;
const accEdge = {};
for (const [id, valor] of Object.entries(vetor)) {
  const m = EDGE_SAB_REGEX.exec(id);
  (accEdge[edgeSlugToKey[m[1]]] ||= []).push(valor);
}
const rawEdge = Object.fromEntries(
  Object.values(edgeSlugToKey).map((k) => {
    const arr = accEdge[k] || [];
    const media = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    return [k, Math.round(media * 100) / 100];
  })
);
const top3Edge = Object.entries(rawEdge).sort((a, b) => b[1] - a[1]).slice(0, 3);
const pqEdge = Math.max(0, Math.min(100, Math.round(
  100 - (top3Edge.reduce((s, [, v]) => s + v, 0) / (top3Edge.length || 1)) * 10
)));
assert.equal(pqFront, pqEdge, `PQ Score diverge: front=${pqFront} vs Edge=${pqEdge}.`);

// ── A1/A3: a validação do fluxo público não pode sumir numa refatoração ──────
assert.ok(edgeSource.includes('IDS_VALIDOS'), 'Allowlist de ids (A3) ausente em atualizarStatus.');
assert.ok(edgeSource.includes('sanitizarRespostas'), 'Sanitização de respostas (A3) ausente.');
assert.ok(edgeSource.includes('avaliarCobertura'), 'Checagem de completude (A1) ausente.');
assert.ok(/assessment\/incomplete/.test(edgeSource), 'Resposta 422 de avaliação incompleta (A1) ausente.');
assert.ok(
  /const \{ error: updateError \}/.test(edgeSource) && /const \{ error: respostasError \}/.test(edgeSource),
  'Verificação de erro nos writes (C3) ausente em atualizarStatus.'
);

console.log('Contrato de scoring validado: 28 DISC (v2, 8 invertidos) + 50 Sabotadores (front ↔ Edge).');
