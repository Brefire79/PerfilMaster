import { callAnthropic } from '../_shared/anthropic.ts';
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';

/**
 * insightPerfil
 * Gera análise completa de um perfil DISC já calculado.
 * Payload: { perfil, nome, idioma? }
 * Retorna: { insight, forcas, desafios, carreiras, comunicacao, desenvolvimento, palavrasChave }
 */

function buildSystemPrompt() {
  return `Você é um especialista em psicologia organizacional, desenvolvimento humano e orientação de carreira.
Analisa perfis comportamentais DISC já calculados e gera análises ricas, práticas e positivas.

REGRAS:
- Foco em desenvolvimento, potencial e autoconhecimento
- Linguagem acessível, encorajadora e profissional
- NUNCA mencione diagnósticos clínicos, transtornos ou riscos psiquiátricos
- NUNCA mencione suicídio, homicídio ou desvios graves de personalidade
- Responda SOMENTE em JSON válido, sem texto adicional
- Idioma: português do Brasil`;
}

function buildUserMessage(perfil: any, nome: string) {
  const d = Number(perfil?.dominante ?? perfil?.scores?.D ?? 0);
  const i = Number(perfil?.influente ?? perfil?.scores?.I ?? 0);
  const s = Number(perfil?.estavel ?? perfil?.scores?.S ?? 0);
  const c = Number(perfil?.analitico ?? perfil?.scores?.C ?? 0);
  const prim = perfil?.perfilPrimario ?? perfil?.dominantProfile ?? 'D';
  const sec = perfil?.perfilSecundario ?? perfil?.secondaryProfile ?? null;

  const nomes: Record<string, string> = {
    D: 'Dominante (Executor)',
    I: 'Influente (Comunicador)',
    S: 'Estável (Colaborador)',
    C: 'Analítico (Conforme)',
  };

  return `Analise o perfil DISC de "${nome}":

Perfil primário: ${nomes[prim] || prim}
${sec ? `Perfil secundário: ${nomes[sec] || sec}` : ''}
Distribuição: D=${d}% | I=${i}% | S=${s}% | C=${c}%

Gere uma análise completa e positiva. Retorne SOMENTE este JSON:
{
  "insight": "<parágrafo rico de 3-4 linhas descrevendo quem é essa pessoa, como pensa e age>",
  "forcas": ["<força 1>", "<força 2>", "<força 3>", "<força 4>", "<força 5>"],
  "desafios": ["<área de desenvolvimento 1>", "<área de desenvolvimento 2>", "<área de desenvolvimento 3>"],
  "carreiras": ["<área/cargo ideal 1>", "<área/cargo ideal 2>", "<área/cargo ideal 3>", "<área/cargo ideal 4>"],
  "comunicacao": "<como essa pessoa se comunica e prefere receber informações — 2 linhas>",
  "desenvolvimento": "<dicas práticas de crescimento pessoal e profissional — 2-3 linhas>",
  "palavrasChave": ["<palavra 1>", "<palavra 2>", "<palavra 3>", "<palavra 4>", "<palavra 5>"]
}`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { perfil, nome, geminiKey } = await req.json();
    if (!perfil || !nome) {
      return jsonResponse({ error: 'perfil e nome são obrigatórios' }, 400, req);
    }

    // D2a: auth é opcional — sem chave do usuário, usa fallback GEMINI_API_KEY do servidor.
    // Necessário para ResultadoPublico (/resultado/:token) que é acessado sem login.
    // Quando chamado por admin (Sessoes/RelatorioOficial), geminiKey vem do localStorage.
    const caller = await getAuthenticatedUser(req);
    const resolvedKey = geminiKey || null;

    // Se não autenticado e sem geminiKey, ainda tenta com a env var do servidor (fallback).
    // callAnthropic já lida com chave ausente lançando erro humanizado.
    const result = await callAnthropic(
      buildSystemPrompt(),
      buildUserMessage(perfil, nome),
      1200,
      resolvedKey
    );

    // Normalizar resposta
    const safe = {
      insight: typeof result?.insight === 'string' ? result.insight : '',
      forcas: Array.isArray(result?.forcas) ? result.forcas.slice(0, 6) : [],
      desafios: Array.isArray(result?.desafios) ? result.desafios.slice(0, 4) : [],
      carreiras: Array.isArray(result?.carreiras) ? result.carreiras.slice(0, 5) : [],
      comunicacao: typeof result?.comunicacao === 'string' ? result.comunicacao : '',
      desenvolvimento: typeof result?.desenvolvimento === 'string' ? result.desenvolvimento : '',
      palavrasChave: Array.isArray(result?.palavrasChave) ? result.palavrasChave.slice(0, 6) : [],
    };

    return jsonResponse(safe, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'insightPerfil failed' }, 500, req);
  }
});
