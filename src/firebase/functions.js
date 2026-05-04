import { getAccessToken } from './auth.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callFunction(name, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured for edge functions.');
  }

  const token = getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
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

export async function generateReport(payload) {
  return callFunction('generateReport', payload);
}

export async function buscarPorToken(payload) {
  return callFunction('buscarPorToken', payload);
}

export async function atualizarStatus(payload) {
  return callFunction('atualizarStatus', payload);
}
