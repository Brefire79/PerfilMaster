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
    const { type, uid, groupId } = await req.json();
    if (!type || !['individual', 'group'].includes(type)) {
      return jsonResponse({ error: 'type must be individual or group' }, 400);
    }

    if (type === 'individual') {
      if (!uid) return jsonResponse({ error: 'uid is required for individual report' }, 400);
      const { data: profile } = await supabase
        .from('app_profiles')
        .select('*')
        .eq('uid', uid)
        .single();
      if (!profile) return jsonResponse({ error: 'profile not found' }, 404);

      return jsonResponse({
        reportId: `profile_${uid}_${Date.now()}`,
        reportUrl: null,
        type,
        generatedAt: new Date().toISOString(),
        payload: profile,
      });
    }

    if (!groupId) return jsonResponse({ error: 'groupId is required for group report' }, 400);
    const { data: report } = await supabase
      .from('app_group_reports')
      .select('*')
      .eq('groupId', groupId)
      .single();
    if (!report) return jsonResponse({ error: 'group report not found' }, 404);

    return jsonResponse({
      reportId: `group_${groupId}_${Date.now()}`,
      reportUrl: null,
      type,
      generatedAt: new Date().toISOString(),
      payload: report,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'generateReport failed' }, 500);
  }
});
