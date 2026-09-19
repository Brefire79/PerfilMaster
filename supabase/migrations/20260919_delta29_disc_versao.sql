-- DELTA 29 — DISC-V2: versão do questionário DISC por perfil (19/09/2026)
-- 8 dos 28 itens DISC viraram invertidos (6 − valor) em src/constants/sampleQuestions.js
-- (q_?_02 e q_?_07 de cada dimensão). Perfis novos gravam disc_versao = 2; os
-- existentes ficam em 1. A Linha do Tempo sinaliza comparação entre versões.
-- Aplicado em produção via conector em 19/09/2026.
ALTER TABLE public.app_profiles ADD COLUMN IF NOT EXISTS disc_versao integer NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.app_profiles.disc_versao IS 'Versão do questionário DISC que gerou os scores (1 = itens todos diretos; 2 = 8 itens invertidos, DISC-V2 de 19/09/2026). Comparar ciclos de versões diferentes é aproximado.';
ALTER TABLE public.app_profiles_historico ADD COLUMN IF NOT EXISTS disc_versao integer;

-- O trigger de histórico (DELTA 25) passa a copiar disc_versao para a coluna própria.
CREATE OR REPLACE FUNCTION public.app_profiles_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.assessmentid IS NULL OR NEW.assessmentid IS NULL OR OLD.assessmentid = NEW.assessmentid THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.app_profiles_historico
    (profile_id, uid, ciclo, assessmentid, groupid, dominantprofile, secondaryprofile,
     scores, pq_score, saboteur_scores, snapshot, criadoem, disc_versao)
  VALUES
    (OLD.id, OLD.uid, OLD.ciclo, OLD.assessmentid, OLD.groupid, OLD.dominantprofile,
     OLD.secondaryprofile, OLD.scores, OLD.pq_score, OLD.saboteur_scores,
     to_jsonb(OLD), OLD.createdat, OLD.disc_versao)
  ON CONFLICT (uid, ciclo) DO NOTHING;
  NEW.ciclo     := OLD.ciclo + 1;
  NEW.createdat := now();
  NEW.updatedat := now();
  RETURN NEW;
END; $$;
