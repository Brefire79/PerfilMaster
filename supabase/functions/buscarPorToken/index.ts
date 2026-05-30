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
      // D3: adicionado telefone — necessário para RelatorioOficial via URL direta e WhatsApp
      .select('nome, status, sessaoid, perfil, telefone')
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
      // D3: telefone incluído para RelatorioOficial e botão WhatsApp
      telefone: avaliado.telefone || null,
      sessaoTitulo: sessao?.titulo || 'Avaliação DISC',
      sessaoDescricao: sessao?.descricao || null,
      perfil: avaliado.perfil || null,
    }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'buscarPorToken failed' }, 500, req);
  }
});
