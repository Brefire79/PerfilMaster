/**
 * ProfileAI — AMB FUSI | "Damos vida à inovação"
 * types.ts — Interfaces TypeScript completas do Assessment Engine
 * Frameworks: Positive Intelligence (Sabotadores) + DISC
 * Versão: 1.0 | Abril 2026
 */

// ============================================================
// ENUMS E TIPOS PRIMITIVOS
// ============================================================

/** Tipo de assessment que pode ser executado */
export type AssessmentType = 'disc' | 'saboteurs' | 'full';

/** Código dos 4 perfis DISC (nomenclatura PT-BR: Dominante, Influente, Estável, Analítico) */
export type DISCProfileCode = 'D' | 'I' | 'S' | 'C';

/** 12 subtipos DISC (combinação primário + secundário) */
export type DISCSubtype =
  | 'DC' | 'D' | 'Di'
  | 'iD' | 'i' | 'iS'
  | 'Si' | 'S' | 'SC'
  | 'CS' | 'C' | 'CD';

/** Código dos 10 sabotadores */
export type SaboteurCode =
  | 'judge'           // Juiz
  | 'stickler'        // Insistente
  | 'pleaser'         // Prestativo
  | 'hyperAchiever'   // Hiper-Realizador
  | 'victim'          // Vítima
  | 'hyperRational'   // Hiper-Racional
  | 'hyperVigilant'   // Hiper-Vigilante
  | 'restless'        // Inquieto
  | 'controller'      // Controlador
  | 'avoider';        // Esquivo

/** Tipo de sabotador no framework */
export type SaboteurType = 'mestre' | 'cumplice';

/** Faixas de intensidade dos sabotadores (escala 1–10) */
export type SaboteurIntensity = 'baixa' | 'moderada' | 'alta' | 'muito_alta';

/** Níveis de presença de um perfil DISC (escala 1–5) */
export type DISCLevel = 'baixo' | 'moderado' | 'alto' | 'dominante';

/** Escala Likert de 1 a 5 */
export type LikertScale = 1 | 2 | 3 | 4 | 5;

// ============================================================
// ENTIDADES DO BANCO DE DADOS
// ============================================================

/** Metadados de um sabotador (tabela: saboteur_types) */
export interface SaboteurTypeRecord {
  id: string;
  code: SaboteurCode;
  nome_pt: string;             // Ex: 'Juiz', 'Insistente'
  nome_en: string;             // Ex: 'Judge', 'Stickler'
  tipo: SaboteurType;
  descricao: string;
  caracteristicas: string[];
  pensamentos_tipicos: string;
  mentira_justificacao: string;
  impacto: string;
  funcao_sobrevivencia: string;
  cor_hex: string;
  created_at: string;
}

/** Metadados de um perfil DISC (tabela: disc_profiles) */
export interface DISCProfileRecord {
  id: string;
  code: DISCProfileCode;
  nome_pt: string;             // 'Dominante' | 'Influente' | 'Estável' | 'Analítico'
  nome_en: string;             // 'Dominance' | 'Influence' | 'Steadiness' | 'Conscientiousness'
  cor_hex: string;
  descricao: string;
  foco: string;
  ritmo: string;
  orientacao: string;
  medo_principal: string;
  pontos_fortes: string[];
  pontos_atencao: string[];
  motivacoes: string[];
  medos: string[];
  como_comunicar: string;
  sabotadores_correlatos: SaboteurCode[];
  created_at: string;
}

/** Subtipo DISC (tabela: disc_subtypes) */
export interface DISCSubtypeRecord {
  id: string;
  code: DISCSubtype;
  combinacao: string;
  caracteristica_principal: string;
  perfil_primario: DISCProfileCode;
  perfil_secundario: DISCProfileCode | null;   // null = perfil puro
  created_at: string;
}

/** Pergunta de assessment (tabela: assessment_questions) */
export interface AssessmentQuestion {
  id: string;
  assessment_type: AssessmentType;
  categoria: DISCProfileCode | SaboteurCode;
  texto: string;
  ordem_exibicao: number;
  escala_min: number;
  escala_max: number;
  escala_labels: Record<string, string>;
  ativo: boolean;
  created_at: string;
}

// ============================================================
// SCORES E RESULTADOS
// ============================================================

/** Scores brutos DISC (média das respostas Likert: 1.0–5.0) */
export interface DISCScores {
  dominante: number;   // Perfil D — #e74c3c
  influente: number;   // Perfil I — #f39c12
  estavel: number;     // Perfil S — #2ecc71
  analitico: number;   // Perfil C — #3498db
}

/** Scores dos sabotadores (escala normalizada: 1.0–10.0) */
export interface SaboteurScores {
  judge: number;           // Juiz
  stickler: number;        // Insistente
  pleaser: number;         // Prestativo
  hyperAchiever: number;   // Hiper-Realizador
  victim: number;          // Vítima
  hyperRational: number;   // Hiper-Racional
  hyperVigilant: number;   // Hiper-Vigilante
  restless: number;        // Inquieto
  controller: number;      // Controlador
  avoider: number;         // Esquivo
  pqScore: number;         // PQ Score (0–100)
}

/** Nomes PT-BR dos sabotadores para exibição */
export const SABOTEUR_NAMES_PT: Record<SaboteurCode, string> = {
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

/** Nomes PT-BR dos perfis DISC para exibição */
export const DISC_NAMES_PT: Record<DISCProfileCode, string> = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

/** Cores padrão dos perfis DISC */
export const DISC_COLORS: Record<DISCProfileCode, string> = {
  D: '#e74c3c',
  I: '#f39c12',
  S: '#2ecc71',
  C: '#3498db',
};

/** Resultado completo de um assessment (tabela: assessment_results) */
export interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_type: AssessmentType;
  respostas_brutas: Record<string, LikertScale>;

  // DISC
  score_dominante: number | null;
  score_influente: number | null;
  score_estavel: number | null;
  score_analitico: number | null;
  perfil_primario: DISCProfileCode | null;
  perfil_secundario: DISCProfileCode | null;
  subtipo_disc: DISCSubtype | null;

  // Sabotadores
  score_juiz: number | null;
  score_insistente: number | null;
  score_prestativo: number | null;
  score_hiper_realizador: number | null;
  score_vitima: number | null;
  score_hiper_racional: number | null;
  score_hiper_vigilante: number | null;
  score_inquieto: number | null;
  score_controlador: number | null;
  score_esquivo: number | null;
  pq_score: number | null;
  top_sabotadores: SaboteurCode[] | null;

  completed_at: string;
  proxima_avaliacao: string;
  created_at: string;
}

/** Relatório gerado pela IA (tabela: user_reports) */
export interface UserReport {
  id: string;
  user_id: string;
  assessment_result_id: string;
  resumo_perfil: string;
  impacto_sabotadores: string;
  recomendacoes: string[];        // 5 recomendações práticas
  focos_mentoria: string[];       // 3 focos prioritários
  pontos_fortes: string[];
  relatorio_completo: string;     // Markdown completo
  modelo_ia: string;
  tokens_usados: number | null;
  created_at: string;
}

// ============================================================
// REQUEST / RESPONSE DA API
// ============================================================

/** Payload enviado pelo frontend para calcular o assessment */
export interface CalculateAssessmentRequest {
  /** Respostas brutas: { question_uuid: valor_likert } */
  respostas: Record<string, LikertScale>;
  /** Tipo de assessment realizado */
  assessment_type: AssessmentType;
}

/** Resposta da Edge Function calculate-assessment */
export interface CalculateAssessmentResponse {
  success: boolean;
  assessment_result_id: string;
  disc: DISCScores & {
    perfil_primario: DISCProfileCode;
    perfil_secundario: DISCProfileCode;
    subtipo: DISCSubtype;
    nivel: Record<DISCProfileCode, DISCLevel>;
  };
  saboteurs: SaboteurScores & {
    top_sabotadores: SaboteurCode[];
    intensidade: Record<SaboteurCode, SaboteurIntensity>;
  };
  pq_score: number;
  proxima_avaliacao: string;
  error?: string;
}

/** Payload enviado para gerar o relatório de IA */
export interface GenerateReportRequest {
  assessment_result_id: string;
}

/** Resposta da Edge Function generate-report */
export interface GenerateReportResponse {
  success: boolean;
  report_id: string;
  resumo_perfil: string;
  impacto_sabotadores: string;
  recomendacoes: string[];
  focos_mentoria: string[];
  pontos_fortes: string[];
  relatorio_completo: string;
  tokens_usados: number;
  error?: string;
}

// ============================================================
// TIPOS DE ESTADO DO COMPONENTE (Frontend)
// ============================================================

/** Estado do wizard de assessment */
export interface AssessmentWizardState {
  /** Etapa atual: 'disc' | 'saboteurs' | 'completed' */
  etapa_atual: 'disc' | 'saboteurs' | 'completed';
  /** Índice da pergunta atual dentro da etapa */
  pergunta_atual: number;
  /** Respostas acumuladas */
  respostas: Record<string, LikertScale>;
  /** Se o usuário já completou o assessment e pode reavaliação */
  pode_reavaliar: boolean;
  /** Data da próxima avaliação permitida */
  proxima_avaliacao: string | null;
}

/** Item de sabotador ordenado por score para exibição no dashboard */
export interface SaboteurDisplayItem {
  code: SaboteurCode;
  nome_pt: string;
  score: number;         // 1.0–10.0
  intensidade: SaboteurIntensity;
  cor_hex: string;
  is_top3: boolean;
}

/** Dados para o gráfico radar do DISC */
export interface DISCRadarData {
  label: string;          // 'Dominante', 'Influente', etc.
  code: DISCProfileCode;
  score: number;          // 1.0–5.0
  cor: string;
  percentual: number;     // 0–100 para renderização SVG
}

// ============================================================
// HELPERS DE INTERPRETAÇÃO
// ============================================================

/** Retorna a intensidade do sabotador baseada no score 1–10 */
export function getSaboteurIntensity(score: number): SaboteurIntensity {
  if (score <= 3.0) return 'baixa';
  if (score <= 5.0) return 'moderada';
  if (score <= 7.0) return 'alta';
  return 'muito_alta';
}

/** Retorna o nível DISC baseado no score 1–5 */
export function getDISCLevel(score: number): DISCLevel {
  if (score <= 2.0) return 'baixo';
  if (score <= 3.0) return 'moderado';
  if (score <= 4.0) return 'alto';
  return 'dominante';
}

/** Calcula o PQ Score a partir dos scores brutos dos sabotadores (escala 1–5) */
export function calcularPQScore(scoresBrutos: Record<SaboteurCode, number>): number {
  const valores = Object.values(scoresBrutos).sort((a, b) => b - a);
  const top3 = valores.slice(0, 3);
  const mediaTop3 = top3.reduce((acc, v) => acc + v, 0) / 3;
  return Math.max(0, Math.min(100, Math.round(100 - mediaTop3 * 10)));
}

/** Normaliza score Likert 1–5 para escala 1–10 para exibição dos sabotadores */
export function normalizarScoreSabotador(mediaLikert: number): number {
  return Math.round(mediaLikert * 2 * 10) / 10;
}
