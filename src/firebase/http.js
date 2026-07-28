/**
 * http.js — camada única de rede do Perfil Master.
 *
 * Por que existe (C1 da auditoria de 27/07/2026):
 * nenhum `fetch` do app tinha timeout. Quando o projeto Supabase pausa por
 * inatividade (Free tier) ou o backend fica lento, a promise do fetch nunca
 * resolve — `useAuth` fica preso, `initialized` nunca vira true e o app exibe
 * "Carregando..." para sempre, sem erro e sem retry. O avaliado no link público
 * ficava travado em "Verificando seu link...".
 *
 * Toda requisição passa a ter prazo, e a falha vira um erro CLASSIFICADO que a
 * UI sabe traduzir (offline / servidor fora / demora).
 */

/** Prazos por tipo de chamada (ms). IA demora mais que leitura de tabela. */
export const TIMEOUT = {
  DB: 12000,      // PostgREST / RPC
  AUTH: 12000,    // GoTrue
  FUNCTION: 30000, // Edge Functions (algumas chamam IA)
};

export const ERR = {
  TIMEOUT: 'backend/timeout',
  OFFLINE: 'backend/offline',
  UNREACHABLE: 'backend/unreachable',
};

/** true se o erro veio da camada de transporte (não é 4xx/5xx da aplicação). */
export function isBackendDown(error) {
  return typeof error?.code === 'string' && error.code.startsWith('backend/');
}

/**
 * Mensagem pronta para o usuário final. Curta, honesta, sem jargão.
 */
export function mensagemDeRede(error) {
  switch (error?.code) {
    case ERR.OFFLINE:
      return 'Você parece estar sem internet. Verifique a conexão e tente de novo.';
    case ERR.TIMEOUT:
      return 'O servidor demorou demais para responder. Tente novamente em instantes.';
    case ERR.UNREACHABLE:
      return 'Não conseguimos falar com o servidor agora. Tente novamente em instantes.';
    default:
      return error?.message || 'Erro inesperado. Tente novamente.';
  }
}

function erroDeRede(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * fetchComTimeout — `fetch` com prazo e erro classificado.
 *
 * Só aborta a espera; NÃO transforma respostas HTTP (4xx/5xx passam direto para
 * quem chamou, que já sabe interpretá-las).
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} ms prazo máximo
 * @returns {Promise<Response>}
 */
export async function fetchComTimeout(url, options = {}, ms = TIMEOUT.DB) {
  // navigator.onLine só é confiável no false: sem rede, falha antes de esperar.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw erroDeRede(ERR.OFFLINE, 'Sem conexão com a internet.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw erroDeRede(ERR.TIMEOUT, `O servidor não respondeu em ${Math.round(ms / 1000)}s.`);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw erroDeRede(ERR.OFFLINE, 'Sem conexão com a internet.');
    }
    // TypeError de fetch = DNS/CORS/conexão recusada (ex.: projeto pausado)
    throw erroDeRede(ERR.UNREACHABLE, 'Servidor indisponível.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetchComRetry — para leituras idempotentes (GET). Uma nova tentativa cobre o
 * cold start do Supabase depois de um período ocioso, sem esconder queda real.
 */
export async function fetchComRetry(url, options = {}, ms = TIMEOUT.DB, tentativas = 2) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fetchComTimeout(url, options, ms);
    } catch (err) {
      ultimoErro = err;
      // Sem internet não adianta insistir; timeout/indisponível pode ser cold start.
      if (err?.code === ERR.OFFLINE) throw err;
      if (i < tentativas - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw ultimoErro;
}
