/**
 * Devolutiva por e-mail — disparada quando uma avaliação é concluída.
 *
 *  - Avaliado recebe: perfil dominante/secundário, barras DISC, PQ (se houver),
 *    resumo da IA (quando já gerado) e botão para o perfil completo no app.
 *  - Facilitador recebe: aviso "Fulano concluiu" com o mesmo resumo e link
 *    direto para o membro no painel. Respeita `app_users.notifications.assessmentComplete`
 *    (ausente = ligado).
 *
 * Tudo best-effort: retorna o que conseguiu enviar, nunca lança.
 */
import { serviceClient } from './auth.ts';
import { appUrl, isEmail, sendEmail } from './email.ts';

export type Disc = 'D' | 'I' | 'S' | 'C';
export type Scores = Record<Disc, number>;

export interface DadosDevolutiva {
  nome: string;
  email?: string | null;
  scores: Scores;
  dominante: Disc;
  secundario?: Disc | null;
  pqScore?: number | null;
  resumo?: string | null;          // texto da IA (opcional)
  forcas?: string[] | null;
  linkPerfil: string;              // absoluto — onde o avaliado vê a devolutiva
  linkPainel: string;              // absoluto — onde o facilitador vê o membro
  adminUid?: string | null;
}

export interface ResultadoNotificacao {
  avaliado: boolean;
  facilitador: boolean;
}

const PERFIS: Record<Disc, { nome: string; cor: string; tagline: string }> = {
  D: { nome: 'Dominante',  cor: '#EF4444', tagline: 'Direto, decidido e orientado a resultados.' },
  I: { nome: 'Influente',  cor: '#F59E0B', tagline: 'Comunicativo, entusiasta e orientado a pessoas.' },
  S: { nome: 'Estável',    cor: '#22C55E', tagline: 'Colaborativo, paciente e orientado à harmonia.' },
  C: { nome: 'Analítico',  cor: '#3B82F6', tagline: 'Preciso, criterioso e orientado à qualidade.' },
};

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function primeiroNome(nome: string): string {
  return (nome || '').trim().split(/\s+/)[0] || 'Olá';
}

function clamp(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

/** Ordena scores desc e devolve dominante/secundário (mesma regra do app: 2º ≥ 80% do 1º). */
export function inferirPerfis(scores: Scores): { dominante: Disc; secundario: Disc | null } {
  const ord = (Object.entries(scores) as [Disc, number][]).sort((a, b) => b[1] - a[1]);
  const dominante = ord[0]?.[0] || 'D';
  const secundario = ord[1] && ord[1][1] >= ord[0][1] * 0.8 ? ord[1][0] : null;
  return { dominante, secundario };
}

function barras(scores: Scores): string {
  return (['D', 'I', 'S', 'C'] as Disc[]).map((k) => {
    const v = clamp(scores[k]);
    const p = PERFIS[k];
    return `
      <tr>
        <td style="padding:6px 0;width:28px;font:700 13px/1 monospace;color:${p.cor};">${k}</td>
        <td style="padding:6px 8px;">
          <div style="background:#E5E7EB;border-radius:999px;height:10px;overflow:hidden;">
            <div style="width:${v}%;background:${p.cor};height:10px;border-radius:999px;"></div>
          </div>
        </td>
        <td style="padding:6px 0;width:40px;text-align:right;font:500 13px/1 monospace;color:#4B5563;">${v}%</td>
      </tr>`;
  }).join('');
}

function blocoPerfil(d: DadosDevolutiva): string {
  const p = PERFIS[d.dominante];
  const s = d.secundario ? PERFIS[d.secundario] : null;
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
      <tr>
        <td style="width:72px;vertical-align:top;">
          <div style="width:64px;height:64px;border-radius:16px;background:${p.cor}1A;border:2px solid ${p.cor};color:${p.cor};font:900 34px/64px Inter,Arial,sans-serif;text-align:center;">${d.dominante}</div>
        </td>
        <td style="vertical-align:middle;padding-left:12px;">
          <div style="font:800 20px/1.2 Inter,Arial,sans-serif;color:#111827;">${p.nome}${s ? ` <span style="font-weight:500;color:#6B7280;">/ ${s.nome}</span>` : ''}</div>
          <div style="font:400 14px/1.4 Inter,Arial,sans-serif;color:#6B7280;margin-top:4px;">${p.tagline}</div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 ${d.pqScore != null ? 8 : 20}px;">${barras(d.scores)}</table>
    ${d.pqScore != null ? `<p style="margin:0 0 20px;font:400 13px/1.5 Inter,Arial,sans-serif;color:#6B7280;">PQ Score (Inteligência Positiva): <strong style="color:#111827;">${clamp(d.pqScore)}</strong>/100</p>` : ''}`;
}

function blocoResumo(d: DadosDevolutiva): string {
  if (!d.resumo) return '';
  const paras = String(d.resumo).split(/\n{2,}/).map((t) => `<p style="margin:0 0 10px;font:400 14px/1.6 Inter,Arial,sans-serif;color:#374151;">${esc(t)}</p>`).join('');
  const forcas = d.forcas?.length
    ? `<p style="margin:14px 0 6px;font:700 13px/1 Inter,Arial,sans-serif;color:#111827;text-transform:uppercase;letter-spacing:.04em;">Pontos fortes</p>
       <ul style="margin:0;padding-left:18px;font:400 14px/1.6 Inter,Arial,sans-serif;color:#374151;">${d.forcas.slice(0, 5).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
    : '';
  return `<div style="background:#F9FAFB;border-left:4px solid #6366F1;border-radius:10px;padding:16px 18px;margin:0 0 24px;">${paras}${forcas}</div>`;
}

function layout(titulo: string, corpo: string, rodape: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;"><tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#1B1D2A;padding:22px 28px;">
        <div style="font:800 18px/1 Inter,Arial,sans-serif;color:#F7F8FC;">Perfil Master</div>
        <div style="font:400 12px/1 Inter,Arial,sans-serif;color:#A0A3B1;margin-top:6px;">Avaliação comportamental DISC + Sabotadores</div>
      </td></tr>
      <tr><td style="padding:28px;">${corpo}</td></tr>
      <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 28px;font:400 12px/1.5 Inter,Arial,sans-serif;color:#9CA3AF;">${rodape}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function botao(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;"><tr><td style="background:#6366F1;border-radius:10px;">
    <a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font:700 14px/1 Inter,Arial,sans-serif;color:#FFFFFF;text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;
}

function linhaScores(s: Scores): string {
  return `D ${clamp(s.D)}% · I ${clamp(s.I)}% · S ${clamp(s.S)}% · C ${clamp(s.C)}%`;
}

export function emailAvaliado(d: DadosDevolutiva): { subject: string; html: string; text: string } {
  const p = PERFIS[d.dominante];
  const subject = `Sua devolutiva está pronta — perfil ${p.nome}`;
  const corpo = `
    <h1 style="margin:0 0 6px;font:800 22px/1.25 Inter,Arial,sans-serif;color:#111827;">Sua devolutiva está pronta, ${esc(primeiroNome(d.nome))}!</h1>
    <p style="margin:0 0 22px;font:400 15px/1.5 Inter,Arial,sans-serif;color:#4B5563;">Obrigado por concluir a avaliação. Abaixo, um resumo do perfil identificado — o relatório completo, com estilo de comunicação, sabotadores e áreas de desenvolvimento, está no app.</p>
    ${blocoPerfil(d)}
    ${blocoResumo(d)}
    ${botao(d.linkPerfil, 'Ver perfil completo')}
    <p style="margin:8px 0 0;font:400 13px/1.5 Inter,Arial,sans-serif;color:#6B7280;">Seu facilitador também recebeu o resultado e vai conduzir a conversa de devolutiva com você.</p>`;
  const rodape = `Este e-mail foi enviado automaticamente pelo Perfil Master após a conclusão da sua avaliação. Se não reconhece esta mensagem, basta ignorá-la.<br><a href="${esc(appUrl())}" style="color:#6366F1;text-decoration:none;">${esc(appUrl())}</a>`;
  const text = [
    `Sua devolutiva está pronta, ${primeiroNome(d.nome)}!`,
    '',
    `Perfil: ${p.nome}${d.secundario ? ' / ' + PERFIS[d.secundario].nome : ''}`,
    linhaScores(d.scores),
    d.pqScore != null ? `PQ Score: ${clamp(d.pqScore)}/100` : '',
    '',
    d.resumo || '',
    '',
    `Ver perfil completo: ${d.linkPerfil}`,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  return { subject, html: layout(subject, corpo, rodape), text };
}

export function emailFacilitador(d: DadosDevolutiva): { subject: string; html: string; text: string } {
  const p = PERFIS[d.dominante];
  const subject = `${d.nome} concluiu a avaliação — perfil ${p.nome}${d.secundario ? ' / ' + PERFIS[d.secundario].nome : ''}`;
  const corpo = `
    <h1 style="margin:0 0 6px;font:800 22px/1.25 Inter,Arial,sans-serif;color:#111827;">${esc(d.nome)} concluiu a avaliação</h1>
    <p style="margin:0 0 22px;font:400 15px/1.5 Inter,Arial,sans-serif;color:#4B5563;">O perfil já está disponível no painel, com a estratégia para o 1:1 e as perguntas de coaching.</p>
    ${blocoPerfil(d)}
    ${blocoResumo(d)}
    ${botao(d.linkPainel, 'Abrir no painel')}
    <p style="margin:8px 0 0;font:400 13px/1.5 Inter,Arial,sans-serif;color:#6B7280;">${d.email ? `A pessoa recebeu uma cópia resumida em ${esc(d.email)}.` : 'A pessoa não tem e-mail cadastrado — a devolutiva ficou só no app.'}</p>`;
  const rodape = `Você recebe este aviso porque "Avaliação concluída" está ativo em Configurações → Notificações no Perfil Master.`;
  const text = [
    `${d.nome} concluiu a avaliação.`,
    `Perfil: ${p.nome}${d.secundario ? ' / ' + PERFIS[d.secundario].nome : ''}`,
    linhaScores(d.scores),
    d.pqScore != null ? `PQ Score: ${clamp(d.pqScore)}/100` : '',
    '',
    `Abrir no painel: ${d.linkPainel}`,
  ].join('\n');
  return { subject, html: layout(subject, corpo, rodape), text };
}

/**
 * Resolve o facilitador (e-mail + preferência) e dispara os dois e-mails.
 * `adminUid` é o dono do tenant (app_groups.adminuid / app_users.adminuid / app_avaliados.adminuid).
 */
export async function notificarConclusao(d: DadosDevolutiva): Promise<ResultadoNotificacao> {
  const out: ResultadoNotificacao = { avaliado: false, facilitador: false };

  if (isEmail(d.email)) {
    const m = emailAvaliado(d);
    const r = await sendEmail({ to: d.email, ...m });
    out.avaliado = r.ok;
  }

  if (d.adminUid) {
    try {
      const sb = serviceClient();
      const { data: admin } = await sb
        .from('app_users')
        .select('email, notifications')
        .eq('uid', d.adminUid)
        .maybeSingle();
      const quer = admin?.notifications?.assessmentComplete !== false; // ausente = ligado
      const mesmoEmail = isEmail(admin?.email) && isEmail(d.email)
        && admin.email.trim().toLowerCase() === d.email.trim().toLowerCase();
      if (quer && isEmail(admin?.email) && !mesmoEmail) {
        const m = emailFacilitador(d);
        const r = await sendEmail({ to: admin.email, ...m });
        out.facilitador = r.ok;
      }
    } catch (e) {
      console.error('[devolutiva] falha ao notificar facilitador:', e);
    }
  }

  return out;
}
