# ProfileAI — Guia de Setup e Deploy

**AMB FUSI | "Damos vida à inovação"**

---

## Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Netlify](https://netlify.com) (gratuita)
- Chave da [Anthropic API](https://console.anthropic.com) (para relatórios IA)

---

## Passo 1 — Configurar o Supabase

### 1.1 Criar projeto
1. Acesse https://app.supabase.com → **New project**
2. Anote a **Project URL** e a **anon key** (Settings → API)

### 1.2 Executar o schema SQL
1. No Supabase: **SQL Editor** → **New query**
2. Cole todo o conteúdo de `schema.sql`
3. Clique em **Run** — todas as tabelas, inserts e políticas RLS serão criadas

### 1.3 Configurar Edge Functions

#### Deploy das funções (Supabase CLI):
```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Vincular ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy das funções
supabase functions deploy calculate-assessment
supabase functions deploy generate-report
```

#### Configurar secret da Anthropic:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...sua-chave...
```

Ou pelo dashboard: **Edge Functions** → **Manage secrets** → adicionar `ANTHROPIC_API_KEY`

### 1.4 Configurar autenticação
1. No Supabase: **Authentication** → **Providers** → **Email** (já habilitado por padrão)
2. Opcional: **Authentication** → **Email Templates** → personalizar com branding AMB FUSI
3. **Authentication** → **URL Configuration** → adicionar seu domínio Netlify em "Site URL"

---

## Passo 2 — Configurar o projeto local

### 2.1 Instalar dependências
```bash
cd "Claude APP"
npm install
```

### 2.2 Criar arquivo de ambiente
```bash
# Copiar template
cp .env.example .env.local

# Editar com seus valores reais
# VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
# VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 2.3 Gerar ícones PWA
Siga as instruções em `public/icons/README.txt`

### 2.4 Testar localmente
```bash
npm run dev
# Abrir http://localhost:5173
```

---

## Passo 3 — Build para produção

```bash
npm run build
```

Isso cria a pasta `dist/` com todos os arquivos otimizados.

---

## Passo 4 — Deploy no Netlify (manual)

1. Acesse https://app.netlify.com
2. Clique em **Add new site** → **Deploy manually**
3. Arraste a pasta `dist/` para a área indicada
4. Aguarde o deploy (geralmente < 30 segundos)
5. Acesse a URL gerada (ex: `https://profileai-abc123.netlify.app`)

### Configurar variáveis de ambiente no Netlify:
1. Site Settings → **Environment variables** → **Add a variable**
2. Adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key

### Configurar domínio personalizado (opcional):
1. Site Settings → **Domain management** → **Add custom domain**

---

## Passo 5 — Atualizar URL no Supabase

Após obter a URL do Netlify:
1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: `https://seu-site.netlify.app`
3. **Redirect URLs**: adicionar `https://seu-site.netlify.app/**`

---

## Estrutura do projeto

```
Claude APP/
├── index.html                          # HTML entry point (PWA)
├── vite.config.js                      # Vite + PWA config
├── netlify.toml                        # Config Netlify
├── package.json
├── .env.example                        # Template de variáveis
├── schema.sql                          # 📦 Banco de dados completo
├── types.ts                            # TypeScript interfaces
├── api-schema.json                     # Schema da API
│
├── AssessmentWizard.jsx                # 🧩 Wizard de perguntas
├── ResultsDashboard.jsx                # 📊 Dashboard de resultados
│
├── supabase/functions/
│   ├── calculate-assessment/index.ts   # ⚙️ Cálculo DISC + Sabotadores
│   └── generate-report/index.ts       # 🤖 Relatório IA (Anthropic)
│
├── src/
│   ├── main.jsx                        # Entry point React
│   ├── App.jsx                         # Roteamento + Auth
│   ├── index.css                       # Estilos globais
│   ├── lib/
│   │   └── supabase.js                 # Cliente Supabase
│   └── pages/
│       ├── LoginPage.jsx               # Login / Cadastro
│       ├── HomePage.jsx                # Home com histórico
│       ├── AssessmentPage.jsx          # Wrapper do wizard
│       └── ResultsPage.jsx             # Wrapper do dashboard
│
└── public/
    ├── favicon.svg
    └── icons/
        ├── icon-192x192.png            # ⚠️ Gerar manualmente
        └── icon-512x512.png            # ⚠️ Gerar manualmente
```

---

## Fluxo da aplicação

```
Login/Cadastro
     ↓
 HomePage (histórico de resultados)
     ↓
 AssessmentPage → AssessmentWizard
     ↓ (28 perguntas DISC + 50 Sabotadores)
 Edge Function: calculate-assessment
     ↓ (salva em assessment_results)
 ResultsPage → ResultsDashboard
     ↓ (se não tiver relatório)
 Edge Function: generate-report → Anthropic API
     ↓ (salva em user_reports)
 Dashboard com: Radar DISC · Barras Sabotadores · PQ Score · Relatório IA
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Variáveis de ambiente não encontradas" | Verifique o `.env.local` e reinicie `npm run dev` |
| "Erro ao carregar perguntas" | Execute o `schema.sql` no Supabase SQL Editor |
| "Usuário não autenticado" | Configure as URLs no Supabase Authentication |
| "Erro na Edge Function" | Verifique se `ANTHROPIC_API_KEY` está configurada nas secrets do Supabase |
| Rota 404 no Netlify | O arquivo `netlify.toml` já inclui o redirect — certifique-se que foi incluído no deploy |
| PWA não instala | Gere os ícones PNG conforme `public/icons/README.txt` |

---

*ProfileAI © 2026 · AMB FUSI · "Damos vida à inovação"*
