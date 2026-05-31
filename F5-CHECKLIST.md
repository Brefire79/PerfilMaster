# F5 — Acessibilidade, Responsividade, Microinterações & Polimento
**Handoff para o Sonnet** · ProfileAI UX Redesign · branch `ux-redesign`

> Última fase da reestruturação UX/UI. F0–F4 já entregues e validados no navegador com dados reais.
> Esta fase é majoritariamente **aplicar e ajustar** o que já existe — baixo risco, tarefas pontuais e verificáveis.

---

## 0. Contexto essencial (leia antes de começar)

- **Stack real:** JavaScript/JSX (NÃO TypeScript), Vite 5, Tailwind 3, `clsx`, Zustand, react-router v6, i18next, recharts, Capacitor, vite-plugin-pwa. Tema **dark**.
- **Memória do projeto** (ler): `project_ux_redesign.md`, `project_profileai.md`, `env_profileai_path.md` em `~/.claude/projects/.../memory/`.
- **Paleta DISC canônica (fonte única):** D=`#EF4444` · I=`#F59E0B` · S=`#22C55E` · C=`#6366F1`. Já unificada em todo o `src` (F4). **Não reintroduzir** os shades antigos (E53E3E/D69E2E/38A169/3182CE).
- **Primitivos F1 disponíveis** (em `src/index.css`, dentro de `@layer components`): `.app-shell`, `.surface-brand` / `.surface-brand-soft`, `.cta-bar` + `.cta-bar__inner` + `.has-cta-bar`, `.option-card` + `.option-card__lead` (estado `.is-selected` / `aria-pressed`), `.progress-track` + `.progress-fill`, `.stat-tile`, `.chip`, `.score-row` + `.score-track` + `.score-fill--D/I/S/C`, `.animate-scale-in`. Tokens: `--accent-primary #6366F1`, `--bg-*`, `--text-*`, `--radius-*`. Fontes: Plus Jakarta Sans (headings) + DM Sans (corpo).
- **`prefers-reduced-motion`** já está implementado no `index.css` (bloco global que zera animações). Reaproveitar, não duplicar.

## ⚠️ Regras invioláveis (não quebrar)
1. **Não alterar regras de permissão/privacidade.** Dados clínicos (`therapyFlag`, §4 do RelatorioOficial) seguem **admin-only** e **`.no-print`**.
2. **Não tocar no `@media print`** do `RelatorioOficial.jsx` (A4, omissão de indicadores clínicos — LGPD §8.1, PRD §6.8).
3. **Não mudar lógica** de cálculo DISC, persistência Supabase, Edge Functions, ou fluxo de token público.
4. **Preservar lazy loading** das rotas (`src/routes/index.jsx`).
5. **Não reintroduzir cores DISC legadas.**

## 🔧 Fluxo de trabalho (importante por causa do OneDrive)
- O repo está sob **OneDrive**, que trava o `.git` intermitentemente durante `git commit`. **Após cada commit, rodar `git fsck --connectivity-only` (esperar exit 0)** e `git show --stat HEAD`. Se um commit falhar/orfanar, NÃO reescrever refs no susto — o conteúdo fica na árvore; verificar com `git show HEAD:caminho | grep marcador`.
- Caminho com acento ("Área") funciona com Read/Write/Edit normalmente.
- Validar cada bloco com `npm run build` (deve dar exit 0, ~9s).
- Preview: criar `PerfilMaster/.claude/launch.json` (server `profileai-dev`, npm `--prefix profileai run dev`, porta 3000) e usar as ferramentas `mcp__Claude_Preview__*`. Login admin: o usuário faz no preview ("já logado"). Token real de teste (avaliada concluída): `526140e5-179b-4cc8-bc60-88b084acc58a` → `/resultado/<token>` e `/admin/relatorio/<token>`.

---

## ✅ Checklist objetivo

### A. Acessibilidade (WCAG AA — foco nas telas públicas, PRD §9)
- [ ] **Contraste de texto:** revisar textos cinza sobre dark. `#4A4D6A` sobre `#0F1117` provavelmente **reprova** AA para texto pequeno — auditar e clarear onde necessário (usar `--text-secondary #A0A3B1` como piso). Telas-alvo: footers de `AvaliacaoPublica`, `ResultadoPublico`, hints do `AssessmentWizard`.
- [ ] **Foco visível:** confirmar `:focus-visible` (já no index.css) aparece em TODOS os elementos interativos, especialmente `.option-card`, `.cta-bar` botões, tabs do `MyProfile`, e cards clicáveis (`Card` com `onClick`).
- [ ] **Labels/aria:** botões só-ícone (ex.: header logout `[→]`, menu `☰`, "Menu" das ações de avaliado em `Sessoes.jsx`) precisam de `aria-label`. Botões de copiar link/WhatsApp idem.
- [ ] **SVGs decorativos:** garantir `aria-hidden="true"` em ícones puramente visuais (vários já têm; varrer o que falta).
- [ ] **Ordem de heading:** cada página deve ter um `<h1>` único e hierarquia coerente (algumas telas usam `<h2>`/`<h3>` soltos).
- [ ] **Estados de seleção anunciáveis:** `.option-card` já usa `aria-pressed` ✓ — confirmar em todos os usos (wizard, avaliação pública).
- [ ] **Toque mínimo 44×44px:** auditar botões pequenos (ações de ícone em listas admin).

### B. Responsividade
- [ ] **Safe-area iOS:** `.cta-bar` já usa `env(safe-area-inset-bottom)` ✓ — validar em viewport com notch (preview mobile 375×812). Conferir headers fixos com `safe-area-top`.
- [ ] **Larguras:** telas públicas usam `.app-shell` (max 30rem) ✓. Conferir que telas aluno/admin não estouram em 320px (iPhone SE).
- [ ] **Breakpoints admin:** tabelas/listas largas (`Sessoes`, `GroupReport`, `Students`) — garantir scroll horizontal controlado ou stack em mobile, sem overflow da viewport.
- [ ] **Tipografia fluida:** títulos grandes (`text-2xl`) não devem quebrar layout em telas estreitas (`text-balance` já ajuda em vários).
- [ ] **Bottom nav** não cobre conteúdo (padding inferior nas telas com nav).

### C. Microinterações & polimento
- [ ] **Transições consistentes:** hover/active em botões e cards (escala 0.98–0.99 já é padrão). Padronizar onde faltar.
- [ ] **Estados de loading:** skeletons/spinners coerentes (já existe `.skeleton`). Conferir telas que ainda usam só "Carregando...".
- [ ] **Animações de entrada:** `.animate-fade-in` / `.animate-slide-up` / `.animate-scale-in` aplicadas de forma coerente — evitar excesso (respeitar reduced-motion, já global).
- [ ] **Feedback de toque:** `-webkit-tap-highlight-color` já zerado globalmente ✓.
- [ ] **Empty states:** revisar mensagens vazias (ex.: histórico sem avaliações no `MyProfile`, sessão sem avaliados) — ter ícone + texto + CTA.

### D. Verificação final (gate de aceite)
- [ ] `npm run build` exit 0; bundle por rota mantém lazy loading; meta < 500KB gzip por chunk principal (PRD §9).
- [ ] Preview mobile (375×812) das telas-chave: `/avaliacao/<token>` (quiz), `/resultado/<token>`, `/student/dashboard`, `/student/profile`, `/student/assessment-wizard`, `/admin/dashboard`, `/admin/relatorio/<token>` — **zero erros de console**.
- [ ] Confirmar §4 clínico ainda `.no-print` e admin-only (regressão check).
- [ ] `git fsck --connectivity-only` exit 0 após commits.
- [ ] Entregar relatório F5 no formato das fases: diagnóstico / alterações / arquivos / validação / checklist OK-NOK / conclusão.

---

## Estado atual (ponto de partida)
- Branch: `ux-redesign` · HEAD: `39a5037` (F4).
- Commits: `06668f0` WIP+F1 → `4dbb24c` F2 → `7284004`+`22fde31` F3 → `39a5037` F4.
- Build verde. `git fsck` exit 0. Working tree limpo (exceto `dist/`/`dev-dist/` que são build artifacts).
- **Após F5:** considerar merge `ux-redesign` → `main` (decisão do Breno) e deploy Netlify.

_Apague este arquivo após concluir a F5 (é um handoff temporário, não documentação permanente)._
