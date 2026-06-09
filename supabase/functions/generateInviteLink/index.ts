// generateInviteLink — gera convite de cadastro (grupo ou aluno avulso).
//
// DELTA 8 (segurança): agora exige caller autenticado com role 'admin' e,
// se houver groupId, que o caller seja dono do grupo. Antes era pública —
// qualquer pessoa podia gerar convites para qualquer grupo.
// FIX funcional: colunas do banco são lowercase (groupid/adminuid/createdat/
// expiresat) — o insert antigo usava camelCase e falhava no PostgREST.
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient, isGroupAdmin } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const { groupId, baseUrl, expiryDays } = await req.json();

    const sb = serviceClient();
    const { data: caller } = await sb
      .from('app_users')
      .select('role')
      .eq('uid', user.id)
      .maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores podem gerar convites.' }, 403, req);
    }

    if (groupId && !(await isGroupAdmin(user.id, groupId))) {
      return jsonResponse({ error: 'Você não é admin deste grupo.' }, 403, req);
    }

    const token = crypto.randomUUID();
    const days = Number(expiryDays) > 0 ? Math.min(Number(expiryDays), 90) : 7;
    const expiresat = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await sb.from('app_invites').insert({
      token,
      groupid: groupId || null,   // null → convite de aluno avulso (DELTA 6)
      adminuid: user.id,          // sempre o caller autenticado
      used: false,
      createdat: new Date().toISOString(),
      expiresat,
    });
    if (error) return jsonResponse({ error: error.message }, 500, req);

    const root = (baseUrl || '').replace(/\/$/, '');
    const inviteUrl = root ? `${root}/join/${token}` : `/join/${token}`;

    return jsonResponse({ token, inviteUrl, expiresAt: expiresat }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'generateInviteLink failed' }, 500, req);
  }
});
