import { serviceClient } from './auth.ts';

/**
 * Rate limit das Edge Functions PÚBLICAS (A4 da auditoria de 27/07/2026).
 *
 * `buscarPorToken`, `atualizarStatus` e `validateInviteToken` são chamáveis por
 * qualquer um que tenha (ou adivinhe) um token, e não tinham nenhum limite:
 * dava para martelar à vontade — enumerar tokens, encher `app_sessao_respostas`
 * de lixo, ou simplesmente queimar a cota do projeto.
 *
 * Contador persistido em `app_rate_limit` (DELTA 20). Não é preciso ao
 * milissegundo — e não precisa ser: o objetivo é cortar automação grosseira,
 * não fazer contabilidade.
 *
 * IMPORTANTE: o IP nunca é gravado em claro. Guardamos um hash com sal do
 * projeto, que serve para contar sem identificar ninguém.
 */

const encoder = new TextEncoder();

/** Identificador estável e anônimo de quem chamou. */
async function identificador(req: Request): Promise<string> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'desconhecido';
  const sal = Deno.env.get('SUPABASE_URL') || 'perfilmaster';
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(`${sal}:${ip}`));
  return Array.from(new Uint8Array(buffer))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface LimiteExcedido {
  limitado: true;
  tentativas: number;
}
export interface LimiteOk {
  limitado: false;
}

/**
 * checarRateLimit — conta chamadas na janela e registra a atual.
 *
 * @param req      requisição (de onde sai o identificador)
 * @param bucket   nome da função, para não misturar contadores
 * @param limite   máximo de chamadas na janela
 * @param janelaMin tamanho da janela em minutos
 *
 * Falha aberta de propósito: se o banco não responder, a chamada PASSA. Um
 * problema no contador não pode derrubar a avaliação de quem está respondendo.
 */
export async function checarRateLimit(
  req: Request,
  bucket: string,
  limite = 30,
  janelaMin = 5,
): Promise<LimiteOk | LimiteExcedido> {
  try {
    const sb = serviceClient();
    const ident = await identificador(req);
    const desde = new Date(Date.now() - janelaMin * 60_000).toISOString();

    const { count, error } = await sb
      .from('app_rate_limit')
      .select('id', { count: 'exact', head: true })
      .eq('bucket', bucket)
      .eq('ident', ident)
      .gte('criadoem', desde);

    if (error) {
      console.warn('[rateLimit] contagem falhou, liberando:', error.message);
      return { limitado: false };
    }

    const tentativas = count ?? 0;
    if (tentativas >= limite) {
      console.warn(`[rateLimit] ${bucket}: ${tentativas} chamadas na janela — bloqueado.`);
      return { limitado: true, tentativas };
    }

    // Registra a chamada atual (best-effort).
    await sb.from('app_rate_limit').insert({ bucket, ident });

    // Poda oportunística: sem cron no Free tier, alguém precisa limpar.
    // ~1% das chamadas pagam esse custo.
    if (Math.random() < 0.01) {
      await sb.rpc('podar_telemetria').catch(() => {});
    }

    return { limitado: false };
  } catch (e) {
    console.warn('[rateLimit] exceção, liberando:', e);
    return { limitado: false };
  }
}

/** Corpo padrão da resposta 429. */
export const CORPO_429 = {
  error: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  code: 'rate/limited',
};
