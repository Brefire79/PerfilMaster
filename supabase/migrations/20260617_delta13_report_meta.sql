-- ============================================================================
-- Perfil Master — DELTA 13 — Metadados de relatório por facilitador (2026-06-17)
-- ----------------------------------------------------------------------------
-- Persiste, por relatório, a ANÁLISE DE IA gerada e a OBSERVAÇÃO de
-- acompanhamento do facilitador — para não precisar regerar a IA toda vez que
-- abrir o Relatório Oficial, e para o admin manter o histórico de anotações.
--
-- Por que uma tabela própria (e não colunas em app_profiles)?
--   A policy profiles_update (DELTA 8) só deixa o DONO da conta (o aluno)
--   atualizar app_profiles — o admin não pode gravar na linha do aluno.
--   app_report_meta é DONA DO ADMIN (adminuid), então funciona para os dois
--   modos de relatório sem mexer nas policies existentes:
--     - ref = token  → relatório de avaliado de sessão (app_avaliados)
--     - ref = uid    → relatório de conta de aluno (app_profiles)
--
-- RLS: cada facilitador enxerga/grava SOMENTE os próprios metadados (adminuid).
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_report_meta (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid    uuid NOT NULL,
  ref         text NOT NULL,          -- token (sessão) OU uid (conta)
  insight     jsonb,                  -- análise de IA salva (insightPerfil)
  observacao  text,                   -- anotação de acompanhamento do facilitador
  criadoem    timestamptz NOT NULL DEFAULT now(),
  atualizadoem timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adminuid, ref)
);

ALTER TABLE public.app_report_meta ENABLE ROW LEVEL SECURITY;

-- Policies — só o admin dono (escopo por adminuid, nunca is_admin() global).
DROP POLICY IF EXISTS "report_meta_select" ON public.app_report_meta;
CREATE POLICY "report_meta_select" ON public.app_report_meta
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "report_meta_insert" ON public.app_report_meta;
CREATE POLICY "report_meta_insert" ON public.app_report_meta
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (adminuid::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "report_meta_update" ON public.app_report_meta;
CREATE POLICY "report_meta_update" ON public.app_report_meta
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING     (adminuid::text = (SELECT auth.uid())::text)
  WITH CHECK(adminuid::text = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "report_meta_delete" ON public.app_report_meta;
CREATE POLICY "report_meta_delete" ON public.app_report_meta
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (adminuid::text = (SELECT auth.uid())::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_report_meta TO authenticated;
REVOKE ALL ON public.app_report_meta FROM anon;
