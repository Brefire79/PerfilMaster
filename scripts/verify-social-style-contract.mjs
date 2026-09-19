// Contrato do Social Style (lente derivada do DISC, Fase 4 — 19/09/2026).
import assert from 'node:assert/strict';
import { derivarSocialStyle, ESTILOS, ZONA_CENTRAL } from '../src/lib/socialStyle.js';

const q = (D, I, S, C) => derivarSocialStyle({ D, I, S, C });

// Quadrantes puros
assert.equal(q(90, 20, 20, 20).estilo, 'condutor');
assert.equal(q(20, 90, 20, 20).estilo, 'expressivo');
assert.equal(q(20, 20, 90, 20).estilo, 'amigavel');
assert.equal(q(20, 20, 20, 90).estilo, 'analitico');

// Eixos e faixas
const c = q(100, 100, 0, 0);
assert.equal(c.assertividade, 100); assert.equal(c.responsividade, 0);
const a = q(0, 0, 100, 100);
assert.equal(a.assertividade, -100);
for (const r of [q(0, 100, 100, 0), q(100, 0, 0, 100)]) assert.ok(r.responsividade === 100 || r.responsividade === -100);

// Zona central: perfil plano avisa os dois eixos e não força rótulo forte.
const plano = q(60, 60, 60, 60);
assert.deepEqual(plano.zonaCentral, ['assertividade', 'responsividade']);
assert.ok(plano.secundario);
// Aquiescência (I 85 · S 80 · C 75 · D 50): assertividade −10 (borda → zona central), responsividade +20.
const aq = q(50, 85, 80, 75);
assert.equal(aq.assertividade, -10); assert.equal(aq.responsividade, 20);
assert.equal(aq.estilo, 'amigavel'); assert.deepEqual(aq.zonaCentral, ['assertividade']); assert.equal(aq.secundario, 'expressivo');

// Formatos aceitos
assert.equal(derivarSocialStyle({ scores: { D: 90, I: 20, S: 20, C: 20 } }).estilo, 'condutor');
assert.equal(derivarSocialStyle({ dominante: 20, influente: 20, estavel: 90, analitico: 20 }).estilo, 'amigavel');
assert.equal(derivarSocialStyle({ D: 0, I: 0, S: 0, C: 0 }), null);
assert.equal(derivarSocialStyle(null), null);

// Textos completos para os 4 estilos
for (const k of Object.keys(ESTILOS)) {
  for (const f of ['nome', 'resumo', 'comoTratar', 'tensao', 'cor']) assert.ok(ESTILOS[k][f], `${k}.${f}`);
}
assert.ok(ZONA_CENTRAL > 0);

console.log('Contrato do Social Style validado: 4 quadrantes, eixos ±100, zona central.');
