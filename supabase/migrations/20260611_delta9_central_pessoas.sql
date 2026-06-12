-- ============================================================================
-- Perfil Master — DELTA 9 — Central de Pessoas (2026-06-11)
-- ----------------------------------------------------------------------------
-- Contexto: a Central de Pessoas (PRD-Central-de-Pessoas) unifica a pessoa
-- física por CPF. Quando dois registros têm o MESMO CPF, o vínculo é criado
-- AUTOMATICAMENTE (sem clique do admin) — caso A do PRD §4. Para auditoria,
-- distinguimos esse vínculo automático da confirmação manual do admin.
--
-- Esta migração só adiciona a coluna `auto` em app_identity_links.
--   auto = true  → criado automaticamente por CPF idêntico
--   auto = false → confirmado manualmente pelo admin (comportamento da Fase 2)
--
-- Sem policy nova: app_identity_links já tem RLS por linked_by (DELTA 8). A
-- auto-unificação roda com a sessão do próprio admin (não service_role), então
-- ele só cria vínculos com linked_by = auth.uid(). NÃO usar is_admin() global
-- nem USING(true) aqui.
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE public.app_identity_links
  ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;

-- Índice auxiliar para evitar duplicar vínculos automáticos (cpf + avaliado).
-- Parcial: só cobre vínculos que apontam para um avaliado.
CREATE INDEX IF NOT EXISTS idx_app_identity_links_cpf_avaliado
  ON public.app_identity_links (cpf, avaliado_id)
  WHERE avaliado_id IS NOT NULL;
