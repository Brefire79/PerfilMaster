/**
 * Envio de e-mail transacional via Resend (https://resend.com).
 *
 * Secrets no Supabase (Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY  — chave da API
 *   EMAIL_FROM      — remetente num domínio VERIFICADO no Resend
 *                     (ex.: "Perfil Master <devolutiva@seudominio.com.br>").
 *                     `onboarding@resend.dev` só entrega ao dono da conta.
 *   APP_URL         — origem do frontend (default: https://perfilmaster.netlify.app)
 *
 * Best-effort por desenho: nunca lança. Se faltar secret ou o Resend falhar,
 * registra no log e devolve { ok: false } — o fluxo de negócio (perfil gravado,
 * avaliação concluída) não pode depender de e-mail.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  skipped?: 'sem_api_key' | 'sem_destinatario' | 'destinatario_invalido';
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function appUrl(): string {
  return (Deno.env.get('APP_URL') || 'https://perfilmaster.netlify.app').replace(/\/+$/, '');
}

export function isEmail(v: unknown): v is string {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') || 'Perfil Master <onboarding@resend.dev>';

  if (!msg.to) return { ok: false, skipped: 'sem_destinatario' };
  if (!isEmail(msg.to)) return { ok: false, skipped: 'destinatario_invalido' };
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY ausente — e-mail não enviado:', msg.subject);
    return { ok: false, skipped: 'sem_api_key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [msg.to.trim()],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[email] Resend recusou:', res.status, JSON.stringify(data));
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[email] exceção ao enviar:', e);
    return { ok: false, error: (e as Error).message };
  }
}
