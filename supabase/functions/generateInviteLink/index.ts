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
    const { groupId, adminUid, baseUrl } = await req.json();
    if (!groupId) return jsonResponse({ error: 'groupId is required' }, 400);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('app_invites').insert({
      token,
      groupId,
      adminUid: adminUid || null,
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt,
    });
    if (error) return jsonResponse({ error: error.message }, 500);

    const root = (baseUrl || '').replace(/\/$/, '');
    const inviteUrl = root ? `${root}/join/${token}` : `/join/${token}`;

    return jsonResponse({ token, inviteUrl, expiresAt });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'generateInviteLink failed' }, 500);
  }
});
