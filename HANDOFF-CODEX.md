# ProfileAI — Resumo do Projeto & Ações Futuras (Handoff p/ Codex)
**Atualizado:** 2026-06-06 · Produção: v1.0.26 · Repo: Brefire79/PerfilMaster (branch `main`)

> Cole este arquivo no início de uma sessão no Codex/Claude Code para dar contexto completo.

---

## 1. O QUE É
SaaS de avaliação comportamental **DISC**. Admin (coach/RH) cria sessões, envia link via WhatsApp, avaliados respondem **sem login** (token), e o admin gera relatório oficial com rastreabilidade LGPD. App **mobile-first, 100% pt-BR**, deploy em https://perfilmaster.netlify.app

## 2. STACK (verdade do terreno)
- **Frontend:** React 18 + Vite 5 + Tailwind 3 + `clsx` + Zustand + react-router v6 + i18next + recharts + Capacitor + vite-plugin-pwa. **JavaScript/JSX, NÃO TypeScript.** Sem shadcn/cva.
- **Backend:** Supabase (Postgres + Auth + Edge Functions Deno). Projeto: **MentoriaX** (`zlbynxjeefqxcgrsmkjp`).
- **IA:** Google Gemini 2.0 Flash (chave do admin) + motor local offline determinístico (fallback).
- **Deploy:** Netlify (CLI manual — NÃO tem CI automático).

## 3. CAMINHO LOCAL
`C:\Users\Breno-Luis\OneDrive\Área de Trabalho\1 PROJETOS\PerfilMaster\profileai\`
- Read/Write/Edit funcionam apesar do acento em "Área".
- `node_modules` presente; `npm run build` ~9s exit 0.

## 4. CHAVES SUPABASE (ARMADILHA CRÍTICA — LER)
Projeto usa o **sistema NOVO de chaves**: `sb_publishable_...` (frontend) e `sb_secret_...` (backend). **NÃO** são JWT (`eyJ...`). Não trocar por JWT.
- **Edge Functions públicas** (chamadas por DESLOGADO) precisam `verify_jwt = false` no `supabase/config.toml` E deploy com `./supabase.exe functions deploy <nome> --no-verify-jwt`. Caso contrário: erro `Invalid JWT` no gateway.
- **Fluxos públicos NÃO podem usar leitura REST anônima** (`selectRows`) — a publishable key não resolve o role `anon` no PostgREST (retorna vazio). Usar Edge Function (service-role).
- **Colunas do banco são lowercase** (`groupid`, `adminuid`, `expiresat`, `cpf_consent`, `concluidoem`). Edge com service-role lê o nome cru → usar lowercase. No frontend, `firestore.js` faz mapeamento camelCase↔lowercase (CAMEL_TO_DB).

## 5. FLUXO DE DEPLOY (sob demanda — Breno autoriza)
```
node bump-version.mjs --notes "..."   # bump versão (senão UpdateBanner não aparece)
rm -rf dist dev-dist                   # limpa chunks acumulados
npm run build                          # exit 0
netlify deploy --prod --dir=dist       # CLI já logado
git add -A && git commit && git push origin main
git fsck --connectivity-only           # OneDrive trava .git às vezes; esperar exit 0
```
Edge Functions: `./supabase.exe functions deploy <nome> --no-verify-jwt` (CLI já linkado).
SQL: rodar no **SQL Editor do dashboard** (CLI `supabase db` não faz query avulsa).

## 6. REGRAS INVIOLÁVEIS
1. Cálculo DISC/PQ intocado (scores, pqScore, top3, subtype).
2. Cores DISC canônicas: **D=#EF4444 I=#F59E0B S=#22C55E C=#6366F1**. Nunca reintroduzir legadas (E53E3E/D69E2E/38A169/3182CE).
3. Dados clínicos (`therapyFlag`, §4 do RelatorioOficial) = **admin-only + `.no-print`**.
4. `@media print` do RelatorioOficial intocado.
5. CPF mascarado em toda UI; completo SÓ no Relatório Oficial.
6. Preservar lazy loading das rotas. Build verde. pt-BR.

## 7. O QUE JÁ FOI ENTREGUE (em produção)
- **UX F0–F5:** redesign mobile premium (design tokens em `index.css`, option-cards, CTA fixo, surface-brand, stat-tiles, barras DISC animadas), acessibilidade (WCAG AA, skip-link, aria, 11 modais role=dialog, document.title dinâmico).
- **Fase 1:** aluno avulso (sem grupo, via `adminuid`), CTA do resultado, fix do Service Worker/UpdateBanner, i18n.
- **Fase 2 (Convergência por CPF):** coleta opcional de CPF (admin/cadastro/avaliação pública) com validação de dígitos + consentimento LGPD; painel de "Vínculos sugeridos por CPF" na tela de Alunos (admin confirma → `app_identity_links`); CPF mascarado, completo só no Relatório.
- **Fase 3 (Histórico de Evolução):** §6 no Relatório Oficial — gráfico de evolução D/I/S/C ao longo das avaliações vinculadas + narrativa de mudança de perfil dominante.
- **Motor local:** `deepInsights` + `coachingQuestions` determinísticos (resultado offline completo sem IA).
- **Fix crítico (v1.0.26):** convite e avaliação pública voltaram a funcionar para deslogados (verify_jwt).

## 8. MIGRAÇÕES SQL (todas aplicadas em prod)
`RODAR-NO-SUPABASE-DELTA-6.sql` (adminuid + app_invites nullable) e `DELTA-7.sql` (cpf, cpf_consent, app_identity_links). Idempotentes.

## 9. ARQUIVOS-CHAVE
- `src/lib/localEngine.js` — motor DISC offline (DISC_PROFILES, SABOTADORES_DATA, deepInsights, coachingQuestions)
- `src/lib/apiKeyManager.js` — orquestra IA (Gemini → fallback local), mergeAiData
- `src/lib/cpf.js` — validação/máscara de CPF
- `src/firebase/firestore.js` — CRUD Supabase REST + mapeamento de colunas + getSugestoesVinculo/getHistoricoEvolucao
- `src/firebase/functions.js` — chamadas Edge Functions (callFunction)
- `src/pages/admin/RelatorioOficial.jsx` — documento oficial §1-§6
- `src/pages/public/AvaliacaoPublica.jsx` + `ResultadoPublico.jsx` — fluxo sem login
- `src/components/admin/IdentityLinkPanel.jsx` — painel de vínculos CPF
- `supabase/config.toml` — verify_jwt por função
- `docs/PRD-Fase2-*.md`, `docs/PRD-Fase3-*.md` — requisitos detalhados

## 10. AÇÕES FUTURAS (pendências / backlog)
### 🔴 Validar (não testado ponta a ponta)
- **Cadastro completo via convite:** o colega abre o link (✅ valida), mas o submit final (`registerStudentWithGroup` via REST) pode falhar se a confirmação de email do Supabase estiver LIGADA (usuário sem sessão → REST anon bloqueado). Se falhar, criar Edge Function `registerStudent` (service-role) que cria user + marca convite usado. **Verificar Supabase → Auth → Email confirmation.**

### 🟡 Limpeza / qualidade
- **Console errors:** `version.json ERR_NAME_NOT_RESOLVED` (rede transitória) e `ai_api_key 404` (busca settings sem chave — tem fallback). Silenciar se incomodar.
- **Contagem "11 alunos / 18%":** somar avaliados+alunos pode inflar com dados de teste. Auditar e limpar registros de teste.
- **dist/ acumulada:** centenas de chunks antigos versionados. Considerar limpar/gitignore.

### 🟢 Épicos futuros (têm fundação pronta)
- **Evolução para o aluno logado** (MyProfile, hoje só admin no Relatório).
- **Análise de IA sobre a evolução** (interpretação textual da trajetória).
- **Comparação de grupos ao longo do tempo** / relatório gerencial agregado.
- **Auth pages premium** (Login/Register ainda no visual antigo, só cores corrigidas).
- **Direito ao esquecimento LGPD** (deleção de dados do titular por CPF).

### Estado git
HEAD = `9ce49dc` = origin/main. Build verde. fsck exit 0.

---
*Memórias persistentes em `~/.claude/projects/.../memory/`: project_profileai, project_ux_redesign, env_profileai_path (contém a armadilha das chaves/verify_jwt).*
