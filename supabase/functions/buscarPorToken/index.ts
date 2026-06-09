import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
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
    return jsonResponse({ error: (err as Error).message || 'buscarPorToken failed' }, 500, req);
  }
});
