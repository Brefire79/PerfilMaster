-- ============================================================================
-- ProfileAI — DELTA 8.3 — Protege admin contra exclusão (2026-06-10)
-- ----------------------------------------------------------------------------
-- Contexto: um admin conseguiu se auto-excluir pela tela de Alunos e perdeu o
-- acesso (o registro em app_users sumiu → login caía como 'student').
--
-- Barreira no banco: trigger BEFORE DELETE que recusa apagar qualquer linha
-- com role='admin' quando a chamada vem do app (anon/authenticated). O backend
-- confiável (service_role) e o SQL Editor (postgres) continuam podendo, caso
-- precise remover um admin de propósito.
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_admin_deletion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN OLD;
  END IF;
  IF OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Não é permitido excluir uma conta de administrador pelo aplicativo';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_deletion ON public.app_users;
CREATE TRIGGER trg_protect_admin_deletion
  BEFORE DELETE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_deletion();

-- Verificação
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_protect_admin_deletion';
