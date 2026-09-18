// consumeInviteAvulso — DELTA 22: a pessoa SEM e-mail entra pelo mesmo link de
// convite da empresa e responde pelo celular, sem criar conta.
//
// Fluxo: /join/:token → "Não tenho e-mail" → { token, nome, telefone } →
//   1. valida o convite (grupo, ativo, com vaga) e TOMA a vaga (atômico)
//   2. garante a sessão avulsa do grupo (mesma regra de ensureSessaoAvulsa
//      no frontend: adminuid + groupid + status ativa + título fixo)
//   3. cria o app_avaliados (status pendente, DISC + Sabotadores)
//   4. registra o uso em app_invite_uses e na trilha de auditoria
//   5. devolve o token do avaliado → o app abre /avaliacao/:token direto
//
// Pública (anon) de propósito: quem usa não tem conta. Por isso: rate limit,
// validação estrita do payload e catch sem detalhe interno (A4).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { checarRateLimit, CORPO_429 } from '../_shared/rateLimit.ts';
import { logAuditEvent } from '../_shared/audit.ts';
import {
  temVagas, tomarVaga, devolverVaga, registrarUso, MENSAGEM_RECUSA, STATUS_HTTP,
} from '../_shared/invites.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Espelha ensureSessaoAvulsa (firestore.js) — título é a chave de reuso.
const TITULO_SESSAO_GRUPO = 'Avaliações do grupo';

function limparTexto(v: unknown, max: number): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function soDigitos(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

async function garantirSessaoDoGrupo(adminuid: string, groupid: string): Promise<string | null> {
  const { data: existente } = await supabase
    .from('app_sessoes')
    .select('id')
    .eq('adminuid', adminuid)
    .eq('groupid', groupid)
    .eq('status', 'ativa')
    .eq('titulo', TITULO_SESSAO_GRUPO)
    .order('criadaem', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existente?.id) return existente.id;

  const agora = new Date().toISOString();
  const { data: nova, error } = await supabase
    .from('app_sessoes')
    .insert({
      adminuid,
      groupid,
      titulo: TITULO_SESSAO_GRUPO,
      descricao: 'Avaliações enviadas por link WhatsApp',
      status: 'ativa',
      criadaem: agora,
      atualizadaem: agora,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[consumeInviteAvulso] falha ao criar sessão do grupo:', error.message);
    return null;
  }
  return nova?.id ?? null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Ação pontual de cadastro — 10 por IP a cada 5 min já cobre uma família
    // no mesmo Wi-Fi e barra varredura de token.
    const limite = await checarRateLimit(req, 'consumeInviteAvulso', 10, 5);
    if (limite.limitado) return jsonResponse(CORPO_429, 429, req);

    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';
    if (token.length < 10 || token.length > 100) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const nome = limparTexto(body.nome, 120);
    const telefone = soDigitos(body.telefone);
    const emailBruto = limparTexto(body.email, 160).toLowerCase();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBruto) ? emailBruto : null;
    if (nome.length < 2) return jsonResponse({ error: 'Informe seu nome.' }, 400, req);
    if (telefone.length < 10 || telefone.length > 13) {
      return jsonResponse({ error: 'Informe um celular válido com DDD.' }, 400, req);
    }

    const { data: invite } = await supabase.from('app_invites').select('*').eq('token', token).maybeSingle();
    if (!invite) return jsonResponse({ error: MENSAGEM_RECUSA.not_found, code: 'invite/not_found' }, 404, req);
    if (!temVagas(invite)) {
      // Convite pessoal (e-mail), avulso sem grupo ou de admin: só pelo cadastro com conta.
      return jsonResponse({ error: 'Este convite exige cadastro com e-mail.', code: 'invite/requires_account' }, 400, req);
    }

    // Toma a vaga antes de criar qualquer coisa — se não houver, nada é gravado.
    const r = await tomarVaga(supabase, token);
    if (r.motivo || !r.invite) {
      const m = r.motivo ?? 'full';
      return jsonResponse({ error: MENSAGEM_RECUSA[m], code: `invite/${m}` }, STATUS_HTTP[m], req);
    }
    const conv = r.invite;

    const sessaoid = await garantirSessaoDoGrupo(conv.adminuid, conv.groupid);
    if (!sessaoid) {
      await devolverVaga(supabase, token);
      return jsonResponse({ error: 'Não foi possível preparar sua avaliação. Tente novamente.' }, 500, req);
    }

    const agora = new Date().toISOString();
    const avaliadoToken = crypto.randomUUID();
    const { error: insErr } = await supabase.from('app_avaliados').insert({
      token: avaliadoToken,
      sessaoid,
      adminuid: conv.adminuid,
      nome,
      telefone,
      email,
      status: 'pendente',
      respostas: null,
      perfil: null,
      incluir_sabotadores: true,
      criadoem: agora,
      atualizadoem: agora,
    });
    if (insErr) {
      console.error('[consumeInviteAvulso] falha ao criar avaliado:', insErr.message);
      await devolverVaga(supabase, token);
      return jsonResponse({ error: 'Não foi possível concluir seu cadastro. Tente novamente.' }, 500, req);
    }

    await registrarUso(supabase, conv, { kind: 'avulso', avaliadoToken, nome, email, telefone });
    await logAuditEvent({
      adminuid: conv.adminuid,
      action: 'invite_used',
      actor_id: null,
      actor_role: 'anon',
      target_type: 'invite',
      target_id: token,
      metadata: { groupid: conv.groupid, kind: 'avulso', avaliadoToken },
    });

    return jsonResponse({ success: true, avaliadoToken, sessaoId: sessaoid }, 200, req);
  } catch (err) {
    // A4: nada de detalhe interno para o chamador anônimo.
    console.error('[consumeInviteAvulso] erro inesperado:', err);
    return jsonResponse({ error: 'Não foi possível processar o convite. Tente novamente.' }, 500, req);
  }
});
