const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = 'profileai.supabase.session';

const listeners = new Set();
let currentSession = loadSession();

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let _refreshPromise = null;

function isTokenExpired(session) {
  if (!session?.access_token) return true;
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    return Date.now() / 1000 > payload.exp - 30; // 30s buffer
  } catch { return true; }
}

async function refreshSession() {
  if (!currentSession?.refresh_token) return null;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
        }
      );
      if (!res.ok) { saveSession(null); return null; }
      const data = await res.json();
      saveSession(data);
      return data;
    } catch { return null; }
    finally { _refreshPromise = null; }
  })();
  return _refreshPromise;
}

function saveSession(session) {
  currentSession = session || null;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  const user = getCurrentUser();
  listeners.forEach((cb) => cb(user));
}

function toUserShape(user) {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email || null,
    displayName: user.user_metadata?.display_name || null,
    photoURL: user.user_metadata?.avatar_url || null,
    emailVerified: !!user.email_confirmed_at,
  };
}

function buildAuthError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

async function authRequest(path, { method = 'GET', body, accessToken } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw buildAuthError('auth/configuration-not-found', 'Supabase auth is not configured.');
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.msg || json?.message || 'Authentication error';
    if (msg.toLowerCase().includes('invalid login credentials')) {
      throw buildAuthError('auth/invalid-credential', msg);
    }
    if (msg.toLowerCase().includes('user already registered')) {
      throw buildAuthError('auth/email-already-in-use', msg);
    }
    if (msg.toLowerCase().includes('password')) {
      throw buildAuthError('auth/weak-password', msg);
    }
    throw buildAuthError('auth/generic', msg);
  }

  return json;
}

export async function signInWithEmail(email, password) {
  const data = await authRequest('token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  saveSession(data);
  return toUserShape(data.user);
}

export async function signUpWithEmail(email, password, displayName) {
  const data = await authRequest('signup', {
    method: 'POST',
    body: {
      email,
      password,
      data: displayName ? { display_name: displayName } : {},
    },
  });
  if (data?.access_token) saveSession(data);
  return toUserShape(data.user);
}

// Valida a senha do usuário logado SEM alterar a sessão atual (não chama
// saveSession). Usado como confirmação em ações sensíveis (ex.: excluir conta).
// Lança auth/invalid-credential se a senha estiver errada.
export async function verifyPassword(password) {
  const email = getCurrentUser()?.email;
  if (!email) throw buildAuthError('auth/user-not-found', 'Sessão não encontrada. Faça login novamente.');
  if (!password) throw buildAuthError('auth/missing-password', 'Informe sua senha.');
  await authRequest('token?grant_type=password', { method: 'POST', body: { email, password } });
  return true;
}

export async function signInWithGoogle() {
  throw buildAuthError(
    'auth/operation-not-supported-in-this-environment',
    'Google login is not configured in Supabase for this app.'
  );
}

export async function signOut() {
  const token = getAccessToken();
  if (token) {
    await authRequest('logout', { method: 'POST', accessToken: token }).catch(() => {});
  }
  saveSession(null);
}

export function onAuthStateChange(callback) {
  listeners.add(callback);
  callback(getCurrentUser());
  return () => listeners.delete(callback);
}

export async function resetPassword(email) {
  // redirect_to: para onde o link do e-mail leva. Precisa estar na allowlist de
  // "Redirect URLs" do Supabase (Auth → URL Configuration). A página /reset-password
  // trata o token de recuperação e deixa o usuário definir a nova senha.
  const redirectTo = `${window.location.origin}/reset-password`;
  await authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    body: { email },
  });
}

/**
 * applyRecoverySession — estabelece a sessão a partir dos tokens vindos no hash
 * do link de recuperação (#access_token=...&refresh_token=...&type=recovery),
 * para então permitir definir uma nova senha via changePassword().
 */
export async function applyRecoverySession(accessToken, refreshToken) {
  if (!accessToken) throw buildAuthError('auth/invalid-token', 'Token de recuperação ausente.');
  const user = await authRequest('user', { accessToken });
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken || null,
    token_type: 'bearer',
    user,
  });
  return toUserShape(user);
}

/**
 * verifyRecoveryToken — troca o `token_hash` de um link de recuperação por uma
 * sessão (POST /auth/v1/verify, type=recovery), estabelecendo-a localmente para
 * a página /reset-password definir a nova senha.
 *
 * Por que existe (e não só o hash #access_token): o `action_link` do Supabase é
 * de USO ÚNICO e se auto-verifica num GET — o preview de link do WhatsApp/e-mail
 * "abre" o link e QUEIMA o token antes do usuário clicar. Mandando um link para
 * a nossa página com `?token_hash=...`, a verificação (POST) só ocorre quando a
 * PESSOA chega — o robô de preview (GET) não consome o token.
 */
export async function verifyRecoveryToken(tokenHash) {
  if (!tokenHash) throw buildAuthError('auth/invalid-token', 'Token de recuperação ausente.');
  const data = await authRequest('verify', {
    method: 'POST',
    body: { type: 'recovery', token_hash: tokenHash },
  });
  if (!data?.access_token) throw buildAuthError('auth/invalid-token', 'Link inválido ou expirado.');
  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    token_type: data.token_type || 'bearer',
    user: data.user,
  });
  return toUserShape(data.user);
}

export async function sendVerificationEmail() {
  return null;
}

export async function updateDisplayName(displayName) {
  const token = getAccessToken();
  if (!token) throw buildAuthError('auth/user-not-found', 'No authenticated user');
  const data = await authRequest('user', {
    method: 'PUT',
    accessToken: token,
    body: { data: { display_name: displayName } },
  });
  saveSession({ ...currentSession, user: data.user || data });
}

export async function changePassword(_currentPassword, newPassword) {
  const token = getAccessToken();
  if (!token) throw buildAuthError('auth/user-not-found', 'No authenticated user');
  await authRequest('user', {
    method: 'PUT',
    accessToken: token,
    body: { password: newPassword },
  });
}

export function getCurrentUser() {
  return toUserShape(currentSession?.user || null);
}

export function getAccessToken() {
  return currentSession?.access_token || null;
}

export async function getValidAccessToken() {
  if (isTokenExpired(currentSession)) {
    const refreshed = await refreshSession();
    return refreshed?.access_token || null;
  }
  return currentSession?.access_token || null;
}

export async function getIdToken() {
  return getValidAccessToken();
}
