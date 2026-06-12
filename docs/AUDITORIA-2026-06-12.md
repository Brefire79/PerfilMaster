# Auditoria Completa — Perfil Master · 2026-06-12

> Escopo: funcionamento, segurança e fluidez. Build atual: **verde**. Runtime sem erros
> (somente warnings de future-flag do React Router). Evidências verificadas em código,
> migrações SQL, Edge Functions, netlify.toml, npm audit e smoke test no preview.

## Veredicto geral

O app está **funcional e bem estruturado** — fluxos públicos por token tratam erro
graciosamente, CORS tem allowlist, headers de segurança existem, `buscarPorToken` não
vaza telefone/CPF, não há `dangerouslySetInnerHTML`, nenhum segredo hardcoded no `src/`.
Os problemas encontrados se dividem em: **2 ações de banco pendentes (críticas)**,
**1 vulnerabilidade real de chave em URL**, **vulnerabilidades npm em código morto**,
e uma camada grande de **código legado morto** que infla bundle, precache e superfície
de ataque. Tudo corrigível sem mudança arquitetural.

---

## 🔴 CRÍTICOS (segurança/banco)

### S1 — DELTA 8 e DELTA 9 não aplicados no Supabase
- A migração antiga `20260504_rls_policies.sql` criou policies `USING (true)` em
  `app_avaliados`/`app_invites` (leitura/escrita pública!) e `is_admin()` global
  (qualquer admin vê dados de todos os facilitadores). O **DELTA 8**
  (`supabase/migrations/20260609_delta8_seguranca.sql`) corrige tudo isso, mas **ainda
  não foi rodado no banco**. Enquanto não rodar, as policies perigosas podem estar ativas.
- O **DELTA 9** (`20260611_delta9_central_pessoas.sql`, coluna `auto`) também está
  pendente — sem ele a auto-unificação da Central de Pessoas falha no INSERT.
- Também pendente: deploy das Edge Functions `consumeInvite`, `generateInviteLink`,
  `buscarPorToken`, `atualizarStatus` (correções de 09/06).
- **Ação:** rodar os dois SQLs no SQL Editor + `supabase functions deploy` das 4 functions.
  (Ação manual do Breno — código já está pronto no repo.)

### S2 — Chave de IA do usuário em URL + provider Gemini legado (remover; DeepSeek only)
- `src/lib/apiKeyManager.js:26` chama
  `generativelanguage.googleapis.com/...generateContent?key=${key}` — **chave na query
  string** (vaza em logs/proxies). A chave fica em `localStorage` (`profileai_api_key`).
- `src/firebase/functions.js:9-26` injeta `geminiKey` do localStorage no payload das
  Edge Functions; `_shared/anthropic.ts` aceita `userKey` com prioridade sobre o secret.
- Decisão vigente: **DeepSeek é o único provider**, com chave SOMENTE no servidor
  (Netlify env / Supabase Secrets). O caminho "chave do usuário no navegador" deve morrer.
- **Ação:** remover o caminho Gemini direto do frontend (`apiKeyManager.callAiApi`
  vira só backend), remover `getGeminiKey`/envio de `geminiKey`, remover `userKey` de
  `callAnthropic`, remover/ajustar `ApiKeySection.jsx` em Settings, limpar a mensagem
  "Configure sua chave Gemini" (`RelatorioOficial.jsx:344`).

### S3 — npm audit: 2 críticas (html2pdf.js / jspdf — XSS, path traversal)
- Ambas vivem em `src/utils/pdfExport.js`, usado apenas por `GroupReport.jsx` — que
  **não está roteado** (código morto). O caminho vivo de PDF é `window.print()` no
  RelatorioOficial (seguro).
- **Ação:** remover `html2pdf.js` do package.json + deletar `pdfExport.js` e
  `GroupReport.jsx`; rodar `npm audit fix` para as moderadas (ws etc.).

---

## 🟠 ALTOS (higiene de segurança / produto)

### S4 — CSP permissiva demais para IA
`netlify.toml` permite `connect-src` para `api.anthropic.com`, `api.openai.com`,
`api.groq.com` e `generativelanguage.googleapis.com` — nenhum é usado. Toda chamada de
IA é server-side. **Ação:** reduzir para `'self' https://*.supabase.co
https://fonts.googleapis.com https://fonts.gstatic.com` (DeepSeek é chamado pelo
servidor, não precisa estar na CSP do browser).

### F1 — Rebrand incompleto (visível ao usuário final)
"ProfileAI" e "AMB FUSI / AmbFusi AI" ainda aparecem em:
- `index.html` (title, description, OG, apple-title) · `public/manifest.json` ·
  manifest do `vite.config.js`
- `Sidebar.jsx:135` (logo do app) · rodapé público `AvaliacaoPublica.jsx:605`
  ("ProfileAI · AmbFusi AI") — **o avaliado vê isso**
- `RelatorioOficial.jsx` (cabeçalho "ProfileAI" do documento oficial)
- `document.title` default em vários pontos
**Ação:** rebrand global → **Perfil Master** (manter "Vianexx AI" como assinatura).

### F4 — Código morto extenso (~20 arquivos)
Fora da árvore de rotas (nada importa): `src/pages/mentor/*` (7 arquivos),
`src/components/mentor/*`, `HomePage.jsx`, `LoginPage.jsx`, `ResultsPage.jsx`,
`AssessmentPage.jsx`, `student/TestRunnerPage.jsx`, `student/RegisterPage.jsx`,
`student/CompletionPage.jsx`, `GroupReport.jsx`, `lib/supabase.js`, `utils/pdfExport.js`.
Consequências: chunk `@supabase/supabase-js` de **203 kB** forçado no build via
`manualChunks` (o app vivo usa REST puro, não precisa do client), precache PWA inflado
(3,5 MB), refs xAI/Grok e AMB FUSI residuais, e as 2 CVEs críticas.
**Ação:** deletar os arquivos, remover `supabase` do `manualChunks`, desinstalar
`@supabase/supabase-js` e `html2pdf.js`.

---

## 🟡 MÉDIOS (fluidez / DX)

### P3 — Warnings do React Router no console
`BrowserRouter` sem future flags gera dezenas de warnings (`v7_startTransition`,
`v7_relativeSplatPath`). **Ação:** `<BrowserRouter future={{ v7_startTransition: true,
v7_relativeSplatPath: true }}>` em `App.jsx`.

### P4 — Service Worker ativo em desenvolvimento
`vite.config.js` → `devOptions.enabled: true` faz o Workbox interceptar/cachear em dev
(logs ruidosos, risco de servir asset velho durante o desenvolvimento).
**Ação:** `devOptions: { enabled: false }`.

### F7 — adminStrategy não persiste (RLS by design)
O Painel Estratégico renderiza do estado local (fix de 11/06) mas é regerado a cada
abertura, pois a policy `profiles_update` só deixa o dono gravar. Persistir em
`app_profiles` vazaria a estratégia privada do facilitador para o aluno
(`profiles_select` own). **Ação (opcional):** Edge Function `saveAdminStrategy`
(JWT+admin, service_role) gravando em tabela própria `app_admin_strategies`
isolada por `adminuid` — padrão já usado no projeto.

### F6 — CLAUDE.md desatualizado
- Pendência "dist/ trackeado" já foi resolvida (verificado: `git ls-files dist` vazio).
- IA descrita como "cascata Gemini → xAI → localEngine" — hoje é **DeepSeek (server) →
  localEngine**.
**Ação:** atualizar CLAUDE.md (seções Stack/IA e Pendências).

## 🟢 BAIXOS
- `npm audit` high no `rollup` é via `netlify-cli` (devDependency — não vai ao bundle).
- Fontes do Google bloqueantes no `<head>` — aceitável; `display=swap` já presente.
- `recharts` (383 kB) já isolado em chunk lazy — ok.

## ✅ O que está bom (não mexer)
- RLS modelada por admin no DELTA 8 (fonte da verdade) · trigger `protect_user_privileges`
- Edge públicas com validação de token e sem PII (`buscarPorToken` retorna só
  nome/status/perfil/temCpf)
- CORS allowlist · headers (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy)
- CPF: dígitos no banco, mascarado na UI, completo só no Relatório Oficial
- Links públicos agora usam domínio público (`src/lib/appUrl.js`, fix de 11/06)
- Lazy loading de todas as rotas · Zustand · build verde · cálculo DISC server-side

---
*Auditoria executada por Claude (Fable 5) · 2026-06-12 · Prompt de correção: `docs/PROMPT-CORRECAO-OPUS48.md`*
