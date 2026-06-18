// assistenteCentral — Módulo 4 da Central de Gestão (Assistente IA).
//
// Arquitetura (NÃO usa texto→SQL livre):
//   1) CAMADA SEMÂNTICA: conjunto FIXO de consultas agregadas permitidas.
//   2) A IA (DeepSeek) só MAPEIA a pergunta → uma consulta permitida (ou "fora
//      de escopo"). Ela nunca gera SQL nem vê PII.
//   3) A app roda a consulta no Supabase (escopada por adminuid / k-anonimato).
//   4) A IA recebe SÓ o JSON agregado e anonimizado e narra de forma humana.
//
// Guardrails: sem PII ao DeepSeek; cache por (consulta+parâmetros); rate limit
// por admin; k-anonimato herdado do Módulo 3.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';
import { callAnthropic } from '../_shared/anthropic.ts';

const RATE_LIMIT = 30;                 // chamadas por janela
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

// ── Camada semântica: consultas permitidas (nome, params, descrição p/ a IA) ──
const CONSULTAS = {
  inteligencia_grupos: {
    descricao: 'Agregados anonimizados por grupo: distribuição DISC, médias DISC e taxa de conclusão. Use para perguntas sobre grupos, perfis predominantes, comparação entre grupos, conclusão.',
    params: { min_n: 'inteiro, mínimo de participantes p/ k-anonimato (default 5)' },
  },
  visao_geral: {
    descricao: 'Observabilidade do período: avaliações iniciadas, concluídas, taxa de conclusão e tempo médio. Use para perguntas sobre volume, engajamento, conclusão ao longo do tempo.',
    params: { dias: 'inteiro, janela em dias (ex.: 7, 30, 90); ausente = tudo' },
  },
} as const;

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function callerClient(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  return createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
    { global: { headers: { Authorization: authHeader } } },
  );
}

// Remove qualquer chave identificável de um objeto agregado (defesa em profundidade).
const PII_KEYS = new Set(['adminuid', 'uid', 'user_id', 'userid', 'nome', 'name', 'email', 'telefone', 'phone', 'cpf', 'token', 'group_id', 'id']);
function anonimizar<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(anonimizar) as unknown as T;
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (PII_KEYS.has(k.toLowerCase())) continue;
      out[k] = anonimizar(v);
    }
    return out as T;
  }
  return obj;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const sb = serviceClient();
    const { data: caller } = await sb.from('app_users').select('role').eq('uid', user.id).maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores.' }, 403, req);
    }

    const { pergunta } = await req.json();
    if (!pergunta || typeof pergunta !== 'string' || pergunta.trim().length < 2) {
      return jsonResponse({ error: 'Pergunta inválida.' }, 400, req);
    }
    const perguntaLimpa = pergunta.trim().slice(0, 500);

    // ── Rate limit por admin (janela móvel) ──────────────────────────────────
    const desde = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await sb
      .from('app_central_ai')
      .select('id', { count: 'exact', head: true })
      .eq('adminuid', user.id)
      .gte('criadoem', desde);
    if ((count ?? 0) >= RATE_LIMIT) {
      return jsonResponse({ error: `Limite de ${RATE_LIMIT} consultas/hora atingido. Tente mais tarde.` }, 429, req);
    }

    // ── 1) Mapeamento de intenção (IA → consulta permitida) ──────────────────
    const intentSystem = `Você roteia perguntas para UMA consulta agregada permitida de um app de avaliação comportamental. NÃO gere SQL. Responda SOMENTE JSON.
Consultas disponíveis:
${Object.entries(CONSULTAS).map(([k, v]) => `- ${k}: ${v.descricao} Params: ${JSON.stringify(v.params)}`).join('\n')}
Formato da resposta: {"query": "<nome ou null>", "params": {<parâmetros>}, "motivo": "<curto, em português>"}.
Se a pergunta NÃO puder ser respondida por nenhuma consulta, use "query": null e explique no "motivo" o que existe, sem inventar dados.`;

    const intent = await callAnthropic(intentSystem, perguntaLimpa, 400);
    const queryName = typeof intent?.query === 'string' ? intent.query : null;

    // Fora de escopo → modo conversa (não inventa dados).
    if (!queryName || !(queryName in CONSULTAS)) {
      return jsonResponse({
        modo: 'conversa',
        narrativa: intent?.motivo || 'Não há um recorte de dados disponível para essa pergunta. Posso responder sobre inteligência de grupos (DISC/conclusão) ou visão geral do período.',
        queryUsada: null,
      }, 200, req);
    }

    const params = intent?.params && typeof intent.params === 'object' ? intent.params : {};

    // ── Cache por (consulta + params) ────────────────────────────────────────
    const cacheKey = await sha256(`${queryName}:${JSON.stringify(params)}`);
    const { data: cached } = await sb
      .from('app_central_ai')
      .select('dados, narrativa, criadoem')
      .eq('adminuid', user.id)
      .eq('cache_key', cacheKey)
      .order('criadoem', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached && Date.now() - new Date(cached.criadoem).getTime() < CACHE_TTL_MS) {
      return jsonResponse({
        modo: 'dado', queryUsada: queryName, dados: cached.dados,
        narrativa: cached.narrativa, cacheHit: true,
      }, 200, req);
    }

    // ── 2) Roda a consulta permitida (escopo do caller) ──────────────────────
    const cc = callerClient(req);
    let dados: unknown = null;

    if (queryName === 'inteligencia_grupos') {
      const minN = Number(params.min_n) > 0 ? Math.floor(Number(params.min_n)) : 5;
      const { data, error } = await cc.rpc('central_group_insights', { min_n: minN });
      if (error) return jsonResponse({ error: `Falha na consulta: ${error.message}` }, 500, req);
      // Só agregados não suprimidos; remove identificadores.
      const linhas = (data || []).filter((l: Record<string, unknown>) => !l.suppressed);
      dados = {
        consulta: 'inteligencia_grupos',
        min_n: minN,
        grupos_exibidos: linhas.length,
        grupos_suprimidos: (data || []).length - linhas.length,
        grupos: anonimizar(linhas.map((l: Record<string, unknown>) => ({
          grupo: l.group_name,
          participantes: l.n_participantes,
          concluidas: l.n_concluidas,
          taxa_conclusao: l.taxa_conclusao,
          distribuicao_disc: l.disc_distribution,
          medias_disc: l.disc_scores_avg,
          pq_score_medio: l.pq_score_avg ?? null,
          sabotadores_medios: l.saboteurs_avg ?? null,
        }))),
      };
    } else if (queryName === 'visao_geral') {
      const dias = Number(params.dias) > 0 ? Math.floor(Number(params.dias)) : null;
      let q = cc.from('app_avaliados').select('status, criadoem, iniciadoem, concluidoem');
      if (dias) q = q.gte('criadoem', new Date(Date.now() - dias * 864e5).toISOString());
      const { data, error } = await q;
      if (error) return jsonResponse({ error: `Falha na consulta: ${error.message}` }, 500, req);
      const rows = data || [];
      const iniciadas = rows.filter((r: Record<string, unknown>) => r.status === 'em_andamento' || r.status === 'concluido' || r.iniciadoem).length;
      const concluidas = rows.filter((r: Record<string, unknown>) => r.status === 'concluido').length;
      let somaMin = 0, nTempo = 0;
      for (const r of rows as Record<string, string>[]) {
        if (r.status !== 'concluido') continue;
        const ini = r.iniciadoem || r.criadoem, fim = r.concluidoem;
        if (!ini || !fim) continue;
        const d = new Date(fim).getTime() - new Date(ini).getTime();
        if (d > 0) { somaMin += d / 60000; nTempo++; }
      }
      dados = {
        consulta: 'visao_geral',
        janela_dias: dias,
        criadas: rows.length,
        iniciadas,
        concluidas,
        taxa_conclusao: iniciadas > 0 ? Math.round((concluidas / iniciadas) * 100) : 0,
        tempo_medio_min: nTempo > 0 ? Math.round(somaMin / nTempo) : null,
      };
    }

    // ── 3) Narração humana (IA recebe SÓ o JSON agregado anonimizado) ─────────
    const narraSystem = `Você é o assistente analítico da Central de Gestão (Vianexx AI). Recebe um JSON com NÚMEROS AGREGADOS (sem nomes de pessoas) e a pergunta do facilitador. Escreva uma resposta clara e objetiva em português brasileiro, baseada SOMENTE nesses números — nunca invente dados nem cite indivíduos. Se um grupo foi suprimido por k-anonimato, mencione que houve recortes com amostra insuficiente. Responda SOMENTE JSON: {"narrativa": "<texto>"}.`;
    const narra = await callAnthropic(
      narraSystem,
      JSON.stringify({ pergunta: perguntaLimpa, dados }),
      1200,
    );
    const narrativa = typeof narra?.narrativa === 'string' ? narra.narrativa : 'Não foi possível gerar a análise.';

    // ── Persiste (cache + rate-limit log). Nunca há PII em `dados`. ───────────
    await sb.from('app_central_ai').insert({
      adminuid: user.id,
      cache_key: cacheKey,
      pergunta: perguntaLimpa,
      query_name: queryName,
      params,
      dados,
      narrativa,
    });

    return jsonResponse({ modo: 'dado', queryUsada: queryName, dados, narrativa, cacheHit: false }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'assistenteCentral failed' }, 500, req);
  }
});
