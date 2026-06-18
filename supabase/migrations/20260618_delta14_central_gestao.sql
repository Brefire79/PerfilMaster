-- ============================================================================
-- Perfil Master — DELTA 14 — Central de Gestão (2026-06-18)
-- ----------------------------------------------------------------------------
-- Fundação da Central de Gestão (área admin/superadmin):
--   1) app_superadmins  — allowlist de UIDs com visão global (Breno).
--   2) is_superadmin()  — helper SECURITY DEFINER usado por RLS e pelo frontend.
--   3) audit_log        — trilha de auditoria APPEND-ONLY (sem UPDATE/DELETE para
--                         ninguém, nem superadmin). INSERT só via service_role
--                         (Edge Functions); SELECT escopado por adminuid OU
--                         superadmin.
--
-- Modelo de tenancy (decisão 18/06): NÃO existe "empresa-cliente" — o tenant é
-- o próprio facilitador (adminuid). admin enxerga o seu escopo; superadmin
-- (UID na allowlist) enxerga tudo. NUNCA usar is_admin() global nem USING(true).
--
-- As views agregadas anonimizadas (Módulos 3/4) entram numa migração posterior
-- (DELTA 15), quando essa camada for construída.
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1) ALLOWLIST DE SUPERADMIN
--    Tabela mínima: cada linha é um UID com visão global. Sem dados sensíveis.
--    Seed manual (SQL Editor) — o app NÃO promove ninguém a superadmin.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_superadmins (
  uid       text PRIMARY KEY,
  nota      text,
  criadoem  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_superadmins ENABLE ROW LEVEL SECURITY;

-- Ninguém (authenticated/anon) lê a allowlist direto: a checagem é só via
-- is_superadmin() (SECURITY DEFINER). Sem policies = SELECT/INSERT/UPDATE/DELETE
-- negados para todos exceto postgres/service_role (que ignoram RLS).
REVOKE ALL ON public.app_superadmins FROM anon, authenticated;

-- >>> SEED: descomente e troque pelo seu UID real (auth.users.id do Breno).
-- INSERT INTO public.app_superadmins (uid, nota)
-- VALUES ('COLOQUE-AQUI-O-UID-DO-BRENO', 'Breno — fundador')
-- ON CONFLICT (uid) DO NOTHING;

-- ============================================================================
-- 2) HELPER is_superadmin()
--    SECURITY DEFINER para conseguir ler app_superadmins mesmo sem GRANT ao
--    chamador. Usado em policies (cross-tenant) e exposto via RPC ao frontend.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_superadmins
    WHERE uid = (SELECT auth.uid())::text
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- ============================================================================
-- 3) TRILHA DE AUDITORIA — audit_log (APPEND-ONLY)
--    adminuid = tenant dono do evento (para escopo de leitura).
--    actor_*  = quem disparou (pode ser o próprio admin, um aluno, ou o sistema).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid    text NOT NULL,                 -- tenant (facilitador) dono do evento
  actor_id    text,                          -- uid de quem disparou (null = sistema)
  actor_role  text,                          -- 'admin' | 'student' | 'system' | 'anon'
  action      text NOT NULL,                 -- ex.: 'assessment_completed'
  target_type text,                          -- ex.: 'avaliado' | 'profile' | 'invite'
  target_id   text,                          -- id/token do alvo
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_adminuid   ON public.audit_log (adminuid);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON public.audit_log (action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas (idempotência).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_log', pol.policyname);
  END LOOP;
END $$;

-- SELECT: admin dono do escopo OU superadmin. Sem policy de INSERT/UPDATE/DELETE
-- → essas operações ficam negadas para authenticated/anon. INSERT acontece
-- exclusivamente via Edge Functions (service_role, que ignora RLS).
CREATE POLICY "audit_log_select" ON public.audit_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    adminuid = (SELECT auth.uid())::text
    OR public.is_superadmin()
  );

-- GRANTs mínimos: authenticated só LÊ; anon nada. Garante append-only mesmo que
-- alguém adicione policy por engano no futuro (sem GRANT, sem operação).
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT  SELECT ON public.audit_log TO authenticated;

-- ============================================================================
-- 4) RECARREGAR CACHE DO POSTGREST
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 5) VERIFICAÇÃO
-- ============================================================================

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('audit_log', 'app_superadmins')
ORDER BY tablename, policyname;
