// cicloPorToken — link público do Teste Dirigido (/teste/:token), DELTA 26.
// Pública: o token UUID é a credencial. Devolve só o necessário para responder
// (primeiro nome, teste, itens, status) — nunca telefone/CPF/e-mail.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { checarRateLimit, CORPO_429 } from '../_shared/rateLimit.ts';
import { TESTES_POR_CODIGO } from '../_shared/testesDirigidos.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const limite = await checarRateLimit(req, 'cicloPorToken', 60, 5);
    if (limite.limitado) return jsonResponse(CORPO_429, 429, req);

    const { token } = await req.json();
    if (!token || typeof token !== 'string' || !UUID.test(token)) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const { data: ciclo, error } = await supabase
      .from('app_ciclos')
      .select('id, pessoa_nome, modulo_codigo, modulo_versao, status, prazo_em, resultado, concluido_em')
      .eq('token', token)
      .maybeSingle();

    if (error || !ciclo) return jsonResponse({ error: 'Link inválido ou expirado.' }, 404, req);
    if (ciclo.status === 'descartado') return jsonResponse({ error: 'Este teste foi cancelado pelo facilitador.' }, 410, req);

    const teste = TESTES_POR_CODIGO[ciclo.modulo_codigo];
    if (!teste) return jsonResponse({ error: 'Teste indisponível.' }, 404, req);

    const primeiroNome = String(ciclo.pessoa_nome || '').trim().split(/\s+/)[0] || null;

    return jsonResponse({
      nome: primeiroNome,
      status: ciclo.status,
      prazoEm: ciclo.prazo_em,
      teste: {
        codigo: teste.codigo,
        versao: teste.versao,
        titulo: teste.titulo,
        foco: teste.foco,
        subescalas: teste.subescalas,
        // itens sem o flag `invertido` — o respondente não precisa saber qual é qual
        itens: teste.itens.map((i) => ({ id: i.id, texto: i.texto })),
      },
      // resultado só depois de concluído (o respondente vê o próprio)
      resultado: ciclo.status === 'concluido' ? ciclo.resultado : null,
      concluidoEm: ciclo.concluido_em,
    }, 200, req);
  } catch (err) {
    console.error('[cicloPorToken] erro inesperado:', err);
    return jsonResponse({ error: 'Não foi possível carregar o teste. Tente novamente.' }, 500, req);
  }
});
