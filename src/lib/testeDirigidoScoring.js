// Scoring genérico dos Testes Dirigidos (src/constants/testesDirigidos.js).
// Determinístico, sem IA. Mesma ideia do motor DISC canônico (discScoring.js):
// (valor − 1) / 4 × peso, média ponderada por subescala × 100 — com a diferença
// de que itens `invertido: true` entram como 6 − valor.
//
// Este arquivo é a referência: quando o teste for pontuado no servidor
// (Edge, fluxo público), a implementação de lá deve espelhar exatamente isto
// e o contrato scripts/verify-testes-dirigidos-contract.mjs deve travar os dois.

import { getTesteDirigido } from '../constants/testesDirigidos.js';

const clamp15 = (v) => Math.min(5, Math.max(1, Math.round(Number(v) || 0)));

/**
 * @param {string} codigo  ex.: 'TD-ASSERTIVIDADE'
 * @param {Record<string, number>} respostas  { itemId: 1..5 }
 * @returns {{ codigo, versao, subescalas: Record<string, number>, geral: number, respondidos: number, total: number, faltantes: string[] } | null}
 */
export function pontuarTesteDirigido(codigo, respostas = {}) {
  const teste = getTesteDirigido(codigo);
  if (!teste) return null;

  const acumulado = {};   // subescala → { soma, peso }
  const faltantes = [];
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

  const subescalas = {};
  for (const key of Object.keys(teste.subescalas)) {
    const acc = acumulado[key];
    subescalas[key] = acc && acc.peso > 0 ? Math.round((acc.soma / acc.peso) * 100) : null;
  }
  const validas = Object.values(subescalas).filter((v) => v != null);
  const geral = validas.length ? Math.round(validas.reduce((a, b) => a + b, 0) / validas.length) : null;

  return {
    codigo,
    versao: teste.versao,
    subescalas,
    geral,
    respondidos,
    total: teste.itens.length,
    faltantes,
  };
}

/** Completude mínima para aceitar o envio: todos os itens (12) — o teste é curto. */
export function testeDirigidoCompleto(codigo, respostas = {}) {
  const r = pontuarTesteDirigido(codigo, respostas);
  return !!r && r.faltantes.length === 0;
}
