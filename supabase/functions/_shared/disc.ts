// Espelho server-side do motor canônico src/lib/discScoring.js.
// Todas as 28 questões são Likert 1-5; mantenha este contrato coberto por
// scripts/verify-scoring-contract.mjs.
type Dimension = 'D' | 'I' | 'S' | 'C';
type Question = { id: string; dimension: Dimension; weight: number };

const QUESTIONS: Question[] = [
  { id: 'q_d_01', dimension: 'D', weight: 1.0 }, { id: 'q_d_02', dimension: 'D', weight: 1.0 },
  { id: 'q_d_03', dimension: 'D', weight: 1.2 }, { id: 'q_d_04', dimension: 'D', weight: 1.1 },
  { id: 'q_d_05', dimension: 'D', weight: 1.5 }, { id: 'q_d_06', dimension: 'D', weight: 1.5 },
  { id: 'q_i_01', dimension: 'I', weight: 1.0 }, { id: 'q_i_02', dimension: 'I', weight: 1.0 },
  { id: 'q_i_03', dimension: 'I', weight: 1.2 }, { id: 'q_i_04', dimension: 'I', weight: 1.1 },
  { id: 'q_i_05', dimension: 'I', weight: 1.5 }, { id: 'q_i_06', dimension: 'I', weight: 1.5 },
  { id: 'q_s_01', dimension: 'S', weight: 1.0 }, { id: 'q_s_02', dimension: 'S', weight: 1.0 },
  { id: 'q_s_03', dimension: 'S', weight: 1.2 }, { id: 'q_s_04', dimension: 'S', weight: 1.1 },
  { id: 'q_s_05', dimension: 'S', weight: 1.5 }, { id: 'q_s_06', dimension: 'S', weight: 1.5 },
  { id: 'q_c_01', dimension: 'C', weight: 1.0 }, { id: 'q_c_02', dimension: 'C', weight: 1.0 },
  { id: 'q_c_03', dimension: 'C', weight: 1.2 }, { id: 'q_c_04', dimension: 'C', weight: 1.1 },
  { id: 'q_c_05', dimension: 'C', weight: 1.5 }, { id: 'q_c_06', dimension: 'C', weight: 1.5 },
  { id: 'q_d_07', dimension: 'D', weight: 1.1 }, { id: 'q_i_07', dimension: 'I', weight: 1.1 },
  { id: 'q_s_07', dimension: 'S', weight: 1.1 }, { id: 'q_c_07', dimension: 'C', weight: 1.1 },
];

const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));

export function calcularPerfil(respostas: Record<string, number>) {
  const acumulado: Record<Dimension, number> = { D: 0, I: 0, S: 0, C: 0 };
  const pesosTotal: Record<Dimension, number> = { D: 0, I: 0, S: 0, C: 0 };

  for (const [questionId, valor] of Object.entries(respostas || {})) {
    const q = QUESTION_MAP.get(questionId);
    if (!q) continue;
    const normalizado = Math.max(0, Math.min(1, (Number(valor) - 1) / 4));
    acumulado[q.dimension] += normalizado * q.weight;
    pesosTotal[q.dimension] += q.weight;
  }

  const scores = Object.fromEntries((['D', 'I', 'S', 'C'] as Dimension[]).map((dimension) => [
    dimension,
    pesosTotal[dimension] > 0 ? Math.round((acumulado[dimension] / pesosTotal[dimension]) * 100) : 0,
  ])) as Record<Dimension, number>;
  const ordenado = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const perfilPrimario = ordenado[0]?.[0] || 'D';
  const perfilSecundario = ordenado[1] && ordenado[1][1] >= ordenado[0][1] * 0.8 ? ordenado[1][0] : undefined;

  return {
    dominante: scores.D,
    influente: scores.I,
    estavel: scores.S,
    analitico: scores.C,
    perfilPrimario,
    perfilSecundario,
  };
}
