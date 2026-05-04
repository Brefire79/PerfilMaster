/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * send-result-email — Deno/Supabase Edge Function
 * Envia e-mail com resultados do teste via Resend
 *
 * Variáveis de ambiente necessárias no Supabase Dashboard:
 *   RESEND_API_KEY  — chave da API Resend (https://resend.com)
 *   FROM_EMAIL      — e-mail remetente verificado no Resend (ex: noreply@seudominio.com)
 *   APP_URL         — URL do frontend (ex: https://profileai.netlify.app)
 */
import { serve }       from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { student_id, test_id } = await req.json();
    if (!student_id || !test_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'student_id e test_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cliente admin (Service Role Key) para bypass de RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Buscar dados necessários
    const [{ data: student }, { data: test }, { data: answers }] = await Promise.all([
      supabase.from('test_students').select('name, email').eq('id', student_id).single(),
      supabase.from('tests').select('title, completion_message').eq('id', test_id).single(),
      supabase.from('test_answers')
        .select('answer_value, questions(content, type, order_index)')
        .eq('student_id', student_id)
        .order('questions(order_index)', { ascending: true }),
    ]);

    if (!student || !test) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados não encontrados' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@profileai.app';
    const appUrl    = Deno.env.get('APP_URL') ?? 'https://profileai.netlify.app';

    // Montar sumário de respostas (HTML)
    const answersHtml = (answers ?? [])
      .map((a: any, i: number) => `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;vertical-align:top;font-size:13px;">
            ${i + 1}. ${a.questions?.content ?? ''}
          </td>
          <td style="padding:8px 12px;color:#1e293b;font-size:13px;">${a.answer_value ?? '—'}</td>
        </tr>`)
      .join('');

    const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resultado da Avaliação — ${test.title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
  <div style="max-width:620px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 36px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">ProfileAI</h1>
      <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">AMB FUSI · Sistema de Mentoria</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 6px;">
        Avaliação Concluída ✅
      </h2>
      <p style="font-size:15px;color:#475569;margin:0 0 20px;">
        Olá <strong>${student.name}</strong>, sua avaliação <strong>${test.title}</strong> foi registrada com sucesso!
      </p>

      <!-- Mensagem do mentor -->
      <div style="background:#f1f5f9;border-radius:10px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #6366f1;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          ${test.completion_message ?? 'Obrigado por concluir a avaliação! O mentor analisará seu perfil em breve.'}
        </p>
      </div>

      <!-- Resumo de respostas -->
      ${answersHtml ? `
      <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 12px;">📋 Resumo das suas respostas</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e2e8f0;">Questão</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:600;border-bottom:1px solid #e2e8f0;">Resposta</th>
          </tr>
        </thead>
        <tbody>
          ${answersHtml}
        </tbody>
      </table>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        ProfileAI · AMB FUSI &mdash; <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">${appUrl}</a>
      </p>
      <p style="font-size:11px;color:#cbd5e1;margin:6px 0 0;">
        Este e-mail foi enviado automaticamente após a conclusão da avaliação.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Enviar via Resend
    if (!resendKey) {
      console.warn('[send-result-email] RESEND_API_KEY não configurada — e-mail não enviado.');
      // Marcar como "tentado" na tabela de resultados
      await supabase
        .from('test_results')
        .update({ email_sent: false })
        .eq('student_id', student_id)
        .eq('test_id', test_id);

      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    `ProfileAI <${fromEmail}>`,
        to:      [student.email],
        subject: `✅ Avaliação concluída: ${test.title}`,
        html:    htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[send-result-email] Resend error:', resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Atualizar flag email_sent na tabela de resultados
    await supabase
      .from('test_results')
      .update({ email_sent: true })
      .eq('student_id', student_id)
      .eq('test_id', test_id);

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[send-result-email] Uncaught error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
