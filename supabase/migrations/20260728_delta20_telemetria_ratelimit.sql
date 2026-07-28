-- ============================================================================
-- Perfil Master — DELTA 20 — Telemetria de erros + base de rate limit
-- (2026-07-28, Sprint 3 da auditoria de 27/07/2026)
-- ----------------------------------------------------------------------------
-- M2 — app_client_errors
--   Até aqui, erro de cliente morria no navegador: `clientErrors.js` gravava em
--   sessionStorage e sumia ao fechar a aba. Ou seja, quando um avaliado ou um
--   facilitador batia num erro, ninguém ficava sabendo — a operação inteira
--   dependia de alguém reclamar no WhatsApp. Esta tabela é o mínimo para
--   enxergar o que acontece em produção.
--
--   NUNCA guarda PII: a Edge aplica a mesma redação de `safeText`
--   (e-mail, CPF e token viram marcador) e corta o texto.
--
-- A4 — app_rate_limit
--   As Edge Functions PÚBLICAS (buscarPorToken, atualizarStatus,
--   validateInviteToken) não tinham nenhum limite: dava para martelar à
--   vontade. Contador simples por (bucket, identificador) numa janela de tempo.
--
-- Em ambas: INSERT só via Edge Function (service_role, ignora RLS).
-- Sem UPDATE/DELETE para o app. SELECT escopado.
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

-- ─── M2: telemetria de erros do cliente ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_client_errors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid   text,             -- NULL quando o erro vem de fluxo anônimo
  origem     text NOT NULL,    -- 'admin' | 'aluno' | 'publico'
  rota       text,             -- caminho da SPA, já sem query string
  fonte      text,             -- componente/módulo que reportou
  mensagem   text NOT NULL,    -- redigida e truncada pela Edge
  codigo     text,             -- ex.: backend/timeout, assessment/incomplete
  versao     text,             -- VITE_APP_VERSION do bundle
  navegador  text,             -- user-agent resumido
  criadoem   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_errors_recentes
  ON public.app_client_errors (criadoem DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_admin
  ON public.app_client_errors (adminuid, criadoem DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_codigo
  ON public.app_client_errors (codigo, criadoem DESC);

ALTER TABLE public.app_client_errors ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_client_errors'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_client_errors', pol.policyname);
  END LOOP;
END $$;

-- SELECT: o facilitador vê os erros do próprio tenant; o superadmin vê tudo,
-- inclusive os anônimos (adminuid NULL) — que são justamente os do avaliado
-- no link público, onde mais dói perder informação.
CREATE POLICY "client_errors_select" ON public.app_client_errors
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (adminuid IS NOT NULL AND adminuid = (SELECT auth.uid())::text)
    OR public.is_superadmin()
  );

REVOKE ALL ON public.app_client_errors FROM anon, authenticated;
GRANT  SELECT ON public.app_client_errors TO authenticated;

-- ─── A4: base do rate limit das Edge públicas ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_rate_limit (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket   text NOT NULL,   -- nome da função: 'buscarPorToken', ...
  ident    text NOT NULL,   -- hash do IP (nunca o IP em claro)
  criadoem timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_janela
  ON public.app_rate_limit (bucket, ident, criadoem DESC);

ALTER TABLE public.app_rate_limit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_rate_limit'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_rate_limit', pol.policyname);
  END LOOP;
END $$;

-- Nenhuma policy: só o service_role (Edge Functions) enxerga e escreve.
REVOKE ALL ON public.app_rate_limit FROM anon, authenticated;

-- ─── Limpeza: as duas tabelas crescem sozinhas ──────────────────────────────
-- Sem agendador no Free tier, a poda roda oportunisticamente pelas próprias
-- Edge Functions (chamam esta função de vez em quando).

CREATE OR REPLACE FUNCTION public.podar_telemetria()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.app_rate_limit    WHERE criadoem < now() - interval '1 day';
  DELETE FROM public.app_client_errors WHERE criadoem < now() - interval '30 days';
$$;

REVOKE EXECUTE ON FUNCTION public.podar_telemetria() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
