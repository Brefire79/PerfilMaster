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
    if (!token) return jsonResponse({ error: 'token is required' }, 400);

    const { data: avaliado, error: avaliadoError } = await supabase
      .from('app_avaliados')
      .select('*')
      .eq('token', token)
      .single();

    if (avaliadoError || !avaliado) {
      return jsonResponse({ error: 'Token inválido ou expirado.' }, 404);
    }

    const { data: sessao } = await supabase
      .from('app_sessoes')
      .select('*')
      .eq('id', avaliado.sessaoId)
      .single();

    return jsonResponse({
      nome: avaliado.nome,
      status: avaliado.status,
      sessaoTitulo: sessao?.titulo || 'Avaliação DISC',
      sessaoDescricao: sessao?.descricao || null,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'buscarPorToken failed' }, 500);
  }
});
