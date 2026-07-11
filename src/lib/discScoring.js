// ============================================================================
// discScoring.js — Motor CANÔNICO de cálculo DISC (fonte única no frontend).
//
// Fórmula (a mesma do Edge atualizarStatus/index.ts — mudou lá, mude aqui):
//   normalizado = (valor − 1) / 4        (likert 1-5 → 0..1)
//   score(dim)  = Σ(normalizado × peso) / Σ(pesos) × 100   (0-100)
//
// Antes da auditoria de 07/07/2026 o AssessmentWizard usava média simples
// (média/5 × 100, sem pesos) enquanto o fluxo público usava esta fórmula —
// a mesma pessoa recebia scores diferentes conforme o fluxo. Perfis antigos
// de conta (calculados pela média simples) NÃO são recalculados; apenas as
// avaliações novas passam a usar a fórmula canônica.
// ============================================================================

import { SAMPLE_QUESTIONS } from '../constants/sampleQuestions.js';

const PROFILE_NAMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

// Mapa id → peso das 28 questões DISC (a partir da fonte única de questões).
const DISC_QUESTION_MAP = new Map(
  SAMPLE_QUESTIONS
    .filter((q) => ['D', 'I', 'S', 'C'].includes(q.dimension))
    .map((q) => [q.id, { dimension: q.dimension, weight: q.weight ?? 1.0 }])
);

/**
 * calcularPerfilDisc — calcula os scores DISC (0-100) com pesos por questão.
 * @param {Record<string, number>} respostas - mapa idQuestao → valor likert (1-5)
 * @returns {{ scores: object, dominantProfile: string, dominantProfileName: string,
 *             secondaryProfile: string, secondaryProfileName: string }}
 */
export function calcularPerfilDisc(respostas) {
  const acumulado = { D: 0, I: 0, S: 0, C: 0 };
  const pesosTotal = { D: 0, I: 0, S: 0, C: 0 };

  for (const [questionId, valor] of Object.entries(respostas || {})) {
    const q = DISC_QUESTION_MAP.get(questionId);
    if (!q) continue;
    const normalizado = Math.max(0, Math.min(1, (Number(valor) - 1) / 4));
    acumulado[q.dimension] += normalizado * q.weight;
    pesosTotal[q.dimension] += q.weight;
  }

  const scores = {};
  for (const dim of ['D', 'I', 'S', 'C']) {
    scores[dim] = pesosTotal[dim] > 0
      ? Math.round((acumulado[dim] / pesosTotal[dim]) * 100)
      : 0;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [dominant, secondary] = sorted;
  return {
    scores,
    dominantProfile: dominant[0],
    dominantProfileName: PROFILE_NAMES[dominant[0]],
    secondaryProfile: secondary[0],
    secondaryProfileName: PROFILE_NAMES[secondary[0]],
  };
}

export { PROFILE_NAMES };
