-- ============================================================================
-- ProfileAI — DELTA 8 — SEGURANÇA CONSOLIDADA (2026-06-09)
-- ----------------------------------------------------------------------------
-- ESTE SCRIPT É A FONTE DA VERDADE DAS POLICIES RLS. Substitui TODAS as
-- policies anteriores das tabelas app_* (base + DELTA 5).
--
-- Problemas corrigidos:
--   S1 (CRÍTICO): avaliados_public_read/avaliados_public_update USING (true)
--       → qualquer pessoa com a anon key listava/alterava TODOS os avaliados
--         (nome, telefone, e-mail, CPF, respostas, perfil). Fluxo público já
--         passa pelas Edge Functions buscarPorToken/atualizarStatus
--         (service_role) — acesso anon direto à tabela foi removido.
--   S2 (CRÍTICO): invites_public_read/invites_public_update_token
--       → convites listáveis e alteráveis por anônimos. Validação/consumo
--         agora é 100% via Edge Functions (validateInviteToken/consumeInvite).
--   S3 (CRÍTICO): escalada de privilégio — users_update_own permitia o aluno
--       alterar a própria coluna role para 'admin'. Bloqueado por trigger.
--   S4 (ALTO): policies *_admin baseadas em is_admin() davam a QUALQUER admin
--       acesso a TODOS os dados (vazamento entre tenants/facilitadores).
--       Agora cada admin enxerga apenas seus grupos/alunos/sessões.
--   F1: admin não enxergava alunos avulsos (groupid NULL) — policies agora
--       incluem adminuid (DELTA 6).
--   F2: aluno não conseguia entrar no grupo via convite (update de memberids
--       bloqueado) — consumo do convite migrado para Edge Function consumeInvite.
--
-- IDEMPOTENTE: pode rodar várias vezes sem quebrar nada.
-- COMO USAR: Supabase Dashboard → SQL Editor → colar tudo → Run.
-- DEPOIS: deployar as Edge Functions atualizadas (ver SUPABASE_FUNCTIONS_DEPLOY.md):
--   supabase functions deploy consumeInvite generateInviteLink buscarPorToken atualizarStatus
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1) GARANTIR RLS LIGADO EM TODAS AS TABELAS app_*
-- ============================================================================

ALTER TABLE public.app_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_assessments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_avaliados        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessao_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_group_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_identity_links   ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) LIMPAR TODAS AS POLICIES ANTIGAS DAS TABELAS app_*
-- ============================================================================

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'app\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- 3) FUNÇÕES AUXILIARES (SECURITY DEFINER — quebram recursão de RLS)
-- ============================================================================

-- Grupos dos quais o usuário logado é admin
CREATE OR REPLACE FUNCTION public.my_admin_groups()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_groups
  WHERE adminuid::text = (SELECT auth.uid())::text;
$$;

-- Sessões das quais o usuário logado é admin
CREATE OR REPLACE FUNCTION public.my_admin_sessoes()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id::text FROM app_sessoes
  WHERE adminuid::text = (SELECT auth.uid())::text;
$$;

-- Grupo de um usuário (para membro ler o próprio grupo/módulos)
CREATE OR REPLACE FUNCTION public.user_group_id(user_uid text)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT groupid::text FROM app_users
  WHERE uid::text = user_uid LIMIT 1;
$$;

-- Alunos sob responsabilidade do admin logado (por grupo OU avulsos por adminuid)
CREATE OR REPLACE FUNCTION public.my_student_uids()
RETURNS SETOF text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT uid::text FROM app_users
  WHERE adminuid::text = (SELECT auth.uid())::text
     OR groupid::text IN (SELECT public.my_admin_groups());
$$;

REVOKE EXECUTE ON FUNCTION public.my_admin_groups()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_admin_sessoes()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_group_id(text)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_student_uids()    FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.my_admin_groups()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_sessoes()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_group_id(text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_student_uids()    TO authenticated;

-- ============================================================================
-- 4) TRIGGER ANTI-ESCALADA DE PRIVILÉGIO (S3)
--    Bloqueia mudança de role por usuário comum; INSERT força role 'student'.
--    service_role (Edge Functions) e o SQL Editor (postgres) não são afetados.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_privileges()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass para backend confiável e SQL Editor
  IF COALESCE((SELECT auth.role()), '') = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';  -- ninguém se cadastra como admin
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Alteração de role não permitida pelo aplicativo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_privileges ON public.app_users;
CREATE TRIGGER trg_protect_user_privileges
  BEFORE INSERT OR UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileges();

-- ============================================================================
-- 5) POLICIES — app_users
--    Dono lê/edita o próprio registro; admin lê/edita seus alunos
--    (por grupo OU avulsos por adminuid). role protegida pelo trigger.
-- ============================================================================

CREATE POLICY "users_select" ON public.app_users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "users_insert" ON public.app_users
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (uid::text = (SELECT auth.uid())::text);

CREATE POLICY "users_update" ON public.app_users
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  )
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

-- ============================================================================
-- 6) POLICIES — app_groups
--    memberids pode ser jsonb (script base) OU text[] (banco em produção).
--    Detecta o tipo real da coluna e cria a policy com o operador certo.
-- ============================================================================

DO $$
DECLARE col_type text;
BEGIN
  SELECT udt_name INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'app_groups'
    AND column_name  = 'memberids';

  IF col_type = 'jsonb' THEN
    EXECUTE $p$
      CREATE POLICY "groups_select" ON public.app_groups
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          adminuid::text = (SELECT auth.uid())::text
          OR (jsonb_typeof(memberids) = 'array' AND memberids ? (SELECT auth.uid())::text)
          OR id::text = public.user_group_id((SELECT auth.uid())::text)
        )$p$;
  ELSIF col_type IS NOT NULL THEN
    -- text[] (udt_name = '_text') ou similar — usa ANY sobre o array
    EXECUTE $p$
      CREATE POLICY "groups_select" ON public.app_groups
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          adminuid::text = (SELECT auth.uid())::text
          OR (SELECT auth.uid())::text = ANY(memberids::text[])
          OR id::text = public.user_group_id((SELECT auth.uid())::text)
        )$p$;
  ELSE
    -- coluna não existe — só admin e membro via app_users.groupid
    EXECUTE $p$
      CREATE POLICY "groups_select" ON public.app_groups
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          adminuid::text = (SELECT auth.uid())::text
          OR id::text = public.user_group_id((SELECT auth.uid())::text)
        )$p$;
  END IF;
END $$;

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

-- ============================================================================
-- 7) POLICIES — app_modules
--    Admin gerencia os seus (por adminuid OU grupo); membro do grupo lê.
-- ============================================================================

CREATE POLICY "modules_select" ON public.app_modules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR groupid::text = public.user_group_id((SELECT auth.uid())::text)
  );

CREATE POLICY "modules_insert" ON public.app_modules
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "modules_update" ON public.app_modules
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  )
  WITH CHECK (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

CREATE POLICY "modules_delete" ON public.app_modules
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

-- ============================================================================
-- 8) POLICIES — app_assessments
--    Dono OU admin responsável (por grupo OU por aluno avulso via my_student_uids).
-- ============================================================================

CREATE POLICY "assessments_select" ON public.app_assessments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid::text IN (SELECT public.my_student_uids())
  );

CREATE POLICY "assessments_insert" ON public.app_assessments
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid::text IN (SELECT public.my_student_uids())
  );

CREATE POLICY "assessments_update" ON public.app_assessments
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid::text IN (SELECT public.my_student_uids())
  )
  WITH CHECK (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid::text IN (SELECT public.my_student_uids())
  );

CREATE POLICY "assessments_delete" ON public.app_assessments
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR uid::text IN (SELECT public.my_student_uids())
  );

-- ============================================================================
-- 9) POLICIES — app_profiles
-- ============================================================================

CREATE POLICY "profiles_select" ON public.app_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid::text IN (SELECT public.my_student_uids())
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

-- ============================================================================
-- 10) POLICIES — app_invites (S2)
--     SOMENTE o admin dono acessa direto. Validação pública e consumo do
--     convite passam pelas Edge Functions validateInviteToken/consumeInvite
--     (service_role) — NENHUM acesso anon/público direto à tabela.
-- ============================================================================

CREATE POLICY "invites_admin_select" ON public.app_invites
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "invites_admin_insert" ON public.app_invites
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text OR adminuid IS NULL);

CREATE POLICY "invites_admin_update" ON public.app_invites
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

CREATE POLICY "invites_admin_delete" ON public.app_invites
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

-- ============================================================================
-- 11) POLICIES — app_sessoes
-- ============================================================================

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

-- ============================================================================
-- 12) POLICIES — app_avaliados (S1)
--     SOMENTE o admin dono acessa direto. O avaliado (link público) passa
--     pelas Edge Functions buscarPorToken/atualizarStatus (service_role).
-- ============================================================================

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

-- ============================================================================
-- 13) POLICIES — app_sessao_respostas
--     INSERT só via Edge Function atualizarStatus (service_role).
-- ============================================================================

CREATE POLICY "respostas_select" ON public.app_sessao_respostas
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (sessaoid::text IN (SELECT public.my_admin_sessoes()));

-- ============================================================================
-- 14) POLICIES — app_group_reports
-- ============================================================================

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

-- ============================================================================
-- 15) POLICIES — app_identity_links (DELTA 7 mantido)
-- ============================================================================

CREATE POLICY "identity_links_select" ON public.app_identity_links
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (linked_by::text = (SELECT auth.uid())::text);

CREATE POLICY "identity_links_insert" ON public.app_identity_links
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (linked_by::text = (SELECT auth.uid())::text);

CREATE POLICY "identity_links_update" ON public.app_identity_links
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (linked_by::text = (SELECT auth.uid())::text)
  WITH CHECK(linked_by::text = (SELECT auth.uid())::text);

CREATE POLICY "identity_links_delete" ON public.app_identity_links
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (linked_by::text = (SELECT auth.uid())::text);

-- ============================================================================
-- 16) GRANTS — anon não tem NENHUM acesso direto às tabelas app_*
--     (fluxos públicos passam por Edge Functions com service_role)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.app_users, public.app_groups, public.app_modules,
  public.app_assessments, public.app_profiles, public.app_invites,
  public.app_sessoes, public.app_avaliados, public.app_sessao_respostas,
  public.app_group_reports, public.app_identity_links
TO authenticated;

REVOKE ALL ON
  public.app_users, public.app_groups, public.app_modules,
  public.app_assessments, public.app_profiles, public.app_invites,
  public.app_sessoes, public.app_avaliados, public.app_sessao_respostas,
  public.app_group_reports, public.app_identity_links
FROM anon;

-- ============================================================================
-- 17) RECARREGAR CACHE DO POSTGREST
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 18) VERIFICAÇÃO
--     Esperado: nenhuma policy com roles {public} e nenhuma USING (true)
--     em tabelas app_*.
-- ============================================================================

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'app\_%' ESCAPE '\'
ORDER BY tablename, policyname;
