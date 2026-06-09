-- ============================================================================
-- ProfileAI — DELTA 8.1 — Exclusão de alunos + disparo em massa (2026-06-09)
-- ----------------------------------------------------------------------------
-- Complementa o DELTA 8 (rode o DELTA 8 antes, se ainda não rodou):
--   1) Coluna conviteenviadoem em app_avaliados — rastreia quem já recebeu o
--      convite WhatsApp, para o botão "Disparar pendentes" enviar só aos novos.
--   2) Policy users_delete — admin pode excluir os PRÓPRIOS alunos
--      (limpeza de testes/erros). Não existia DELETE em app_users.
--   3) profiles_delete ampliada — admin apaga o perfil dos próprios alunos
--      junto com o registro (antes era só o dono).
--
-- IDEMPOTENTE: pode rodar várias vezes sem quebrar nada.
-- COMO USAR: Supabase Dashboard → SQL Editor → colar tudo → Run.
-- ============================================================================

-- ── 1) Rastreio de disparo do convite WhatsApp ──────────────────────────────
ALTER TABLE public.app_avaliados
  ADD COLUMN IF NOT EXISTS conviteenviadoem timestamptz NULL;

-- ── 2) Admin exclui os próprios alunos (avulsos por adminuid OU por grupo) ──
DROP POLICY IF EXISTS "users_delete" ON public.app_users;
CREATE POLICY "users_delete" ON public.app_users
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

-- ── 3) Admin apaga o perfil DISC dos próprios alunos ────────────────────────
DROP POLICY IF EXISTS "profiles_delete" ON public.app_profiles;
CREATE POLICY "profiles_delete" ON public.app_profiles
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR uid::text IN (SELECT public.my_student_uids())
  );

-- ── 4) Recarrega o cache do PostgREST (nova coluna) ─────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 5) Verificação ──────────────────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_avaliados'
  AND column_name = 'conviteenviadoem';

SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('users_delete', 'profiles_delete')
ORDER BY tablename;
