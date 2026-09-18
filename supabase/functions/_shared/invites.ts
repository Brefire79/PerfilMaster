/**
 * Convite com vagas (DELTA 22) — helpers compartilhados por consumeInvite
 * (conta) e consumeInviteAvulso (sem e-mail).
 *
 * A vaga é tomada pelo RPC invite_consume_seat (UPDATE condicional atômico).
 * Se ele devolver NULL, `motivoRecusa` explica por quê olhando o convite.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type MotivoRecusa = 'not_found' | 'used' | 'expired' | 'paused' | 'closed' | 'full';

export const MENSAGEM_RECUSA: Record<MotivoRecusa, string> = {
  not_found: 'Convite não encontrado. Confira o link recebido.',
  used: 'Convite já utilizado.',
  expired: 'Convite expirado. Peça um novo a quem enviou o link.',
  paused: 'Este convite está pausado. Fale com quem enviou o link.',
  closed: 'Este convite foi encerrado.',
  full: 'As vagas deste convite se esgotaram. Fale com quem enviou o link.',
};

export const STATUS_HTTP: Record<MotivoRecusa, number> = {
  not_found: 404, used: 409, expired: 410, paused: 409, closed: 410, full: 409,
};

/** Por que um convite não pode ser usado agora (null = pode). */
export function motivoRecusa(invite: Record<string, any> | null): MotivoRecusa | null {
  if (!invite) return 'not_found';
  if (invite.used) return 'used';
  if (invite.status === 'pausado') return 'paused';
  if (invite.status === 'encerrado') return 'closed';
  if (invite.expiresat && new Date(invite.expiresat).getTime() < Date.now()) return 'expired';
  if (invite.maxuses != null && Number(invite.usecount || 0) >= Number(invite.maxuses)) return 'full';
  return null;
}

export function vagasRestantes(invite: Record<string, any>): number | null {
  if (invite.maxuses == null) return null;
  return Math.max(0, Number(invite.maxuses) - Number(invite.usecount || 0));
}

/** Convite multiuso com vagas = convite de grupo sem e-mail pessoal e sem role admin. */
export function temVagas(invite: Record<string, any>): boolean {
  return !!invite.groupid && !invite.email && invite.role !== 'admin';
}

/**
 * Toma uma vaga. Devolve o convite atualizado ou o motivo da recusa.
 * Se `uid` já gastou vaga neste convite (reentrada), não desconta de novo.
 */
export async function tomarVaga(
  sb: SupabaseClient,
  token: string,
  opts: { uid?: string | null } = {},
): Promise<{ invite: Record<string, any> | null; motivo: MotivoRecusa | null; reentrada: boolean }> {
  const { data: atual } = await sb.from('app_invites').select('*').eq('token', token).maybeSingle();
  if (!atual) return { invite: null, motivo: 'not_found', reentrada: false };

  if (opts.uid) {
    const { data: ja } = await sb
      .from('app_invite_uses')
      .select('id')
      .eq('inviteid', atual.id)
      .eq('uid', opts.uid)
      .maybeSingle();
    if (ja) return { invite: atual, motivo: null, reentrada: true };
  }

  const { data: tomado, error } = await sb.rpc('invite_consume_seat', { p_token: token });
  if (error) {
    // RPC ausente (migration DELTA 22 não rodou) → comportamento antigo: sem limite.
    console.warn('[invites] invite_consume_seat indisponível — seguindo sem contador:', error.message);
    return { invite: atual, motivo: motivoRecusa(atual), reentrada: false };
  }
  // RETURNS composite: PostgREST devolve objeto; sem vaga vem com campos nulos.
  const row = tomado && typeof tomado === 'object' && (tomado as any).token ? (tomado as Record<string, any>) : null;
  if (!row) return { invite: atual, motivo: motivoRecusa(atual) ?? 'full', reentrada: false };
  return { invite: row, motivo: null, reentrada: false };
}

export async function devolverVaga(sb: SupabaseClient, token: string): Promise<void> {
  const { error } = await sb.rpc('invite_release_seat', { p_token: token });
  if (error) console.warn('[invites] invite_release_seat falhou:', error.message);
}

/** Registra quem gastou a vaga (lista "quem entrou" da aba Convite). Best-effort. */
export async function registrarUso(
  sb: SupabaseClient,
  invite: Record<string, any>,
  uso: {
    kind: 'conta' | 'avulso';
    uid?: string | null;
    avaliadoToken?: string | null;
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
  },
): Promise<void> {
  if (!invite?.id || !invite?.adminuid) return;
  const { error } = await sb.from('app_invite_uses').insert({
    inviteid: invite.id,
    token: invite.token,
    adminuid: invite.adminuid,
    groupid: invite.groupid || null,
    kind: uso.kind,
    uid: uso.uid || null,
    avaliadotoken: uso.avaliadoToken || null,
    nome: uso.nome ? String(uso.nome).slice(0, 120) : null,
    email: uso.email ? String(uso.email).slice(0, 160).toLowerCase() : null,
    telefone: uso.telefone ? String(uso.telefone).slice(0, 20) : null,
  });
  // 23505 = reentrada da mesma conta (índice único) — não é erro de negócio.
  if (error && error.code !== '23505') console.warn('[invites] registrarUso falhou:', error.message);
}
