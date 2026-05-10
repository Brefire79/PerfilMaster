-- ═════════════════════════════════════════════════════════════════════════════
-- ProfileAI — Enable Row Level Security (RLS) on all app_* tables
-- Migration: 20260510_enable_rls
-- ═════════════════════════════════════════════════════════════════════════════
--
-- COMO RODAR:
-- 1. Acesse https://supabase.com/dashboard/project/zlbynxjeefqxcgrsmkjp
-- 2. Menu lateral → SQL Editor → New query
-- 3. Cole TODO o conteúdo deste arquivo
-- 4. Clique em Run
-- 5. Verifique no Table Editor que cada tabela mostra "RLS enabled"
--
-- IMPORTANTE:
-- - Edge Functions usam SUPABASE_SERVICE_ROLE_KEY, que bypassa RLS automaticamente.
-- - Frontend usa SUPABASE_ANON_KEY + JWT do usuário, então RLS é a única defesa.
-- - auth.uid() retorna UUID; nas tabelas o uid é text — daí o ::text.
-- - Convenção: identificadores são lowercase no Postgres (groupid, adminuid, etc).
--
-- ROLLBACK (em caso de problema):
--   Ver o final do arquivo, seção COMENTADA "ROLLBACK".
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. APP_USERS ────────────────────────────────────────────────────────────
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self_read" ON app_users;
CREATE POLICY "users_self_read" ON app_users
  FOR SELECT TO authenticated
  USING (uid = auth.uid()::text);

DROP POLICY IF EXISTS "users_admin_read" ON app_users;
CREATE POLICY "users_admin_read" ON app_users
  FOR SELECT TO authenticated
  USING (
    groupid IN (
      SELECT id FROM app_groups WHERE adminuid = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "users_self_insert" ON app_users;
CREATE POLICY "users_self_insert" ON app_users
  FOR INSERT TO authenticated
  WITH CHECK (uid = auth.uid()::text);

DROP POLICY IF EXISTS "users_self_update" ON app_users;
CREATE POLICY "users_self_update" ON app_users
  FOR UPDATE TO authenticated
  USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);

DROP POLICY IF EXISTS "users_admin_update" ON app_users;
CREATE POLICY "users_admin_update" ON app_users
  FOR UPDATE TO authenticated
  USING (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

-- ─── 2. APP_GROUPS ───────────────────────────────────────────────────────────
ALTER TABLE app_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_admin_full" ON app_groups;
CREATE POLICY "groups_admin_full" ON app_groups
  FOR ALL TO authenticated
  USING (adminuid = auth.uid()::text)
  WITH CHECK (adminuid = auth.uid()::text);

DROP POLICY IF EXISTS "groups_member_read" ON app_groups;
CREATE POLICY "groups_member_read" ON app_groups
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = ANY(memberids)
    OR id IN (SELECT groupid FROM app_users WHERE uid = auth.uid()::text)
  );

-- ─── 3. APP_MODULES ──────────────────────────────────────────────────────────
ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_admin_full" ON app_modules;
CREATE POLICY "modules_admin_full" ON app_modules
  FOR ALL TO authenticated
  USING (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  )
  WITH CHECK (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "modules_member_read" ON app_modules;
CREATE POLICY "modules_member_read" ON app_modules
  FOR SELECT TO authenticated
  USING (
    groupid IN (SELECT groupid FROM app_users WHERE uid = auth.uid()::text)
  );

-- ─── 4. APP_ASSESSMENTS ──────────────────────────────────────────────────────
ALTER TABLE app_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessments_self_full" ON app_assessments;
CREATE POLICY "assessments_self_full" ON app_assessments
  FOR ALL TO authenticated
  USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);

DROP POLICY IF EXISTS "assessments_admin_read" ON app_assessments;
CREATE POLICY "assessments_admin_read" ON app_assessments
  FOR SELECT TO authenticated
  USING (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "assessments_admin_insert" ON app_assessments;
CREATE POLICY "assessments_admin_insert" ON app_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

DROP POLICY IF EXISTS "assessments_admin_update" ON app_assessments;
CREATE POLICY "assessments_admin_update" ON app_assessments
  FOR UPDATE TO authenticated
  USING (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

-- ─── 5. APP_PROFILES ─────────────────────────────────────────────────────────
ALTER TABLE app_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_full" ON app_profiles;
CREATE POLICY "profiles_self_full" ON app_profiles
  FOR ALL TO authenticated
  USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);

DROP POLICY IF EXISTS "profiles_admin_read" ON app_profiles;
CREATE POLICY "profiles_admin_read" ON app_profiles
  FOR SELECT TO authenticated
  USING (
    groupid IN (SELECT id FROM app_groups WHERE adminuid = auth.uid()::text)
  );

-- ─── 6. APP_INVITES ──────────────────────────────────────────────────────────
ALTER TABLE app_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_admin_full" ON app_invites;
CREATE POLICY "invites_admin_full" ON app_invites
  FOR ALL TO authenticated
  USING (adminuid = auth.uid()::text)
  WITH CHECK (adminuid = auth.uid()::text);

-- Token público é validado via Edge Function (service role) — nenhum acesso anon.

-- ─── 7. APP_SESSOES ──────────────────────────────────────────────────────────
ALTER TABLE app_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessoes_admin_full" ON app_sessoes;
CREATE POLICY "sessoes_admin_full" ON app_sessoes
  FOR ALL TO authenticated
  USING (adminuid = auth.uid()::text)
  WITH CHECK (adminuid = auth.uid()::text);

-- ─── 8. APP_AVALIADOS ────────────────────────────────────────────────────────
ALTER TABLE app_avaliados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliados_admin_full" ON app_avaliados;
CREATE POLICY "avaliados_admin_full" ON app_avaliados
  FOR ALL TO authenticated
  USING (adminuid = auth.uid()::text)
  WITH CHECK (adminuid = auth.uid()::text);

-- Avaliados são acessados via token público APENAS pela Edge Function buscarPorToken
-- (que usa service role). Nenhum acesso anon direto à tabela.

-- ─── 9. APP_SESSAO_RESPOSTAS ─────────────────────────────────────────────────
ALTER TABLE app_sessao_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "respostas_admin_read" ON app_sessao_respostas;
CREATE POLICY "respostas_admin_read" ON app_sessao_respostas
  FOR SELECT TO authenticated
  USING (
    sessaoid IN (SELECT id FROM app_sessoes WHERE adminuid = auth.uid()::text)
  );

-- Inserção feita via Edge Function atualizarStatus (service role).

-- ─── 10. APP_GROUP_REPORTS ───────────────────────────────────────────────────
ALTER TABLE app_group_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_admin_full" ON app_group_reports;
CREATE POLICY "reports_admin_full" ON app_group_reports
  FOR ALL TO authenticated
  USING (adminuid = auth.uid()::text)
  WITH CHECK (adminuid = auth.uid()::text);

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ═════════════════════════════════════════════════════════════════════════════
-- Rode esta query depois para confirmar que TODAS as tabelas têm RLS ativo:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public' AND tablename LIKE 'app_%'
--   ORDER BY tablename;
--
-- Todas devem mostrar rowsecurity = true.
-- ═════════════════════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (se algo quebrar) — REMOVA O COMENTÁRIO PARA EXECUTAR
-- ═════════════════════════════════════════════════════════════════════════════
-- ALTER TABLE app_users             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_groups            DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_modules           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_assessments       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_profiles          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_invites           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_sessoes           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_avaliados         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_sessao_respostas  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE app_group_reports     DISABLE ROW LEVEL SECURITY;
