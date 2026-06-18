// logAudit — registra, na trilha de auditoria (DELTA 14), eventos originados no
// frontend do facilitador (ex.: admin abriu o histórico de um participante,
// relatório gerado/exportado). INSERT em audit_log só acontece via service_role.
//
// Segurança:
//   - exige JWT e role 'admin';
//   - adminuid do evento é SEMPRE o uid do caller (não vem do cliente) — um admin
//     só consegue gravar eventos no PRÓPRIO escopo/tenant;
//   - apenas ações de uma allowlist são aceitas (evita forja/spam de eventos).
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';
import { logAuditEvent } from '../_shared/audit.ts';

// Ações que o frontend do admin pode registrar.
const ACOES_PERMITIDAS = new Set([
  'admin_viewed_history',   // admin abriu o histórico de um participante
  'report_generated',       // relatório oficial gerado/visualizado
  'report_exported',        // relatório exportado (PDF)
]);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const { action, target_type, target_id, metadata } = await req.json();
    if (!action || !ACOES_PERMITIDAS.has(action)) {
      return jsonResponse({ error: 'Ação de auditoria inválida.' }, 400, req);
    }

    // Só admins registram eventos da Central.
    const sb = serviceClient();
    const { data: caller } = await sb
      .from('app_users')
      .select('role')
      .eq('uid', user.id)
      .maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores.' }, 403, req);
    }

    await logAuditEvent({
      adminuid: user.id,            // sempre o caller — escopo do próprio tenant
      action,
      actor_id: user.id,
      actor_role: 'admin',
      target_type: typeof target_type === 'string' ? target_type.slice(0, 60) : null,
      target_id: typeof target_id === 'string' ? target_id.slice(0, 120) : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    return jsonResponse({ success: true }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'logAudit failed' }, 500, req);
  }
});
