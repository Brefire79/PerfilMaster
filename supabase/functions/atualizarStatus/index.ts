import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularPerfil } from '../_shared/disc.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const TRANSICOES_VALIDAS: Record<string, string[]> = {
  pendente: ['em_andamento'],
  em_andamento: ['concluido'],
  concluido: [],
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { token, novoStatus, respostas } = await req.json();
    if (!token) return jsonResponse({ error: 'token is required' }, 400);
    if (!novoStatus) return jsonResponse({ error: 'novoStatus is required' }, 400);

    const { data: avaliado, error: avaliadoError } = await supabase
      .from('app_avaliados')
      .select('*')
      .eq('token', token)
      .single();

    if (avaliadoError || !avaliado) {
      return jsonResponse({ error: 'Token inválido ou expirado.' }, 404);
    }

    const statusAtual = avaliado.status;
    if (!TRANSICOES_VALIDAS[statusAtual]?.includes(novoStatus)) {
      return jsonResponse({ error: `Transição inválida: ${statusAtual} -> ${novoStatus}` }, 400);
    }

    const agora = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: novoStatus,
      atualizadoEm: agora,
    };
    if (novoStatus === 'em_andamento') payload.iniciadoEm = agora;

    let perfil: Record<string, unknown> | null = null;
    if (novoStatus === 'concluido') {
      if (!respostas || typeof respostas !== 'object' || Object.keys(respostas).length === 0) {
        return jsonResponse({ error: 'respostas are required to conclude' }, 400);
      }
      perfil = calcularPerfil(respostas);
      payload.respostas = respostas;
      payload.perfil = perfil;
      payload.concluidoEm = agora;

      await supabase.from('app_sessao_respostas').insert({
        avaliadoId: avaliado.id || avaliado.token,
        sessaoId: avaliado.sessaoId,
        respostas,
        submissaoEm: agora,
      });
    }

    await supabase.from('app_avaliados').update(payload).eq('token', token);

    return jsonResponse({ success: true, ...(perfil ? { perfil } : {}) });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'atualizarStatus failed' }, 500);
  }
});
