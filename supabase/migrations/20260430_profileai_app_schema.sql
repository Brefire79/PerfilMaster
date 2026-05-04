-- ProfileAI base schema for Supabase (Postgres)
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  role text not null default 'student',
  groupid uuid null,
  displayname text null,
  name text null,
  email text null,
  photo text null,
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_groups (
  id uuid primary key default gen_random_uuid(),
  adminuid text not null,
  name text not null,
  adminname text null,
  memberids jsonb not null default '[]'::jsonb,
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_modules (
  id uuid primary key default gen_random_uuid(),
  groupid uuid null,
  adminuid text null,
  title text null,
  objective text null,
  "order" integer null default 0,
  status text not null default 'draft',
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_assessments (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  groupid uuid null,
  moduleid uuid null,
  status text not null default 'pending',
  answers jsonb not null default '{}'::jsonb,
  profilebuilt boolean not null default false,
  profilebuiltat timestamptz null,
  submittedat timestamptz null,
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_profiles (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  assessmentid uuid null,
  groupid uuid null,
  dominantprofile text null,
  secondaryprofile text null,
  scores jsonb not null default '{}'::jsonb,
  summary text null,
  strengths jsonb null,
  challenges jsonb null,
  rolerecommendation text null,
  workstylerecommendation text null,
  teambehavior text null,
  communicationtips jsonb null,
  saboteurpatterns jsonb null,
  derailmentrisks jsonb null,
  developmentareas jsonb null,
  evolutionnotes text null,
  leadershipstyle text null,
  conflictstyle text null,
  motivators jsonb null,
  stressors jsonb null,
  therapyindicator jsonb null,
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create table if not exists public.app_sessoes (
  id uuid primary key default gen_random_uuid(),
  adminuid text not null,
  groupid uuid null,
  titulo text not null,
  descricao text null,
  status text not null default 'ativa',
  criadaem timestamptz not null default now(),
  atualizadaem timestamptz not null default now()
);

create table if not exists public.app_avaliados (
  id uuid primary key default gen_random_uuid(),
  sessaoid uuid not null references public.app_sessoes(id) on delete cascade,
  adminuid text not null,
  nome text not null,
  telefone text not null,
  email text null,
  token text not null unique,
  status text not null default 'pendente',
  respostas jsonb null,
  perfil jsonb null,
  criadoem timestamptz not null default now(),
  iniciadoem timestamptz null,
  concluidoem timestamptz null,
  atualizadoem timestamptz not null default now()
);

create table if not exists public.app_sessao_respostas (
  id uuid primary key default gen_random_uuid(),
  avaliadoid text not null,
  sessaoid uuid not null references public.app_sessoes(id) on delete cascade,
  respostas jsonb not null,
  submissaoem timestamptz not null default now()
);

create table if not exists public.app_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  groupid uuid not null,
  adminuid text null,
  used boolean not null default false,
  createdat timestamptz not null default now(),
  expiresat timestamptz null,
  usedat timestamptz null,
  usedby text null
);

create table if not exists public.app_group_reports (
  id uuid primary key default gen_random_uuid(),
  groupid uuid not null unique,
  adminuid text null,
  distribution jsonb null,
  teamdynamics text null,
  collaborationtips jsonb null,
  conflictrisks jsonb null,
  recommendedroles jsonb null,
  groupstrengths jsonb null,
  groupblindspots jsonb null,
  aiinsight text null,
  balanceanalysis text null,
  developmentpriorities jsonb null,
  payload jsonb null,
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create index if not exists idx_app_users_groupid on public.app_users (groupid);
create index if not exists idx_app_groups_adminuid on public.app_groups (adminuid);
create index if not exists idx_app_modules_groupid on public.app_modules (groupid);
create index if not exists idx_app_assessments_uid on public.app_assessments (uid);
create index if not exists idx_app_assessments_groupid on public.app_assessments (groupid);
create index if not exists idx_app_profiles_groupid on public.app_profiles (groupid);
create index if not exists idx_app_sessoes_adminuid on public.app_sessoes (adminuid);
create index if not exists idx_app_avaliados_sessaoid on public.app_avaliados (sessaoid);
create index if not exists idx_app_invites_groupid on public.app_invites (groupid);

