-- keepalive: RPC mínima para manter o projeto Supabase (Free tier) acordado.
--
-- Por que existe:
-- o Free tier pausa o projeto após ~7 dias sem atividade. O workflow
-- .github/workflows/keepalive.yml batia em /auth/v1/health, que é atendido pelo
-- gateway e pode NÃO gerar atividade no Postgres. Esta função força uma consulta
-- real ao banco sem expor nenhum dado: devolve só o relógio do servidor.
--
-- Nota de segurança: a migration 20260711014738_harden_security_definer.sql
-- revoga EXECUTE de anon por padrão (ALTER DEFAULT PRIVILEGES), então o GRANT
-- explícito abaixo é obrigatório — sem ele o ping volta 403.
-- É SECURITY INVOKER (padrão) e não lê tabela nenhuma: anon não ganha acesso a
-- nada além da hora atual.

CREATE OR REPLACE FUNCTION public.ping()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$ SELECT now() $$;

GRANT EXECUTE ON FUNCTION public.ping() TO anon;
