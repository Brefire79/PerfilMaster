import { serviceClient } from './auth.ts';

/**
 * Evento de auditoria (DELTA 14). Gravação EXPLÍCITA e best-effort: nunca quebra
 * o fluxo principal. INSERT só acontece aqui (service_role) — a tabela audit_log
 * é append-only (sem UPDATE/DELETE para ninguém).
 *
 * adminuid = tenant (facilitador) dono do evento, usado para escopar a leitura.
 */
export interface AuditEvent {
  adminuid: string;
  action: string;            // ex.: 'assessment_completed', 'invite_created'
  actor_id?: string | null;  // uid de quem disparou (null = sistema/anon)
  actor_role?: string | null;// 'admin' | 'student' | 'anon' | 'system'
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(ev: AuditEvent): Promise<void> {
  if (!ev?.adminuid || !ev?.action) return;
  try {
    const sb = serviceClient();
    const { error } = await sb.from('audit_log').insert({
      adminuid: ev.adminuid,
      action: ev.action,
      actor_id: ev.actor_id ?? null,
      actor_role: ev.actor_role ?? null,
      target_type: ev.target_type ?? null,
      target_id: ev.target_id ?? null,
      metadata: ev.metadata ?? {},
    });
    if (error) console.error('[audit] insert falhou:', ev.action, error.message);
  } catch (e) {
    // Best-effort: auditoria nunca derruba o fluxo de negócio.
    console.error('[audit] exceção ao registrar', ev.action, e);
  }
}
