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
  saude_status: {
    descricao: 'Saúde e status operacional do app para este facilitador: versão atual, se há atualização disponível, nº de grupos e alunos, avaliações pendentes/em andamento/concluídas, última atividade, itens parados e ALERTAS de anomalia (avaliações travadas, queda de conclusão, inatividade). Use para "como está o app", "está tudo certo?", "tem algo anormal?", "qual a versão", monitoramento e diagnóstico. NÃO cobre erros de código/runtime.',
    params: {},
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

    const { pergunta, contexto } = await req.json();
    if (!pergunta || typeof pergunta !== 'string' || pergunta.trim().length < 2) {
      return jsonResponse({ error: 'Pergunta inválida.' }, 400, req);
    }
    const perguntaLimpa = pergunta.trim().slice(0, 500);

    // Contexto da sessão (consciência de contexto) — sem PII, campos curtos.
    const ctx = contexto && typeof contexto === 'object' ? contexto as Record<string, unknown> : {};
    const contextoSeguro = {
      tela: typeof ctx.tela === 'string' ? ctx.tela.slice(0, 60) : null,
      appVersion: typeof ctx.appVersion === 'string' ? ctx.appVersion.slice(0, 20) : null,
      atualizacaoDisponivel: !!ctx.atualizacaoDisponivel,
    };

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
        narrativa: intent?.motivo || 'Não há um recorte de dados disponível para essa pergunta. Posso responder sobre inteligência de grupos (DISC/conclusão), visão geral do período ou a saúde e o status do app.',
        queryUsada: null,
      }, 200, req);
    }

    const params = intent?.params && typeof intent.params === 'object' ? intent.params : {};

    // ── Cache por (consulta + params) ────────────────────────────────────────
    // saude_status é tempo-sensível (status operacional) → sempre fresco.
    const cacheKey = await sha256(`${queryName}:${JSON.stringify(params)}`);
    if (queryName !== 'saude_status') {
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
    } else if (queryName === 'saude_status') {
      const agora = Date.now();
      const D7 = 7 * 864e5, D14 = 14 * 864e5;

      // Avaliações de sessão do facilitador (RLS: escopo do caller).
      const { data: avRows } = await cc.from('app_avaliados').select('status, criadoem, iniciadoem, concluidoem');
      const av = (avRows || []) as Record<string, string>[];
      const pendentes = av.filter((r) => r.status === 'pendente').length;
      const emAndamento = av.filter((r) => r.status === 'em_andamento').length;
      const concluidas = av.filter((r) => r.status === 'concluido').length;
      const concluidas7d = av.filter((r) => r.status === 'concluido' && r.concluidoem && agora - new Date(r.concluidoem).getTime() < D7).length;
      const iniciadas = av.filter((r) => r.status === 'em_andamento' || r.status === 'concluido' || r.iniciadoem).length;
      const paradas = av.filter((r) => r.status === 'em_andamento' && (r.iniciadoem || r.criadoem) && agora - new Date(r.iniciadoem || r.criadoem).getTime() > D7).length;

      // Última atividade (qualquer timestamp relevante).
      let ultima = 0;
      for (const r of av) {
        for (const ts of [r.concluidoem, r.iniciadoem, r.criadoem]) {
          if (ts) { const t = new Date(ts).getTime(); if (t > ultima) ultima = t; }
        }
      }

      // Grupos e alunos do facilitador (tolerante a erro de RLS).
      const { count: nGrupos } = await cc.from('app_groups').select('id', { count: 'exact', head: true });
      const { data: alunosRows } = await cc.from('app_users').select('createdat').eq('role', 'student');
      const alunos = (alunosRows || []) as Record<string, string>[];
      const alunos7d = alunos.filter((u) => u.createdat && agora - new Date(u.createdat).getTime() < D7).length;

      const taxa = iniciadas > 0 ? Math.round((concluidas / iniciadas) * 100) : 0;
      const diasSemAtividade = ultima ? Math.floor((agora - ultima) / 864e5) : null;

      // ── Detecção de anomalias (sinais derivados dos dados) ──
      const alertas: string[] = [];
      if (paradas > 0) alertas.push(`${paradas} avaliação(ões) iniciada(s) há mais de 7 dias sem conclusão.`);
      if (iniciadas >= 5 && taxa < 30) alertas.push(`Taxa de conclusão baixa (${taxa}%).`);
      if ((pendentes + emAndamento) > 0 && concluidas7d === 0) alertas.push('Nenhuma conclusão nos últimos 7 dias, mas há avaliações em aberto.');
      if (ultima && agora - ultima > D14) alertas.push(`Sem atividade há ${diasSemAtividade} dias.`);
      if (contextoSeguro.atualizacaoDisponivel) alertas.push('Há uma atualização do app disponível — recarregue para aplicar.');

      dados = {
        consulta: 'saude_status',
        app_version: contextoSeguro.appVersion,
        atualizacao_disponivel: contextoSeguro.atualizacaoDisponivel,
        grupos: nGrupos ?? 0,
        alunos: alunos.length,
        alunos_novos_7d: alunos7d,
        avaliacoes: { pendentes, em_andamento: emAndamento, concluidas, concluidas_7d: concluidas7d },
        taxa_conclusao: taxa,
        avaliacoes_paradas: paradas,
        dias_sem_atividade: diasSemAtividade,
        alertas,
        status_geral: alertas.length === 0 ? 'saudavel' : (paradas > 0 || (iniciadas >= 5 && taxa < 30) ? 'atencao' : 'observar'),
      };
    }

    // ── 3) Narração humana (IA recebe SÓ o JSON agregado anonimizado) ─────────
    const narraSystem = `Você é o Mestre, o assistente do Perfil Master (Vianexx AI), especialista comportamental e de gestão. Recebe um JSON com NÚMEROS AGREGADOS (sem nomes de pessoas), o contexto da sessão e a pergunta do facilitador. Escreva uma resposta clara, objetiva e acolhedora em português brasileiro, baseada SOMENTE nesses números. Nunca invente dados nem cite indivíduos.
- Fale como uma pessoa: frases de tamanhos variados, sem travessão (—), sem floreio publicitário e sem forçar listas de três. Vá direto ao ponto.
- Pode dar ORIENTAÇÕES práticas e próximos passos a partir dos números (ex.: cobrar avaliações paradas, reforçar grupos com baixa conclusão).
- Se a consulta for "saude_status": resuma o status, destaque os "alertas" de anomalia (se houver) e oriente o que fazer; se não houver alertas, tranquilize que está tudo saudável. Lembre que você monitora dados (volume, conclusão, itens parados, versão), não erros internos de código.
- Se um grupo foi suprimido por k-anonimato, mencione que houve recortes com amostra insuficiente.
Responda SOMENTE JSON: {"narrativa": "<texto>"}.`;
    const narra = await callAnthropic(
      narraSystem,
      JSON.stringify({ pergunta: perguntaLimpa, contexto: contextoSeguro, dados }),
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
