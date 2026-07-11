// Exclusão definitiva da própria conta.
// Alunos têm seus dados pessoais removidos. Administradores só podem excluir
// contas sem dependências para impedir perda acidental de todo um tenant.
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';

type CountResult = { label: string; count: number };

async function countRows(sb: ReturnType<typeof serviceClient>, table: string, column: string, value: string) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  if (error) throw error;
  return count || 0;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, req);

  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const body = await req.json().catch(() => ({}));
    if (body?.confirmation !== 'EXCLUIR MINHA CONTA') {
      return jsonResponse({ error: 'Confirmação de exclusão inválida.' }, 400, req);
    }

    const sb = serviceClient();
    const uid = authUser.id;
    const { data: account, error: accountError } = await sb
      .from('app_users')
      .select('uid, role, groupid')
      .eq('uid', uid)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) return jsonResponse({ error: 'Conta do aplicativo não encontrada.' }, 404, req);

    if (account.role === 'admin') {
      const checks: CountResult[] = await Promise.all([
        countRows(sb, 'app_groups', 'adminuid', uid).then((count) => ({ label: 'grupos', count })),
        countRows(sb, 'app_users', 'adminuid', uid).then((count) => ({ label: 'alunos', count })),
        countRows(sb, 'app_sessoes', 'adminuid', uid).then((count) => ({ label: 'avaliações avulsas', count })),
        countRows(sb, 'app_invites', 'adminuid', uid).then((count) => ({ label: 'convites', count })),
        countRows(sb, 'app_users', 'invitedby', uid).then((count) => ({ label: 'administradores convidados', count })),
      ]);
      const blockers = checks.filter((item) => item.count > 0);
      if (blockers.length) {
        return jsonResponse({
          error: 'A conta administra dados ativos e não pode ser excluída automaticamente.',
          code: 'account/has-dependencies',
          blockers,
        }, 409, req);
      }
    }

    const deletions = [
      ['app_identity_links', 'user_uid'],
      ['app_admin_strategies', 'studentuid'],
      ['app_report_meta', 'ref'],
      ['app_profiles', 'uid'],
      ['app_assessments', 'uid'],
    ] as const;
    for (const [table, column] of deletions) {
      const { error } = await sb.from(table).delete().eq(column, uid);
      if (error && error.code !== '42P01') throw error;
    }

    if (account.groupid) {
      const { data: group } = await sb.from('app_groups').select('memberids').eq('id', account.groupid).maybeSingle();
      if (group) {
        const members = Array.isArray(group.memberids) ? group.memberids.filter((id: unknown) => id !== uid) : [];
        const { error } = await sb.from('app_groups').update({ memberids: members, updatedat: new Date().toISOString() }).eq('id', account.groupid);
        if (error) throw error;
      }
    }

    if (account.role === 'admin') {
      const adminDeletes = [
        ['app_central_ai', 'adminuid'],
        ['app_admin_strategies', 'adminuid'],
        ['app_report_meta', 'adminuid'],
        ['audit_log', 'adminuid'],
        ['app_superadmins', 'uid'],
      ] as const;
      for (const [table, column] of adminDeletes) {
        const { error } = await sb.from(table).delete().eq(column, uid);
        if (error && error.code !== '42P01') throw error;
      }
    }

    const { error: appUserError } = await sb.from('app_users').delete().eq('uid', uid);
    if (appUserError) throw appUserError;

    const { error: authError } = await sb.auth.admin.deleteUser(uid, false);
    if (authError) throw authError;

    return jsonResponse({ deleted: true }, 200, req);
  } catch (error) {
    console.error('[deleteAccount]', (error as Error)?.message || error);
    return jsonResponse({ error: 'Não foi possível excluir a conta. Tente novamente ou contate o suporte.' }, 500, req);
  }
});
