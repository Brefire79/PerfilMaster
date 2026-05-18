-- ═════════════════════════════════════════════════════════════════════════════
-- FIX v2: Infinite recursion + cast uuid/text em RLS policies
-- Migration: 20260511_fix_rls_recursion
-- ═════════════════════════════════════════════════════════════════════════════
-- PROBLEMA 1: policy "users_admin_read" → app_groups → app_users (loop infinito)
-- PROBLEMA 2: comparações falham porque algumas colunas são uuid e outras text
--
-- SOLUÇÃO:
--   - Funções SECURITY DEFINER quebram o ciclo
--   - Casts explícitos para ::text em todos os lados das comparações
--
-- COMO RODAR: SQL Editor do Supabase → cole tudo → Run
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Remove policies que causam recursão ─────────────────────────────────────
DROP POLICY IF EXISTS "users_admin_read" ON app_users;
DROP POLICY IF EXISTS "users_admin_update" ON app_users;
DROP POLICY IF EXISTS "groups_member_read" ON app_groups;
DROP POLICY IF EXISTS "modules_admin_full" ON app_modules;
DROP POLICY IF EXISTS "modules_member_read" ON app_modules;
DROP POLICY IF EXISTS "assessments_admin_read" ON app_assessments;
DROP POLICY IF EXISTS "assessments_admin_insert" ON app_assessments;
DROP POLICY IF EXISTS "assessments_admin_update" ON app_assessments;
DROP POLICY IF EXISTS "profiles_admin_read" ON app_profiles;
DROP POLICY IF EXISTS "respostas_admin_read" ON app_sessao_respostas;

-- Remove funções antigas (caso a v1 tenha sido rodada)
DROP FUNCTION IF EXISTS public.my_admin_groups();
DROP FUNCTION IF EXISTS public.user_group_id(text);
DROP FUNCTION IF EXISTS public.my_admin_sessoes();

-- ─── Helper functions com SECURITY DEFINER ──────────────────────────────────
-- TODAS retornam text e fazem cast interno para evitar conflito uuid/text
CREATE OR REPLACE FUNCTION public.my_admin_groups()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_groups WHERE adminuid::text = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.user_group_id(user_uid text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT groupid::text FROM app_users WHERE uid::text = user_uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_admin_sessoes()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_sessoes WHERE adminuid::text = auth.uid()::text;
$$;

-- ─── Recria policies com cast ::text em ambos os lados ──────────────────────

-- app_users — admin lê e atualiza membros dos próprios grupos
CREATE POLICY "users_admin_read" ON app_users
  FOR SELECT TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "users_admin_update" ON app_users
  FOR UPDATE TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));

-- app_groups — membro lê grupos onde está
CREATE POLICY "groups_member_read" ON app_groups
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = ANY(memberids::text[])
    OR id::text = public.user_group_id(auth.uid()::text)
  );

-- app_modules — admin total / membro leitura
CREATE POLICY "modules_admin_full" ON app_modules
  FOR ALL TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()))
  WITH CHECK (groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "modules_member_read" ON app_modules
  FOR SELECT TO authenticated
  USING (groupid::text = public.user_group_id(auth.uid()::text));

-- app_assessments — admin lê/insere/atualiza
CREATE POLICY "assessments_admin_read" ON app_assessments
  FOR SELECT TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "assessments_admin_insert" ON app_assessments
  FOR INSERT TO authenticated
  WITH CHECK (groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "assessments_admin_update" ON app_assessments
  FOR UPDATE TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));

-- app_profiles — admin lê dos membros
CREATE POLICY "profiles_admin_read" ON app_profiles
  FOR SELECT TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));

-- app_sessao_respostas — admin lê das próprias sessões
CREATE POLICY "respostas_admin_read" ON app_sessao_respostas
  FOR SELECT TO authenticated
  USING (sessaoid::text IN (SELECT public.my_admin_sessoes()));

-- ─── Permissões nas funções ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.my_admin_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_group_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_sessoes() TO authenticated;

-- ─── Também corrige policies SELF que comparam uid::text ────────────────────
-- (caso essas colunas sejam uuid e o policy original tenha falhado silencioso)
DROP POLICY IF EXISTS "users_self_read" ON app_users;
DROP POLICY IF EXISTS "users_self_insert" ON app_users;
DROP POLICY IF EXISTS "users_self_update" ON app_users;

CREATE POLICY "users_self_read" ON app_users
  FOR SELECT TO authenticated
  USING (uid::text = auth.uid()::text);

CREATE POLICY "users_self_insert" ON app_users
  FOR INSERT TO authenticated
  WITH CHECK (uid::text = auth.uid()::text);

CREATE POLICY "users_self_update" ON app_users
  FOR UPDATE TO authenticated
  USING (uid::text = auth.uid()::text)
  WITH CHECK (uid::text = auth.uid()::text);

-- Mesma correção para profiles, assessments self
DROP POLICY IF EXISTS "profiles_self_full" ON app_profiles;
CREATE POLICY "profiles_self_full" ON app_profiles
  FOR ALL TO authenticated
  USING (uid::text = auth.uid()::text)
  WITH CHECK (uid::text = auth.uid()::text);

DROP POLICY IF EXISTS "assessments_self_full" ON app_assessments;
CREATE POLICY "assessments_self_full" ON app_assessments
  FOR ALL TO authenticated
  USING (uid::text = auth.uid()::text)
  WITH CHECK (uid::text = auth.uid()::text);

-- Idem groups admin / sessoes admin / invites / avaliados / reports
DROP POLICY IF EXISTS "groups_admin_full" ON app_groups;
CREATE POLICY "groups_admin_full" ON app_groups
  FOR ALL TO authenticated
  USING (adminuid::text = auth.uid()::text)
  WITH CHECK (adminuid::text = auth.uid()::text);

DROP POLICY IF EXISTS "sessoes_admin_full" ON app_sessoes;
CREATE POLICY "sessoes_admin_full" ON app_sessoes
  FOR ALL TO authenticated
  USING (adminuid::text = auth.uid()::text)
  WITH CHECK (adminuid::text = auth.uid()::text);

DROP POLICY IF EXISTS "invites_admin_full" ON app_invites;
CREATE POLICY "invites_admin_full" ON app_invites
  FOR ALL TO authenticated
  USING (adminuid::text = auth.uid()::text)
  WITH CHECK (adminuid::text = auth.uid()::text);

DROP POLICY IF EXISTS "avaliados_admin_full" ON app_avaliados;
CREATE POLICY "avaliados_admin_full" ON app_avaliados
  FOR ALL TO authenticated
  USING (adminuid::text = auth.uid()::text)
  WITH CHECK (adminuid::text = auth.uid()::text);

DROP POLICY IF EXISTS "reports_admin_full" ON app_group_reports;
CREATE POLICY "reports_admin_full" ON app_group_reports
  FOR ALL TO authenticated
  USING (adminuid::text = auth.uid()::text)
  WITH CHECK (adminuid::text = auth.uid()::text);

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Lista as policies criadas:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename LIKE 'app_%'
--    ORDER BY tablename;
--
-- 2. No app: F12 → Console → localStorage.clear(); location.reload();
-- ═════════════════════════════════════════════════════════════════════════════
