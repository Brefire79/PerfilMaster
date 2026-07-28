# Deploy das Edge Functions (Supabase)

> Projeto: **MentoriaX** · ref `zlbynxjeefqxcgrsmkjp` · org Vianexx
> Atualizado em 27/07/2026.

## 1) Pré-requisitos

- Supabase CLI instalado
- Projeto linkado: `supabase link --project-ref zlbynxjeefqxcgrsmkjp`

## 2) Secrets obrigatórios

```bash
supabase secrets set AI_API_KEY=<chave-deepseek>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> O provider de IA é **DeepSeek** (único). `_shared/anthropic.ts` mantém o nome
> legado, mas lê `AI_API_KEY` (com fallback histórico para `DEEPSEEK_API_KEY`).
> A chave **nunca** sai do servidor — o cliente não envia nem recebe chave.

## 3) Deploy das funções

```bash
# Fluxo público (token = credencial)
supabase functions deploy buscarPorToken
supabase functions deploy atualizarStatus
supabase functions deploy validateInviteToken

# Convites, conta e equipe
supabase functions deploy consumeInvite
supabase functions deploy generateInviteLink
supabase functions deploy manageTeamAdmins
supabase functions deploy generateRecoveryLink
supabase functions deploy convertAvaliado
supabase functions deploy deleteAccount

# IA (DeepSeek)
supabase functions deploy insightPerfil
supabase functions deploy buildProfile
supabase functions deploy analyzeResponse
supabase functions deploy groupInsights
supabase functions deploy therapyFlag
supabase functions deploy generate-report

# Cálculo determinístico, auditoria e telemetria
supabase functions deploy generateReport
supabase functions deploy calculate-assessment
supabase functions deploy logAudit
supabase functions deploy logClientError
```

`assistenteCentral` segue deployada mas **não é mais chamada** — o chat "Mestre"
virou motor local (`src/lib/mestreLocal.js`). Candidata a remoção.

## 4) Teste rápido

```bash
supabase functions invoke buscarPorToken --data '{"token":"TOKEN_AQUI"}'
```

## 5) Observações

- `verify_jwt` por função vive em `supabase/config.toml`.
- CORS com allowlist em `_shared/response.ts` — domínio novo entra lá.
- Tabelas usadas: `app_users`, `app_groups`, `app_assessments`, `app_profiles`,
  `app_invites`, `app_sessoes`, `app_avaliados`, `app_sessao_respostas`,
  `app_identity_links`, `app_report_meta`, `app_superadmins`, `audit_log`,
  `app_central_ai`, `app_client_errors`, `app_rate_limit`.
- **Edge pública nova** precisa de `checarRateLimit()` de `_shared/rateLimit.ts`
  e de um `catch` que não devolva `err.message` ao cliente. O contrato de
  segurança (`npm test`) falha se faltar.

## 6) Pendências de deploy (auditoria 27/07/2026)

**Primeiro, o banco:** rodar o **DELTA 20** no SQL Editor
(`supabase/migrations/20260728_delta20_telemetria_ratelimit.sql`). Cria
`app_client_errors` e `app_rate_limit`. Sem ele, a aba Diagnóstico exibe aviso e
o rate limit *falha aberto* — libera as chamadas, sem quebrar nada.

```bash
# Sprints 1 e 2 — completude, sanitização e writes verificados
supabase functions deploy atualizarStatus     --project-ref zlbynxjeefqxcgrsmkjp

# Sprint 3 — rate limit e erros genéricos
supabase functions deploy buscarPorToken      --project-ref zlbynxjeefqxcgrsmkjp
supabase functions deploy validateInviteToken --project-ref zlbynxjeefqxcgrsmkjp

# Sprint 3 — telemetria (função NOVA)
supabase functions deploy logClientError      --project-ref zlbynxjeefqxcgrsmkjp
```

Depois, no GitHub: secret **`SUPABASE_ANON_KEY`** em *Settings → Secrets and
variables → Actions*, para o workflow `keepalive` conseguir pingar o projeto.

---

*Perfil Master · Vianexx AI*
