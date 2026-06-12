# Prompt de Correção — copie tudo abaixo da linha e cole no Claude Code (Opus 4.8)

---

Execute o plano de correção da auditoria `profileai/docs/AUDITORIA-2026-06-12.md` no projeto Perfil Master. Trabalhe SOMENTE dentro de `profileai/`. Siga as fases na ordem, validando com `npm run build` ao fim de cada fase (build precisa ficar verde antes de seguir). NÃO commit nem deploy — eu faço isso ao final, depois de validar o preview.

## Regras invioláveis (não quebrar em nenhuma fase)
- Cálculo DISC/PQ intocado; cores DISC canônicas (D #EF4444 · I #F59E0B · S #22C55E · C #6366F1); UI 100% pt-BR (Dominante/Influente/Estável/Analítico).
- Nenhuma chave de IA no frontend/bundle/localStorage/URL — chave só em Netlify env e Supabase Secrets. DeepSeek é o ÚNICO provider.
- RLS: nunca `is_admin()` global, nunca `USING (true)`/`TO public` em tabela `app_*`. Fluxos públicos só via Edge Function com service_role.
- Toda coluna nova do Postgres precisa ser registrada no mapa `CAMEL_TO_DB` de `src/firebase/firestore.js`.
- Não usar `<form>`; handlers onClick/onChange.

## FASE 1 — Remover código morto + vulnerabilidades críticas
1. Confirme que nada na árvore viva importa estes arquivos (grep antes de deletar; a árvore viva nasce em `src/main.jsx` → `App.jsx` → `src/routes/index.jsx`) e DELETE:
   - `src/pages/mentor/` (pasta inteira) e `src/components/mentor/` (pasta inteira)
   - `src/pages/HomePage.jsx`, `src/pages/LoginPage.jsx`, `src/pages/ResultsPage.jsx`, `src/pages/AssessmentPage.jsx`
   - `src/pages/student/TestRunnerPage.jsx`, `src/pages/student/RegisterPage.jsx`, `src/pages/student/CompletionPage.jsx`
   - `src/pages/admin/GroupReport.jsx`, `src/utils/pdfExport.js`, `src/lib/supabase.js`
2. `npm uninstall html2pdf.js @supabase/supabase-js` (o app vivo usa REST puro via `src/firebase/firestore.js`).
3. Em `vite.config.js`: remova a entrada `supabase: ['@supabase/supabase-js']` de `manualChunks`.
4. Rode `npm audit fix` (sem `--force`). Aceite o que sobrar em devDependencies (rollup via netlify-cli não vai ao bundle).
5. Valide: `npm run build` verde e o chunk `supabase-*.js` NÃO existe mais no output.

## FASE 2 — DeepSeek único provider (matar caminho Gemini do frontend)
1. `src/lib/apiKeyManager.js`: remova `detectApiProvider`/`callAiApi` com Gemini (a chamada com `?key=` na URL é proibida). `generateAnalysis` deve usar SOMENTE: backend Netlify (`/api/generate-profile-analysis`, que já usa DeepSeek server-side) com fallback `localEngine`. Mantenha exports usados por `MemberProfileSlideOver.jsx` (`generateAnalysis`, `loadApiKey` — se `loadApiKey` ficar sem uso real, remova-o e ajuste o caller). Limpe a chave legada do localStorage (`localStorage.removeItem('profileai_api_key')` em migração leve no boot do módulo).
2. `src/firebase/functions.js`: remova `getGeminiKey()` e o spread `{ geminiKey, ... }` do payload.
3. `supabase/functions/_shared/anthropic.ts`: remova o parâmetro `userKey` (chave vem só de `AI_API_KEY`/`DEEPSEEK_API_KEY` dos Secrets). Ajuste callers nas Edge Functions que passavam a chave do usuário.
4. `src/components/ApiKeySection.jsx` + uso em `Settings.jsx`: substitua a UI de "cole sua chave Gemini" por um card informativo "IA gerenciada pelo servidor (DeepSeek) — nenhuma configuração necessária". Sem input de chave.
5. `src/pages/admin/RelatorioOficial.jsx` (~linha 344): troque a mensagem "Configure sua chave Gemini em Configurações" por orientação correta (ex.: "Serviço de IA temporariamente indisponível — tente novamente"). Grep final: `grep -ri "gemini\|grok\|xai\|XAI_API_KEY" src/` deve retornar zero no código vivo. Em `netlify/functions/generate-profile-analysis.mjs`, remova o fallback `XAI_API_KEY` (mantenha `AI_API_KEY` e `DEEPSEEK_API_KEY`).
6. Valide build.

## FASE 3 — Rebrand Perfil Master (remover ProfileAI / AMB FUSI do código vivo)
1. `index.html`: title "Perfil Master", description, OG tags, `apple-mobile-web-app-title`.
2. `public/manifest.json` e manifest do `vite.config.js`: name "Perfil Master", short_name "PerfilMaster".
3. `src/components/layout/Sidebar.jsx:135`: logo → "Perfil Master".
4. `src/pages/public/AvaliacaoPublica.jsx:605` (rodapé público): → "Perfil Master · Vianexx AI".
5. `src/pages/admin/RelatorioOficial.jsx`: cabeçalho do documento e `document.title` → "Perfil Master"; rodapé legal "ProfileAI © ..." → "Perfil Master © ...".
6. Grep final no código vivo: `grep -ri "ProfileAI\|AMB FUSI\|AmbFusi" src/ index.html public/manifest.json` — só podem sobrar comentários internos (idealmente zero). i18n `pt-BR.json` também ("app.name" etc., se existir).
7. Valide build.

## FASE 4 — Fluidez
1. `src/App.jsx`: `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>` (elimina os warnings do console).
2. `vite.config.js`: `devOptions: { enabled: false }` no VitePWA (SW não roda mais em dev).
3. `netlify.toml` (CSP): em `connect-src`, remova `https://generativelanguage.googleapis.com https://api.anthropic.com https://api.openai.com https://api.groq.com`. Deixe: `'self' https://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com`.
4. Valide build e compare o precache do PWA (esperado cair bem abaixo dos 3,5 MB).

## FASE 5 — Persistência do Painel Estratégico (Edge Function, opcional mas recomendado)
1. Crie `supabase/migrations/20260612_delta10_admin_strategies.sql`: tabela `app_admin_strategies (id uuid pk default gen_random_uuid(), adminuid text not null, studentuid text not null, strategy jsonb not null, atualizadoem timestamptz not null default now(), unique(adminuid, studentuid))`, RLS habilitada com policies SELECT/INSERT/UPDATE/DELETE `TO authenticated USING/WITH CHECK (adminuid = (SELECT auth.uid())::text)`. Sem `USING(true)`, sem `is_admin()`.
2. Registre as colunas novas no `CAMEL_TO_DB` (`studentUid: 'studentuid'`, `adminUid` já existe como 'adminuid'? confira; `atualizadoEm: 'atualizadoem'` já existe).
3. `firestore.js`: `getAdminStrategy(adminUid, studentUid)` e `saveAdminStrategy(adminUid, studentUid, strategy)` (upsert por unique). Acesso direto autenticado funciona porque a RLS isola por adminuid — não precisa de Edge Function.
4. `MemberProfileSlideOver.jsx` (`handleRegenerate` e load): ao abrir, tente `getAdminStrategy`; ao gerar, `saveAdminStrategy` no lugar do `updateProfile` best-effort atual (remova o try/catch de RLS). O aluno NUNCA lê essa tabela (policy é por adminuid).
5. Valide build.

## FASE 6 — Documentação e encerramento
1. Atualize `CLAUDE.md`: IA = "DeepSeek server-side (Netlify Function + Edge `_shared/anthropic.ts`) com fallback localEngine — único provider"; remova a pendência do dist/ trackeado (já resolvida); remova pendências de rebrand/AMB FUSI (resolvidas); registre pendências de banco: rodar DELTA 8 + DELTA 9 + DELTA 10 e deployar Edge Functions (`consumeInvite`, `generateInviteLink`, `buscarPorToken`, `atualizarStatus` + as alteradas na Fase 2/5).
2. Smoke test no preview (`npm run dev` já configurado na porta 3000): `/avaliacao/token-invalido` e `/resultado/token-invalido` mostram erro amigável; `/login` carrega; console sem warnings de router e sem erros; rodapé público mostra "Perfil Master".
3. Relatório final: liste cada fase com o que mudou, resultado do build (tamanho dos chunks antes/depois se disponível), o grep final de cada fase, e a lista exata do que EU preciso rodar manualmente no Supabase/Netlify (SQLs + functions deploy + env vars `VITE_APP_URL`).

## Avisos
- `RODAR-NO-SUPABASE*.sql` são gitignored; mudanças permanentes de SQL vão para `supabase/migrations/`.
- Se um arquivo "morto" tiver na verdade um import vivo que eu não detectei, NÃO delete — reporte.
- Não rode `npm audit fix --force`.
- Não toque em `dist/`, `dev-dist/`, `android/`/Capacitor.
