// manageTeamAdmins — gestão dos administradores convidados por um admin.
//
// DELTA 12: lista e revoga/reativa SOMENTE os admins que o próprio caller
// convidou (app_users.invitedby = caller.id). A mudança de role roda com
// service_role (o trigger protect_user_privileges bloqueia o app comum).
//
// Ações:
//   { action: 'list' }                      → admins convidados pelo caller
//   { action: 'setRole', targetUid, role }  → role ∈ {'admin','student'}
//
// Regras de segurança:
//   - Caller precisa estar autenticado e ter role 'admin'.
//   - Só age sobre usuários com invitedby = caller.id (escopo).
//   - Não pode alterar a própria conta.
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const sb = serviceClient();

    // Caller precisa ser admin.
    const { data: caller } = await sb
      .from('app_users')
      .select('role')
      .eq('uid', user.id)
      .maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores podem gerenciar a equipe.' }, 403, req);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── Listar admins convidados por mim ──────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await sb
        .from('app_users')
        .select('uid, displayname, email, role, createdat, updatedat')
        .eq('invitedby', user.id)
        .order('createdat', { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500, req);
      const admins = (data || []).map((u) => ({
        uid: u.uid,
        displayName: u.displayname || u.email || 'Profissional',
        email: u.email || null,
        role: u.role,            // 'admin' = ativo · 'student' = revogado
        ativo: u.role === 'admin',
        criadoEm: u.createdat || null,
        atualizadoEm: u.updatedat || null,
      }));
      return jsonResponse({ admins }, 200, req);
    }

    // ── Revogar / reativar acesso de admin ────────────────────────────────────
    if (action === 'setRole') {
      const targetUid = String(body?.targetUid || '');
      const role = body?.role === 'admin' ? 'admin' : 'student';
      if (!targetUid) return jsonResponse({ error: 'targetUid é obrigatório.' }, 400, req);
      if (targetUid === user.id) {
        return jsonResponse({ error: 'Você não pode alterar a sua própria conta.' }, 400, req);
      }

      // Escopo: só age sobre quem ESTE admin convidou.
      const { data: target } = await sb
        .from('app_users')
        .select('uid, invitedby')
        .eq('uid', targetUid)
        .maybeSingle();
      if (!target || target.invitedby !== user.id) {
        return jsonResponse({ error: 'Profissional não encontrado na sua equipe.' }, 404, req);
      }

      const { error } = await sb
        .from('app_users')
        .update({ role, updatedat: new Date().toISOString() })
        .eq('uid', targetUid);
      if (error) return jsonResponse({ error: error.message }, 500, req);

      return jsonResponse({ success: true, uid: targetUid, role }, 200, req);
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'manageTeamAdmins failed' }, 500, req);
  }
});
