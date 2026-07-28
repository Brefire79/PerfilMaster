import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { checarRateLimit, CORPO_429 } from '../_shared/rateLimit.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // A4: função pública sem limite era martelável à vontade.
    const limite = await checarRateLimit(req, 'buscarPorToken', 60, 5);
    if (limite.limitado) return jsonResponse(CORPO_429, 429, req);

    const { token } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 100) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const { data: avaliado, error: avaliadoError } = await supabase
      .from('app_avaliados')
      // DELTA 8: telefone removido da resposta pública (PII) — RelatorioOficial
      // (admin autenticado) obtém telefone via getAvaliadoByToken/REST com RLS.
      // DELTA 7: lê cpf só para derivar o booleano temCpf (NUNCA expõe o valor)
      .select('nome, status, sessaoid, perfil, cpf')
      .eq('token', token)
      .single();

    if (avaliadoError || !avaliado) {
      return jsonResponse({ error: 'Token inválido ou expirado.' }, 404, req);
    }

    const { data: sessao } = await supabase
      .from('app_sessoes')
      .select('titulo, descricao')
      .eq('id', avaliado.sessaoid)
      .single();

    return jsonResponse({
      nome: avaliado.nome,
      status: avaliado.status,
      sessaoTitulo: sessao?.titulo || 'Avaliação DISC',
      sessaoDescricao: sessao?.descricao || null,
      perfil: avaliado.perfil || null,
      // DELTA 7: só informa SE há CPF (boolean), nunca o valor — privacidade LGPD
      temCpf: Boolean(avaliado.cpf),
    }, 200, req);
  } catch (err) {
    // A4: antes devolvia a mensagem crua do erro para um chamador ANÔNIMO —
    // texto do Postgres com nome de tabela, coluna e constraint. O detalhe
    // fica no log do servidor; o cliente recebe algo genérico.
    console.error('[buscarPorToken] erro inesperado:', err);
    return jsonResponse({ error: 'Não foi possível carregar sua avaliação. Tente novamente.' }, 500, req);
  }
});
