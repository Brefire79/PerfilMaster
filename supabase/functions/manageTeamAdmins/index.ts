// manageTeamAdmins — gestão dos administradores convidados por um admin.
//
// DELTA 12: lista e revoga/reativa SOMENTE os admins que o próprio caller
// convidou (app_users.invitedby = caller.id). A mudança de role roda com
// service_role (o trigger protect_user_privileges bloqueia o app comum).
//
// Ações:
//   { action: 'list' }                       → admins da equipe do caller
//   { action: 'setRole', targetUid, role }   → role ∈ {'admin','student'}
//   { action: 'promoteByEmail', email }       → promove uma conta JÁ EXISTENTE
//                                               a admin e a reivindica (invitedby)
//
// promoteByEmail resolve o caso do convidado que JÁ tinha conta (o link de
// convite cria conta nova e falha com "e-mail já em uso"). Promover é só um
// interruptor de `role`: groupid/adminuid ficam intactos, então revogar
// (setRole→'student') devolve a pessoa exatamente ao que era. Reversível N vezes.
//
// Regras de segurança:
//   - Caller precisa estar autenticado e ter role 'admin'.
//   - Só age sobre usuários com invitedby = caller.id (escopo).
//   - Não pode alterar a própria conta.
//   - Não reivindica quem já pertence à equipe de outro admin.
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

    // ── Promover uma conta JÁ EXISTENTE a admin (por e-mail) ──────────────────
    if (action === 'promoteByEmail') {
      const email = String(body?.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return jsonResponse({ error: 'Informe um e-mail válido.' }, 400, req);
      }

      // Busca a conta existente (e-mail case-insensitive).
      const { data: rows, error: lookErr } = await sb
        .from('app_users')
        .select('uid, displayname, email, role, invitedby, createdat')
        .ilike('email', email)
        .limit(2);
      if (lookErr) return jsonResponse({ error: lookErr.message }, 500, req);

      const target = (rows || [])[0];
      if (!target) {
        return jsonResponse(
          { error: 'Nenhuma conta encontrada com esse e-mail. Peça para a pessoa se cadastrar no app primeiro.' },
          404, req
        );
      }
      if (target.uid === user.id) {
        return jsonResponse({ error: 'Você não pode promover a sua própria conta.' }, 400, req);
      }
      if (target.role === 'admin') {
        return jsonResponse(
          { error: target.invitedby === user.id
              ? 'Esse usuário já é administrador da sua equipe.'
              : 'Esse usuário já é administrador.' },
          409, req
        );
      }
      // Já reivindicado por outro admin → não sequestrar.
      if (target.invitedby && target.invitedby !== user.id) {
        return jsonResponse({ error: 'Esse usuário pertence à equipe de outro administrador.' }, 409, req);
      }

      // Interruptor de role: NÃO toca em groupid/adminuid (reversível).
      const agora = new Date().toISOString();
      const { error } = await sb
        .from('app_users')
        .update({ role: 'admin', invitedby: user.id, updatedat: agora })
        .eq('uid', target.uid);
      if (error) return jsonResponse({ error: error.message }, 500, req);

      return jsonResponse({
        success: true,
        uid: target.uid,
        admin: {
          uid: target.uid,
          displayName: target.displayname || target.email || 'Profissional',
          email: target.email || null,
          role: 'admin',
          ativo: true,
          criadoEm: target.createdat || null,
        },
      }, 200, req);
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'manageTeamAdmins failed' }, 500, req);
  }
});
