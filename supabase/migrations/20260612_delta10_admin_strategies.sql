-- ============================================================================
-- Perfil Master — DELTA 10 — Painel Estratégico persistente (2026-06-12)
-- ----------------------------------------------------------------------------
-- Contexto: o Painel Estratégico (adminStrategy) é gerado pelo facilitador a
-- partir do perfil DISC de um aluno. Ele NÃO pode morar em app_profiles, pois a
-- policy profiles_select libera o próprio aluno a ler o seu perfil — isso vazaria
-- a estratégia privada do facilitador. Por isso usamos uma tabela própria,
-- isolada por adminuid, que o aluno NUNCA acessa.
--
-- Modelo de segurança: cada facilitador só enxerga/grava as SUAS estratégias.
--   - RLS por adminuid = auth.uid() (NUNCA is_admin() global, NUNCA USING(true)).
--   - Apenas authenticated; anon não tem acesso.
-- Unicidade: uma estratégia por (admin, aluno) → upsert por on_conflict.
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_admin_strategies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid     text NOT NULL,
  studentuid   text NOT NULL,
  strategy     jsonb NOT NULL,
  atualizadoem timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adminuid, studentuid)
);

CREATE INDEX IF NOT EXISTS idx_app_admin_strategies_adminuid
  ON public.app_admin_strategies (adminuid);

ALTER TABLE public.app_admin_strategies ENABLE ROW LEVEL SECURITY;

-- Cada admin só lê/escreve as próprias estratégias (isolamento por adminuid).
DROP POLICY IF EXISTS admin_strategies_select ON public.app_admin_strategies;
CREATE POLICY admin_strategies_select
  ON public.app_admin_strategies
  FOR SELECT
  TO authenticated
  USING (adminuid = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS admin_strategies_insert ON public.app_admin_strategies;
CREATE POLICY admin_strategies_insert
  ON public.app_admin_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (adminuid = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS admin_strategies_update ON public.app_admin_strategies;
CREATE POLICY admin_strategies_update
  ON public.app_admin_strategies
  FOR UPDATE
  TO authenticated
  USING (adminuid = (SELECT auth.uid())::text)
  WITH CHECK (adminuid = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS admin_strategies_delete ON public.app_admin_strategies;
CREATE POLICY admin_strategies_delete
  ON public.app_admin_strategies
  FOR DELETE
  TO authenticated
  USING (adminuid = (SELECT auth.uid())::text);
