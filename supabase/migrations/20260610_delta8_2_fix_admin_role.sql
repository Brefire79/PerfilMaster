-- ============================================================================
-- ProfileAI — DELTA 8.2 — Correção: admin entrando como aluno (2026-06-09)
-- ----------------------------------------------------------------------------
-- Sintoma: após o DELTA 8, o login do facilitador cai como "student".
-- O app lê o papel em app_users.role (getUser → useAuth). Duas causas possíveis:
--   (1) o trigger anti-escalada rebaixou o role para 'student', OU
--   (2) a policy de SELECT impede o usuário de ler a PRÓPRIA linha.
--
-- Este script corrige as duas e imprime um diagnóstico no final (aba "Messages").
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

-- ── 1) Trigger anti-escalada ROBUSTO (não depende de auth.role(), que pode
--       não existir no projeto e quebrava todo INSERT/UPDATE em app_users) ──
CREATE OR REPLACE FUNCTION public.protect_user_privileges()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Backend confiável (Edge Functions = service_role) e SQL Editor: liberados.
  -- current_user reflete o role efetivo após o SET ROLE do PostgREST.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'student';        -- ninguém se cadastra como admin pelo app
    RETURN NEW;
  END IF;

  -- UPDATE pelo app: ignora tentativa de mudar role (sem lançar erro, para não
  -- quebrar updates legítimos que por acaso reenviem o campo role).
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_privileges ON public.app_users;
CREATE TRIGGER trg_protect_user_privileges
  BEFORE INSERT OR UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileges();

-- ── 2) Re-garante o papel de admin do facilitador ───────────────────────────
--      (roda como postgres → bypassa o trigger). Ajuste o e-mail se precisar.
UPDATE public.app_users
   SET role = 'admin', updatedat = now()
 WHERE email = 'breno.luis@gmail.com';

-- ── 3) Re-afirma a policy de SELECT garantindo que o dono SEMPRE lê a si ────
DROP POLICY IF EXISTS "users_select" ON public.app_users;
CREATE POLICY "users_select" ON public.app_users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    uid::text = (SELECT auth.uid())::text
    OR adminuid::text = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
  );

NOTIFY pgrst, 'reload schema';

-- ── 4) DIAGNÓSTICO (veja a aba "Messages"/"Notices" do SQL Editor) ──────────
DO $$
DECLARE v_uid text; v_role text; v_visible int; v_rls_role text;
BEGIN
  SELECT uid, role INTO v_uid, v_role
  FROM public.app_users WHERE email = 'breno.luis@gmail.com' LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE '>>> Nenhum registro em app_users com esse e-mail. O uid do login NAO tem linha em app_users.';
    RETURN;
  END IF;

  RAISE NOTICE '>>> role no banco = % (uid=%)', v_role, v_uid;

  -- Simula a leitura sob a identidade do facilitador (RLS ligado)
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_visible FROM public.app_users WHERE uid = v_uid;
  SELECT role     INTO v_rls_role FROM public.app_users WHERE uid = v_uid;
  RESET ROLE;

  RAISE NOTICE '>>> Via RLS o facilitador enxerga % linha(s) do proprio registro; role lido = %',
               v_visible, COALESCE(v_rls_role, '(invisivel)');

  IF v_visible = 0 THEN
    RAISE NOTICE '>>> CAUSA = leitura bloqueada pela RLS. (Verifique se o uid do auth bate com app_users.uid)';
  ELSIF v_rls_role = 'admin' THEN
    RAISE NOTICE '>>> OK: leitura e role corretos. Se ainda entrar como aluno, e CACHE: deslogar + Ctrl+Shift+R.';
  END IF;
END $$;
