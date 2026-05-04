type Question = { id: string; dimension: 'D' | 'I' | 'S' | 'C'; type: 'likert5' | 'forced_choice' | 'scenario'; weight: number };

const QUESTIONS: Question[] = [
  { id: 'q_d_01', dimension: 'D', type: 'likert5', weight: 1.0 }, { id: 'q_d_02', dimension: 'D', type: 'likert5', weight: 1.0 },
  { id: 'q_d_03', dimension: 'D', type: 'forced_choice', weight: 1.2 }, { id: 'q_d_04', dimension: 'D', type: 'likert5', weight: 1.1 },
  { id: 'q_d_05', dimension: 'D', type: 'scenario', weight: 1.5 }, { id: 'q_d_06', dimension: 'D', type: 'likert5', weight: 1.5 },
  { id: 'q_i_01', dimension: 'I', type: 'likert5', weight: 1.0 }, { id: 'q_i_02', dimension: 'I', type: 'likert5', weight: 1.0 },
  { id: 'q_i_03', dimension: 'I', type: 'forced_choice', weight: 1.2 }, { id: 'q_i_04', dimension: 'I', type: 'likert5', weight: 1.1 },
  { id: 'q_i_05', dimension: 'I', type: 'scenario', weight: 1.5 }, { id: 'q_i_06', dimension: 'I', type: 'likert5', weight: 1.5 },
  { id: 'q_s_01', dimension: 'S', type: 'likert5', weight: 1.0 }, { id: 'q_s_02', dimension: 'S', type: 'likert5', weight: 1.0 },
  { id: 'q_s_03', dimension: 'S', type: 'forced_choice', weight: 1.2 }, { id: 'q_s_04', dimension: 'S', type: 'likert5', weight: 1.1 },
  { id: 'q_s_05', dimension: 'S', type: 'scenario', weight: 1.5 }, { id: 'q_s_06', dimension: 'S', type: 'likert5', weight: 1.5 },
  { id: 'q_c_01', dimension: 'C', type: 'likert5', weight: 1.0 }, { id: 'q_c_02', dimension: 'C', type: 'likert5', weight: 1.0 },
  { id: 'q_c_03', dimension: 'C', type: 'forced_choice', weight: 1.2 }, { id: 'q_c_04', dimension: 'C', type: 'likert5', weight: 1.1 },
  { id: 'q_c_05', dimension: 'C', type: 'scenario', weight: 1.5 }, { id: 'q_c_06', dimension: 'C', type: 'likert5', weight: 1.5 },
];

const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));

export function calcularPerfil(respostas: Record<string, number>) {
  const acumulado = { D: 0, I: 0, S: 0, C: 0 };
  const pesosTotal = { D: 0, I: 0, S: 0, C: 0 };

  for (const [questionId, valor] of Object.entries(respostas || {})) {
    const q = QUESTION_MAP.get(questionId);
    if (!q) continue;
    const range = q.type === 'likert5' ? 4 : 3;
    const normalizado = Math.max(0, Math.min(1, (Number(valor) - 1) / range));
    acumulado[q.dimension] += normalizado * q.weight;
    pesosTotal[q.dimension] += q.weight;
  }

  const scores = {
    D: pesosTotal.D > 0 ? Math.round((acumulado.D / pesosTotal.D) * 100) : 0,
    I: pesosTotal.I > 0 ? Math.round((acumulado.I / pesosTotal.I) * 100) : 0,
    S: pesosTotal.S > 0 ? Math.round((acumulado.S / pesosTotal.S) * 100) : 0,
    C: pesosTotal.C > 0 ? Math.round((acumulado.C / pesosTotal.C) * 100) : 0,
  };

  const ordenado = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const perfilPrimario = ordenado[0]?.[0] || 'D';
  const perfilSecundario = ordenado[1] && ordenado[1][1] >= Number(ordenado[0][1]) * 0.8 ? ordenado[1][0] : undefined;

  return {
    dominante: scores.D,
    influente: scores.I,
    estavel: scores.S,
    analitico: scores.C,
    perfilPrimario,
    perfilSecundario,
  };
}
