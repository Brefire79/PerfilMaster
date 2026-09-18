-- ============================================================================
-- DELTA 22 — Convite empresarial (turma com vagas) — 18/09/2026
--
-- Uma empresa pede N avaliações: o facilitador cria o grupo com um convite
-- que tem VAGAS (maxuses), contador em tempo real (usecount), contato da
-- empresa e status (ativo/pausado/encerrado). Cada cadastro — com conta
-- (e-mail) ou avulso (só celular) — gasta uma vaga e fica registrado em
-- app_invite_uses, que é a lista "quem entrou" da aba Convite.
--
-- A vaga é tomada ATOMICAMENTE por invite_consume_seat() (UPDATE condicional
-- com RETURNING): duas pessoas clicando no mesmo segundo nunca passam do
-- limite. Só service_role executa — o cliente nunca mexe no contador.
-- ============================================================================

-- 1) Colunas novas em app_invites --------------------------------------------
ALTER TABLE public.app_invites
  ADD COLUMN IF NOT EXISTS maxuses       integer,                       -- NULL = sem limite
  ADD COLUMN IF NOT EXISTS usecount      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS label         text,                          -- ex.: nome da empresa
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'ativo';

DO $$ BEGIN
  ALTER TABLE public.app_invites
    ADD CONSTRAINT app_invites_status_chk CHECK (status IN ('ativo', 'pausado', 'encerrado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.app_invites
    ADD CONSTRAINT app_invites_maxuses_chk CHECK (maxuses IS NULL OR maxuses >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill best-effort do contador dos convites de grupo já existentes a
-- partir da trilha de auditoria (invite_used). Convites pessoais (e-mail) e
-- avulsos continuam com a semântica `used` de uso único.
UPDATE public.app_invites i
   SET usecount = sub.n
  FROM (
    SELECT target_id AS token, count(*)::int AS n
      FROM public.audit_log
     WHERE action = 'invite_used'
     GROUP BY target_id
  ) sub
 WHERE sub.token = i.token
   AND i.groupid IS NOT NULL
   AND i.email IS NULL
   AND i.usecount = 0;

-- 2) app_invite_uses — quem gastou cada vaga -----------------------------------
CREATE TABLE IF NOT EXISTS public.app_invite_uses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviteid      uuid NOT NULL REFERENCES public.app_invites(id) ON DELETE CASCADE,
  token         text NOT NULL,                      -- token do convite (redundante, facilita consulta)
  adminuid      text NOT NULL,                      -- tenant (facilitador) — escopo da RLS
  groupid       uuid,
  kind          text NOT NULL CHECK (kind IN ('conta', 'avulso')),
  uid           text,                               -- kind = conta → app_users.uid
  avaliadotoken text,                               -- kind = avulso → app_avaliados.token
  nome          text,
  email         text,
  telefone      text,
  usedat        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_invite_uses_inviteid_idx ON public.app_invite_uses (inviteid);
CREATE INDEX IF NOT EXISTS app_invite_uses_adminuid_idx ON public.app_invite_uses (adminuid);
CREATE UNIQUE INDEX IF NOT EXISTS app_invite_uses_conta_unq
  ON public.app_invite_uses (inviteid, uid) WHERE uid IS NOT NULL;

ALTER TABLE public.app_invite_uses ENABLE ROW LEVEL SECURITY;

-- Só o facilitador dono lê. INSERT/UPDATE/DELETE: ninguém além de service_role
-- (Edge Functions consumeInvite / consumeInviteAvulso).
DROP POLICY IF EXISTS "invite_uses_admin_select" ON public.app_invite_uses;
CREATE POLICY "invite_uses_admin_select" ON public.app_invite_uses
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (adminuid = (SELECT auth.uid())::text OR public.is_superadmin());

REVOKE ALL ON public.app_invite_uses FROM anon, authenticated;
GRANT SELECT ON public.app_invite_uses TO authenticated;

-- 3) Tomada atômica de vaga ----------------------------------------------------
-- Devolve a linha do convite se conseguiu a vaga; NULL se não (esgotado,
-- pausado, encerrado, expirado, usado ou inexistente). O chamador decide a
-- mensagem consultando o convite.
CREATE OR REPLACE FUNCTION public.invite_consume_seat(p_token text)
RETURNS public.app_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.app_invites;
BEGIN
  UPDATE public.app_invites
     SET usecount = usecount + 1,
         usedat   = now()
   WHERE token = p_token
     AND status = 'ativo'
     AND used = false
     AND (expiresat IS NULL OR expiresat > now())
     AND (maxuses IS NULL OR usecount < maxuses)
  RETURNING * INTO r;
  RETURN r;
END;
$$;

-- Devolve a vaga se um passo posterior falhar (ex.: INSERT do avaliado).
CREATE OR REPLACE FUNCTION public.invite_release_seat(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.app_invites
     SET usecount = GREATEST(usecount - 1, 0)
   WHERE token = p_token;
$$;

REVOKE ALL ON FUNCTION public.invite_consume_seat(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_release_seat(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_consume_seat(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.invite_release_seat(text) TO service_role;

-- 4) Recarregar cache do PostgREST -------------------------------------------
NOTIFY pgrst, 'reload schema';
