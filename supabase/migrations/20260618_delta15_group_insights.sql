-- ============================================================================
-- Perfil Master — DELTA 15 — Inteligência de Grupos (2026-06-18)
-- ----------------------------------------------------------------------------
-- Módulo 3 da Central de Gestão: agregados ANONIMIZADOS por grupo, com
-- k-anonimato. Nenhum registro individual identificável sai daqui — só números.
--
-- Fonte de dados (apenas o que está realmente persistido de forma agregável):
--   - Contas de aluno: app_users (groupid) ⋈ app_profiles (dominantprofile/scores)
--   - Avaliados de sessão: app_avaliados ⋈ app_sessoes (groupid)
-- Entrega: distribuição DISC, médias DISC e taxa de conclusão.
-- PQ Score e intensidades numéricas dos Sabotadores NÃO são persistidos hoje
--   (saboteurpatterns é texto qualitativo; não há coluna pq_score). Quando o
--   pipeline passar a gravá-los, estendemos esta função — NÃO inventamos coluna.
--
-- Escopo (tenancy = facilitador): admin vê os próprios grupos; superadmin vê
-- todos (is_superadmin()). SECURITY DEFINER para agregar sem expor linhas via RLS.
--
-- k-anonimato: grupos com menos de `min_n` participantes retornam suppressed=true
-- e agregados nulos ("amostra insuficiente"). Default N=5 (configurável no param).
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.central_group_insights(min_n int DEFAULT 5)
RETURNS TABLE (
  group_id          uuid,
  group_name        text,
  adminuid          text,
  n_participantes   int,
  n_concluidas      int,
  taxa_conclusao    int,
  disc_distribution jsonb,
  disc_scores_avg   jsonb,
  suppressed        boolean
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  is_super boolean := public.is_superadmin();
  caller   text    := (SELECT auth.uid())::text;
  n        int     := GREATEST(COALESCE(min_n, 5), 1);
BEGIN
  RETURN QUERY
  WITH grupos AS (
    SELECT g.id, g.name, g.adminuid::text AS adminuid
    FROM app_groups g
    WHERE is_super OR g.adminuid::text = caller
  ),
  -- Cast numérico seguro (ignora valores não-numéricos)
  -- Participantes de CONTA (alunos do grupo)
  contas AS (
    SELECT u.groupid AS gid,
           NULLIF(p.dominantprofile, '') AS disc,
           (p.dominantprofile IS NOT NULL) AS concluido,
           NULLIF(p.scores->>'D','')::numeric AS sd,
           NULLIF(p.scores->>'I','')::numeric AS si,
           NULLIF(p.scores->>'S','')::numeric AS ss,
           NULLIF(p.scores->>'C','')::numeric AS sc
    FROM app_users u
    LEFT JOIN app_profiles p ON p.uid = u.uid
    WHERE u.groupid IS NOT NULL
  ),
  -- Participantes de SESSÃO (avaliados das sessões do grupo)
  sessao_av AS (
    SELECT s.groupid AS gid,
           NULLIF(a.perfil->>'perfilPrimario','') AS disc,
           (a.status = 'concluido') AS concluido,
           NULLIF(a.perfil->>'dominante','')::numeric AS sd,
           NULLIF(a.perfil->>'influente','')::numeric AS si,
           NULLIF(a.perfil->>'estavel','')::numeric AS ss,
           NULLIF(a.perfil->>'analitico','')::numeric AS sc
    FROM app_avaliados a
    JOIN app_sessoes s ON s.id = a.sessaoid
    WHERE s.groupid IS NOT NULL
  ),
  todos AS (
    SELECT * FROM contas
    UNION ALL
    SELECT * FROM sessao_av
  ),
  agg AS (
    SELECT
      g.id, g.name, g.adminuid,
      COUNT(t.*)::int AS n_part,
      COUNT(t.*) FILTER (WHERE t.concluido)::int AS n_conc,
      jsonb_build_object(
        'D', COUNT(*) FILTER (WHERE t.concluido AND t.disc = 'D'),
        'I', COUNT(*) FILTER (WHERE t.concluido AND t.disc = 'I'),
        'S', COUNT(*) FILTER (WHERE t.concluido AND t.disc = 'S'),
        'C', COUNT(*) FILTER (WHERE t.concluido AND t.disc = 'C')
      ) AS dist,
      jsonb_build_object(
        'D', ROUND(AVG(t.sd) FILTER (WHERE t.concluido)),
        'I', ROUND(AVG(t.si) FILTER (WHERE t.concluido)),
        'S', ROUND(AVG(t.ss) FILTER (WHERE t.concluido)),
        'C', ROUND(AVG(t.sc) FILTER (WHERE t.concluido))
      ) AS scores_avg
    FROM grupos g
    LEFT JOIN todos t ON t.gid = g.id
    GROUP BY g.id, g.name, g.adminuid
  )
  SELECT
    a.id,
    a.name,
    a.adminuid,
    a.n_part,
    a.n_conc,
    CASE WHEN a.n_part > 0 THEN ROUND(100.0 * a.n_conc / a.n_part)::int ELSE 0 END,
    CASE WHEN a.n_part < n THEN NULL ELSE a.dist END,
    CASE WHEN a.n_part < n THEN NULL ELSE a.scores_avg END,
    (a.n_part < n) AS suppressed
  FROM agg a
  ORDER BY a.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.central_group_insights(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.central_group_insights(int) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verificação rápida (rode logado via app; no SQL Editor o caller não é admin):
-- SELECT * FROM public.central_group_insights(5);
