-- ============================================================================
-- DELTA 26 — Ciclos de desenvolvimento / aplicação de Testes Dirigidos — 19/09/2026
--
-- Um "ciclo" = um Teste Dirigido (catálogo src/constants/testesDirigidos.js)
-- aplicado a UMA pessoa, sugerido pelo motor de abordagem (src/lib/abordagem.js)
-- ou escolhido pelo facilitador. Guarda de onde veio (regra + versão do motor),
-- o que foi respondido e o resultado por subescala — rastreável e auditável.
--
-- Três canais de aplicação, uma tabela:
--   • conta   → pessoa logada responde em /student/teste/:id (RLS: uid = auth.uid())
--   • avulso  → link público /teste/:token (token UUID = credencial; só via Edge
--               cicloPorToken / cicloResponder com service_role — anon não tem GRANT)
--   • turma   → o facilitador cria N ciclos de uma vez (um por pessoa concluída)
--
-- Status: sugerido → aplicado → concluido | descartado
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_ciclos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid         text NOT NULL,                    -- facilitador (tenant)
  groupid          uuid,                             -- turma, quando aplicado por turma
  pessoa_tipo      text NOT NULL CHECK (pessoa_tipo IN ('conta', 'avulso')),
  uid              text,                             -- conta de aluno
  avaliado_id      uuid REFERENCES public.app_avaliados(id) ON DELETE CASCADE,
  pessoa_nome      text,                             -- só para o facilitador (nunca sai pelo Edge público além do 1º nome)
  token            uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),  -- credencial do link público
  modulo_codigo    text NOT NULL,                    -- 'TD-ASSERTIVIDADE' …
  modulo_versao    integer NOT NULL DEFAULT 1,
  regra_id         text,                             -- 'R3-SAB-STICKLER', 'MANUAL' …
  motor_versao     integer,
  justificativa    jsonb,                            -- string[] do motor no momento da sugestão
  perfil_base_id   uuid,                             -- app_profiles.id (conta) que originou a sugestão
  status           text NOT NULL DEFAULT 'aplicado'
                   CHECK (status IN ('sugerido', 'aplicado', 'concluido', 'descartado')),
  prazo_em         timestamptz,
  respostas        jsonb,                            -- { itemId: 1..5 }
  resultado        jsonb,                            -- { subescalas:{..}, geral, versao }
  concluido_em     timestamptz,
  criadoem         timestamptz NOT NULL DEFAULT now(),
  atualizadoem     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_ciclos_pessoa_check CHECK (
    (pessoa_tipo = 'conta'  AND uid IS NOT NULL) OR
    (pessoa_tipo = 'avulso' AND avaliado_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS app_ciclos_adminuid_idx ON public.app_ciclos (adminuid, criadoem DESC);
CREATE INDEX IF NOT EXISTS app_ciclos_uid_idx      ON public.app_ciclos (uid) WHERE uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_ciclos_avaliado_idx ON public.app_ciclos (avaliado_id) WHERE avaliado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_ciclos_groupid_idx  ON public.app_ciclos (groupid) WHERE groupid IS NOT NULL;

COMMENT ON TABLE public.app_ciclos IS
  'Aplicações de Testes Dirigidos (ciclos de desenvolvimento). Sugestão do motor de abordagem + respostas + resultado, por pessoa. Link público só via Edge (token).';

-- atualizadoem automático
CREATE OR REPLACE FUNCTION public.app_ciclos_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizadoem := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS app_ciclos_touch ON public.app_ciclos;
CREATE TRIGGER app_ciclos_touch BEFORE UPDATE ON public.app_ciclos
  FOR EACH ROW EXECUTE FUNCTION public.app_ciclos_touch();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.app_ciclos ENABLE ROW LEVEL SECURITY;

-- Facilitador: tudo nos próprios ciclos (adminuid = ele).
DROP POLICY IF EXISTS ciclos_admin_all ON public.app_ciclos;
CREATE POLICY ciclos_admin_all ON public.app_ciclos
  FOR ALL TO authenticated
  USING  (adminuid = (SELECT auth.uid())::text)
  WITH CHECK (adminuid = (SELECT auth.uid())::text);

-- Aluno: vê os próprios ciclos…
DROP POLICY IF EXISTS ciclos_aluno_select ON public.app_ciclos;
CREATE POLICY ciclos_aluno_select ON public.app_ciclos
  FOR SELECT TO authenticated
  USING (pessoa_tipo = 'conta' AND uid = (SELECT auth.uid())::text);

-- …e só pode RESPONDER (o trigger abaixo impede mexer em qualquer outra coluna).
DROP POLICY IF EXISTS ciclos_aluno_responder ON public.app_ciclos;
CREATE POLICY ciclos_aluno_responder ON public.app_ciclos
  FOR UPDATE TO authenticated
  USING  (pessoa_tipo = 'conta' AND uid = (SELECT auth.uid())::text AND status = 'aplicado')
  WITH CHECK (pessoa_tipo = 'conta' AND uid = (SELECT auth.uid())::text AND status IN ('aplicado', 'concluido'));

-- Trava: quem não é o facilitador (dono) só altera respostas/resultado/status→concluido/concluido_em.
CREATE OR REPLACE FUNCTION public.app_ciclos_protege_colunas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  papel text := COALESCE((SELECT auth.role()), '');
  quem  text := (SELECT auth.uid())::text;
BEGIN
  -- service_role / postgres (Edge, SQL Editor) e o próprio facilitador passam
  -- (mesmo bypass de protect_user_privileges).
  IF papel = 'service_role' OR session_user IN ('postgres', 'supabase_admin') OR quem = OLD.adminuid THEN
    RETURN NEW;
  END IF;
  IF NEW.adminuid       IS DISTINCT FROM OLD.adminuid
  OR NEW.groupid        IS DISTINCT FROM OLD.groupid
  OR NEW.pessoa_tipo    IS DISTINCT FROM OLD.pessoa_tipo
  OR NEW.uid            IS DISTINCT FROM OLD.uid
  OR NEW.avaliado_id    IS DISTINCT FROM OLD.avaliado_id
  OR NEW.pessoa_nome    IS DISTINCT FROM OLD.pessoa_nome
  OR NEW.token          IS DISTINCT FROM OLD.token
  OR NEW.modulo_codigo  IS DISTINCT FROM OLD.modulo_codigo
  OR NEW.modulo_versao  IS DISTINCT FROM OLD.modulo_versao
  OR NEW.regra_id       IS DISTINCT FROM OLD.regra_id
  OR NEW.motor_versao   IS DISTINCT FROM OLD.motor_versao
  OR NEW.justificativa  IS DISTINCT FROM OLD.justificativa
  OR NEW.perfil_base_id IS DISTINCT FROM OLD.perfil_base_id
  OR NEW.prazo_em       IS DISTINCT FROM OLD.prazo_em
  OR NEW.criadoem       IS DISTINCT FROM OLD.criadoem
  OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'concluido') THEN
    RAISE EXCEPTION 'ciclo/colunas_protegidas' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.app_ciclos_protege_colunas() FROM PUBLIC;
DROP TRIGGER IF EXISTS app_ciclos_protege_colunas ON public.app_ciclos;
CREATE TRIGGER app_ciclos_protege_colunas BEFORE UPDATE ON public.app_ciclos
  FOR EACH ROW EXECUTE FUNCTION public.app_ciclos_protege_colunas();

-- Privilégios: anon nada (o link público passa pela Edge com service_role).
REVOKE ALL ON public.app_ciclos FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_ciclos TO authenticated;
GRANT ALL ON public.app_ciclos TO service_role;

-- ── Auditoria automática (audit_log, append-only) ───────────────────────────
-- Um trigger cobre os 3 canais: cycle_applied (INSERT), cycle_completed
-- (status → concluido, seja pelo aluno logado ou pela Edge pública) e
-- cycle_discarded. Metadata sem PII: módulo/versão/regra/canal/resultado geral.
CREATE OR REPLACE FUNCTION public.app_ciclos_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  papel text := COALESCE((SELECT auth.role()), '');
  quem  text := (SELECT auth.uid())::text;
  ator_role text;
  acao text;
  meta jsonb;
BEGIN
  ator_role := CASE
    WHEN papel = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN 'system'
    WHEN quem = NEW.adminuid THEN 'admin'
    WHEN quem = NEW.uid THEN 'student'
    ELSE 'anon' END;

  IF TG_OP = 'INSERT' THEN
    acao := 'cycle_applied';
  ELSIF NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM 'concluido' THEN
    acao := 'cycle_completed';
  ELSIF NEW.status = 'descartado' AND OLD.status IS DISTINCT FROM 'descartado' THEN
    acao := 'cycle_discarded';
  ELSE
    RETURN NEW;
  END IF;

  meta := jsonb_build_object(
    'modulo', NEW.modulo_codigo,
    'modulo_versao', NEW.modulo_versao,
    'regra', NEW.regra_id,
    'motor_versao', NEW.motor_versao,
    'canal', CASE WHEN NEW.pessoa_tipo = 'conta' THEN 'conta' ELSE 'link' END,
    'groupid', NEW.groupid,
    'geral', CASE WHEN acao = 'cycle_completed' THEN NEW.resultado->'geral' ELSE NULL END
  );

  INSERT INTO public.audit_log (adminuid, actor_id, actor_role, action, target_type, target_id, metadata)
  VALUES (NEW.adminuid, quem, ator_role, acao, 'ciclo', NEW.id::text, meta);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.app_ciclos_audit() FROM PUBLIC;
DROP TRIGGER IF EXISTS app_ciclos_audit ON public.app_ciclos;
CREATE TRIGGER app_ciclos_audit AFTER INSERT OR UPDATE ON public.app_ciclos
  FOR EACH ROW EXECUTE FUNCTION public.app_ciclos_audit();
