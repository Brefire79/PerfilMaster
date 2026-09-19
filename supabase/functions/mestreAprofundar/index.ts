// mestreAprofundar — Mestre v2, modo aprofundado com IA (Fase 4, opcional).
//
// O chat continua 100% local. Quando o facilitador clica "Aprofundar com IA"
// numa resposta COM DADOS, o cliente manda a pergunta + o JSON agregado que o
// motor local já calculou. Aqui:
//   1) JWT + role admin;  2) rate limit 30/h por admin (app_central_ai);
//   3) ANONIMIZAÇÃO no servidor (nomes, e-mails, ids, tokens, listas nominais
//      viram contagens) — a IA nunca vê quem é quem, mesmo para consultas por
//      pessoa (abordagem_pessoa / evolucao_pessoa: só scores, PQ, sabotadores,
//      regra e sugestão);  4) DeepSeek redige interpretação + próximos passos;
//   5) persiste em app_central_ai (cache/auditoria de uso, sem PII).
// Substitui a antiga assistenteCentral (que roteava a pergunta por IA).
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';
import { callAnthropic } from '../_shared/anthropic.ts';

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const CONSULTAS_PERMITIDAS = new Set([
  'pendencias', 'abordagem_turma', 'abordagem_pessoa', 'evolucao_pessoa', 'ciclos',
  'inteligencia_grupos', 'visao_geral', 'contagem', 'saude_status',
]);

// Chaves que identificam alguém — removidas em qualquer profundidade.
const PII_KEYS = new Set(['adminuid', 'uid', 'user_id', 'userid', 'nome', 'name', 'email', 'telefone', 'phone', 'cpf', 'token', 'group_id', 'groupid', 'id', 'avaliado_id', 'avaliadoid', 'pessoa_nome', 'pessoanome']);
// Listas nominais → só a contagem.
const LISTAS_NOMINAIS = new Set(['pessoas_em_aberto', 'testes_vencidos', 'testes_vencem_7d', 'aguardando']);

function anonimizar(obj: unknown, chavePai = ''): unknown {
  if (Array.isArray(obj)) {
    if (LISTAS_NOMINAIS.has(chavePai)) return { quantidade: obj.length };
    return obj.map((v) => anonimizar(v, chavePai));
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const kl = k.toLowerCase();
      if (PII_KEYS.has(kl)) continue;
      if (kl === 'grupo' && typeof v === 'string') { out[k] = 'a turma'; continue; }
      out[k] = anonimizar(v, k);
    }
    return out;
  }
  if (typeof obj === 'string') return obj.slice(0, 400);
  return obj;
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);
    const sb = serviceClient();
    const { data: caller } = await sb.from('app_users').select('role').eq('uid', user.id).maybeSingle();
    if (caller?.role !== 'admin') return jsonResponse({ error: 'Apenas administradores.' }, 403, req);

    const { pergunta, consulta, dados } = await req.json(); // a narrativa local (tem nomes) NÃO é enviada
    if (!consulta || !CONSULTAS_PERMITIDAS.has(consulta)) return jsonResponse({ error: 'Consulta não permitida.' }, 400, req);
    if (!dados || typeof dados !== 'object') return jsonResponse({ error: 'Sem dados para aprofundar.' }, 400, req);
    const perguntaLimpa = String(pergunta || '').trim().slice(0, 300);

    // Rate limit por admin (mesma tabela/janela do antigo assistente).
    const desde = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await sb.from('app_central_ai').select('id', { count: 'exact', head: true }).eq('adminuid', user.id).gte('criadoem', desde);
    if ((count ?? 0) >= RATE_LIMIT) return jsonResponse({ error: `Limite de ${RATE_LIMIT} aprofundamentos por hora atingido. Tente mais tarde.` }, 429, req);

    const dadosAnon = anonimizar(dados) as Record<string, unknown>;

    const system = `Você é o Mestre, assistente de um facilitador que aplica avaliações comportamentais (DISC + Sabotadores/PQ) e Testes Dirigidos de desenvolvimento no Perfil Master. Recebe um JSON com NÚMEROS AGREGADOS ou o perfil de UMA pessoa SEM identificação (chame-a de "a pessoa"), mais a pergunta original. Escreva em português brasileiro, como uma pessoa experiente conversando: frases de tamanhos variados, sem travessão, sem listas de três forçadas, sem floreio.
Objetivo: aprofundar a leitura que o app já deu (interpretação comportamental, riscos, como conduzir a conversa de devolutiva, próximos passos práticos para o facilitador). Baseie-se SOMENTE no JSON; não invente números nem cite nomes. Se houver "sugestao" com módulo/regra, explique por que faz sentido e como introduzir o teste à pessoa. Se houver alerta de aquiescência, oriente a ler o DISC com cautela. Termine com 2 a 4 ações concretas para esta semana.
Responda SOMENTE JSON: {"narrativa": "<texto com parágrafos separados por \\n>"}.`;

    const out = await callAnthropic(system, JSON.stringify({ pergunta: perguntaLimpa, consulta, dados: dadosAnon }), 1400);
    const narrativa = typeof out?.narrativa === 'string' ? out.narrativa.trim() : 'Não foi possível gerar o aprofundamento.';

    const cacheKey = await sha256(`aprofundar:${consulta}:${JSON.stringify(dadosAnon)}`);
    await sb.from('app_central_ai').insert({
      adminuid: user.id, cache_key: cacheKey, pergunta: perguntaLimpa, query_name: `aprofundar:${consulta}`,
      params: {}, dados: dadosAnon, narrativa,
    });

    return jsonResponse({ narrativa }, 200, req);
  } catch (err) {
    console.error('[mestreAprofundar] erro:', err);
    return jsonResponse({ error: 'Não foi possível aprofundar agora. Tente novamente em instantes.' }, 500, req);
  }
});
