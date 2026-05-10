-- ============================================================================
-- ProfileAI — RLS Policies for app_* tables
-- Migration: 20260504_rls_policies
-- ----------------------------------------------------------------------------
-- Idempotent. Cobre tanto schema com uid TEXT quanto UUID via cast.
-- ============================================================================

-- Enable RLS
ALTER TABLE public.app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_avaliados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_group_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
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

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE uid::text = auth.uid()::text AND role = 'admin'
  );
$$;

-- app_users
CREATE POLICY "users_select_own"   ON public.app_users FOR SELECT USING (uid::text = auth.uid()::text);
CREATE POLICY "users_select_admin" ON public.app_users FOR SELECT USING (public.is_admin());
CREATE POLICY "users_insert_self"  ON public.app_users FOR INSERT WITH CHECK (uid::text = auth.uid()::text);
CREATE POLICY "users_update_own"   ON public.app_users FOR UPDATE USING (uid::text = auth.uid()::text) WITH CHECK (uid::text = auth.uid()::text);
CREATE POLICY "users_update_admin" ON public.app_users FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- app_assessments
CREATE POLICY "assessments_select_own"   ON public.app_assessments FOR SELECT USING (uid::text = auth.uid()::text);
CREATE POLICY "assessments_select_admin" ON public.app_assessments FOR SELECT USING (public.is_admin());
CREATE POLICY "assessments_insert_own"   ON public.app_assessments FOR INSERT WITH CHECK (uid::text = auth.uid()::text);
CREATE POLICY "assessments_update_own"   ON public.app_assessments FOR UPDATE USING (uid::text = auth.uid()::text) WITH CHECK (uid::text = auth.uid()::text);
CREATE POLICY "assessments_delete_own"   ON public.app_assessments FOR DELETE USING (uid::text = auth.uid()::text);

-- app_profiles
CREATE POLICY "profiles_select_own"   ON public.app_profiles FOR SELECT USING (uid::text = auth.uid()::text);
CREATE POLICY "profiles_select_admin" ON public.app_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "profiles_insert_own"   ON public.app_profiles FOR INSERT WITH CHECK (uid::text = auth.uid()::text);
CREATE POLICY "profiles_update_own"   ON public.app_profiles FOR UPDATE USING (uid::text = auth.uid()::text) WITH CHECK (uid::text = auth.uid()::text);

-- app_groups
CREATE POLICY "groups_admin_all" ON public.app_groups FOR ALL USING (adminuid::text = auth.uid()::text) WITH CHECK (adminuid::text = auth.uid()::text);
CREATE POLICY "groups_member_read" ON public.app_groups FOR SELECT USING (memberids::text LIKE '%' || auth.uid()::text || '%');

-- app_modules
CREATE POLICY "modules_admin_all" ON public.app_modules FOR ALL USING (adminuid::text = auth.uid()::text OR public.is_admin()) WITH CHECK (adminuid::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "modules_authenticated_read" ON public.app_modules FOR SELECT USING (auth.role() = 'authenticated');

-- app_invites
CREATE POLICY "invites_admin_write" ON public.app_invites FOR ALL USING (adminuid::text = auth.uid()::text) WITH CHECK (adminuid::text = auth.uid()::text);
CREATE POLICY "invites_public_read" ON public.app_invites FOR SELECT USING (true);
CREATE POLICY "invites_public_update_token" ON public.app_invites FOR UPDATE USING (true) WITH CHECK (true);

-- app_sessoes
CREATE POLICY "sessoes_admin_all" ON public.app_sessoes FOR ALL USING (adminuid::text = auth.uid()::text) WITH CHECK (adminuid::text = auth.uid()::text);

-- app_avaliados
CREATE POLICY "avaliados_admin_all" ON public.app_avaliados FOR ALL USING (adminuid::text = auth.uid()::text) WITH CHECK (adminuid::text = auth.uid()::text);
CREATE POLICY "avaliados_public_read" ON public.app_avaliados FOR SELECT USING (true);
CREATE POLICY "avaliados_public_update" ON public.app_avaliados FOR UPDATE USING (true) WITH CHECK (true);

-- app_group_reports
CREATE POLICY "reports_admin_all" ON public.app_group_reports FOR ALL USING (adminuid::text = auth.uid()::text) WITH CHECK (adminuid::text = auth.uid()::text);
