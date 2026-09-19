// Contrato dos Testes Dirigidos + motor de abordagem (Fase 2, 19/09/2026).
// Trava: estrutura do catálogo (12 itens, 3 subescalas × 4, itens invertidos
// em toda subescala, ids únicos), extremos do scoring (0/100 com inversão
// aplicada), e que toda regra do motor aponta para um teste que existe.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TESTES_DIRIGIDOS, TESTES_POR_CODIGO } from '../src/constants/testesDirigidos.js';
import { pontuarTesteDirigido, testeDirigidoCompleto } from '../src/lib/testeDirigidoScoring.js';
import { sugerirAbordagem, sugerirAbordagemTurma, LIMIARES } from '../src/lib/abordagem.js';

// ── Catálogo ─────────────────────────────────────────────────────────────────
assert.equal(TESTES_DIRIGIDOS.length, 7, 'O catálogo deve ter 7 testes dirigidos.');
const todosIds = TESTES_DIRIGIDOS.flatMap((t) => t.itens.map((i) => i.id));
assert.equal(new Set(todosIds).size, todosIds.length, 'Ids de itens devem ser únicos em todo o catálogo.');
assert.ok(todosIds.every((id) => /^td_[a-z]+_[a-z]+_\d{2}$/.test(id)), 'Id fora do padrão td_<teste>_<subescala>_<nn>.');

for (const t of TESTES_DIRIGIDOS) {
  assert.ok(/^TD-[A-Z-]+$/.test(t.codigo), `${t.codigo}: código fora do padrão.`);
  assert.ok(Number.isInteger(t.versao) && t.versao >= 1, `${t.codigo}: versao inválida.`);
  assert.ok(Number.isInteger(t.prazoDias) && t.prazoDias > 0, `${t.codigo}: prazoDias inválido.`);
  assert.equal(t.itens.length, 12, `${t.codigo}: deve ter 12 itens.`);
  const subs = Object.keys(t.subescalas);
  assert.equal(subs.length, 3, `${t.codigo}: deve ter 3 subescalas.`);
  for (const s of subs) {
    const itens = t.itens.filter((i) => i.subescala === s);
    assert.equal(itens.length, 4, `${t.codigo}/${s}: deve ter 4 itens.`);
    assert.ok(itens.some((i) => i.invertido), `${t.codigo}/${s}: precisa de pelo menos 1 item invertido.`);
    assert.ok(itens.some((i) => !i.invertido), `${t.codigo}/${s}: precisa de pelo menos 1 item direto.`);
  }
  assert.ok(t.itens.every((i) => i.type === 'likert5' && i.text?.ptBR?.trim()), `${t.codigo}: todo item é likert5 com texto ptBR.`);
  assert.ok(t.itens.every((i) => subs.includes(i.subescala)), `${t.codigo}: item com subescala desconhecida.`);

  // Scoring: "melhor resposta" em todos os itens → 100; "pior" → 0.
  const melhor = Object.fromEntries(t.itens.map((i) => [i.id, i.invertido ? 1 : 5]));
  const pior   = Object.fromEntries(t.itens.map((i) => [i.id, i.invertido ? 5 : 1]));
  const rMelhor = pontuarTesteDirigido(t.codigo, melhor);
  const rPior   = pontuarTesteDirigido(t.codigo, pior);
  assert.equal(rMelhor.geral, 100, `${t.codigo}: melhor resposta deve dar 100.`);
  assert.equal(rPior.geral, 0, `${t.codigo}: pior resposta deve dar 0.`);
  assert.ok(subs.every((s) => rMelhor.subescalas[s] === 100 && rPior.subescalas[s] === 0), `${t.codigo}: extremos por subescala.`);
  // Concordar com tudo (aquiescência) NÃO pode dar 100 — é o motivo dos itens invertidos.
  const tudo5 = Object.fromEntries(t.itens.map((i) => [i.id, 5]));
  assert.equal(pontuarTesteDirigido(t.codigo, tudo5).geral, 50, `${t.codigo}: concordar com tudo deve dar 50 (metade invertida).`);
  assert.ok(testeDirigidoCompleto(t.codigo, melhor), `${t.codigo}: completo com 12 respostas.`);
  assert.ok(!testeDirigidoCompleto(t.codigo, { [t.itens[0].id]: 3 }), `${t.codigo}: incompleto com 1 resposta.`);
}

// ── Motor de abordagem ───────────────────────────────────────────────────────
const base = { scores: { D: 50, I: 50, S: 50, C: 50 }, pqScore: 70, saboteurScores: null };

// R2: PQ baixo vence tudo.
let s = sugerirAbordagem({ ...base, pqScore: 55, saboteurScores: { pleaser: 90 } });
assert.equal(s.modulo.codigo, 'TD-PQ-BASE'); assert.equal(s.regraId, 'R2-PQ-BAIXO');

// R3: sabotador mais intenso decide; alternativa é o segundo.
s = sugerirAbordagem({ ...base, saboteurScores: { pleaser: 70, controller: 80, judge: 40 } });
assert.equal(s.modulo.codigo, 'TD-DELEGACAO'); assert.equal(s.regraId, 'R3-SAB-CONTROLLER');
assert.equal(s.alternativas[0]?.codigo, 'TD-ASSERTIVIDADE');

// R6: rotação — já aplicou o primeiro → passa ao segundo, com regra composta.
s = sugerirAbordagem({ ...base, saboteurScores: { pleaser: 70, controller: 80 } }, { jaAplicados: ['TD-DELEGACAO'] });
assert.equal(s.modulo.codigo, 'TD-ASSERTIVIDADE'); assert.ok(s.regraId.endsWith('+R6-ROTACAO'));

// R4: só DISC (perfil antigo).
s = sugerirAbordagem({ scores: { D: 30, I: 60, S: 60, C: 50 } });
assert.equal(s.modulo.codigo, 'TD-DECISAO'); assert.equal(s.regraId, 'R4-DISC');

// R5: nada disparou.
s = sugerirAbordagem({ scores: { D: 55, I: 55, S: 55, C: 55 }, saboteurScores: { judge: 40 } });
assert.equal(s.regraId, 'R5-PADRAO');

// R1: aquiescência marca alerta sem mudar a regra.
s = sugerirAbordagem({ scores: { D: 50, I: 85, S: 80, C: 75 }, pqScore: 65, saboteurScores: { stickler: 72, pleaser: 68 } });
assert.ok(s.alertas.includes('aquiescencia')); assert.equal(s.modulo.codigo, 'TD-DELEGACAO');

// Formato do Relatório Oficial (dominante/influente/…) é aceito.
s = sugerirAbordagem({ dominante: 80, influente: 40, estavel: 40, analitico: 40 });
assert.equal(s.modulo.codigo, 'TD-DELEGACAO');

// Sem dados → null.
assert.equal(sugerirAbordagem({}), null);

// Toda sugestão aponta para um teste do catálogo, com versão e regra.
for (const perfil of [base, { ...base, saboteurScores: { hyperVigilant: 70 } }, { ...base, saboteurScores: { victim: 66, restless: 66 } }]) {
  const r = sugerirAbordagem(perfil);
  assert.ok(TESTES_POR_CODIGO[r.modulo.codigo], `Sugestão aponta para teste inexistente: ${r.modulo.codigo}`);
  assert.ok(r.versao >= 1 && r.regraId, 'Sugestão sem versão/regra.');
  assert.ok(r.alternativas.every((a) => TESTES_POR_CODIGO[a.codigo]), 'Alternativa inexistente.');
}

// Turma: k-anonimato.
const turma = Array.from({ length: 6 }, (_, i) => ({ ...base, saboteurScores: { pleaser: 70 + i } }));
assert.equal(sugerirAbordagemTurma(turma.slice(0, 4), 5).suppressed, true);
const agg = sugerirAbordagemTurma(turma, 5);
assert.equal(agg.suppressed, false); assert.equal(agg.modulo.codigo, 'TD-ASSERTIVIDADE'); assert.equal(agg.distribuicao[0].pct, 100);

assert.ok(LIMIARES.sabotadorAlto > 0 && LIMIARES.pqBaixo > 0);

// Espelho do catálogo no Edge (Deno) é GERADO a partir do JS — falha se estiver desatualizado.
const gen = spawnSync(process.execPath, [fileURLToPath(new URL('./gen-testes-dirigidos-edge.mjs', import.meta.url)), '--check'], { stdio: 'inherit' });
assert.equal(gen.status, 0, 'supabase/functions/_shared/testesDirigidos.ts desatualizado — rode node scripts/gen-testes-dirigidos-edge.mjs');

console.log(`Contrato dos Testes Dirigidos validado: ${TESTES_DIRIGIDOS.length} testes × 12 itens + motor de abordagem (v${s.versao}).`);
