// consumeInvite — consome um convite em nome do usuário recém-autenticado.
//
// DELTA 8 (segurança): substitui o fluxo antigo em que o próprio aluno fazia
// REST direto em app_users/app_groups/app_invites — o que exigia policies
// públicas/permissivas (removidas) e falhava nas policies estritas (aluno não
// pode alterar memberids do grupo nem marcar convite como usado).
//
// Fluxo: Register.jsx → signUp → consumeInvite({ token, userData })
//   1. Valida o JWT do caller (precisa estar autenticado)
//   2. Valida o convite (existe, não usado, não expirado)
//   3. Cria/atualiza a linha do aluno em app_users (role SEMPRE 'student';
//      groupid/adminuid vêm do CONVITE, nunca do cliente)
//   4. Adiciona o uid em app_groups.memberids (se o convite tem grupo)
//   5. Marca o convite como usado (used/usedat/usedby)
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';

function cpfDigitsOnly(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

function isValidCpfServer(v: unknown): boolean {
  const cpf = cpfDigitsOnly(v);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const { token, userData } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 100) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const sb = serviceClient();

    const { data: invite, error: inviteError } = await sb
      .from('app_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return jsonResponse({ error: 'Convite não encontrado.' }, 404, req);
    }
    if (invite.used) {
      return jsonResponse({ error: 'Convite já utilizado.' }, 409, req);
    }
    if (invite.expiresat && new Date(invite.expiresat).getTime() < Date.now()) {
      return jsonResponse({ error: 'Convite expirado.' }, 410, req);
    }

    const agora = new Date().toISOString();
    const safe = userData && typeof userData === 'object' ? userData : {};
    const cpf = isValidCpfServer(safe.cpf) ? cpfDigitsOnly(safe.cpf) : null;

    // Campos sensíveis (role, groupid, adminuid) NUNCA vêm do cliente —
    // role fixa em 'student' e vínculos derivados do convite.
    const row: Record<string, unknown> = {
      uid: user.id,
      role: 'student',
      email: user.email || (typeof safe.email === 'string' ? safe.email : null),
      displayname: typeof safe.displayName === 'string' ? safe.displayName.slice(0, 120) : null,
      groupid: invite.groupid || null,
      adminuid: invite.adminuid || null,
      updatedat: agora,
    };
    if (cpf && safe.cpfConsent === true) {
      row.cpf = cpf;
      row.cpf_consent = true;
      row.cpf_consent_at = agora;
    }

    const { data: existing } = await sb
      .from('app_users')
      .select('uid')
      .eq('uid', user.id)
      .maybeSingle();
    if (!existing) row.createdat = agora;

    const { error: upsertError } = await sb
      .from('app_users')
      .upsert(row, { onConflict: 'uid' });
    if (upsertError) {
      return jsonResponse({ error: `Falha ao registrar aluno: ${upsertError.message}` }, 500, req);
    }

    if (invite.groupid) {
      const { data: group } = await sb
        .from('app_groups')
        .select('memberids')
        .eq('id', invite.groupid)
        .single();
      const memberids = Array.isArray(group?.memberids) ? group.memberids : [];
      if (!memberids.includes(user.id)) {
        await sb
          .from('app_groups')
          .update({ memberids: [...memberids, user.id], updatedat: agora })
          .eq('id', invite.groupid);
      }
    }

    // Convite de GRUPO (groupid presente) é MULTIUSO: registra o último uso
    // sem invalidar, permitindo vários cadastros até a data de expiração.
    // Convite avulso (sem groupid) permanece de USO ÚNICO.
    if (invite.groupid) {
      await sb
        .from('app_invites')
        .update({ usedat: agora, usedby: user.id }) // NÃO seta used:true
        .eq('token', token);
    } else {
      await sb
        .from('app_invites')
        .update({ used: true, usedat: agora, usedby: user.id })
        .eq('token', token);
    }

    return jsonResponse(
      { success: true, groupId: invite.groupid || null, adminUid: invite.adminuid || null },
      200,
      req
    );
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'consumeInvite failed' }, 500, req);
  }
});
