// Gera supabase/functions/_shared/testesDirigidos.ts a partir de
// src/constants/testesDirigidos.js — o catálogo tem UMA fonte (o JS) e o Edge
// recebe uma cópia gerada. `node scripts/gen-testes-dirigidos-edge.mjs` para
// regravar; `--check` (usado pelo contrato) só compara e falha se estiver
// desatualizado.
import { readFile, writeFile } from 'node:fs/promises';
import { TESTES_DIRIGIDOS } from '../src/constants/testesDirigidos.js';

const destino = new URL('../supabase/functions/_shared/testesDirigidos.ts', import.meta.url);

const catalogo = TESTES_DIRIGIDOS.map((t) => ({
  codigo: t.codigo,
  versao: t.versao,
  titulo: t.titulo,
  foco: t.foco,
  prazoDias: t.prazoDias,
  subescalas: t.subescalas,
  itens: t.itens.map((i) => ({ id: i.id, subescala: i.subescala, invertido: !!i.invertido, weight: i.weight ?? 1, texto: i.text.ptBR })),
}));

const conteudo = `// GERADO por scripts/gen-testes-dirigidos-edge.mjs a partir de
// src/constants/testesDirigidos.js — NÃO EDITE À MÃO. Rode o gerador.
// O contrato (verify-testes-dirigidos-contract.mjs) falha se este arquivo
// estiver desatualizado em relação ao JS.

export interface ItemTD { id: string; subescala: string; invertido: boolean; weight: number; texto: string }
export interface TesteDirigido {
  codigo: string; versao: number; titulo: string; foco: string; prazoDias: number;
  subescalas: Record<string, string>; itens: ItemTD[];
}

export const TESTES_DIRIGIDOS: TesteDirigido[] = ${JSON.stringify(catalogo, null, 2)};

export const TESTES_POR_CODIGO: Record<string, TesteDirigido> =
  Object.fromEntries(TESTES_DIRIGIDOS.map((t) => [t.codigo, t]));

const clamp15 = (v: unknown) => Math.min(5, Math.max(1, Math.round(Number(v) || 0)));

/** Espelho exato de src/lib/testeDirigidoScoring.js#pontuarTesteDirigido. */
export function pontuarTesteDirigido(codigo: string, respostas: Record<string, unknown> = {}) {
  const teste = TESTES_POR_CODIGO[codigo];
  if (!teste) return null;
  const acumulado: Record<string, { soma: number; peso: number }> = {};
  const faltantes: string[] = [];
  let respondidos = 0;
  for (const item of teste.itens) {
    const bruto = respostas?.[item.id];
    if (bruto == null || bruto === '') { faltantes.push(item.id); continue; }
    respondidos += 1;
    let valor = clamp15(bruto);
    if (item.invertido) valor = 6 - valor;
    const peso = Number(item.weight) || 1;
    const acc = (acumulado[item.subescala] ||= { soma: 0, peso: 0 });
    acc.soma += ((valor - 1) / 4) * peso;
    acc.peso += peso;
  }
  const subescalas: Record<string, number | null> = {};
  for (const key of Object.keys(teste.subescalas)) {
    const acc = acumulado[key];
    subescalas[key] = acc && acc.peso > 0 ? Math.round((acc.soma / acc.peso) * 100) : null;
  }
  const validas = Object.values(subescalas).filter((v): v is number => v != null);
  const geral = validas.length ? Math.round(validas.reduce((a, b) => a + b, 0) / validas.length) : null;
  return { codigo, versao: teste.versao, subescalas, geral, respondidos, total: teste.itens.length, faltantes };
}

/** Só aceita o envio completo (12 itens) com valores 1..5 — descarta chaves desconhecidas. */
export function sanitizarRespostas(codigo: string, bruto: unknown): Record<string, number> | null {
  const teste = TESTES_POR_CODIGO[codigo];
  if (!teste || !bruto || typeof bruto !== 'object') return null;
  const ids = new Set(teste.itens.map((i) => i.id));
  const limpo: Record<string, number> = {};
  for (const [k, v] of Object.entries(bruto as Record<string, unknown>)) {
    if (!ids.has(k)) continue;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 1 || n > 5) continue;
    limpo[k] = n;
  }
  return Object.keys(limpo).length === ids.size ? limpo : null;
}
`;

if (process.argv.includes('--check')) {
  let atual = '';
  try { atual = await readFile(destino, 'utf8'); } catch { /* não existe */ }
  if (atual.replace(/\r\n/g, '\n') !== conteudo) {
    console.error('supabase/functions/_shared/testesDirigidos.ts está desatualizado — rode: node scripts/gen-testes-dirigidos-edge.mjs');
    process.exit(1);
  }
} else {
  await writeFile(destino, conteudo, 'utf8');
  console.log('Gerado supabase/functions/_shared/testesDirigidos.ts');
}
