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
import { logAuditEvent } from '../_shared/audit.ts';
import {
  temVagas, tomarVaga, devolverVaga, registrarUso, motivoRecusa, MENSAGEM_RECUSA, STATUS_HTTP,
} from '../_shared/invites.ts';

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

    const { token: tokenBruto, userData, byEmail } = await req.json();
    const sb = serviceClient();

    // DELTA 21 — dois jeitos de achar o convite:
    //   (a) token do link /join/:token (fluxo clássico, também após login Google);
    //   (b) byEmail: o facilitador registrou o e-mail da pessoa no convite
    //       (app_invites.email). Normalmente o trigger do banco já consome no
    //       primeiro login; este caminho cobre conta antiga no Auth sem app_users.
    let invite: Record<string, any> | null = null;
    let token = typeof tokenBruto === 'string' ? tokenBruto : '';
    if (token) {
      if (token.length < 10 || token.length > 100) {
        return jsonResponse({ error: 'token inválido' }, 400, req);
      }
      const { data } = await sb.from('app_invites').select('*').eq('token', token).single();
      invite = data ?? null;
    } else if (byEmail === true) {
      // Só provedores OAuth (Google) provam a posse do e-mail. Cadastro por
      // e-mail/senha não confirma o endereço — alguém poderia se cadastrar com
      // o e-mail de outra pessoa e roubar o convite dela.
      const provider = String(user.app_metadata?.provider || 'email');
      if (provider === 'email') {
        return jsonResponse({ error: 'Convite por e-mail só é reconhecido em login com Google. Use o link do convite.' }, 403, req);
      }
      const email = String(user.email || '').trim().toLowerCase();
      if (!email) return jsonResponse({ error: 'Conta sem e-mail — não dá para localizar convite.' }, 400, req);
      const { data } = await sb
        .from('app_invites')
        .select('*')
        .ilike('email', email)
        .eq('used', false)
        .order('createdat', { ascending: false })
        .limit(1)
        .maybeSingle();
      invite = data ?? null;
      token = invite?.token || '';
    } else {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    if (!invite) {
      return jsonResponse({ error: 'Convite não encontrado para esta conta. Peça ao facilitador um link ou o registro do seu e-mail.' }, 404, req);
    }
    // DELTA 22: pausado/encerrado/esgotado além de usado/expirado.
    const recusa = motivoRecusa(invite);
    if (recusa) {
      return jsonResponse({ error: MENSAGEM_RECUSA[recusa], code: `invite/${recusa}` }, STATUS_HTTP[recusa], req);
    }

    const agora = new Date().toISOString();
    const safe = userData && typeof userData === 'object' ? userData : {};
    const cpf = isValidCpfServer(safe.cpf) ? cpfDigitsOnly(safe.cpf) : null;

    // DELTA 12: convite de ADMIN promove a admin INDEPENDENTE (workspace próprio).
    // Roda via service_role → o trigger protect_user_privileges permite a role.
    // Admin convidado NÃO herda grupo/adminuid do convidante (dados isolados);
    // guardamos `invitedby` apenas para o convidante poder listar/revogar.
    const isAdminInvite = invite.role === 'admin';

    // Campos sensíveis (role, groupid, adminuid) NUNCA vêm do cliente —
    // role/vínculos derivam do CONVITE (server-side).
    const row: Record<string, unknown> = {
      uid: user.id,
      role: isAdminInvite ? 'admin' : 'student',
      email: user.email || (typeof safe.email === 'string' ? safe.email : null),
      displayname: typeof safe.displayName === 'string' && safe.displayName
        ? safe.displayName.slice(0, 120)
        : (String(user.user_metadata?.full_name || user.user_metadata?.name || '').slice(0, 120) || null),
      photourl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      groupid: isAdminInvite ? null : (invite.groupid || null),
      adminuid: isAdminInvite ? null : (invite.adminuid || null),
      updatedat: agora,
    };
    // Resiliência: só referencia a coluna `invitedby` (DELTA 12) em convite de
    // admin — cadastro de aluno não toca na coluna nova.
    if (isAdminInvite) row.invitedby = invite.adminuid || null;
    if (cpf && safe.cpfConsent === true) {
      row.cpf = cpf;
      row.cpf_consent = true;
      row.cpf_consent_at = agora;
    }

    const { data: existing } = await sb
      .from('app_users')
      .select('uid, role')
      .eq('uid', user.id)
      .maybeSingle();
    if (!existing) row.createdat = agora;

    // FIX (auditoria 07/07/2026): um ADMIN existente que consome convite de
    // ALUNO não pode ser rebaixado a student (o upsert sobrescreveria role,
    // groupid e adminuid, quebrando o workspace dele). Bloqueia com erro claro.
    if (existing?.role === 'admin' && !isAdminInvite) {
      return jsonResponse(
        { error: 'Esta conta é de administrador — não é possível usá-la para entrar como aluno. Use outra conta ou peça um convite de admin.' },
        409,
        req
      );
    }

    // DELTA 22: convite com vagas — toma a vaga ANTES de criar a conta (atômico).
    // Reentrada da mesma conta não desconta de novo.
    const comVagas = temVagas(invite);
    let vagaTomada = false;
    if (comVagas) {
      const r = await tomarVaga(sb, token, { uid: user.id });
      if (r.motivo) {
        return jsonResponse({ error: MENSAGEM_RECUSA[r.motivo], code: `invite/${r.motivo}` }, STATUS_HTTP[r.motivo], req);
      }
      vagaTomada = !r.reentrada;
      if (r.invite) invite = r.invite;
    }

    const { error: upsertError } = await sb
      .from('app_users')
      .upsert(row, { onConflict: 'uid' });
    if (upsertError) {
      if (vagaTomada) await devolverVaga(sb, token);
      return jsonResponse({ error: `Falha ao registrar aluno: ${upsertError.message}` }, 500, req);
    }
    if (comVagas && vagaTomada) {
      await registrarUso(sb, invite, {
        kind: 'conta', uid: user.id,
        nome: row.displayname as string | null, email: row.email as string | null,
      });
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
    // DELTA 21: convite com e-mail é PESSOAL → uso único mesmo com grupo.
    if (invite.groupid && !invite.email) {
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

    // Trilha de auditoria (DELTA 14): convite consumido. Dono do evento = quem
    // convidou (invite.adminuid); ator = a conta recém-criada/atualizada.
    if (invite.adminuid) {
      await logAuditEvent({
        adminuid: invite.adminuid,
        action: 'invite_used',
        actor_id: user.id,
        actor_role: row.role as string,
        target_type: 'invite',
        target_id: token,
        metadata: { groupid: invite.groupid || null, isAdminInvite },
      });
    }

    return jsonResponse(
      { success: true, role: row.role, groupId: invite.groupid || null, adminUid: invite.adminuid || null },
      200,
      req
    );
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'consumeInvite failed' }, 500, req);
  }
});
