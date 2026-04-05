/**
 * ProfileAI — AMB FUSI
 * Cliente Supabase — inicialização única para toda a aplicação
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true quando as variáveis de ambiente estão configuradas */
export const isConfigured = Boolean(supabaseUrl && supabaseAnon);

// Usa valores placeholder para não travar a inicialização do módulo.
// O App.jsx verifica `isConfigured` e exibe a tela de setup se necessário.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Retorna os headers de autenticação para chamadas às Edge Functions
 * @returns {Promise<{Authorization: string}>}
 */
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.');
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Chama uma Edge Function do Supabase com autenticação automática
 * @param {string} fnName — nome da função (ex: 'calculate-assessment')
 * @param {object} body   — payload JSON
 * @returns {Promise<any>} — resposta JSON parseada
 */
export async function callEdgeFunction(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body });

  if (error) throw new Error(error.message ?? `Erro ao chamar ${fnName}`);
  if (data?.success === false) throw new Error(data.error ?? `Erro ao chamar ${fnName}`);

  return data;
}
