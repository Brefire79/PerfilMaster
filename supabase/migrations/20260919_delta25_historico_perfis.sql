-- ============================================================================
-- DELTA 25 — Histórico de perfis (reavaliação sem perder o anterior) — 19/09/2026
--
-- Problema: app_profiles tem UNIQUE(uid) e o wizard grava por upsert. Quando
-- a pessoa refaz a avaliação, o perfil anterior (DISC, PQ, sabotadores e todo
-- o texto da IA) é SOBRESCRITO. app_assessments guarda as respostas antigas,
-- mas nenhuma tela lê — não existe "antes → depois".
--
-- Solução sem quebrar nada:
--   • app_profiles continua sendo "o perfil ATUAL", uma linha por uid. Telas,
--     RPCs (central_*) e Edge (buildProfile, convertAvaliado) seguem iguais.
--   • app_profiles.ciclo (1, 2, 3…) conta quantas avaliações a pessoa fez.
--   • app_profiles_historico recebe, por trigger BEFORE UPDATE, uma cópia
--     integral (jsonb) da linha anterior — mas SÓ quando o assessmentid muda,
--     isto é, quando chega uma avaliação nova. O enriquecimento da IA
--     (buildProfile faz upsert com o MESMO assessmentid) e updateProfile
--     (não envia assessmentid) não geram histórico.
--   • Excluir a conta (deleteAccount apaga app_profiles por uid) leva o
--     histórico junto (FK ON DELETE CASCADE) — LGPD preservada.
--
-- Leitura: mesma regra de escopo do app_profiles (a própria pessoa, o
-- facilitador dos grupos dela ou o facilitador direto). Só leitura para o
-- app: INSERT vem exclusivamente do trigger (SECURITY DEFINER).
-- ============================================================================

-- 1) Contador de ciclos no perfil atual -------------------------------------
ALTER TABLE public.app_profiles
  ADD COLUMN IF NOT EXISTS ciclo integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.app_profiles.ciclo IS
  'Número da avaliação que gerou este perfil (1 = primeira). Incrementado pelo trigger quando chega um assessmentid novo; os anteriores ficam em app_profiles_historico.';

-- 2) Tabela de histórico ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_profiles_historico (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  uid              text NOT NULL,
  ciclo            integer NOT NULL,
  assessmentid     uuid,
  groupid          uuid,
  dominantprofile  text,
  secondaryprofile text,
  scores           jsonb,
  pq_score         integer,
  saboteur_scores  jsonb,
  -- Cópia integral da linha de app_profiles no momento em que foi substituída
  -- (inclui aisummary, developmentareas, evolutionnotes, adminstrategy…).
  -- Colunas novas de app_profiles entram aqui sozinhas, sem migração.
  snapshot         jsonb NOT NULL,
  -- Quando o perfil substituído foi criado e quando foi substituído.
  criadoem         timestamptz,
  substituidoem    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_profiles_historico_uid_ciclo_key UNIQUE (uid, ciclo)
);

CREATE INDEX IF NOT EXISTS app_profiles_historico_uid_idx
  ON public.app_profiles_historico (uid, ciclo DESC);
CREATE INDEX IF NOT EXISTS app_profiles_historico_groupid_idx
  ON public.app_profiles_historico (groupid);

COMMENT ON TABLE public.app_profiles_historico IS
  'Perfis anteriores de cada pessoa (um por ciclo). Preenchida só pelo trigger app_profiles_snapshot; o app apenas lê.';

-- 3) Trigger: fotografa o perfil anterior quando chega avaliação nova --------
CREATE OR REPLACE FUNCTION public.app_profiles_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só é reavaliação quando o assessmentid muda de um valor para outro.
  -- (NULL → valor = primeira gravação completa; valor → NULL = correção.)
  IF OLD.assessmentid IS NULL
     OR NEW.assessmentid IS NULL
     OR OLD.assessmentid = NEW.assessmentid THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.app_profiles_historico
    (profile_id, uid, ciclo, assessmentid, groupid, dominantprofile, secondaryprofile,
     scores, pq_score, saboteur_scores, snapshot, criadoem)
  VALUES
    (OLD.id, OLD.uid, OLD.ciclo, OLD.assessmentid, OLD.groupid, OLD.dominantprofile,
     OLD.secondaryprofile, OLD.scores, OLD.pq_score, OLD.saboteur_scores,
     to_jsonb(OLD), OLD.createdat)
  ON CONFLICT (uid, ciclo) DO NOTHING; -- idempotente: retry do mesmo upsert não duplica

  NEW.ciclo     := OLD.ciclo + 1;
  NEW.createdat := now();          -- o perfil novo nasce agora
  NEW.updatedat := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.app_profiles_snapshot() FROM PUBLIC;

DROP TRIGGER IF EXISTS app_profiles_snapshot ON public.app_profiles;
CREATE TRIGGER app_profiles_snapshot
  BEFORE UPDATE ON public.app_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.app_profiles_snapshot();

-- 4) RLS: só leitura, mesmo escopo do app_profiles --------------------------
ALTER TABLE public.app_profiles_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_historico_select ON public.app_profiles_historico;
CREATE POLICY profiles_historico_select
  ON public.app_profiles_historico
  FOR SELECT TO authenticated
  USING (
    uid = (SELECT auth.uid())::text
    OR groupid::text IN (SELECT public.my_admin_groups())
    OR uid IN (SELECT public.my_student_uids())
  );
-- Sem policy de INSERT/UPDATE/DELETE: o app não escreve aqui.

-- O Supabase concede ALL a authenticated em tabela nova (default privileges);
-- a RLS já barra a escrita, mas revogamos explicitamente (defesa em profundidade).
REVOKE ALL ON public.app_profiles_historico FROM anon, public;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.app_profiles_historico FROM authenticated;
GRANT SELECT ON public.app_profiles_historico TO authenticated;
GRANT ALL    ON public.app_profiles_historico TO service_role;

-- 5) Verificação rápida (rodar depois de aplicar) ----------------------------
-- select uid, ciclo, assessmentid from app_profiles order by ciclo desc limit 5;
-- select count(*) from app_profiles_historico;  -- 0 até a primeira reavaliação
