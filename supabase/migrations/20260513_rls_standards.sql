-- ═════════════════════════════════════════════════════════════════════════════
-- ProfileAI + MentoriaX — RLS Standards Final Cleanup
-- Migration: 20260513_rls_standards
-- ═════════════════════════════════════════════════════════════════════════════
-- Aplica os padrões definitivos de RLS (aprendidos na sessão MentoriaX):
--
--   ✅ (SELECT auth.uid()) — avaliado 1x por query, não 1x por linha
--   ✅ TO authenticated em writes (nunca TO public com write ops)
--   ✅ TO authenticated USING (true) em ref tables (nunca auth.role() = 'authenticated')
--   ✅ 1 policy por (tabela, role, ação) — sem múltiplas permissivas
--   ✅ SECURITY DEFINER + REVOKE FROM PUBLIC + GRANT TO authenticated
--   ✅ Nunca USING (true) ou WITH CHECK (true) em INSERT/UPDATE/DELETE
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run
-- Idempotente: pode rodar múltiplas vezes sem problema.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: Helper functions com SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER quebra ciclos de recursão RLS e oculta detalhes internos.
-- REVOKE FROM PUBLIC garante que anon nunca chama direto via REST.

CREATE OR REPLACE FUNCTION public.my_admin_groups()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_groups
  WHERE adminuid::text = (SELECT auth.uid())::text;
$$;

CREATE OR REPLACE FUNCTION public.user_group_id(user_uid text)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT groupid::text FROM app_users
  WHERE uid::text = user_uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_admin_sessoes()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_sessoes
  WHERE adminuid::text = (SELECT auth.uid())::text;
$$;

REVOKE EXECUTE ON FUNCTION public.my_admin_groups()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_group_id(text)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_admin_sessoes()      FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION public.my_admin_groups()       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_group_id(text)     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.my_admin_sessoes()      TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: ProfileAI — tabelas de assessment
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assessment_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saboteur_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_subtypes        ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas (idempotente)
DROP POLICY IF EXISTS "ver_proprios_resultados"         ON public.assessment_results;
DROP POLICY IF EXISTS "inserir_proprio_resultado"       ON public.assessment_results;
DROP POLICY IF EXISTS "atualizar_proprio_resultado"     ON public.assessment_results;
DROP POLICY IF EXISTS "results_owner_all"               ON public.assessment_results;

DROP POLICY IF EXISTS "ver_proprio_relatorio"           ON public.user_reports;
DROP POLICY IF EXISTS "inserir_proprio_relatorio"       ON public.user_reports;
DROP POLICY IF EXISTS "reports_owner_all"               ON public.user_reports;

DROP POLICY IF EXISTS "leitura_autenticada_perguntas"   ON public.assessment_questions;
DROP POLICY IF EXISTS "questions_authenticated_read"    ON public.assessment_questions;

DROP POLICY IF EXISTS "leitura_autenticada_sabotadores" ON public.saboteur_types;
DROP POLICY IF EXISTS "saboteurs_authenticated_read"    ON public.saboteur_types;

DROP POLICY IF EXISTS "leitura_autenticada_disc_perfis"    ON public.disc_profiles;
DROP POLICY IF EXISTS "disc_profiles_authenticated_read"   ON public.disc_profiles;

DROP POLICY IF EXISTS "leitura_autenticada_disc_subtipos"  ON public.disc_subtypes;
DROP POLICY IF EXISTS "disc_subtypes_authenticated_read"   ON public.disc_subtypes;

-- assessment_results: usuário dono de tudo (INSERT/UPDATE via app, service_role bypassa)
CREATE POLICY "results_owner_all" ON public.assessment_results
  AS PERMISSIVE FOR ALL TO authenticated
  USING     ((SELECT auth.uid()) = user_id)
  WITH CHECK((SELECT auth.uid()) = user_id);

-- user_reports: mesmo padrão (geração via Edge Function usa service_role)
CREATE POLICY "reports_owner_all" ON public.user_reports
  AS PERMISSIVE FOR ALL TO authenticated
  USING     ((SELECT auth.uid()) = user_id)
  WITH CHECK((SELECT auth.uid()) = user_id);

-- Tabelas de referência: leitura apenas para autenticados
-- NOTA: TO authenticated USING (true) é correto — não usar auth.role() = 'authenticated'
CREATE POLICY "questions_read" ON public.assessment_questions
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "saboteurs_read" ON public.saboteur_types
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "disc_profiles_read" ON public.disc_profiles
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "disc_subtypes_read" ON public.disc_subtypes
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 3: app_users
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self_read"    ON public.app_users;
DROP POLICY IF EXISTS "users_self_insert"  ON public.app_users;
DROP POLICY IF EXISTS "users_self_update"  ON public.app_users;
DROP POLICY IF EXISTS "users_admin_read"   ON public.app_users;
DROP POLICY IF EXISTS "users_admin_update" ON public.app_users;
DROP POLICY IF EXISTS "users_select_own"   ON public.app_users;
DROP POLICY IF EXISTS "users_select_admin" ON public.app_users;
DROP POLICY IF EXISTS "users_insert_self"  ON public.app_users;
DROP POLICY IF EXISTS "users_update_own"   ON public.app_users;
DROP POLICY IF EXISTS "users_update_admin" ON public.app_users;
DROP POLICY IF EXISTS "users_select"       ON public.app_users;
DROP POLICY IF EXISTS "users_insert"       ON public.app_users;
DROP POLICY IF EXISTS "users_update"       ON public.app_users;

-- SELECT: dono OU admin do grupo
CREATE POLICY "users_select" ON public.app_users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

-- INSERT: somente o próprio usuário cria seu registro
CREATE POLICY "users_insert" ON public.app_users
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (uid::text = (SELECT auth.uid())::text);

-- UPDATE: dono ou admin do grupo
CREATE POLICY "users_update" ON public.app_users
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  )
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 4: app_groups
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_admin_full"  ON public.app_groups;
DROP POLICY IF EXISTS "groups_admin_all"   ON public.app_groups;
DROP POLICY IF EXISTS "groups_member_read" ON public.app_groups;
DROP POLICY IF EXISTS "groups_select"      ON public.app_groups;
DROP POLICY IF EXISTS "groups_insert"      ON public.app_groups;
DROP POLICY IF EXISTS "groups_update"      ON public.app_groups;
DROP POLICY IF EXISTS "groups_delete"      ON public.app_groups;

-- SELECT: admin do grupo OU membro
CREATE POLICY "groups_select" ON public.app_groups
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    adminuid::text = (SELECT auth.uid())::text
    OR (SELECT auth.uid())::text = ANY(memberids::text[])
    OR id::text = public.user_group_id((SELECT auth.uid())::text)
  );

CREATE POLICY "groups_insert" ON public.app_groups
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "groups_update" ON public.app_groups
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "groups_delete" ON public.app_groups
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 5: app_modules
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_admin_full"         ON public.app_modules;
DROP POLICY IF EXISTS "modules_admin_all"          ON public.app_modules;
DROP POLICY IF EXISTS "modules_member_read"        ON public.app_modules;
DROP POLICY IF EXISTS "modules_authenticated_read" ON public.app_modules;
DROP POLICY IF EXISTS "modules_select"             ON public.app_modules;
DROP POLICY IF EXISTS "modules_insert"             ON public.app_modules;
DROP POLICY IF EXISTS "modules_update"             ON public.app_modules;
DROP POLICY IF EXISTS "modules_delete"             ON public.app_modules;

-- SELECT: admin do grupo OU membro do grupo
CREATE POLICY "modules_select" ON public.app_modules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    groupid::text IN (SELECT public.my_admin_groups())
    OR groupid::text = public.user_group_id((SELECT auth.uid())::text)
  );

CREATE POLICY "modules_insert" ON public.app_modules
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "modules_update" ON public.app_modules
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (groupid::text IN (SELECT public.my_admin_groups()))
  WITH CHECK(groupid::text IN (SELECT public.my_admin_groups()));

CREATE POLICY "modules_delete" ON public.app_modules
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (groupid::text IN (SELECT public.my_admin_groups()));


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 6: app_assessments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessments_self_full"     ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_admin_read"    ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_admin_insert"  ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_admin_update"  ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_select_own"    ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_select_admin"  ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_insert_own"    ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_update_own"    ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_delete_own"    ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_select"        ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_insert"        ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_update"        ON public.app_assessments;
DROP POLICY IF EXISTS "assessments_delete"        ON public.app_assessments;

-- SELECT: dono OU admin do grupo
CREATE POLICY "assessments_select" ON public.app_assessments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "assessments_insert" ON public.app_assessments
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "assessments_update" ON public.app_assessments
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  )
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

-- DELETE: somente o dono (admin não deleta assessment alheio)
CREATE POLICY "assessments_delete" ON public.app_assessments
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (uid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 7: app_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_full"    ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_admin_read"   ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_select_own"   ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_select"       ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_insert"       ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_update"       ON public.app_profiles;
DROP POLICY IF EXISTS "profiles_delete"       ON public.app_profiles;

CREATE POLICY "profiles_select" ON public.app_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "profiles_insert" ON public.app_profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (uid::text = (SELECT auth.uid())::text);

CREATE POLICY "profiles_update" ON public.app_profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (uid::text = (SELECT auth.uid())::text)
  WITH CHECK(uid::text = (SELECT auth.uid())::text);

CREATE POLICY "profiles_delete" ON public.app_profiles
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (uid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 8: app_invites
-- ─────────────────────────────────────────────────────────────────────────────
-- Leitura/validação de tokens: via Edge Function com service_role (bypassa RLS)
-- Não expor SELECT anon — link de convite é validado no backend

ALTER TABLE public.app_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_admin_full"          ON public.app_invites;
DROP POLICY IF EXISTS "invites_admin_write"         ON public.app_invites;
DROP POLICY IF EXISTS "invites_public_read"         ON public.app_invites;
DROP POLICY IF EXISTS "invites_public_update_token" ON public.app_invites;
DROP POLICY IF EXISTS "invites_update_token"        ON public.app_invites;
DROP POLICY IF EXISTS "invites_admin_select"        ON public.app_invites;
DROP POLICY IF EXISTS "invites_admin_insert"        ON public.app_invites;
DROP POLICY IF EXISTS "invites_admin_update"        ON public.app_invites;
DROP POLICY IF EXISTS "invites_admin_delete"        ON public.app_invites;

CREATE POLICY "invites_admin_select" ON public.app_invites
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "invites_admin_insert" ON public.app_invites
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "invites_admin_update" ON public.app_invites
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "invites_admin_delete" ON public.app_invites
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 9: app_sessoes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessoes_admin_full" ON public.app_sessoes;
DROP POLICY IF EXISTS "sessoes_admin_all"  ON public.app_sessoes;
DROP POLICY IF EXISTS "sessoes_select"     ON public.app_sessoes;
DROP POLICY IF EXISTS "sessoes_insert"     ON public.app_sessoes;
DROP POLICY IF EXISTS "sessoes_update"     ON public.app_sessoes;
DROP POLICY IF EXISTS "sessoes_delete"     ON public.app_sessoes;

CREATE POLICY "sessoes_select" ON public.app_sessoes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "sessoes_insert" ON public.app_sessoes
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "sessoes_update" ON public.app_sessoes
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "sessoes_delete" ON public.app_sessoes
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 10: app_avaliados
-- ─────────────────────────────────────────────────────────────────────────────
-- Avaliados acessados via token público: Edge Function com service_role
-- Não expor SELECT/UPDATE anon — validação de token é responsabilidade do backend

ALTER TABLE public.app_avaliados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliados_admin_full"    ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_admin_all"     ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_public_read"   ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_public_update" ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_select"        ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_insert"        ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_update"        ON public.app_avaliados;
DROP POLICY IF EXISTS "avaliados_delete"        ON public.app_avaliados;

CREATE POLICY "avaliados_select" ON public.app_avaliados
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "avaliados_insert" ON public.app_avaliados
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "avaliados_update" ON public.app_avaliados
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "avaliados_delete" ON public.app_avaliados
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 11: app_sessao_respostas
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: via Edge Function atualizarStatus (service_role) — sem policy de insert necessária
-- SELECT: somente o admin da sessão

ALTER TABLE public.app_sessao_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "respostas_admin_read"          ON public.app_sessao_respostas;
DROP POLICY IF EXISTS "sessao_respostas_public_insert" ON public.app_sessao_respostas;
DROP POLICY IF EXISTS "respostas_select"              ON public.app_sessao_respostas;

CREATE POLICY "respostas_select" ON public.app_sessao_respostas
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (sessaoid::text IN (SELECT public.my_admin_sessoes()));


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 12: app_group_reports
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.app_group_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_admin_full"    ON public.app_group_reports;
DROP POLICY IF EXISTS "reports_admin_all"     ON public.app_group_reports;
DROP POLICY IF EXISTS "group_reports_select"  ON public.app_group_reports;
DROP POLICY IF EXISTS "group_reports_insert"  ON public.app_group_reports;
DROP POLICY IF EXISTS "group_reports_update"  ON public.app_group_reports;
DROP POLICY IF EXISTS "group_reports_delete"  ON public.app_group_reports;

CREATE POLICY "group_reports_select" ON public.app_group_reports
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "group_reports_insert" ON public.app_group_reports
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "group_reports_update" ON public.app_group_reports
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "group_reports_delete" ON public.app_group_reports
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);


-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ═════════════════════════════════════════════════════════════════════════════
-- Cole e rode SEPARADAMENTE para verificar:
--
-- 1. RLS ativo em todas as tabelas:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--
-- 2. Nenhuma múltipla policy permissiva por (tabela, role, ação):
--    SELECT tablename, cmd, string_agg(roles::text, ',') as roles, COUNT(*) as cnt
--    FROM pg_policies
--    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
--    GROUP BY tablename, cmd, roles::text
--    HAVING COUNT(*) > 1
--    ORDER BY tablename;
--    -- Deve retornar 0 linhas
--
-- 3. Funções SECURITY DEFINER com grants corretos:
--    SELECT p.proname, a.rolname
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    JOIN pg_auth_members m ON m.member = (
--      SELECT oid FROM pg_roles WHERE rolname = 'authenticated'
--    )
--    WHERE n.nspname = 'public' AND p.prosecdef = true;
-- ═════════════════════════════════════════════════════════════════════════════
