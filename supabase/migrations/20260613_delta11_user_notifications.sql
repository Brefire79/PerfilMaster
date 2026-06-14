-- ============================================================================
-- Perfil Master — DELTA 11 — Preferências de notificação por usuário (2026-06-13)
-- ----------------------------------------------------------------------------
-- Persiste os toggles de Notificações (Configurações) por usuário.
-- Camada de ENTREGA (e-mail/push) é separada e ainda não implementada — esta
-- migração só guarda as PREFERÊNCIAS.
--
-- Formato: { newMember, assessmentComplete, weeklyDigest, systemUpdates } (bool).
-- RLS: usa as policies existentes de app_users (DELTA 8) — o dono atualiza a
-- própria linha (users_update). A coluna não afeta role (trigger inalterado).
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS notifications jsonb NOT NULL DEFAULT '{}'::jsonb;
