import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { checarRateLimit, CORPO_429 } from '../_shared/rateLimit.ts';
import { motivoRecusa, temVagas, vagasRestantes } from '../_shared/invites.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // A4: limite apertado — validar convite é ação pontual do cadastro.
    // Sem isso dava para varrer tokens de convite à vontade.
    const limite = await checarRateLimit(req, 'validateInviteToken', 20, 5);
    if (limite.limitado) return jsonResponse(CORPO_429, 429, req);

    const { token } = await req.json();
    if (!token) return jsonResponse({ valid: false, reason: 'missing_token' }, 400, req);

    const { data: invite, error } = await supabase
      .from('app_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) return jsonResponse({ valid: false, reason: 'not_found' }, 404, req);
    // DELTA 22: used | expired | paused | closed | full — a tela de cadastro
    // e a /join mostram a mensagem certa antes de a pessoa preencher algo.
    const recusa = motivoRecusa(invite);
    if (recusa) return jsonResponse({ valid: false, reason: recusa, label: invite.label || null }, 200, req);

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
      // DELTA 22 — convite empresarial (vagas). `avulsoDisponivel`: a pessoa
      // sem e-mail pode responder pelo celular (consumeInviteAvulso).
      label: invite.label || null,
      maxUses: invite.maxuses ?? null,
      useCount: invite.usecount ?? 0,
      vagasRestantes: vagasRestantes(invite),
      avulsoDisponivel: temVagas(invite),
    }, 200, req);
  } catch (err) {
    // A4: `reason` ia direto para a tela de cadastro com o texto interno do erro.
    console.error('[validateInviteToken] erro inesperado:', err);
    return jsonResponse({ valid: false, reason: 'error' }, 500, req);
  }
});
