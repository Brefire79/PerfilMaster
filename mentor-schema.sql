-- ============================================================
-- ProfileAI — AMB FUSI | Sistema de Mentoria
-- mentor-schema.sql — Tabelas adicionais para Mentores e Testes
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensão para gerar bytes aleatórios (token de convite)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: profiles
-- Perfil de cada usuário autenticado (mentor | student)
-- Criado automaticamente via trigger no signup
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'mentor' CHECK (role IN ('mentor', 'student')),
  name        TEXT,
  email       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: tests
-- Testes criados pelo mentor
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  mode                TEXT NOT NULL DEFAULT 'individual' CHECK (mode IN ('individual', 'group')),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  invite_token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  completion_message  TEXT DEFAULT 'Obrigado por concluir a avaliação! Você receberá o resultado por e-mail em breve.',
  deadline            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: questions
-- Perguntas de cada teste
-- Tipos: multiple_choice | likert | text
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  order_index   INT NOT NULL DEFAULT 0,
  type          TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('multiple_choice', 'likert', 'text')),
  content       TEXT NOT NULL,
  options       JSONB,      -- Array de strings para multiple_choice
  required      BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: test_students
-- Alunos inscritos por teste via link de convite
-- ============================================================
CREATE TABLE IF NOT EXISTS test_students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  extra_fields  JSONB DEFAULT '{}',   -- campos adicionais configurados pelo mentor
  status        TEXT NOT NULL DEFAULT 'registered'
                  CHECK (status IN ('registered', 'in_progress', 'completed')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  UNIQUE(test_id, email)
);

-- ============================================================
-- TABELA: test_groups
-- Grupos de alunos dentro de um teste (modo grupo)
-- ============================================================
CREATE TABLE IF NOT EXISTS test_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id     UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Grupo',
  color       TEXT DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: group_members
-- Relacionamento aluno ↔ grupo
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id    UUID NOT NULL REFERENCES test_groups(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES test_students(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, student_id)
);

-- ============================================================
-- TABELA: test_answers
-- Respostas individuais por pergunta
-- ============================================================
CREATE TABLE IF NOT EXISTS test_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES test_students(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_value  TEXT,
  answered_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, question_id)
);

-- ============================================================
-- TABELA: test_results
-- Resultado consolidado por aluno/teste
-- ============================================================
CREATE TABLE IF NOT EXISTS test_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id          UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES test_students(id) ON DELETE CASCADE,
  answers_summary  JSONB,
  score            NUMERIC(5,2),
  email_sent       BOOLEAN DEFAULT FALSE,
  email_sent_at    TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- ============================================================
-- TRIGGER: auto-criar perfil ao registrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'mentor'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results   ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê/edita o próprio
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Tests: mentor gerencia os seus; leitura pública de testes ativos (por token)
DROP POLICY IF EXISTS "tests_mentor_all"   ON tests;
DROP POLICY IF EXISTS "tests_public_read"  ON tests;
CREATE POLICY "tests_mentor_all"  ON tests FOR ALL  USING (auth.uid() = mentor_id);
CREATE POLICY "tests_public_read" ON tests FOR SELECT USING (status = 'active');

-- Questions: mentor gerencia; leitura pública para testes ativos
DROP POLICY IF EXISTS "questions_mentor_all"   ON questions;
DROP POLICY IF EXISTS "questions_public_read"  ON questions;
CREATE POLICY "questions_mentor_all" ON questions FOR ALL
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.mentor_id = auth.uid()));
CREATE POLICY "questions_public_read" ON questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.status = 'active'));

-- test_students: mentor lê todos do seu teste; qualquer um pode inserir (cadastro público)
DROP POLICY IF EXISTS "ts_mentor_read"  ON test_students;
DROP POLICY IF EXISTS "ts_public_insert" ON test_students;
DROP POLICY IF EXISTS "ts_update"        ON test_students;
CREATE POLICY "ts_mentor_read"   ON test_students FOR SELECT
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_students.test_id AND tests.mentor_id = auth.uid()));
CREATE POLICY "ts_public_insert" ON test_students FOR INSERT WITH CHECK (true);
CREATE POLICY "ts_update"        ON test_students FOR UPDATE USING (true);

-- test_groups: mentor gerencia
DROP POLICY IF EXISTS "groups_mentor_all" ON test_groups;
CREATE POLICY "groups_mentor_all" ON test_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_groups.test_id AND tests.mentor_id = auth.uid()));

-- group_members: mentor gerencia
DROP POLICY IF EXISTS "gm_mentor_all" ON group_members;
CREATE POLICY "gm_mentor_all" ON group_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM test_groups tg
    JOIN tests t ON t.id = tg.test_id
    WHERE tg.id = group_members.group_id AND t.mentor_id = auth.uid()
  ));

-- test_answers: aluno insere; mentor lê
DROP POLICY IF EXISTS "ans_insert"       ON test_answers;
DROP POLICY IF EXISTS "ans_mentor_read"  ON test_answers;
CREATE POLICY "ans_insert"      ON test_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "ans_mentor_read" ON test_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_answers.test_id AND tests.mentor_id = auth.uid()));

-- test_results: qualquer um insere/atualiza; mentor lê
DROP POLICY IF EXISTS "res_insert"       ON test_results;
DROP POLICY IF EXISTS "res_update"       ON test_results;
DROP POLICY IF EXISTS "res_mentor_read"  ON test_results;
CREATE POLICY "res_insert"      ON test_results FOR INSERT WITH CHECK (true);
CREATE POLICY "res_update"      ON test_results FOR UPDATE USING (true);
CREATE POLICY "res_mentor_read" ON test_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM tests WHERE tests.id = test_results.test_id AND tests.mentor_id = auth.uid()));

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tests_mentor_id        ON tests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_tests_invite_token     ON tests(invite_token);
CREATE INDEX IF NOT EXISTS idx_questions_test_id      ON questions(test_id, order_index);
CREATE INDEX IF NOT EXISTS idx_test_students_test_id  ON test_students(test_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_student   ON test_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test      ON test_results(test_id);
