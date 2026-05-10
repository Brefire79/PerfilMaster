# Auditoria de Segurança — ProfileAI

Avaliação realizada em 2026-05-09. Cobre frontend, Edge Functions, autenticação, autorização, dados sensíveis e configuração de deploy.

**Escopo**: `profileai/` (React + Supabase Edge Functions + PostgREST)

**Classificação de severidade**:
- 🔴 **CRÍTICO** — explorável, exposição direta de dados ou credenciais
- 🟠 **ALTO** — explorável com pouco esforço, dano significativo
- 🟡 **MÉDIO** — requer condições específicas, dano moderado
- 🟢 **BAIXO** — boas práticas, hardening

---

## 🔴 CRÍTICO

### C-1. `.gitignore` não ignora `.env.local`
**Arquivo**: [`profileai/.gitignore`](../.gitignore)

```
node_modules

# Local Netlify folder
.netlify
```

`.env.local` contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Embora a anon key seja desenhada para ser pública, **commitar credenciais é má prática** e abre porta para outros segredos vazarem por engano (ex: alguém adiciona `SUPABASE_SERVICE_ROLE_KEY` localmente).

**Ação**:
```
# adicionar a profileai/.gitignore
.env
.env.local
.env.*.local
*.env
dist
.supabase
```

E imediatamente: `git rm --cached profileai/.env.local` se já foi versionado.

---

### C-2. Edge Functions não validam ownership do recurso
**Arquivos**: [`buildProfile/index.ts`](../supabase/functions/buildProfile/index.ts), [`analyzeResponse/index.ts`](../supabase/functions/analyzeResponse/index.ts), [`groupInsights/index.ts`](../supabase/functions/groupInsights/index.ts)

`verify_jwt = true` no [`config.toml`](../supabase/config.toml) garante que o caller está **autenticado**, mas **não** que ele é dono do recurso. Exemplo:

```ts
const { assessmentId, uid } = await req.json();
// nunca verifica se o JWT do caller corresponde a uid
const { data: assessment } = await supabase
  .from('app_assessments')
  .select('*')
  .eq('id', assessmentId)
  .single();
```

Qualquer aluno autenticado pode chamar `buildProfile` passando o `assessmentId` e `uid` de **outro** aluno e:
1. Reescrever o perfil de outra pessoa
2. Forçar gasto de tokens da API Gemini com dados arbitrários

**Ação**: extrair JWT do header `Authorization`, decodificar e comparar com `uid`/owner do recurso:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cliente com a chave do CALLER, não service role
const callerClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
);
const { data: { user: caller } } = await callerClient.auth.getUser();
if (!caller) return jsonResponse({ error: 'unauthorized' }, 401);

// Garante que caller.id === uid OU caller é admin do grupo
if (caller.id !== uid) {
  // verifica se caller é admin do grupo do assessment...
}
```

---

### C-3. Service Role Key usado em funções públicas sem sanitização
**Arquivos**: [`atualizarStatus/index.ts`](../supabase/functions/atualizarStatus/index.ts), [`buscarPorToken/index.ts`](../supabase/functions/buscarPorToken/index.ts)

Estas funções têm `verify_jwt = false` (são acessíveis sem autenticação por design — fluxo público de avaliação via token) e usam `SUPABASE_SERVICE_ROLE_KEY` que **bypassa RLS**.

Riscos:
- Qualquer pessoa pode tentar adivinhar tokens (UUID v4 — 122 bits, computacionalmente inviável, mas...)
- Sem rate limiting, é possível enumerar lentamente
- Se um token vazar (log, screenshot, e-mail forwarded), expõe dados do avaliado

**Ação**:
1. Adicionar **rate limiting** no Supabase (Edge Function tem suporte via `Deno.serve` + cache de IPs)
2. Considerar tokens com expiração (`expires_at`) e renovação
3. Em `buscarPorToken`, retornar **dados mínimos** (apenas o necessário para a tela de avaliação) — atualmente retorna `nome` e detalhes da sessão

---

## 🟠 ALTO

### A-1. CORS aberto a `*` em todas as Edge Functions
**Arquivo**: [`_shared/response.ts`](../supabase/functions/_shared/response.ts)

```ts
'Access-Control-Allow-Origin': '*'
```

Permite chamadas de qualquer origem. Um app malicioso pode invocar suas funções a partir de qualquer site.

**Ação**: restringir ao domínio do app:
```ts
const ALLOWED_ORIGINS = [
  'https://perfilmaster.netlify.app',
  'http://localhost:5173',  // dev
];
const origin = req.headers.get('origin') || '';
const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

return new Response(JSON.stringify(body), {
  headers: { 'Access-Control-Allow-Origin': allowed, ... }
});
```

---

### A-2. JWT armazenado em localStorage (XSS = roubo de sessão)
**Arquivo**: [`firebase/auth.js`](../src/firebase/auth.js)

O token Supabase é guardado em `localStorage`. Se houver QUALQUER vulnerabilidade XSS no app, o atacante extrai o JWT e age como o usuário até a expiração (3600s configurado em `config.toml`).

**Ação**:
1. Auditar todas as renderizações de strings vindas do banco (procurar `dangerouslySetInnerHTML`, eval, etc.)
2. Configurar **Content Security Policy** no `index.html` ou via header do Netlify
3. Considerar httpOnly cookie via Supabase server-side auth (mais complexo, mas elimina XSS leak)
4. Reduzir `jwt_expiry` de 3600s para 900s (15 min) e usar refresh token

---

### A-3. Sem RLS visível na configuração — depende 100% de RLS no Supabase
**Risco**: o frontend chama PostgREST direto com a anon key. Se as tabelas em `app_*` não tiverem **Row Level Security** habilitado, **qualquer usuário autenticado pode ler/escrever qualquer linha**.

**Ação**: verificar no painel Supabase (Table Editor → cada tabela → toggle "Enable RLS") e criar políticas:

```sql
-- Exemplo: app_users — usuário só lê o próprio registro
CREATE POLICY "users_self_read" ON app_users
  FOR SELECT TO authenticated
  USING (uid = auth.uid()::text);

-- Admin lê membros dos próprios grupos
CREATE POLICY "users_admin_read" ON app_users
  FOR SELECT TO authenticated
  USING (
    groupId IN (SELECT id FROM app_groups WHERE adminUid = auth.uid()::text)
  );

-- app_profiles — só dono ou admin do grupo
CREATE POLICY "profiles_owner_read" ON app_profiles
  FOR SELECT TO authenticated
  USING (
    uid = auth.uid()::text
    OR groupId IN (SELECT id FROM app_groups WHERE adminUid = auth.uid()::text)
  );
```

Aplicar policies similares em **todas** as tabelas `app_*`.

---

### A-4. Anon Key no bundle do frontend (esperado, mas RLS é o única defesa)
A `VITE_SUPABASE_ANON_KEY` aparece no bundle JavaScript final servido pelo Netlify. Isso é **comportamento esperado** do Supabase, mas significa que **a única barreira é o RLS** (ver A-3).

Sem RLS configurado, qualquer pessoa que abrir o devtools pega a anon key e:
- Lê todas as linhas de `app_users` (e-mails de todos os usuários)
- Lê resultados completos de avaliações de outros
- Escreve em qualquer tabela

---

## 🟡 MÉDIO

### M-1. CSP ausente
**Arquivo**: [`netlify.toml`](../netlify.toml)

Não há header `Content-Security-Policy`. Ataques de XSS, clickjacking e injeção de iframe ficam mais fáceis.

**Ação**: adicionar em `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

---

### M-2. Senha não tem requisitos de complexidade visíveis
**Risco**: Supabase Auth aceita por default senhas a partir de 6 caracteres. Para SaaS corporativo, isso é fraco.

**Ação**: configurar no painel Supabase em Authentication → Providers → Email:
- Mínimo 8 caracteres
- Requer maiúscula + número + símbolo (se a feature estiver disponível)
- Bloquear senhas vazadas (HaveIBeenPwned check, recurso premium)

---

### M-3. Tokens de convite (`app_invites`) sem rate limiting
Um aluno mal-intencionado pode brute-forçar tokens. UUID v4 são seguros, mas não há limite de tentativas.

**Ação**: adicionar rate limit por IP no fluxo `/join/:token`.

---

### M-4. Logs em `import.meta.env.DEV` podem vazar em produção se mal-configurado
**Arquivos**: vários (Dashboard.jsx, etc.)

```js
if (import.meta.env.DEV) {
  console.log('[AdminDashboard] groups carregados:', groups.length, groups);
}
```

Se o build de produção for feito com `NODE_ENV=development`, esses logs vazam dados sensíveis (lista completa de membros).

**Ação**: validar o build de produção com `npm run build` e checar o bundle por strings como `[AdminDashboard]`. Adicionar verificação no CI.

---

### M-5. `mailto:` não escapa caracteres especiais corretamente
**Arquivo**: [`Students.jsx`](../src/pages/admin/Students.jsx)

```js
const href = `mailto:${encodeURIComponent(student.email)}?subject=...`;
```

`encodeURIComponent` em e-mail é **incorreto** — quebra o `@`. Use o e-mail direto (ele já é validado pelo Supabase) ou parse propriamente.

---

### M-6. Sem 2FA / MFA para admins
Contas de admin têm acesso a dados sensíveis de todos os alunos. Ausência de MFA é um risco.

**Ação**: ativar **TOTP** no Supabase (Authentication → MFA → Enable) e exigir para usuários `role='admin'`.

---

## 🟢 BAIXO

### B-1. Mensagens de erro do Supabase expostas para o usuário
Em vários lugares: `setError(err.message)` ou similar. Mensagens internas (`failed to insert into app_users`) vazam estrutura do banco.

**Ação**: mapear erros conhecidos para mensagens amigáveis e logar o detalhe técnico no console/observabilidade.

---

### B-2. Falta auditoria/histórico de ações administrativas
Nenhuma tabela `app_audit_log` registra ações sensíveis (deleção de grupo, atribuição de avaliação, exclusão de avaliado).

**Ação**: criar tabela de auditoria:
```sql
CREATE TABLE app_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

E inserir após cada ação destrutiva no frontend ou via trigger Postgres.

---

### B-3. WhatsApp link revela telefone do avaliado para qualquer admin do grupo
Comportamento esperado, mas considere mascarar telefones no UI exceto na hora de enviar.

---

### B-4. Sem CAPTCHA no signup
Permite bots criarem contas. Para SaaS B2B isso é menos crítico (convite por token), mas se o signup público for liberado, adicionar reCAPTCHA ou hCaptcha.

---

### B-5. Tokens de avaliado sem expiração
Um token gerado em janeiro de 2026 funciona indefinidamente. Considere expiração de 30-90 dias.

---

### B-6. `analyzeResponse` aceita qualquer payload sem validação de schema
**Arquivo**: [`analyzeResponse/index.ts`](../supabase/functions/analyzeResponse/index.ts)

Se o frontend enviar um objeto malformado, a função pode crashar ou consumir tokens da Gemini desnecessariamente. Use Zod ou validação manual.

---

### B-7. PDF export pode incluir dados sensíveis sem aviso
**Arquivo**: [`pdfExport.js`](../src/utils/pdfExport.js)

Ao exportar relatório, inclui o painel estratégico se admin estiver visualizando. Se o PDF for vazado, todos os dados confidenciais vão junto.

**Ação**: adicionar marca d'água "CONFIDENCIAL — NÃO COMPARTILHAR" no PDF e/ou opção de exportar versão sem painel estratégico.

---

## Resumo executivo

| Severidade | Quantidade | Status |
|---|---|---|
| 🔴 Crítico | 3 | **Ação imediata** |
| 🟠 Alto | 4 | Tratar em ≤ 2 semanas |
| 🟡 Médio | 6 | Tratar em ≤ 1 mês |
| 🟢 Baixo | 7 | Backlog priorizado |

### Top 5 ações imediatas (P0)
1. **Corrigir `.gitignore`** — adicionar `.env*` e remover do histórico se já commitado (C-1)
2. **Habilitar RLS** em todas as tabelas `app_*` com políticas restritivas (A-3)
3. **Validar ownership** nas Edge Functions `buildProfile`, `analyzeResponse`, `groupInsights` (C-2)
4. **Restringir CORS** ao domínio de produção + localhost (A-1)
5. **Adicionar headers de segurança** no Netlify (CSP, X-Frame-Options, etc.) (M-1)

### Recomendações estratégicas
- Implementar **CI de segurança**: `npm audit`, scan de secrets (gitleaks), análise estática (eslint-plugin-security)
- **Pen-test** antes de onboarding de clientes corporativos
- **DPO/LGPD compliance review** — dados comportamentais são pessoais sensíveis no Brasil; revisar política de privacidade, retenção e direito ao esquecimento
- **Monitoramento**: configurar Sentry ou similar para capturar erros em produção
- **Backup**: ativar Point-in-Time Recovery no Supabase para o ambiente de produção

---

## Anexo A — Checklist de RLS por tabela

| Tabela | Self read | Admin read | Self write | Admin write |
|---|---|---|---|---|
| `app_users` | ✅ próprio uid | ✅ se admin do grupo | ✅ próprio uid | ❌ |
| `app_groups` | ✅ se membro | ✅ se adminUid | ❌ | ✅ se adminUid |
| `app_modules` | ✅ se membro do grupo | ✅ se adminUid | ❌ | ✅ se adminUid |
| `app_assessments` | ✅ próprio uid | ✅ se admin do grupo | ✅ próprio uid | ✅ se admin do grupo |
| `app_profiles` | ✅ próprio uid | ✅ se admin do grupo | Edge Function only | Edge Function only |
| `app_invites` | ❌ (apenas via Edge) | ✅ se adminUid | ❌ | ✅ se adminUid |
| `app_sessoes` | ❌ | ✅ se adminUid | ❌ | ✅ se adminUid |
| `app_avaliados` | ❌ (apenas via token público) | ✅ se admin do sessao | ❌ | ✅ se admin do sessao |
| `app_sessao_respostas` | ❌ | ✅ se admin do sessao | ❌ | ✅ se admin do sessao |
| `app_group_reports` | ❌ | ✅ se adminUid | ❌ | Edge Function only |

---

## Anexo B — Variáveis de ambiente sensíveis

| Variável | Onde fica | Sensível |
|---|---|---|
| `VITE_SUPABASE_URL` | bundle frontend | Não (público) |
| `VITE_SUPABASE_ANON_KEY` | bundle frontend | Não (público, mas requer RLS) |
| `GEMINI_API_KEY` | Supabase Edge Function secrets | **SIM** — nunca expor |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets (auto) | **CRÍTICO** — bypassa RLS |
| `SUPABASE_URL` (server) | Edge Function env (auto) | Não |

**Validação**: nenhuma chave server-side deve aparecer em arquivos `VITE_*` ou no bundle do frontend.

---

## Anexo C — Compliance LGPD (Brasil)

Como o app coleta dados comportamentais e psicológicos, alguns pontos da LGPD devem ser considerados:

1. **Base legal** — consentimento explícito do titular (aluno) deve ser registrado no signup
2. **Direito ao esquecimento** — implementar endpoint de deleção total da conta (não apenas soft delete)
3. **Direito à portabilidade** — permitir export dos próprios dados em formato JSON/CSV
4. **DPO designado** — nomear encarregado de tratamento
5. **Política de retenção** — definir prazo máximo de retenção de respostas (sugestão: 5 anos após última atividade)
6. **Notificação de incidente** — processo definido para informar ANPD em caso de vazamento

Recomendação: consultar um advogado especializado antes do go-live com clientes B2B.
