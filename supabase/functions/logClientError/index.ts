import { handleCors } from '../_shared/response.ts';
import { serviceClient } from '../_shared/auth.ts';
import { checarRateLimit } from '../_shared/rateLimit.ts';

/**
 * logClientError — telemetria de erros do navegador (M2 da auditoria 27/07/2026).
 *
 * Antes, `src/lib/clientErrors.js` gravava em sessionStorage: o erro sumia ao
 * fechar a aba e o Breno nunca ficava sabendo. Um avaliado que travasse no meio
 * das 78 questões simplesmente desistia em silêncio.
 *
 * Pública de propósito — o erro mais importante de capturar é justamente o do
 * avaliado anônimo no link do WhatsApp, que não tem sessão. Por isso:
 *   - rate limit apertado (um cliente com defeito não pode inundar a tabela);
 *   - allowlist de campos, tudo truncado;
 *   - redação de PII no servidor, sem confiar no que o cliente mandou.
 *
 * Responde 204 sempre que possível: telemetria nunca deve virar um segundo erro
 * na tela de quem já está com problema.
 */

const LIMITE_TEXTO = 300;
const ORIGENS = new Set(['admin', 'aluno', 'publico']);

/**
 * Remove identificadores diretos. O front já faz isso em `safeText`, mas o
 * servidor não confia no cliente — qualquer um pode chamar este endpoint.
 */
function redigir(valor: unknown, max = LIMITE_TEXTO): string | null {
  if (valor == null) return null;
  const texto = String(valor)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{11}\b/g, '[documento]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uuid]')
    .replace(/([?#&](?:token|token_hash|access_token|refresh_token)=)[^&\s]+/gi, '$1[redacted]')
    .trim();
  return texto ? texto.slice(0, max) : null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const limite = await checarRateLimit(req, 'logClientError', 30, 5);
    if (limite.limitado) return new Response(null, { status: 204 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return new Response(null, { status: 204 });

    const origem = ORIGENS.has(body.origem) ? body.origem : 'publico';
    const mensagem = redigir(body.mensagem);
    if (!mensagem) return new Response(null, { status: 204 });

    const sb = serviceClient();
    const { error } = await sb.from('app_client_errors').insert({
      // adminuid só é aceito quando vem de área logada; no fluxo público fica
      // NULL e só o superadmin enxerga.
      adminuid: origem === 'admin' ? redigir(body.adminuid, 64) : null,
      origem,
      rota: redigir(body.rota, 120),
      fonte: redigir(body.fonte, 80),
      mensagem,
      codigo: redigir(body.codigo, 60),
      versao: redigir(body.versao, 40),
      navegador: redigir(req.headers.get('user-agent'), 180),
    });

    if (error) console.error('[logClientError] insert falhou:', error.message);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[logClientError] exceção:', err);
    // Nunca propaga: quem chamou já está tratando um erro.
    return new Response(null, { status: 204 });
  }
});
