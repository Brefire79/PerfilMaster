-- ============================================================================
-- DELTA 27 — HOTFIX de segurança: bypass em trigger SECURITY DEFINER — 19/09/2026
--
-- Achado (durante o DELTA 26): dentro de uma função SECURITY DEFINER,
-- `current_user` é o DONO da função (postgres), não quem chamou. O bypass
--   IF auth.role() = 'service_role' OR current_user IN ('postgres','supabase_admin')
-- de `protect_user_privileges` era, portanto, SEMPRE verdadeiro — a trava que
-- impede promover alguém a admin pelo app estava anulada (aluno com UPDATE na
-- própria linha de app_users conseguia gravar role='admin').
--
-- Correção: usar `session_user` (papel de LOGIN, que não muda com SET ROLE nem
-- com SECURITY DEFINER): 'authenticator' no PostgREST, 'postgres' no SQL
-- Editor/CLI/conector. service_role continua reconhecido por auth.role().
-- Aplicado em produção via conector em 19/09/2026.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Bypass para backend confiável (Edge com service_role) e SQL Editor/CLI.
  IF COALESCE((SELECT auth.role()), '') = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin') THEN
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
END; $$;

-- As funções do DELTA 26 (app_ciclos_protege_colunas, app_ciclos_audit) já
-- estão com session_user no arquivo 20260919_delta26_ciclos_testes_dirigidos.sql.

-- protect_admin_deletion (DELTA 8.2/8.3) tinha o mesmo bypass.
CREATE OR REPLACE FUNCTION public.protect_admin_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((SELECT auth.role()), '') = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN OLD;
  END IF;
  IF OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Não é permitido excluir uma conta de administrador pelo aplicativo';
  END IF;
  RETURN OLD;
END; $$;
