import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SAMPLE_QUESTIONS } from '../src/constants/sampleQuestions.js';
import { calcularPerfilDisc } from '../src/lib/discScoring.js';
import { computeSaboteurs } from '../src/lib/saboteurScoring.js';

const disc = SAMPLE_QUESTIONS.filter((q) => ['D', 'I', 'S', 'C'].includes(q.dimension));
const sabotadores = SAMPLE_QUESTIONS.filter((q) => String(q.dimension).startsWith('SAB_'));
assert.equal(SAMPLE_QUESTIONS.length, 78, 'O questionário completo deve ter 78 questões.');
assert.equal(disc.length, 28, 'O bloco DISC deve ter 28 questões.');
assert.equal(sabotadores.length, 50, 'O bloco de Sabotadores deve ter 50 questões.');
assert.equal(new Set(SAMPLE_QUESTIONS.map((q) => q.id)).size, 78, 'IDs de questões devem ser únicos.');
assert.ok(disc.every((q) => q.type === 'likert5'), 'Todas as questões DISC devem ser Likert 1-5.');

const allMin = Object.fromEntries(SAMPLE_QUESTIONS.map((q) => [q.id, 1]));
const allMax = Object.fromEntries(SAMPLE_QUESTIONS.map((q) => [q.id, 5]));
assert.deepEqual(calcularPerfilDisc(allMin).scores, { D: 0, I: 0, S: 0, C: 0 });
assert.deepEqual(calcularPerfilDisc(allMax).scores, { D: 100, I: 100, S: 100, C: 100 });
assert.equal(computeSaboteurs(allMin, sabotadores)?.pqScore, 90);
assert.equal(computeSaboteurs(allMax, sabotadores)?.pqScore, 50);

const edgeSource = await readFile(new URL('../supabase/functions/atualizarStatus/index.ts', import.meta.url), 'utf8');
const sharedSource = await readFile(new URL('../supabase/functions/_shared/disc.ts', import.meta.url), 'utf8');
for (const question of disc) {
  const expected = `id: '${question.id}'`;
  assert.ok(edgeSource.includes(expected), `${question.id} ausente em atualizarStatus.`);
  assert.ok(sharedSource.includes(expected), `${question.id} ausente em _shared/disc.ts.`);
  const edgePattern = new RegExp(`id: '${question.id}'[^}]+type: 'likert5'[^}]+weight: ${question.weight}`);
  assert.ok(edgePattern.test(edgeSource), `${question.id} diverge no motor público.`);
  const sharedPattern = new RegExp(`id: '${question.id}'[^}]+weight: ${question.weight}`);
  assert.ok(sharedPattern.test(sharedSource), `${question.id} diverge no motor compartilhado.`);
}

console.log('Contrato de scoring validado: 28 DISC + 50 Sabotadores.');
