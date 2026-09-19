-- ============================================================================
-- DELTA 23 — Janela de horário da avaliação (turma responde junta) — 19/09/2026
--
-- O facilitador define em app_groups quando a avaliação ABRE (janela_inicio)
-- e FECHA (janela_fim). Vale para as duas portas da turma: conta (wizard) e
-- avulso (link público), porque a sessão avulsa carrega o groupid.
--
-- A janela governa o INÍCIO. Quem começou dentro dela pode terminar: o
-- servidor aceita o envio até janela_fim + 2 h (tolerância). Ambos NULL =
-- sem janela (comportamento de sempre).
--
-- Trava no servidor (não só na tela):
--   • contas  → trigger em app_assessments quando status vira 'submitted'
--   • avulsos → checagem na Edge atualizarStatus (única porta de escrita)
-- ============================================================================

ALTER TABLE public.app_groups
  ADD COLUMN IF NOT EXISTS janela_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS janela_fim    timestamptz;

DO $$ BEGIN
  ALTER TABLE public.app_groups
    ADD CONSTRAINT app_groups_janela_chk
    CHECK (janela_inicio IS NULL OR janela_fim IS NULL OR janela_fim > janela_inicio);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- true se a turma pode ENVIAR agora (inclui a tolerância de 2 h após o fim).
CREATE OR REPLACE FUNCTION public.janela_permite_envio(p_groupid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT (g.janela_inicio IS NULL OR now() >= g.janela_inicio)
       AND (g.janela_fim    IS NULL OR now() <= g.janela_fim + interval '2 hours')
      FROM public.app_groups g
     WHERE g.id = p_groupid
  ), true);
$$;

REVOKE ALL ON FUNCTION public.janela_permite_envio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.janela_permite_envio(uuid) TO authenticated, service_role;

-- Trigger: envio de avaliação de conta fora da janela é recusado no banco.
CREATE OR REPLACE FUNCTION public.trg_app_assessments_janela()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted')
     AND NEW.groupid IS NOT NULL
     AND NOT public.janela_permite_envio(NEW.groupid) THEN
    RAISE EXCEPTION 'janela_fechada: a avaliação desta turma não está aberta agora'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_assessments_janela ON public.app_assessments;
CREATE TRIGGER app_assessments_janela
  BEFORE INSERT OR UPDATE ON public.app_assessments
  FOR EACH ROW EXECUTE FUNCTION public.trg_app_assessments_janela();

NOTIFY pgrst, 'reload schema';
