/**
 * URL pública base do app — usada para montar links que vão para o DISPOSITIVO
 * do aluno (WhatsApp, e-mail, QR Code): /avaliacao/:token, /resultado/:token,
 * /join/:token, /register?token=, etc.
 *
 * Problema que isto resolve: em desenvolvimento `window.location.origin` é
 * `http://localhost:3000`, que o celular do aluno não consegue abrir. Aqui,
 * em ambiente local, caímos para o domínio de produção (ou VITE_APP_URL).
 *
 * Precedência:
 *   1. VITE_APP_URL (defina no build/produção para o domínio oficial)
 *   2. window.location.origin — quando NÃO for localhost/rede local
 *   3. https://perfilmaster.netlify.app (fallback)
 *
 * Para redirecionamentos de AUTENTICAÇÃO (login/reset de senha) continue usando
 * window.location.origin direto — lá o localhost é o comportamento desejado.
 */
const PROD_FALLBACK = 'https://perfilmaster.netlify.app';

function isLocalHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) // 172.16.0.0–172.31.255.255
  );
}

export function getPublicBaseUrl() {
  const env = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_URL;
  if (env) return String(env).replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    if (!isLocalHost(window.location.hostname)) return window.location.origin;
  }
  return PROD_FALLBACK;
}

/** Monta uma URL pública absoluta a partir de um caminho (ex.: `/resultado/abc`). */
export function publicUrl(path = '') {
  const base = getPublicBaseUrl();
  const p = String(path || '');
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
