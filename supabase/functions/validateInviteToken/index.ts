import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { token } = await req.json();
    if (!token) return jsonResponse({ valid: false, reason: 'missing_token' }, 400, req);

    const { data: invite, error } = await supabase
      .from('app_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) return jsonResponse({ valid: false, reason: 'not_found' }, 404, req);
    if (invite.used) return jsonResponse({ valid: false, reason: 'used' }, 200, req);
    // FIX: colunas do banco são lowercase (expiresat/groupid/adminuid), não camelCase
    if (invite.expiresat && new Date(invite.expiresat).getTime() < Date.now()) {
      return jsonResponse({ valid: false, reason: 'expired' }, 200, req);
    }

    const { data: group } = invite.groupid
      ? await supabase
          .from('app_groups')
          .select('id,name,adminname')
          .eq('id', invite.groupid)
          .single()
      : { data: null };

    return jsonResponse({
      valid: true,
      role: invite.role === 'admin' ? 'admin' : 'student', // DELTA 12: convite de admin
      groupId: invite.groupid || null,
      adminUid: invite.adminuid || null,   // Register precisa para vincular o aluno (DELTA 6)
      groupName: group?.name || null,
      adminName: group?.adminname || null,
      expiresAt: invite.expiresat || null,
    }, 200, req);
  } catch (err) {
    return jsonResponse({ valid: false, reason: (err as Error).message || 'validateInviteToken failed' }, 500, req);
  }
});
