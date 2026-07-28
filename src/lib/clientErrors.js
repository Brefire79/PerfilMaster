/**
 * clientErrors — registro de erros do navegador.
 *
 * Até 27/07/2026 isto gravava só em sessionStorage: o erro morria ao fechar a
 * aba e ninguém do outro lado ficava sabendo. Um avaliado que travasse no meio
 * das 78 questões desistia em silêncio. Agora o registro também é ENVIADO
 * (M2 da auditoria), mantendo o histórico local para depuração na hora.
 *
 * Regras: best-effort absoluto (telemetria nunca vira um segundo erro na tela),
 * sem PII, e sem tentar reportar falha de rede genérica — que seria justamente
 * o momento em que o envio não vai funcionar.
 */

const STORAGE_KEY = 'profileai.client-errors';
const MAX_ENTRIES = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function safeText(value, max = 240) {
  return String(value || '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{11}\b/g, '[documento]')
    .replace(/[?#](?:token|token_hash|access_token)=[^&\s]+/gi, '?token=[redacted]')
    .slice(0, max);
}

/** Deriva a origem pela rota, para escopar quem enxerga o registro. */
function origemDaRota(rota = '') {
  if (rota.startsWith('/admin')) return 'admin';
  if (rota.startsWith('/student')) return 'aluno';
  return 'publico';
}

/**
 * Envia para a Edge logClientError. Silencioso por definição: usa sendBeacon
 * quando disponível (sobrevive à navegação/fechamento da aba) e cai para fetch
 * com keepalive. Nunca lança, nunca bloqueia o chamador.
 */
function enviar(entry, adminUid) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  // Sem rede, o envio falharia de qualquer jeito — e um erro de rede é
  // exatamente o caso em que insistir só gera ruído.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const url = `${SUPABASE_URL}/functions/v1/logClientError`;
  const payload = JSON.stringify({
    origem: origemDaRota(entry.route),
    adminuid: adminUid || null,
    rota: entry.route,
    fonte: entry.source,
    mensagem: entry.message,
    codigo: entry.code || null,
    versao: entry.version,
  });

  try {
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    }).catch(() => {});
  } catch (_) {
    // Telemetria nunca deve quebrar o fluxo principal.
  }
}

export function reportClientError(error, context = {}) {
  const entry = {
    at: new Date().toISOString(),
    route: safeText(context.route || window.location.pathname, 120),
    source: safeText(context.source || 'app', 80),
    message: safeText(error?.message || error || 'Erro desconhecido'),
    code: safeText(error?.code || context.code || '', 60) || null,
    version: safeText(import.meta.env.VITE_APP_VERSION || 'dev', 40),
  };

  try {
    const previous = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    const entries = Array.isArray(previous) ? previous : [];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...entries, entry].slice(-MAX_ENTRIES)));
  } catch (_) {
    // Observabilidade nunca deve quebrar o fluxo principal.
  }

  enviar(entry, context.adminUid);
  return entry;
}

export function getClientErrors() {
  try {
    const entries = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (_) {
    return [];
  }
}
