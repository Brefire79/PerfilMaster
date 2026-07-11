const STORAGE_KEY = 'profileai.client-errors';
const MAX_ENTRIES = 20;

function safeText(value, max = 240) {
  return String(value || '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{11}\b/g, '[documento]')
    .replace(/[?#](?:token|token_hash|access_token)=[^&\s]+/gi, '?token=[redacted]')
    .slice(0, max);
}

export function reportClientError(error, context = {}) {
  const entry = {
    at: new Date().toISOString(),
    route: safeText(context.route || window.location.pathname, 120),
    source: safeText(context.source || 'app', 80),
    message: safeText(error?.message || error || 'Erro desconhecido'),
    version: safeText(import.meta.env.VITE_APP_VERSION || 'dev', 40),
  };

  try {
    const previous = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    const entries = Array.isArray(previous) ? previous : [];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...entries, entry].slice(-MAX_ENTRIES)));
  } catch (_) {
    // Observabilidade nunca deve quebrar o fluxo principal.
  }
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
