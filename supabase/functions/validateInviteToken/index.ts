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
    if (!token) return jsonResponse({ valid: false, reason: 'missing_token' }, 400);

    const { data: invite, error } = await supabase
      .from('app_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) return jsonResponse({ valid: false, reason: 'not_found' }, 404);
    if (invite.used) return jsonResponse({ valid: false, reason: 'used' }, 200);
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return jsonResponse({ valid: false, reason: 'expired' }, 200);
    }

    const { data: group } = await supabase
      .from('app_groups')
      .select('id,name,adminName')
      .eq('id', invite.groupId)
      .single();

    return jsonResponse({
      valid: true,
      groupId: invite.groupId,
      groupName: group?.name || null,
      adminName: group?.adminName || null,
      expiresAt: invite.expiresAt || null,
    });
  } catch (err) {
    return jsonResponse({ valid: false, reason: (err as Error).message || 'validateInviteToken failed' }, 500);
  }
});
