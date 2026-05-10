import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Cliente service-role — bypassa RLS, usar APENAS para queries de validação interna
 * (ex: verificar se o caller é admin do grupo).
 */
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );
}

/**
 * Resolve o usuário autenticado a partir do header Authorization.
 * Retorna null se não houver token, token inválido ou expirado.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  // Cliente com a credencial do caller — auth.getUser() valida o JWT
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await callerClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Verifica se o caller é admin de um grupo específico.
 * Usa service client porque app_groups pode ter RLS que esconde grupos não-admin.
 */
export async function isGroupAdmin(callerUid: string, groupId: string): Promise<boolean> {
  if (!callerUid || !groupId) return false;
  const sb = serviceClient();
  const { data, error } = await sb
    .from('app_groups')
    .select('id')
    .eq('id', groupId)
    .eq('adminuid', callerUid)
    .maybeSingle();
  return !error && !!data;
}

/**
 * Verifica se o caller pode acessar dados de um aluno (uid alvo):
 * - é o próprio aluno, OU
 * - é admin do grupo do aluno
 */
export async function canAccessUser(callerUid: string, targetUid: string): Promise<boolean> {
  if (callerUid === targetUid) return true;
  const sb = serviceClient();
  const { data: targetUser } = await sb
    .from('app_users')
    .select('groupid')
    .eq('uid', targetUid)
    .maybeSingle();
  if (!targetUser?.groupid) return false;
  return isGroupAdmin(callerUid, targetUser.groupid);
}

/**
 * Verifica se o caller é dono ou admin de um assessment específico.
 */
export async function canAccessAssessment(callerUid: string, assessmentId: string): Promise<boolean> {
  if (!callerUid || !assessmentId) return false;
  const sb = serviceClient();
  const { data: assessment } = await sb
    .from('app_assessments')
    .select('uid, groupid')
    .eq('id', assessmentId)
    .maybeSingle();
  if (!assessment) return false;
  if (assessment.uid === callerUid) return true;
  if (assessment.groupid) {
    return isGroupAdmin(callerUid, assessment.groupid);
  }
  return false;
}
