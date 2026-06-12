import { getValidAccessToken } from './auth.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callFunction(name, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured for edge functions.');
  }

  // IA gerenciada pelo servidor (DeepSeek): a chave vem dos Secrets, nunca do cliente.
  const enrichedPayload = payload || {};

  const token = await getValidAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(enrichedPayload),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = data?.error || data?.message || `Function ${name} failed (${res.status})`;
    throw new Error(msg);
  }
  return data?.data ?? data;
}

export async function analyzeResponse(payload) {
  return callFunction('analyzeResponse', payload);
}

/** Gera insights ricos de um perfil DISC já calculado (sem raw answers) */
export async function insightPerfil(payload) {
  return callFunction('insightPerfil', payload);
}

export async function buildProfile(payload) {
  return callFunction('buildProfile', payload);
}

export async function groupInsights(payload) {
  return callFunction('groupInsights', payload);
}

export async function therapyFlag(payload) {
  return callFunction('therapyFlag', payload);
}

export async function generateInviteLink(payload) {
  return callFunction('generateInviteLink', payload);
}

export async function validateInviteToken(payload) {
  return callFunction('validateInviteToken', payload);
}

/** DELTA 8: consome o convite no backend (service-role) — cria app_users,
 *  entra no grupo e marca o convite como usado, sem policies públicas. */
export async function consumeInvite(payload) {
  return callFunction('consumeInvite', payload);
}

export async function generateReport(payload) {
  return callFunction('generateReport', payload);
}

export async function buscarPorToken(payload) {
  return callFunction('buscarPorToken', payload);
}

export async function atualizarStatus(payload) {
  return callFunction('atualizarStatus', payload);
}
