// cicloResponder — envio do Teste Dirigido pelo link público, DELTA 26.
// Pública (token = credencial). Sanitiza (só ids do teste, 1..5, completo),
// pontua NO SERVIDOR com o espelho gerado do catálogo e grava (o trigger do
// banco registra `cycle_completed` na trilha de auditoria). Idempotente: já concluído → 409.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { checarRateLimit, CORPO_429 } from '../_shared/rateLimit.ts';
import { TESTES_POR_CODIGO, pontuarTesteDirigido, sanitizarRespostas } from '../_shared/testesDirigidos.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const limite = await checarRateLimit(req, 'cicloResponder', 20, 5);
    if (limite.limitado) return jsonResponse(CORPO_429, 429, req);

    const { token, respostas } = await req.json();
    if (!token || typeof token !== 'string' || !UUID.test(token)) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const { data: ciclo, error } = await supabase
      .from('app_ciclos')
      .select('id, adminuid, groupid, pessoa_tipo, avaliado_id, uid, modulo_codigo, modulo_versao, status')
      .eq('token', token)
      .maybeSingle();

    if (error || !ciclo) return jsonResponse({ error: 'Link inválido ou expirado.' }, 404, req);
    if (ciclo.status === 'concluido') return jsonResponse({ error: 'Este teste já foi respondido.', code: 'ciclo/concluido' }, 409, req);
    if (ciclo.status === 'descartado') return jsonResponse({ error: 'Este teste foi cancelado pelo facilitador.', code: 'ciclo/descartado' }, 410, req);
    if (!TESTES_POR_CODIGO[ciclo.modulo_codigo]) return jsonResponse({ error: 'Teste indisponível.' }, 404, req);

    // A3/A1 (mesma disciplina do atualizarStatus): allowlist de ids, 1..5, completo.
    const limpas = sanitizarRespostas(ciclo.modulo_codigo, respostas);
    if (!limpas) {
      return jsonResponse({ error: 'Responda todas as perguntas antes de enviar.', code: 'ciclo/incompleto' }, 422, req);
    }
    const resultado = pontuarTesteDirigido(ciclo.modulo_codigo, limpas);
    if (!resultado || resultado.geral == null) {
      return jsonResponse({ error: 'Não foi possível pontuar o teste.' }, 500, req);
    }

    const agora = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('app_ciclos')
      .update({
        respostas: limpas,
        resultado: { subescalas: resultado.subescalas, geral: resultado.geral, versao: resultado.versao },
        status: 'concluido',
        concluido_em: agora,
      })
      .eq('id', ciclo.id)
      .eq('status', ciclo.status); // corrida: se outro envio concluiu antes, não sobrescreve

    if (upErr) {
      console.error('[cicloResponder] falha ao gravar:', upErr);
      return jsonResponse({ error: 'Não foi possível salvar suas respostas. Tente novamente.' }, 500, req);
    }

    // Auditoria (cycle_completed) é gravada pelo trigger app_ciclos_audit no banco —
    // vale para os 3 canais e não depende de quem chamou.

    return jsonResponse({
      success: true,
      resultado: { subescalas: resultado.subescalas, geral: resultado.geral, versao: resultado.versao },
    }, 200, req);
  } catch (err) {
    console.error('[cicloResponder] erro inesperado:', err);
    return jsonResponse({ error: 'Não foi possível enviar o teste. Tente novamente.' }, 500, req);
  }
});
