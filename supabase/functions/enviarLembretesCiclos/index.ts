// enviarLembretesCiclos — lembrete de Teste Dirigido aguardando resposta (Fase 4).
//
// Dois modos de chamada, uma regra:
//   • CRON (GitHub Actions semanal): header `x-cron-token` == secret CRON_TOKEN → todos os
//     facilitadores.
//   • ADMIN (botão no app): JWT de admin → só os ciclos dele.
// Regra: ciclo `aplicado` com prazo em até 7 dias ou vencido há até 30 dias, pessoa com
// e-mail, e sem lembrete nos últimos 7 dias (`lembrete_em`). Envia pelo Resend
// (`_shared/email.ts`, best-effort — sem RESEND_API_KEY só conta o que enviaria).
// Conta → link /student/teste/:id (precisa logar); avulso → /teste/:token.
// Depois manda ao facilitador um resumo ("3 lembretes enviados"), se ele tiver e-mail.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { sendEmail, isEmail, appUrl } from '../_shared/email.ts';
import { layout, botao, esc } from '../_shared/devolutiva.ts';
import { TESTES_POR_CODIGO } from '../_shared/testesDirigidos.ts';

const sb = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
const D = 864e5;

function primeiroNome(n: unknown) { return String(n || '').trim().split(/\s+/)[0] || 'Olá'; }
function fmt(iso: string | null) { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR'); }

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // ── Autorização: cron OU admin ─────────────────────────────────────────
    const cronToken = Deno.env.get('CRON_TOKEN');
    const viaCron = !!cronToken && req.headers.get('x-cron-token') === cronToken;
    let adminUid: string | null = null;
    if (!viaCron) {
      const user = await getAuthenticatedUser(req);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);
      const { data: caller } = await sb.from('app_users').select('role').eq('uid', user.id).maybeSingle();
      if (caller?.role !== 'admin') return jsonResponse({ error: 'Apenas administradores.' }, 403, req);
      adminUid = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const simular = body?.simular === true; // só conta, não envia
    const groupId = adminUid && typeof body?.groupId === 'string' && /^[0-9a-f-]{36}$/i.test(body.groupId) ? body.groupId : null; // admin pode restringir à turma

    const agora = Date.now();
    const ateProximo = new Date(agora + 7 * D).toISOString();
    const vencidoDesde = new Date(agora - 30 * D).toISOString();
    const semLembreteDesde = new Date(agora - 7 * D).toISOString();

    let q = sb.from('app_ciclos')
      .select('id, adminuid, pessoa_tipo, uid, avaliado_id, pessoa_nome, token, modulo_codigo, prazo_em, lembrete_em')
      .eq('status', 'aplicado')
      .not('prazo_em', 'is', null)
      .lte('prazo_em', ateProximo)
      .gte('prazo_em', vencidoDesde);
    if (adminUid) q = q.eq('adminuid', adminUid);
    if (groupId) q = q.eq('groupid', groupId);
    const { data: ciclos, error } = await q;
    if (error) { console.error('[lembretes] consulta:', error); return jsonResponse({ error: 'Falha ao consultar ciclos.' }, 500, req); }

    const elegiveis = (ciclos || []).filter((c) => !c.lembrete_em || c.lembrete_em < semLembreteDesde);

    // E-mails das pessoas (conta → app_users; avulso → app_avaliados), em lote.
    const uids = [...new Set(elegiveis.filter((c) => c.pessoa_tipo === 'conta').map((c) => c.uid))];
    const avIds = [...new Set(elegiveis.filter((c) => c.pessoa_tipo === 'avulso').map((c) => c.avaliado_id))];
    const emailPorUid = new Map<string, string>();
    const emailPorAv = new Map<string, string>();
    if (uids.length) {
      const { data } = await sb.from('app_users').select('uid, email').in('uid', uids);
      for (const u of data || []) if (isEmail(u.email)) emailPorUid.set(u.uid, u.email.trim());
    }
    if (avIds.length) {
      const { data } = await sb.from('app_avaliados').select('id, email').in('id', avIds);
      for (const a of data || []) if (isEmail(a.email)) emailPorAv.set(a.id, a.email.trim());
    }

    const base = appUrl();
    const porAdmin = new Map<string, { enviados: number; semEmail: number }>();
    let enviados = 0, semEmail = 0, falhas = 0;

    for (const c of elegiveis) {
      const to = c.pessoa_tipo === 'conta' ? emailPorUid.get(c.uid) : emailPorAv.get(c.avaliado_id);
      const acc = porAdmin.get(c.adminuid) || { enviados: 0, semEmail: 0 };
      porAdmin.set(c.adminuid, acc);
      if (!to) { semEmail++; acc.semEmail++; continue; }
      if (simular) { enviados++; acc.enviados++; continue; }

      const teste = TESTES_POR_CODIGO[c.modulo_codigo];
      const titulo = teste?.titulo || c.modulo_codigo;
      const vencido = new Date(c.prazo_em).getTime() < agora;
      const link = c.pessoa_tipo === 'conta' ? `${base}/student/teste/${c.id}` : `${base}/teste/${c.token}`;
      const corpo = `
        <p style="font:400 15px/1.6 Inter,Arial,sans-serif;color:#111827;margin:0 0 12px;">${esc(primeiroNome(c.pessoa_nome))}, ${vencido ? 'o prazo do seu próximo passo passou, mas ainda dá tempo' : 'seu próximo passo de desenvolvimento está esperando'}.</p>
        <p style="font:400 14px/1.6 Inter,Arial,sans-serif;color:#374151;margin:0 0 6px;"><strong>${esc(titulo)}</strong> — ${esc(teste?.foco || '')}</p>
        <p style="font:400 13px/1.6 Inter,Arial,sans-serif;color:#6B7280;margin:0 0 16px;">12 perguntas, cerca de 3 minutos${c.prazo_em ? ` · prazo ${esc(fmt(c.prazo_em))}` : ''}.</p>
        ${botao(link, 'Responder agora')}
        <p style="font:400 12px/1.6 Inter,Arial,sans-serif;color:#9CA3AF;margin:8px 0 0;">Responda pensando em como você age na maior parte das vezes. O resultado é um ponto de partida para a conversa com seu facilitador.</p>`;
      const r = await sendEmail({
        to,
        subject: `${vencido ? 'Ainda dá tempo: ' : 'Lembrete: '}${titulo} — Perfil Master`,
        html: layout('Lembrete do seu teste', corpo, 'Você recebe este e-mail porque seu facilitador aplicou um teste dirigido a você no Perfil Master.'),
        text: `${primeiroNome(c.pessoa_nome)}, seu teste "${titulo}" está aguardando resposta. Responda em: ${link}`,
      });
      if (r.ok) {
        enviados++; acc.enviados++;
        await sb.from('app_ciclos').update({ lembrete_em: new Date().toISOString() }).eq('id', c.id);
      } else if (r.skipped === 'sem_api_key') {
        // Sem Resend configurado: conta como "enviaria" para diagnóstico, não marca.
        enviados++; acc.enviados++;
      } else {
        falhas++; console.error('[lembretes] falha ao enviar', c.id, r.error);
      }
    }

    // Resumo ao facilitador (só quando houve envio real, via cron ou admin).
    if (!simular) {
      for (const [uid, acc] of porAdmin) {
        if (acc.enviados === 0) continue;
        const { data: adm } = await sb.from('app_users').select('email, displayname, name').eq('uid', uid).maybeSingle();
        if (!adm || !isEmail(adm.email)) continue;
        const corpo = `
          <p style="font:400 15px/1.6 Inter,Arial,sans-serif;color:#111827;margin:0 0 12px;">${esc(primeiroNome(adm.displayname || adm.name))}, enviei ${acc.enviados} lembrete${acc.enviados === 1 ? '' : 's'} de teste dirigido hoje${acc.semEmail ? ` (${acc.semEmail} pessoa${acc.semEmail === 1 ? '' : 's'} sem e-mail cadastrado — mande o link pelo WhatsApp)` : ''}.</p>
          ${botao(`${base}/admin/central/pessoas`, 'Ver pendências na Central')}`;
        await sendEmail({ to: adm.email.trim(), subject: `Lembretes enviados: ${acc.enviados} — Perfil Master`, html: layout('Lembretes de testes dirigidos', corpo, 'Resumo automático dos lembretes do Perfil Master.'), text: `${acc.enviados} lembrete(s) enviado(s).` });
      }
    }

    return jsonResponse({ ok: true, modo: viaCron ? 'cron' : 'admin', simular, elegiveis: elegiveis.length, enviados, semEmail, falhas }, 200, req);
  } catch (err) {
    console.error('[enviarLembretesCiclos] erro inesperado:', err);
    return jsonResponse({ error: 'Não foi possível enviar os lembretes.' }, 500, req);
  }
});
