# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# Perfil Master (profileai)

> SaaS de avaliação comportamental DISC + PQ Sabotadores · Vianexx AI · Breno Luis
> Deploy: perfilmaster.netlify.app · Repo: Brefire79/profileai (branch `main`)
> **Todo o código fica em `profileai/` — nunca edite fora desta pasta.**

---

## Comandos

```bash
cd profileai

npm run dev              # dev server local (porta 3000 via .Codex/launch.json)
npm run build            # build de produção (Vite → dist/)
npm run deploy           # bump de versão + build + netlify deploy --prod
npm run deploy:preview   # build + deploy de preview no Netlify
npm run bump             # bump patch (bump:minor / bump:major)
npm run cap:sync         # sync Capacitor (mobile)

# Edge Functions (Deno) — deploy individual:
supabase functions deploy nome-da-function --project-ref <ref>
```

Não há testes automatizados nem linter configurados. Validação = `npm run build` + verificação manual no preview.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + JSX (Tailwind CSS, Zustand, react-router v6, i18next) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions em Deno/TS) |
| Deploy | Netlify (frontend + 1 function proxy DeepSeek) + Supabase (Edge Functions) |
| Mobile | Capacitor |
| IA | **DeepSeek server-side** — Netlify Function (`netlify/functions/generate-profile-analysis.mjs`) + Edge `_shared/anthropic.ts`, com fallback `localEngine`. **Provider único.** Chave só nos Secrets (Netlify env / Supabase Secrets) — nunca no bundle, localStorage ou URL. |

---

## Arquitetura — o que não é óbvio

### `src/firebase/` NÃO é Firebase
É a **camada de dados Supabase** com nomes legados da migração:
- `firebase/auth.js` — wrapper do Supabase Auth (GoTrue REST), sessão em `localStorage` (`profileai.supabase.session`), refresh automático de token.
- `firebase/firestore.js` — wrapper REST do PostgREST. Contém o mapa `CAMEL_TO_DB` (camelCase do app ↔ colunas lowercase do Postgres). **Toda coluna nova precisa ser registrada ali** ou o PATCH/INSERT falha silenciosamente.
- `firebase/functions.js` — invocador das Edge Functions (injeta JWT do usuário ou anon key).
- `firebase/config.js` — stub vazio, só compatibilidade.

### Três modos de atendimento
1. **Grupo** (alunos com conta): admin cria grupo → convite (`/join/:token` → `/register?token=`) → Edge Function `consumeInvite` cria o `app_users`, entra no grupo e queima o convite (tudo server-side, service_role). Aluno faz `AssessmentWizard` logado.
2. **Individual avulso** (conta sem grupo): convite com `groupid NULL`; aluno fica vinculado ao admin via `app_users.adminuid` (DELTA 6).
3. **Esporádico sem conta** (avaliação avulsa): admin cria `app_sessoes` + `app_avaliados`; cada avaliado recebe link WhatsApp `/avaliacao/:token` (token UUID = credencial). Fluxo 100% via Edge Functions `buscarPorToken`/`atualizarStatus` (service_role) — o anônimo **nunca** acessa tabelas direto. Resultado em `/resultado/:token`; admin vê `RelatorioOficial` em `/admin/relatorio/:token`.
   - **UI (jun/2026):** as abas **Sessões** e **Pessoas** foram **ocultadas** (itens removidos do `Sidebar.jsx` e rotas removidas de `routes/index.jsx`; arquivos `Sessoes.jsx`/`Pessoas.jsx` preservados para reativação). O ponto de entrada migrou para a aba **Alunos** (botão "Avaliação avulsa") e **Grupos › Membros** (botão "Avaliação avulsa (WhatsApp)"), ambos via `components/sessao/NovoAvaliadoTrigger.jsx`. A sessão necessária ao avaliado é criada/reusada implicitamente por `ensureSessaoAvulsa(adminUid, { groupId, titulo })` em `firestore.js` — o facilitador não gerencia mais sessões manualmente.

### Convergência de identidade (CPF)
CPF opcional (com consentimento LGPD) liga avaliações esporádicas ↔ contas de aluno (`app_identity_links`, DELTA 7). CPF nunca sai em resposta pública — só o booleano `temCpf`.

### Banco de dados / RLS — REGRAS CRÍTICAS
- **Fonte da verdade das policies: `RODAR-NO-SUPABASE-DELTA-8-SEGURANCA.sql`** (espelhado em `supabase/migrations/20260609_delta8_seguranca.sql`). Os scripts `RODAR-NO-SUPABASE*.sql` são **gitignored** — alterações permanentes devem ir para `supabase/migrations/`.
- Modelo: cada admin enxerga **apenas os seus** grupos/alunos/sessões/avaliados (por `adminuid` ou grupo). **Nunca** use `is_admin()` global em policy (vaza dados entre facilitadores) e **nunca** crie policy `USING (true)` / `TO public` em tabela `app_*`.
- Fluxos públicos (convite, avaliação por token) passam por Edge Functions com `SUPABASE_SERVICE_ROLE_KEY` — anon não tem GRANT nas tabelas `app_*`.
- `app_users.role` é protegida por trigger (`protect_user_privileges`): o app (anon/authenticated) **não** consegue promover ninguém a admin; INSERTs forçam `student`. Promoção a admin só acontece (a) via SQL Editor ou (b) por Edge Function com `service_role` — `consumeInvite` (convite de admin, DELTA 12) e `manageTeamAdmins` (gestão/revogação de admins convidados, escopo `invitedby`). O trigger mantém o bypass só para `service_role`/`postgres`.
- Colunas do Postgres são **lowercase sem underscore** (`adminuid`, `criadoem`) exceto as do DELTA 7 (`cpf_consent`, `avaliado_id` etc.). Em Edge Functions, escreva os nomes reais das colunas.
- Tabelas: `app_users`, `app_groups`, `app_modules`, `app_assessments`, `app_profiles`, `app_invites`, `app_sessoes`, `app_avaliados`, `app_sessao_respostas`, `app_group_reports`, `app_identity_links`, `app_superadmins`, `audit_log`, `app_central_ai` (Central, DELTA 14/16).

### Edge Functions (`supabase/functions/`)
| Função | Auth | Papel |
|---|---|---|
| `buscarPorToken` | pública (token = credencial) | dados do avaliado p/ link público (sem telefone/CPF) |
| `atualizarStatus` | pública (token) | transição de status + **cálculo DISC server-side** (28 questões `q_*_01..07`) + grava respostas/perfil |
| `validateInviteToken` | pública (token) | valida convite no cadastro |
| `consumeInvite` | JWT obrigatório | consome convite: cria aluno (ou admin, se `invite.role='admin'`), entra no grupo, marca usado |
| `generateInviteLink` | JWT + role admin | gera convite (grupo, avulso ou **admin** via `role:'admin'`) |
| `manageTeamAdmins` | JWT + role admin | lista/revoga/reativa admins do caller (escopo `invitedby`) + `promoteByEmail` (promove conta existente) — DELTA 12 |
| `analyzeResponse`, `buildProfile`, `generate-report`, `groupInsights`, `insightPerfil`, `therapyFlag` | variado | IA (DeepSeek via `_shared/anthropic.ts`) — chave só nos Secrets do servidor |
| `calculate-assessment`, `generateReport` | — | cálculo determinístico, sem IA (obs.: `calculate-assessment` grava na tabela legada `assessment_results`, **não** no pipeline `app_profiles`) |
| `logAudit` | JWT + role admin | Central (DELTA 14): registra evento de auditoria do frontend (allowlist de ações, `adminuid` forçado ao caller) |
| `generateRecoveryLink` | JWT + role admin | Caminho B: gera link de reset de senha (`auth.admin.generateLink` type=recovery) de um aluno do caller p/ enviar por WhatsApp — sem SMTP. Aponta p/ `/reset-password` |
| `assistenteCentral` | JWT + role admin | Central (DELTA 16): Assistente IA — camada semântica fixa, anonimização, cache + rate limit. **Obsoleta desde jul/2026**: o chat "Mestre" virou motor local (`src/lib/mestreLocal.js`) e não a chama mais |

Padrões: `handleCors(req)` no início, erros via `jsonResponse({ error }, status, req)`, CORS com allowlist em `_shared/response.ts` (adicione novos domínios lá), helpers de autorização em `_shared/auth.ts`.

### Questões da avaliação
`src/constants/sampleQuestions.js` tem 78 questões: 28 DISC (`dimension: D/I/S/C`) + 50 sabotadores (`q_sab_*`), **todas likert5**. Desde o **DELTA 19**, o fluxo público é **Completo (78 = 28 DISC + 50 Sabotadores)** — `AvaliacaoPublica.jsx` aplica DISC→Sabotadores e `atualizarStatus/index.ts` pontua **ambos** (DISC + PQ/Sabotadores). Os ids/pesos DISC e o scoring de Sabotadores estão **duplicados** em `atualizarStatus/index.ts` (espelha `src/lib/saboteurScoring.js`) — mudou questão DISC ou regra de sabotador, atualize os dois lados.

**Motor DISC canônico (auditoria 07/07/2026):** a fórmula oficial é a ponderada — `(valor−1)/4 × peso`, média ponderada por dimensão × 100 — implementada em **`src/lib/discScoring.js`** (frontend: `AssessmentWizard`, `MemberProfileSlideOver`) e espelhada em `atualizarStatus/index.ts` (fluxo público). Antes, o wizard usava média simples (÷5×100, sem pesos) e o Edge tinha types errados (`forced_choice`/`scenario` em `q_*_03/_05`, range 3) — a mesma pessoa recebia scores diferentes conforme o fluxo. **Perfis antigos não foram recalculados** (persistidos como estavam); apenas avaliações novas usam o motor canônico. Mudou peso/questão: `discScoring.js` lê `sampleQuestions.js` em runtime (sincroniza sozinho), mas o array `QUESTIONS` do Edge precisa ser atualizado à mão.

### Fórmula PQ Score (não alterar isoladamente)
```
PQ Score = 100 - (média dos top 3 scores brutos [1-5] × 10)
```
Sincronizar `calculate-assessment`, `generate-report`, `src/lib/localEngine.js` e **`src/lib/saboteurScoring.js`** (DELTA 17 — usado pelo `AssessmentWizard` para persistir `pq_score` + `saboteur_scores` em `app_profiles`). Sabotadores: dimensão `SAB_<KEY>` nas 50 questões `q_sab_*` → chave canônica (`judge`, `controller`, `hyperAchiever`, …) via `SAB_DIMENSION_TO_KEY`.

### Central de Gestão (DELTA 14-17) — área admin/superadmin
Aba de topo (`/admin/central`, em `src/pages/admin/central/`), visível a admin/superadmin, com 4 sub-abas. **Tenancy = facilitador (`adminuid`)**; superadmin = UID na allowlist `app_superadmins` (RPC `is_superadmin()`, hook `useSuperadmin`). **Não** existe entidade "empresa-cliente" — "empresa-cliente" ≡ facilitador.
- **Visão Geral** (Módulo 1): observabilidade das 2 fontes (sessão + conta) via RPC `central_observabilidade` (admin = próprio; superadmin = global, toggle "Global/Meu escopo"). Agregação pura em `src/lib/observabilidade.js`.
- **Pessoas & Histórico** (Módulo 2): lista com status real (`getPessoas`) + histórico + **Trilha de Auditoria** (`audit_log`, append-only). Eventos gravados explicitamente por Edge Functions: `assessment_completed`, `invite_created`, `invite_used`, `admin_viewed_history`, `report_exported` (`_shared/audit.ts` + `logAudit`).
- **Inteligência de Grupos** (Módulo 3): agregados anonimizados por grupo (RPC `central_group_insights(min_n)`) com **k-anonimato** (grupos < N → `suppressed`). DISC + conclusão (2 fontes) + PQ/Sabotadores (só contas, DELTA 17).
- **Mestre** (ex-Módulo 4): desde jul/2026 é um **chat flutuante 100% local** — a sub-aba Central › "Mestre (IA)" foi **removida** (rota `central/assistente` redireciona ao Painel; `AssistenteIA.jsx` preservado sem rota). Gatilho "Perguntar ao Mestre" no header do **Dashboard**; painel (`src/components/mestre/MestreChat.jsx`) montado no `AdminLayout`. Motor `src/lib/mestreLocal.js`: roteia por palavras-chave para as consultas fixas (`inteligencia_grupos`/`visao_geral`/`saude_status`/`contagem` — esta última replica o cálculo do card "Total de Alunos" do Painel, com dedup de convertidos DELTA 19) via os mesmos RPCs escopados das outras abas + base de conhecimento do app (modo conversa, incl. data/hora local) — **nenhuma chamada a IA externa no chat**. A API DeepSeek fica reservada à análise nos relatórios (`insightPerfil`) e ao pipeline de avaliação. **Conversa persistida** em `mestreStore` (localStorage `profileai.mestre.chat`), limpa só no logout (`authStore.clearUser`). **Miss-log** (`profileai.mestre.misslog`, localStorage): perguntas sem resposta + erros, insumo para evoluir o vocabulário; não é limpo no logout. Edge Function `assistenteCentral` segue deployada mas **não é mais chamada** (candidata a remoção). PDF local (`src/lib/centralPdf.js`, import dinâmico).

---

## Padrões de código

- Nomenclatura PT-BR na UI: **Dominante, Influente, Estável, Analítico** (nunca D/I/S/C solto em texto); sabotadores conforme `localEngine.js`.
- Cores DISC: D `#EF4444` · I `#F59E0B` · S `#22C55E` · C `#6366F1`. Tema dark: bg `#0F1117`, surface `#1A1D2E`, borda `#2D3047`.
- Nunca usar `<form>` — handlers `onClick`/`onChange`.
- Estado global em `src/store/` (Zustand); `sessaoStore` cobre o fluxo de sessões/avaliados.
- Env vars do frontend com prefixo `VITE_` (`.env.local`, não commitado); segredos só em Supabase Secrets / Netlify env. Nunca colocar chave de IA no bundle.

---

## Pendências conhecidas

- [x] **Banco — DELTA 8/9/10 aplicados** (SQL Editor, 12/06/2026): RLS por facilitador, coluna `auto` (Central de Pessoas) e tabela `app_admin_strategies` (Painel Estratégico).
- [x] **Banco — DELTA 11 aplicado** (SQL Editor, 18/06/2026): adiciona `app_users.notifications` (jsonb) para persistir as preferências de notificação. Aplicado no script consolidado `RODAR-NO-SUPABASE-DELTAS-11-13-16-17.sql` (gitignored).
- [x] **Banco — DELTA 12 aplicado** (SQL Editor, 18/06/2026): `app_invites.role` + `app_users.invitedby` para convite de admin / gestão de equipe. Espelho: `RODAR-NO-SUPABASE-DELTA-12.sql` (gitignored) + `supabase/migrations/20260613_delta12_admin_invites.sql`. **`manageTeamAdmins` ganhou ação `promoteByEmail`** (18/06, já deployada): promove uma conta JÁ existente a admin reivindicando-a (`invitedby=caller`), sem tocar em `groupid`/`adminuid` — revogar (`setRole→'student'`) é reversível N vezes. Resolve o convidado que já tinha conta ("e-mail já em uso").
- [x] **Banco — DELTA 13 aplicado** (SQL Editor, 18/06/2026): cria `app_report_meta` (dona do admin, chave `adminuid+ref`) que persiste a **análise de IA** e a **observação do facilitador** por relatório. `ref` = token (avaliado de sessão) ou uid (conta de aluno). Sem ela, o Relatório Oficial funciona, mas a IA precisa ser regerada a cada abertura e a observação não fica salva (mensagem amigável na UI). Helpers: `getReportMeta`/`salvarReportInsight`/`salvarReportObservacao` em `firestore.js`.
- [x] **Banco — DELTA 14 aplicado** (`20260618_delta14_central_gestao.sql`, SQL Editor 18/06/2026): fundação da **Central de Gestão**. Cria `app_superadmins` (allowlist de visão global), `is_superadmin()` (RPC SECURITY DEFINER usado por RLS e pelo frontend via `useSuperadmin`) e `audit_log` (trilha **append-only**: SELECT escopado por `adminuid`/superadmin, INSERT só via Edge Functions/`service_role`, sem UPDATE/DELETE). Seed do UID do Breno em `app_superadmins` feito. Tenancy = facilitador (`adminuid`); **não** há "empresa-cliente" como entidade.
- [x] **Banco — DELTA 15 aplicado** (`20260618_delta15_group_insights.sql`, SQL Editor 18/06/2026): Módulo 3 (Inteligência de Grupos). RPC `central_group_insights(min_n int)` (SECURITY DEFINER) → **agregados anonimizados por grupo** (distribuição DISC, médias DISC, taxa de conclusão) com **k-anonimato** (grupos < N vêm `suppressed=true` com agregados nulos). Escopo: admin vê os próprios grupos; superadmin vê todos. Fonte: `app_users⋈app_profiles` + `app_avaliados⋈app_sessoes`. **PQ Score e Sabotadores numéricos NÃO são agregados** (não persistidos hoje — `saboteurpatterns` é texto qualitativo, não há coluna `pq_score`); painel mostra placeholder.
- [x] **Banco — DELTA 16 aplicado** (SQL Editor, 18/06/2026): Módulo 4 (Assistente IA). Cria `app_central_ai` (cache de respostas + base de rate-limit por `adminuid`): SELECT escopado por `adminuid`/superadmin, INSERT só via Edge Function (`service_role`), sem UPDATE/DELETE. Nunca guarda PII (só agregados anonimizados). Sem o DELTA, o Assistente responde mas falha ao gravar cache/rate-limit. Edge Function `assistenteCentral` **já deployada** (18/06): camada semântica fixa (consultas `inteligencia_grupos`/`visao_geral`, sem texto→SQL), anonimização do payload ao DeepSeek, cache 6h por (consulta+params), rate limit 30/h. PDF montado client-side (jsPDF + autotable) em `src/lib/centralPdf.js`. Requer o secret `AI_API_KEY` (DeepSeek) já existente.
- [x] **Banco — DELTA 17 aplicado** (SQL Editor, 18/06/2026): (a) adiciona `app_profiles.pq_score` (int) + `saboteur_scores` (jsonb 0-100 por sabotador), agora **persistidos pelo `AssessmentWizard`** via `src/lib/saboteurScoring.js`; (b) estende `central_group_insights` p/ agregar **PQ Score médio** e **intensidade média dos 10 Sabotadores** por grupo (só contas de aluno — desde o DELTA 19 o fluxo público também coleta Sabotadores, mas `central_group_insights` mantém PQ/Sab dos avaliados de sessão como `NULL` na agregação) com k-anonimato; (c) cria `central_observabilidade(apenas_meu boolean)` — registros normalizados das 2 fontes p/ o Módulo 1 com escopo **admin OU superadmin (visão global cross-tenant)**. `assistenteCentral` redeployada p/ incluir PQ/Sabotadores no payload. Sem o DELTA, o Módulo 3 mostra placeholder de PQ/Sabotadores e a Visão Geral cai no escopo do próprio admin.
- [x] **Banco + Edge — DELTA 19 aplicado** (`20260619_delta19_avaliado_convert.sql`, SQL Editor 19/06/2026; ref `zlbynxjeefqxcgrsmkjp`): **(1) Avaliação avulsa virou Completa (78 questões)** — o fluxo público (`AvaliacaoPublica.jsx`) deixou de ser DISC-only e agora aplica as 28 DISC + 50 Sabotadores; `atualizarStatus` (redeployada) calcula **PQ Score + Sabotadores server-side** (`calcularSabotadores`, espelha `saboteurScoring.js`) e grava `saboteurScores`/`saboteurTop3`/`pqScore` em `app_avaliados.perfil`. `ResultadoPublico.jsx` e `RelatorioOficial.jsx` (§3.2) exibem a seção PQ/Sabotadores. Avaliados antigos (DISC-only) seguem OK — `calcularSabotadores` retorna `null` e a seção some. **(2) Converter avaliado em conta** — nova Edge `convertAvaliado` (JWT+admin, deployada): avaliado de sessão (token, sem login) → **conta de aluno** (auth user + `app_users` + `app_profiles`, role forçado `student`), migrando o perfil; rollback se o INSERT falhar, adoção de auth órfão (e-mail no Auth sem `app_users`), colisão de e-mail → erro claro (não mescla), e devolve **link de senha (Caminho B)** p/ WhatsApp. Botão "Tornar conta" em `Students.jsx` (`ConverterContaButton.jsx`). **(3) Coluna `app_avaliados.converted_uid`** marca o convertido; `central_group_insights` (v3) e `central_observabilidade` (v2) recriadas para **ignorar convertidos** (senão a pessoa contaria 2×: avaliado + conta). **(4) Fix recovery-link**: `verifyRecoveryToken` (fluxo `?token_hash=`/POST verify) — o preview de link do WhatsApp não queima mais o token de uso único (`auth.js` + `ResetPassword.jsx`). Frontend: commit `f8fdb68` + `npm run deploy` (Netlify prod) + push `origin/main` (v1.0.48). **Completado em 07/07/2026**: `generateRecoveryLink` e `convertAvaliado` ainda devolviam o `action_link` cru (GET auto-verificável) — agora ambas montam `{baseUrl}/reset-password?token_hash={hashed_token}&type=recovery` a partir de `properties.hashed_token` (fallback: link cru se não houver `baseUrl`). Requer redeploy das duas Edge Functions.
- [x] **Edge Functions — deploy de auditoria (DELTA 14) feito** (18/06/2026, ref `zlbynxjeefqxcgrsmkjp`): nova `logAudit` (eventos do frontend do admin, allowlist de ações, escopo forçado ao caller) + `_shared/audit.ts` (`logAuditEvent`, INSERT best-effort via service_role). Re-deployadas `atualizarStatus` (`assessment_completed`), `generateInviteLink` (`invite_created`) e `consumeInvite` (`invite_used`). Eventos passam a popular `audit_log`; a Trilha de Auditoria (Central › Pessoas & Histórico) lê de lá.
- [x] **Edge Functions deployadas** (12-13/06): `consumeInvite`, `generateInviteLink`, `buscarPorToken`, `atualizarStatus`, `insightPerfil`, `therapyFlag` (`_shared/anthropic.ts` sem `userKey`/`geminiKey`).
- [ ] (Futuro) Entrega real de notificações (e-mail/push) — provedor + Edge Functions/cron. Hoje só persiste a preferência.
- [ ] **(Pesquisa) Modelos de perfil além de DiSC** — o seletor "Modelo de Perfil" (criação de módulo) oferecia DiSC/Social Style/OCAI/Custom, mas **só DiSC tem motor de cálculo e relatório**; os demais eram cosméticos (gerariam relatório DISC). Foram marcados **"(em breve)" / desabilitados** em `Modules.jsx` e `ModuleBuilder.jsx`. Pesquisar a melhor abordagem (banco de questões + scoring + relatório por modelo) antes de habilitar Social Style/OCAI/Custom. Obs.: o `AssessmentWizard` principal ignora módulos (usa `sampleQuestions.js` fixo); só `/student/assessment/:id` usa questões de módulo.
- [x] **Reset de senha — Caminho B (WhatsApp, sem SMTP) implementado** (18/06/2026): botão "Senha" no aluno (`Students.jsx`) → `generateRecoveryLink` (Edge, deployada) gera o link de recuperação via `auth.admin.generateLink` → modal com "Enviar no WhatsApp"/"Copiar". Página `/reset-password` (`applyRecoverySession`) define a nova senha. **Redirect URL configurada** (`https://perfilmaster.netlify.app/reset-password` + localhost) na allowlist **Auth → URL Configuration → Redirect URLs** do Supabase (18/06/2026). **Não precisa de SMTP** para o Caminho B. Fluxo completo no ar.
- [ ] **(Opcional, Caminho A) SMTP próprio p/ reset self-service** — se quiser que o usuário resete sozinho via e-mail (sem o facilitador), configurar SMTP próprio (Resend + domínio verificado) em Auth → Emails. Hoje o `onboarding@resend.dev` só entrega ao dono da conta Resend.
- [ ] (Futuro) Edge Function `deleteAccount` (service_role) para exclusão real de dados de contas de aluno (admin segue protegido por trigger).
- [ ] (Futuro, adiado) Migrar IA de DeepSeek para Codex e aceitar chaves `sk-ant-` no backend.

---

- [x] **Auditoria 07/07/2026 — correções aplicadas** (código; requer redeploy): (a) motor DISC canônico `src/lib/discScoring.js` (wizard + MemberProfileSlideOver) espelhando o Edge; (b) types corrigidos no `atualizarStatus` (todas likert5 — `q_*_03/_05` distorciam o DISC público); (c) recovery link com `?token_hash=` em `generateRecoveryLink` e `convertAvaliado` (preview do WhatsApp não queima mais o token); (d) respostas da avaliação pública persistidas em `localStorage` por token (retomada após refresh, chave `profileai.avaliacao.respostas.<token>`, limpa no sucesso); (e) `generateLocalAnalysis` com clamp de PQ e auto-detecção de escala (1-5 vs 0-100); (f) `consumeInvite` não rebaixa mais conta admin que consome convite de aluno (409). **Deploy necessário**: Edge Functions `atualizarStatus`, `generateRecoveryLink`, `convertAvaliado`, `consumeInvite` + `npm run deploy` (Netlify). Nenhum dado migrado — perfis antigos preservados.
- [ ] (Baixa, futuro) Persistir `saboteurTop3` também no fluxo de conta (`app_profiles`) — requer coluna nova + migração; hoje o top-3 é derivado de `saboteur_scores`.

---

*Perfil Master · Vianexx AI · Breno Luis · atualizado 07/07/2026 (auditoria completa + correções de scoring/recovery-link; DELTA 19 em dia)*
