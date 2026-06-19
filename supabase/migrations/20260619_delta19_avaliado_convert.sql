-- ============================================================================
-- Perfil Master — DELTA 19 — Converter avaliado de sessão em conta de aluno
-- (2026-06-19)
-- ----------------------------------------------------------------------------
-- 1) app_avaliados.converted_uid (uuid): marca o avaliado que virou conta de
--    aluno (Edge convertAvaliado). Serve de histórico, evita reconversão e
--    desconta a pessoa das agregações de grupo (senão contaria 2×: avaliado +
--    conta).
-- 2) Recria central_group_insights e central_observabilidade ignorando os
--    avaliados convertidos (converted_uid IS NOT NULL).
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE public.app_avaliados
  ADD COLUMN IF NOT EXISTS converted_uid uuid;

-- ── central_group_insights v3 (exclui avaliados convertidos) ────────────────
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
  pq_score_avg      int,
  saboteurs_avg     jsonb,
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
  contas AS (
    SELECT u.groupid AS gid,
           NULLIF(p.dominantprofile, '') AS disc,
           (p.dominantprofile IS NOT NULL) AS concluido,
           NULLIF(p.scores->>'D','')::numeric AS sd,
           NULLIF(p.scores->>'I','')::numeric AS si,
           NULLIF(p.scores->>'S','')::numeric AS ss,
           NULLIF(p.scores->>'C','')::numeric AS sc,
           p.pq_score::numeric AS pq,
           p.saboteur_scores AS sab
    FROM app_users u
    LEFT JOIN app_profiles p ON p.uid = u.uid
    WHERE u.groupid IS NOT NULL
  ),
  sessao_av AS (
    SELECT s.groupid AS gid,
           NULLIF(a.perfil->>'perfilPrimario','') AS disc,
           (a.status = 'concluido') AS concluido,
           NULLIF(a.perfil->>'dominante','')::numeric AS sd,
           NULLIF(a.perfil->>'influente','')::numeric AS si,
           NULLIF(a.perfil->>'estavel','')::numeric AS ss,
           NULLIF(a.perfil->>'analitico','')::numeric AS sc,
           NULL::numeric AS pq,
           NULL::jsonb AS sab
    FROM app_avaliados a
    JOIN app_sessoes s ON s.id = a.sessaoid
    WHERE s.groupid IS NOT NULL
      AND a.converted_uid IS NULL          -- DELTA 19: convertido conta como conta
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
      ) AS scores_avg,
      ROUND(AVG(t.pq) FILTER (WHERE t.concluido AND t.pq IS NOT NULL))::int AS pq_avg,
      jsonb_build_object(
        'judge',         ROUND(AVG((t.sab->>'judge')::numeric)         FILTER (WHERE t.concluido)),
        'controller',    ROUND(AVG((t.sab->>'controller')::numeric)    FILTER (WHERE t.concluido)),
        'hyperAchiever', ROUND(AVG((t.sab->>'hyperAchiever')::numeric) FILTER (WHERE t.concluido)),
        'restless',      ROUND(AVG((t.sab->>'restless')::numeric)      FILTER (WHERE t.concluido)),
        'pleaser',       ROUND(AVG((t.sab->>'pleaser')::numeric)       FILTER (WHERE t.concluido)),
        'avoider',       ROUND(AVG((t.sab->>'avoider')::numeric)       FILTER (WHERE t.concluido)),
        'victim',        ROUND(AVG((t.sab->>'victim')::numeric)        FILTER (WHERE t.concluido)),
        'stickler',      ROUND(AVG((t.sab->>'stickler')::numeric)      FILTER (WHERE t.concluido)),
        'hyperRational', ROUND(AVG((t.sab->>'hyperRational')::numeric) FILTER (WHERE t.concluido)),
        'hyperVigilant', ROUND(AVG((t.sab->>'hyperVigilant')::numeric) FILTER (WHERE t.concluido))
      ) AS sab_avg,
      COUNT(t.*) FILTER (WHERE t.concluido AND t.pq IS NOT NULL)::int AS n_pq
    FROM grupos g
    LEFT JOIN todos t ON t.gid = g.id
    GROUP BY g.id, g.name, g.adminuid
  )
  SELECT
    a.id, a.name, a.adminuid, a.n_part, a.n_conc,
    CASE WHEN a.n_part > 0 THEN ROUND(100.0 * a.n_conc / a.n_part)::int ELSE 0 END,
    CASE WHEN a.n_part < n THEN NULL ELSE a.dist END,
    CASE WHEN a.n_part < n THEN NULL ELSE a.scores_avg END,
    CASE WHEN a.n_part < n OR a.n_pq = 0 THEN NULL ELSE a.pq_avg END,
    CASE WHEN a.n_part < n OR a.n_pq = 0 THEN NULL ELSE a.sab_avg END,
    (a.n_part < n) AS suppressed
  FROM agg a
  ORDER BY a.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.central_group_insights(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.central_group_insights(int) TO authenticated;

-- ── central_observabilidade v2 (exclui avaliados convertidos) ───────────────
CREATE OR REPLACE FUNCTION public.central_observabilidade(apenas_meu boolean DEFAULT false)
RETURNS TABLE (
  origem      text,
  status      text,
  criadoem    timestamptz,
  iniciadoem  timestamptz,
  concluidoem timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  is_super boolean := public.is_superadmin() AND NOT COALESCE(apenas_meu, false);
  caller   text    := (SELECT auth.uid())::text;
BEGIN
  RETURN QUERY
  SELECT 'sessao'::text, a.status,
         a.criadoem, a.iniciadoem, a.concluidoem
  FROM app_avaliados a
  WHERE (is_super OR a.adminuid::text = caller)
    AND a.converted_uid IS NULL            -- DELTA 19: convertido aparece como conta

  UNION ALL

  SELECT 'conta'::text,
         CASE WHEN p.dominantprofile IS NOT NULL THEN 'concluido' ELSE 'pendente' END,
         COALESCE(p.createdat, u.createdat),
         CASE WHEN p.dominantprofile IS NOT NULL THEN COALESCE(p.updatedat, p.createdat, u.createdat) END,
         CASE WHEN p.dominantprofile IS NOT NULL THEN COALESCE(p.updatedat, p.createdat, u.createdat) END
  FROM app_users u
  LEFT JOIN app_profiles p ON p.uid = u.uid
  WHERE u.role = 'student'
    AND (
      is_super
      OR u.adminuid::text = caller
      OR u.groupid IN (SELECT id FROM app_groups WHERE adminuid::text = caller)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.central_observabilidade(boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.central_observabilidade(boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
