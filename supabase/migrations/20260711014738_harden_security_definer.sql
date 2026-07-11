-- Hardening complementar das funções privilegiadas do Perfil Master.
-- O projeto mantém algumas SECURITY DEFINER em public porque elas são RPCs do
-- PostgREST. Removemos CREATE de roles não confiáveis no schema, revogamos a
-- execução padrão e reabrimos somente as RPCs intencionais para authenticated.

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.my_admin_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_sessoes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_group_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_student_uids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.central_group_insights(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.central_observabilidade(boolean) TO authenticated;

-- Novas tabelas deixam de ser expostas automaticamente pela Data API em
-- projetos Supabase recentes. As permissões abaixo documentam explicitamente
-- a superfície usada pelo frontend; RLS continua sendo a autorização por linha.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_report_meta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_admin_strategies TO authenticated;
GRANT SELECT ON public.audit_log, public.app_central_ai TO authenticated;
REVOKE ALL ON public.audit_log, public.app_central_ai, public.app_superadmins FROM anon;

NOTIFY pgrst, 'reload schema';
