// ============================================================================
// Cálculo de Sabotadores + PQ Score a partir das 50 questões q_sab_* (likert 1-5).
// Usado pelo AssessmentWizard (conta de aluno) para PERSISTIR pq_score e os
// scores numéricos dos 10 sabotadores em app_profiles — destravando o Módulo 3.
//
// PQ Score (fórmula oficial do projeto, sincronizada com localEngine.js):
//   PQ Score = 100 - (média dos top-3 scores brutos [1-5] × 10)
// ============================================================================

// dimension (sampleQuestions) → chave canônica (localEngine.js)
export const SAB_DIMENSION_TO_KEY = {
  SAB_JUDGE: 'judge',
  SAB_CONTROLLER: 'controller',
  SAB_HYPER_ACHIEVER: 'hyperAchiever',
  SAB_RESTLESS: 'restless',
  SAB_PLEASER: 'pleaser',
  SAB_AVOIDER: 'avoider',
  SAB_VICTIM: 'victim',
  SAB_STICKLER: 'stickler',
  SAB_HYPER_RATIONAL: 'hyperRational',
  SAB_HYPER_VIGILANT: 'hyperVigilant',
};

// Rótulos PT-BR (espelham SABOTADORES_DATA em localEngine.js)
export const SABOTEUR_LABELS = {
  judge: 'Juiz',
  stickler: 'Insistente',
  pleaser: 'Prestativo',
  hyperAchiever: 'Hiper-Realizador',
  victim: 'Vítima',
  hyperRational: 'Hiper-Racional',
  hyperVigilant: 'Hiper-Vigilante',
  restless: 'Inquieto',
  controller: 'Controlador',
  avoider: 'Esquivo',
};

export const SABOTEUR_KEYS = Object.values(SAB_DIMENSION_TO_KEY);

/**
 * computeSaboteurs — calcula scores brutos (1-5), normalizados (0-100), top-3 e PQ.
 * @param {Record<string, number>} respostas - mapa idQuestao → valor (1-5)
 * @param {Array} perguntasSaboteurs - as 50 questões q_sab_* (com `dimension`)
 * @returns {{ raw: object, scores: object, top3: string[], pqScore: number }|null}
 */
export function computeSaboteurs(respostas, perguntasSaboteurs = []) {
  const acc = {}; // key → array de respostas
  for (const q of perguntasSaboteurs) {
    const key = SAB_DIMENSION_TO_KEY[q?.dimension];
    if (!key) continue;
    const v = respostas?.[q.id];
    if (v != null && !Number.isNaN(Number(v))) {
      (acc[key] ||= []).push(Number(v));
    }
  }

  const keysComResposta = Object.keys(acc);
  if (keysComResposta.length === 0) return null;

  const raw = {};    // 1-5 (bruto, para o PQ)
  const scores = {}; // 0-100 (para visualização/agregação)
  for (const key of SABOTEUR_KEYS) {
    const arr = acc[key];
    if (!arr || arr.length === 0) {
      raw[key] = 0;
      scores[key] = 0;
    } else {
      const media = arr.reduce((s, v) => s + v, 0) / arr.length;
      raw[key] = Math.round(media * 100) / 100;            // 2 casas
      scores[key] = Math.round((media / 5) * 100);          // 0-100
    }
  }

  // Top-3 pela intensidade bruta
  const top3 = Object.entries(raw)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const top3Avg = top3.reduce((s, k) => s + (raw[k] || 0), 0) / (top3.length || 1);
  const pqScore = Math.max(0, Math.min(100, Math.round(100 - top3Avg * 10)));

  return { raw, scores, top3, pqScore };
}
