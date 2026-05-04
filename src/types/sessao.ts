type TimestampLike = string | Date | { toDate?: () => Date };

// ─── Coleção: sessoes ──────────────────────────────────────────────────────────
// Sessão de avaliação criada pelo admin para um grupo ou avulsa
export interface Sessao {
  id: string;
  adminUid: string;
  groupId?: string;
  titulo: string;
  descricao?: string;
  status: SessaoStatus;
  criadaEm: TimestampLike;
  atualizadaEm: TimestampLike;
}

export type SessaoStatus = 'ativa' | 'encerrada';

// ─── Coleção: avaliados ────────────────────────────────────────────────────────
// Pessoa cadastrada pelo admin para responder uma avaliação via WhatsApp
// O ID do documento é o próprio token (UUID) para lookup O(1) sem auth
export interface Avaliado {
  id: string;           // = token
  sessaoId: string;
  adminUid: string;
  nome: string;
  telefone: string;     // ex: "5511999999999" (com DDI)
  email?: string;
  token: string;        // UUID, espelhado aqui por clareza
  status: AvaliadoStatus;
  respostas?: Record<string, number>; // questionId → valor selecionado
  perfil?: PerfilResultado;
  criadoEm: TimestampLike;
  iniciadoEm?: TimestampLike;
  concluidoEm?: TimestampLike;
  atualizadoEm: TimestampLike;
}

export type AvaliadoStatus = 'pendente' | 'em_andamento' | 'concluido';

// ─── Resultado de perfil DISC ──────────────────────────────────────────────────
export interface PerfilResultado {
  dominante: number;    // 0–100
  influente: number;
  estavel: number;
  analitico: number;
  perfilPrimario: DimensaoDisc;
  perfilSecundario?: DimensaoDisc;
}

export type DimensaoDisc = 'D' | 'I' | 'S' | 'C';

// ─── Coleção: sessao_respostas (registros imutáveis de submissão) ──────────────
export interface SessaoResposta {
  id: string;
  avaliadoId: string;
  sessaoId: string;
  respostas: Record<string, number>;
  submissaoEm: TimestampLike;
}

// ─── Input do Cloud Function atualizarStatus ──────────────────────────────────
export interface AtualizarStatusInput {
  token: string;
  novoStatus: AvaliadoStatus;
  respostas?: Record<string, number>;
}

// ─── Resposta do Cloud Function buscarPorToken ────────────────────────────────
export interface BuscarPorTokenOutput {
  nome: string;
  status: AvaliadoStatus;
  sessaoTitulo: string;
  sessaoDescricao?: string;
}
