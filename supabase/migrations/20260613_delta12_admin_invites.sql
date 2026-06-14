-- ============================================================================
-- Perfil Master — DELTA 12 — Convite de administrador + gestão de equipe (2026-06-13)
-- ----------------------------------------------------------------------------
-- Permite que um admin convide um profissional para acessar como ADMIN
-- (admin independente — workspace próprio, NÃO compartilha dados do convidante).
--
-- Segurança:
--   - A promoção a admin SÓ acontece via Edge Function com service_role
--     (consumeInvite / manageTeamAdmins). O trigger protect_user_privileges
--     continua bloqueando qualquer mudança de role pelo app (anon/authenticated).
--   - `app_invites.role`: 'student' (default) ou 'admin'. Só admins geram
--     convites de admin (validado em generateInviteLink).
--   - `app_users.invitedby`: uid do admin que promoveu — usado para LISTAR e
--     REVOGAR apenas os admins que o próprio convidante criou (escopo).
--
-- IDEMPOTENTE. Rodar no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE public.app_invites
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS invitedby text NULL;

-- Índice para a listagem "admins que eu convidei" (manageTeamAdmins).
CREATE INDEX IF NOT EXISTS idx_app_users_invitedby
  ON public.app_users (invitedby)
  WHERE invitedby IS NOT NULL;
