// generateRecoveryLink — Caminho B: o facilitador gera um LINK de recuperação de
// senha para um aluno seu e o envia por WhatsApp (sem depender de SMTP/e-mail).
//
// Segurança:
//   - exige JWT + role 'admin';
//   - o alvo precisa ser um ALUNO do caller (por adminuid OU por grupo do caller);
//   - o link é gerado via service_role (auth.admin.generateLink, type=recovery) e
//     aponta para /reset-password (a página in-app que define a nova senha).
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';
import { logAuditEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const { targetUid, baseUrl } = await req.json();
    if (!targetUid || typeof targetUid !== 'string') {
      return jsonResponse({ error: 'targetUid é obrigatório.' }, 400, req);
    }

    const sb = serviceClient();

    // Caller precisa ser admin.
    const { data: caller } = await sb.from('app_users').select('role').eq('uid', user.id).maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores.' }, 403, req);
    }

    // Alvo precisa ser um aluno do caller (por adminuid OU por grupo do caller).
    const { data: alvo } = await sb
      .from('app_users')
      .select('uid, email, adminuid, groupid, role')
      .eq('uid', targetUid)
      .maybeSingle();
    if (!alvo) return jsonResponse({ error: 'Aluno não encontrado.' }, 404, req);
    if (!alvo.email) return jsonResponse({ error: 'Este aluno não tem e-mail cadastrado.' }, 400, req);

    let autorizado = alvo.adminuid === user.id;
    if (!autorizado && alvo.groupid) {
      const { data: grupo } = await sb
        .from('app_groups')
        .select('id')
        .eq('id', alvo.groupid)
        .eq('adminuid', user.id)
        .maybeSingle();
      autorizado = !!grupo;
    }
    if (!autorizado) {
      return jsonResponse({ error: 'Você não gerencia este aluno.' }, 403, req);
    }

    const root = (baseUrl || '').replace(/\/$/, '');
    const redirectTo = root ? `${root}/reset-password` : undefined;

    // Gera o link de recuperação (service_role).
    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email: alvo.email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error || !data?.properties?.action_link) {
      return jsonResponse({ error: error?.message || 'Falha ao gerar link de recuperação.' }, 500, req);
    }

    // Trilha de auditoria (sem expor o link).
    await logAuditEvent({
      adminuid: user.id,
      action: 'password_reset_link_generated',
      actor_id: user.id,
      actor_role: 'admin',
      target_type: 'aluno',
      target_id: targetUid,
      metadata: {},
    });

    return jsonResponse({ actionLink: data.properties.action_link, email: alvo.email }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'generateRecoveryLink failed' }, 500, req);
  }
});
