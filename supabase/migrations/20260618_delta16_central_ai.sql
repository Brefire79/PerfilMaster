-- ============================================================================
-- Perfil Master — DELTA 16 — Assistente IA da Central (2026-06-18)
-- ----------------------------------------------------------------------------
-- Suporte ao Módulo 4 (Assistente IA): CACHE de respostas + base para
-- RATE LIMIT por facilitador. Cada linha guarda uma resposta agregada já
-- ANONIMIZADA (sem PII) + a narrativa gerada, chaveada por (adminuid, cache_key).
--
--   - Cache: mesma pergunta (mesma consulta+parâmetros) reusa a linha dentro do
--     TTL, sem nova chamada ao DeepSeek.
--   - Rate limit: a Edge Function conta linhas recentes por adminuid na janela.
--
-- INSERT só via Edge Function (service_role). SELECT escopado por adminuid
-- (histórico do próprio facilitador). Sem UPDATE/DELETE para o app.
-- Nunca há PII aqui (dados já vêm agregados/anonimizados do Módulo 3).
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_central_ai (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid   text NOT NULL,
  cache_key  text NOT NULL,
  pergunta   text,
  query_name text,
  params     jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados      jsonb,            -- resultado agregado anonimizado (p/ cache e PDF)
  narrativa  text,            -- texto humano gerado pela IA
  criadoem   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_central_ai_cache
  ON public.app_central_ai (adminuid, cache_key);
CREATE INDEX IF NOT EXISTS idx_app_central_ai_rate
  ON public.app_central_ai (adminuid, criadoem DESC);

ALTER TABLE public.app_central_ai ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_central_ai'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_central_ai', pol.policyname);
  END LOOP;
END $$;

-- SELECT: dono (ou superadmin). INSERT/UPDATE/DELETE: nenhuma policy → negados
-- ao app; a gravação ocorre só via Edge Function (service_role, ignora RLS).
CREATE POLICY "central_ai_select" ON public.app_central_ai
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    adminuid = (SELECT auth.uid())::text
    OR public.is_superadmin()
  );

REVOKE ALL ON public.app_central_ai FROM anon, authenticated;
GRANT  SELECT ON public.app_central_ai TO authenticated;

NOTIFY pgrst, 'reload schema';
