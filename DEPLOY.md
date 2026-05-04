# ProfileAI — Guia de Deploy Manual

> Deploy manual para Netlify + Supabase  
> Tempo estimado: ~15 minutos na primeira vez

---

## Pré-requisitos

- [ ] Conta no [Netlify](https://netlify.com)
- [ ] Projeto Supabase criado em [supabase.com](https://supabase.com)
- [ ] Node.js 20+ instalado localmente
- [ ] Git instalado localmente
- [ ] Repositório GitHub com o código do ProfileAI

---

## 1. Configurar o Supabase

### 1.1 Criar as Tabelas

Execute os SQLs abaixo no **Supabase SQL Editor**  
(`Dashboard → SQL Editor → New query`):

```sql
-- ─── app_users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid         UUID NOT NULL UNIQUE,   -- Supabase Auth UID
  email       TEXT,
  displayname TEXT,
  photourl    TEXT,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','student')),
  groupid     UUID,
  createdat   TIMESTAMPTZ DEFAULT now(),
  updatedat   TIMESTAMPTZ DEFAULT now()
);

-- ─── app_groups ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  adminuid    UUID NOT NULL,
  adminname   TEXT,
  memberids   UUID[] DEFAULT '{}',
  moduleids   UUID[] DEFAULT '{}',
  createdat   TIMESTAMPTZ DEFAULT now(),
  updatedat   TIMESTAMPTZ DEFAULT now()
);

-- ─── app_modules ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groupid     UUID,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'draft',
  "order"     INT DEFAULT 0,
  questions   JSONB DEFAULT '[]',
  createdat   TIMESTAMPTZ DEFAULT now(),
  updatedat   TIMESTAMPTZ DEFAULT now()
);

-- ─── app_assessments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          UUID NOT NULL,
  groupid      UUID,
  moduleid     UUID,
  status       TEXT DEFAULT 'pending',
  answers      JSONB DEFAULT '{}',
  submittedat  TIMESTAMPTZ,
  createdat    TIMESTAMPTZ DEFAULT now(),
  updatedat    TIMESTAMPTZ DEFAULT now()
);

-- ─── app_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          UUID NOT NULL UNIQUE,
  groupid      UUID,
  primarytype  TEXT,
  scores       JSONB DEFAULT '{}',
  createdat    TIMESTAMPTZ DEFAULT now(),
  updatedat    TIMESTAMPTZ DEFAULT now()
);

-- ─── app_invites ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT NOT NULL UNIQUE,
  groupid    UUID NOT NULL,
  adminuid   UUID NOT NULL,
  used       BOOLEAN DEFAULT false,
  usedat     TIMESTAMPTZ,
  usedby     UUID,
  expiresat  TIMESTAMPTZ NOT NULL,
  createdat  TIMESTAMPTZ DEFAULT now()
);

-- ─── app_sessoes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_sessoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adminuid     UUID NOT NULL,
  groupid      UUID,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  status       TEXT DEFAULT 'ativa',
  criadaem     TIMESTAMPTZ DEFAULT now(),
  atualizadaem TIMESTAMPTZ DEFAULT now()
);

-- ─── app_avaliados ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_avaliados (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessaoid     UUID NOT NULL,
  adminuid     UUID NOT NULL,
  nome         TEXT NOT NULL,
  telefone     TEXT,
  email        TEXT,
  token        TEXT NOT NULL UNIQUE,
  status       TEXT DEFAULT 'pendente',
  respostas    JSONB,
  perfil       JSONB,
  criadoem     TIMESTAMPTZ DEFAULT now(),
  iniciadoem   TIMESTAMPTZ,
  concluidoem  TIMESTAMPTZ,
  atualizadoem TIMESTAMPTZ DEFAULT now()
);

-- ─── app_sessao_respostas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_sessao_respostas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessaoid    UUID NOT NULL,
  avaliadoid  UUID NOT NULL,
  respostas   JSONB DEFAULT '{}',
  createdat   TIMESTAMPTZ DEFAULT now()
);

-- ─── app_group_reports ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_group_reports (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groupid   UUID NOT NULL UNIQUE,
  adminuid  UUID,
  data      JSONB DEFAULT '{}',
  createdat TIMESTAMPTZ DEFAULT now(),
  updatedat TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Configurar RLS (Row Level Security)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_modules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sessoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_avaliados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_group_reports ENABLE ROW LEVEL SECURITY;

-- app_users: usuário lê/escreve apenas sua própria linha
CREATE POLICY "users_own_row" ON app_users
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- app_groups: admin gerencia seus grupos; alunos leem grupos dos quais fazem parte
CREATE POLICY "groups_admin_all" ON app_groups
  USING (adminuid = auth.uid())
  WITH CHECK (adminuid = auth.uid());

CREATE POLICY "groups_member_read" ON app_groups
  FOR SELECT USING (auth.uid() = ANY(memberids));

-- app_assessments: aluno gerencia as próprias avaliações
CREATE POLICY "assessments_own" ON app_assessments
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- app_profiles: aluno lê/escreve seu próprio perfil
CREATE POLICY "profiles_own" ON app_profiles
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- app_invites: admin gerencia seus convites; anon lê (para validar token)
CREATE POLICY "invites_admin_write" ON app_invites
  USING (adminuid = auth.uid())
  WITH CHECK (adminuid = auth.uid());

CREATE POLICY "invites_public_read" ON app_invites
  FOR SELECT USING (true);

-- app_sessoes: admin gerencia suas sessões
CREATE POLICY "sessoes_admin" ON app_sessoes
  USING (adminuid = auth.uid())
  WITH CHECK (adminuid = auth.uid());

-- app_avaliados: admin gerencia; público lê/atualiza pelo token (para avaliação pública)
CREATE POLICY "avaliados_admin" ON app_avaliados
  USING (adminuid = auth.uid())
  WITH CHECK (adminuid = auth.uid());

CREATE POLICY "avaliados_public_read" ON app_avaliados
  FOR SELECT USING (true);

CREATE POLICY "avaliados_public_update" ON app_avaliados
  FOR UPDATE USING (true);

-- app_group_reports: admin lê/escreve seus relatórios
CREATE POLICY "reports_admin" ON app_group_reports
  USING (adminuid = auth.uid())
  WITH CHECK (adminuid = auth.uid());
```

### 1.3 Criar o primeiro usuário Admin

1. No Supabase, vá em **Authentication → Users → Add User**
2. Preencha e-mail e senha
3. Anote o UID gerado (coluna `id`)
4. Execute no SQL Editor:

```sql
INSERT INTO app_users (uid, email, role, displayname, createdat, updatedat)
VALUES (
  'COLE_O_UID_AQUI',
  'seu@email.com',
  'admin',
  'Seu Nome',
  now(),
  now()
)
ON CONFLICT (uid) DO UPDATE SET role = 'admin';
```

### 1.4 Configurar Auth no Supabase

Em **Authentication → URL Configuration**:
- **Site URL**: `https://SEU_DOMINIO.netlify.app`
- **Redirect URLs**: adicione `https://SEU_DOMINIO.netlify.app/**`

---

## 2. Configurar Variáveis de Ambiente

### 2.1 Arquivo local (desenvolvimento)

Já existe `.env.local` na raiz do projeto. Confirme os valores:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

VITE_SB_TABLE_USERS=app_users
VITE_SB_TABLE_GROUPS=app_groups
VITE_SB_TABLE_MODULES=app_modules
VITE_SB_TABLE_ASSESSMENTS=app_assessments
VITE_SB_TABLE_PROFILES=app_profiles
VITE_SB_TABLE_INVITES=app_invites
VITE_SB_TABLE_SESSOES=app_sessoes
VITE_SB_TABLE_AVALIADOS=app_avaliados
VITE_SB_TABLE_SESSAO_RESPOSTAS=app_sessao_respostas
VITE_SB_TABLE_GROUP_REPORTS=app_group_reports
```

Onde encontrar as chaves: **Supabase → Project Settings → API**

---

## 3. Build Local (teste antes do deploy)

```bash
# Instalar dependências
npm install

# Testar em dev
npm run dev

# Gerar build de produção
npm run build

# Testar build localmente
npm run preview
```

> O build gera a pasta `/dist`. Confirme que não há erros antes de fazer deploy.

---

## 4. Deploy no Netlify

### Opção A — Deploy via Interface Web (recomendado para a primeira vez)

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em **Add new site → Import an existing project**
3. Conecte ao GitHub e selecione o repositório `profileai`
4. Configure:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Clique em **Deploy site**

### 4.1 Adicionar Variáveis de Ambiente no Netlify

Após criar o site:
1. Vá em **Site configuration → Environment variables**
2. Adicione cada variável do arquivo `.env.local`:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |
| `VITE_SB_TABLE_USERS` | `app_users` |
| `VITE_SB_TABLE_GROUPS` | `app_groups` |
| `VITE_SB_TABLE_MODULES` | `app_modules` |
| `VITE_SB_TABLE_ASSESSMENTS` | `app_assessments` |
| `VITE_SB_TABLE_PROFILES` | `app_profiles` |
| `VITE_SB_TABLE_INVITES` | `app_invites` |
| `VITE_SB_TABLE_SESSOES` | `app_sessoes` |
| `VITE_SB_TABLE_AVALIADOS` | `app_avaliados` |
| `VITE_SB_TABLE_SESSAO_RESPOSTAS` | `app_sessao_respostas` |
| `VITE_SB_TABLE_GROUP_REPORTS` | `app_group_reports` |

3. Após adicionar as variáveis, clique em **Trigger deploy → Deploy site**

### Opção B — Deploy Manual via CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Fazer deploy direto da pasta dist
netlify deploy --prod --dir=dist
```

---

## 5. Verificar o Deploy

Após o deploy finalizar:

- [ ] Acesse `https://SEU_SITE.netlify.app` — deve carregar a tela de login
- [ ] Faça login com o usuário admin criado
- [ ] Verifique se redireciona para `/admin/dashboard`
- [ ] Teste criar um grupo e gerar um link de convite
- [ ] Teste o link de convite em uma aba anônima (registro de aluno)
- [ ] Teste a avaliação DISC completa como aluno
- [ ] Teste logout e login novamente

---

## 6. Domínio Personalizado (opcional)

1. Em Netlify: **Domain management → Add a domain**
2. Insira seu domínio (ex: `profileai.seudominio.com.br`)
3. Configure o DNS no seu provedor de domínio:
   - Tipo `CNAME` apontando para `SEU_SITE.netlify.app`
4. O Netlify provisiona HTTPS automaticamente via Let's Encrypt
5. Lembre de atualizar as URLs no Supabase Auth:
   - **Site URL**: `https://profileai.seudominio.com.br`
   - **Redirect URLs**: `https://profileai.seudominio.com.br/**`

---

## 7. Estrutura de Arquivos Importantes

```
profileai/
├── src/
│   ├── firebase/
│   │   ├── auth.js          ← Wrapper Supabase Auth (não alterar nome)
│   │   ├── firestore.js     ← Wrapper Supabase REST API
│   │   └── config.js        ← Stub vazio (compatibilidade)
│   ├── store/
│   │   └── authStore.js     ← Estado global de autenticação (Zustand)
│   ├── hooks/
│   │   └── useAuth.js       ← Hook principal de auth
│   ├── routes/
│   │   └── index.jsx        ← Todas as rotas + proteção por role
│   └── pages/
│       ├── admin/           ← Páginas do painel admin
│       └── student/         ← Páginas do aluno
├── .env.local               ← Variáveis locais (NÃO commitar)
├── netlify.toml             ← Config Netlify (SPA redirect configurado)
├── vite.config.js           ← Config Vite + PWA
└── DEPLOY.md                ← Este arquivo
```

---

## 8. Segurança — Checklist

- [ ] Nunca commitar `.env.local` no Git (já está no `.gitignore`)
- [ ] Usar apenas a **Anon Key** no frontend (nunca a Service Role Key)
- [ ] Todas as tabelas com **RLS habilitado**
- [ ] Policies configuradas conforme seção 1.2
- [ ] Usuários admin criados via Supabase Auth + SQL (nunca expor a criação via frontend)
- [ ] Tokens de convite têm expiração (7 dias) e são de uso único

---

## 9. Atualizações Futuras

Para atualizar o app após mudanças no código:

```bash
# Gerar novo build
npm run build

# Deploy automático (se integrado ao GitHub):
git add .
git commit -m "feat: descrição da mudança"
git push origin main
# → Netlify faz deploy automaticamente

# Deploy manual:
netlify deploy --prod --dir=dist
```

---

*ProfileAI © 2026 — AmbFusi AI*
