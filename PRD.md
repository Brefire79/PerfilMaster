# PRD — ProfileAI
**Documento de Requisitos de Produto**  
Versão 2.0 · Breno Luis (AmbFusi AI / Vianexx AI) · Maio 2026

---

## 1. Visão Geral do Produto

**ProfileAI** é uma plataforma SaaS de avaliação comportamental baseada no modelo DISC. Administradores (instrutores, coaches, RH) criam sessões de avaliação, enviam links públicos via WhatsApp sem exigir login dos avaliados, acompanham resultados em tempo real, geram relatórios oficiais com rastreabilidade legal (LGPD / uso pericial) e obtêm análises enriquecidas por IA (Google Gemini).

**Módulo paralelo — Sessões**: avaliações públicas sem login via link/token único, voltadas a workshops, processos seletivos e contextos externos.

**Papéis de usuário:** Admin | Aluno (Student)  
**Plataforma:** PWA web (mobile-first), build Vite + React, deploy Netlify  
**Backend:** Supabase (REST API + Edge Functions Deno)  
**IA:** Google Gemini 2.0 Flash via Supabase Edge Functions (chave configurável pelo admin)  
**Idioma:** PT-BR (português do Brasil)

---

## 2. Objetivos de Negócio

| # | Objetivo | Métrica de sucesso |
|---|----------|-------------------|
| 1 | Simplificar avaliação comportamental para instrutores | Tempo de criação de sessão < 2 min |
| 2 | Maximizar taxa de resposta dos avaliados | Link público sem cadastro; acesso em 1 clique |
| 3 | Fornecer insights profissionais acionáveis | Relatório oficial gerado em < 30 s |
| 4 | Garantir rastreabilidade legal dos dados | Documento com ID único + LGPD compliance |
| 5 | Reduzir custo de IA | Admin usa própria chave Gemini (zero custo no servidor) |

---

## 3. Papéis e Permissões

### 3.1 Admin
- Criar/editar/excluir grupos e módulos
- Criar sessões públicas e adicionar avaliados
- Visualizar status e resultados de todos os avaliados
- Gerar Relatório Oficial (documento legal com ID rastreável)
- Enviar link de resultado limpo via WhatsApp para o avaliado
- Configurar chave de API do Google Gemini
- Ver indicadores clínicos internos (acesso exclusivo — nunca compartilhado com avaliado)

### 3.2 Aluno (Student)
- Responder avaliação DISC via wizard (com login)
- Ver próprio perfil DISC com análise de IA
- Acessar avaliação pública via link (sem login)
- Visualizar resultado público em `/resultado/:token` (sem login)

---

## 4. Arquitetura Técnica

### 4.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, React Router v6 |
| Estado | Zustand 4 (authStore, profileStore, groupStore, assessmentStore, sessaoStore) |
| Backend | Supabase REST API (via fetch em `src/firebase/`) |
| Auth | Supabase Auth (email/senha) |
| Edge Functions | Deno (Supabase Functions) — IA e lógica server-side |
| IA | Google Gemini 2.0 Flash (`generativelanguage.googleapis.com/v1beta`) |
| Charts | Recharts 2 |
| Notifications | React Hot Toast |

### 4.2 Estrutura de Pastas

```
src/
├── firebase/           # Wrappers Supabase (mantém shape de API do Firebase)
│   ├── auth.js         # signIn/signUp/signOut/onAuthStateChange/getValidAccessToken
│   ├── firestore.js    # CRUD Supabase REST — tabelas app_*
│   └── functions.js    # Chamadas Edge Functions + auto-inject da chave Gemini
├── lib/
│   ├── supabase.js     # Cliente @supabase/supabase-js
│   ├── apiKeyManager.js# Carrega/salva API key (Supabase settings + localStorage)
│   └── localEngine.js  # Motor local DISC (fallback offline)
├── store/              # Zustand stores
├── pages/
│   ├── admin/          # Dashboard, Students, Groups, GroupDetail, Reports,
│   │                   # Settings, Sessoes, Modules, ModuleBuilder, RelatorioOficial
│   ├── student/        # StudentDashboard, Assessment, MyProfile
│   ├── auth/           # Login, Register, ForgotPassword
│   ├── public/         # AvaliacaoPublica, ResultadoPublico
│   └── shared/         # NotFound
├── components/
│   ├── assessment/     # AssessmentWizard
│   ├── group/          # GroupCard, MemberList, InviteLink
│   ├── profile/        # MemberProfileSlideOver, ProfileBadge, ProfileDetail
│   ├── sessao/         # SessionCreator, AvaliadoForm
│   └── ui/             # Button, Card, Badge, Input, Modal, RadarChart, etc.
└── routes/index.jsx    # Rotas + ProtectedRoute + RootRedirect

supabase/functions/
├── _shared/
│   ├── anthropic.ts    # callAnthropic() — chama Google Gemini (naming legado)
│   ├── response.ts     # handleCors() / jsonResponse() — CORS + helpers
│   └── auth.ts         # getAuthenticatedUser()
├── analyzeResponse/    # Analisa respostas individuais
├── buildProfile/       # Constrói perfil DISC completo
├── insightPerfil/      # Gera insights ricos de um perfil DISC já calculado
├── groupInsights/      # Insights coletivos de grupo
├── therapyFlag/        # Indicador de bem-estar interno (admin only)
├── generateInviteLink/ # Gera token de convite com expiração
├── validateInviteToken/# Valida token de convite
├── generateReport/     # Gera dados do relatório completo
├── buscarPorToken/     # Busca avaliado por token público
└── atualizarStatus/    # Atualiza status do avaliado
```

### 4.3 Fluxo de Chave de API

```
Admin → Settings → Integrações de IA → digita chave Google AI Studio
       ↓
localStorage('profileai_api_key') + Supabase settings table
       ↓
functions.js: callFunction() → injeta { geminiKey } em todas as chamadas de IA
       ↓
Edge Function recebe geminiKey → usa como Authorization para Gemini API
       ↓
Fallback: GEMINI_API_KEY (env var do servidor) se geminiKey não fornecida
```

### 4.4 CORS

Origens permitidas em `supabase/functions/_shared/response.ts`:
- `https://profileai.netlify.app` (produção)
- `http://localhost:3000` e `http://localhost:3001` (desenvolvimento)

---

## 5. Banco de Dados (Supabase)

### Tabelas principais

| Tabela | Finalidade |
|--------|-----------|
| `app_users` | Perfis de usuário (uid, email, role, displayname) |
| `app_groups` | Grupos criados pelo admin |
| `app_group_members` | Alunos pertencentes a cada grupo |
| `app_assessments` | Avaliações respondidas pelos alunos (perfil, respostas) |
| `app_invite_tokens` | Tokens de convite gerados para grupos |
| `app_sessions` | Sessões de avaliação pública (nome, descrição) |
| `app_avaliados` | Avaliados em sessões públicas (nome, telefone, token, status, perfil) |
| `settings` | Configurações por usuário (API key, etc.) |

### Campos críticos de `app_avaliados`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `token` | uuid | Token público único por avaliado |
| `status` | text | `pending` → `in_progress` → `completed` |
| `perfil` | jsonb | Objeto DISC: `{ dominantProfile, scores: {D,I,S,C}, answers }` |
| `sessaoid` | uuid | FK → `app_sessions.id` |

---

## 6. Módulos Funcionais

### 6.1 Autenticação
- Login / Cadastro / Recuperação de senha via Supabase Auth
- Redirecionamento automático por role (admin → `/admin/dashboard`, aluno → `/student/dashboard`)
- Proteção de rotas via `ProtectedRoute` + Zustand `authStore`
- Tokens JWT com refresh automático

### 6.2 Grupos e Convites
- Admin cria grupos com nome e descrição
- Geração de link de convite com token único (validade: 7 dias, uso único)
- Aluno acessa `/join/:token` → redirecionado para `/register?token=xxx`
- Após cadastro, aluno é automaticamente vinculado ao grupo

### 6.3 Avaliação DISC (Alunos com Login)
- Wizard passo a passo com 28 perguntas DISC em escala Likert 1–5
- Cálculo automático das dimensões D, I, S, C
- Análise IA via `buildProfile` (Google Gemini)
- Resultado salvo em `app_assessments`
- Visualização em `/student/profile`

### 6.4 Avaliação Avulsa Pública (Sem Login)
> **Atualização jun/2026:** as abas dedicadas **Sessões** e **Pessoas** foram ocultadas. O ponto de entrada agora é o botão **"Avaliação avulsa"** na aba **Alunos** e em **Grupos › Membros** (`NovoAvaliadoTrigger`). A sessão é criada/reusada implicitamente (`ensureSessaoAvulsa`) — o admin não gerencia sessões manualmente. O restante do fluxo (token, link WhatsApp, status, resultado) permanece idêntico.
- Admin clica em "Avaliação avulsa" (em Alunos ou num grupo)
- Adiciona avaliados (nome + telefone obrigatórios, e-mail/CPF opcionais)
- Sistema gera token único por avaliado
- Admin envia link: `https://dominio.com/avaliacao/:token`
- Avaliado responde sem criar conta
- Status atualiza em tempo real: `pending` → `in_progress` → `completed`
- Admin vê resultados e aciona IA diretamente no painel

### 6.5 Avaliação Pública (`/avaliacao/:token`)
- Carrega nome do avaliado via `buscarPorToken`
- 28 perguntas DISC com seleção única por linha
- Sem paginação — fluxo contínuo com scroll
- Ao finalizar: calcula perfil, envia para `atualizarStatus`, redireciona para `/resultado/:token`

### 6.6 Resultado Público (`/resultado/:token`)
- Página sem login para o avaliado ver seu próprio perfil
- Carrega dados via `buscarPorToken` (retorna nome, status, perfil)
- Auto-chama `insightPerfil` para gerar análise enriquecida
- Exibe: banner do perfil dominante, barras DISC animadas, forças, áreas de desenvolvimento, comunicação, carreiras sugeridas
- **Não exibe** nenhum dado clínico ou de bem-estar
- Design dark mobile-first com animação fade-in

### 6.7 Painel de Sessões — Visão Admin
- Lista de avaliados com status, perfil DISC e ações
- Modal com duas abas:
  - **Admin**: análise completa (insight IA, forças, carreiras, desafios) + indicadores de bem-estar (uso interno)
  - **Aluno**: prévia da mensagem WhatsApp que será enviada (perfil limpo + link para `/resultado/:token`)
- Botões:
  - 🤖 **Refinar com IA**: chama `insightPerfil`, popula aba Admin
  - 🚩 **Verificar Indicadores**: chama `therapyFlag`, exibe nível (none/watch/suggest)
  - 📤 **Liberar para Aluno**: abre WhatsApp com mensagem pré-formatada + link
  - 👁 **Visualizar Relatório**: abre tela de Relatório Oficial
  - 📄 **Relatório Oficial**: navega para `/admin/relatorio/:token`

### 6.8 Relatório Oficial (`/admin/relatorio/:token`)
- Documento oficial de identificação única: `DISC-{ANO}-{8 hex chars do token}`
- Protegido: requer role admin
- **§ 1 — Identificação**: nome, telefone, sessão, documento ID, data
- **§ 2 — Perfil DISC**: barras animadas, tabela com valores e percentuais, interpretação
- **§ 3 — Análise IA**: insight, forças, desafios, carreiras, estilo de comunicação. **Persistida (DELTA 13):** a análise é salva em `app_report_meta` ao ser gerada — ao reabrir o relatório ela já aparece (botão "↻ Regerar IA" para atualizar). Não precisa regerar toda vez.
- **§ 3.1 — Padrões Sabotadores e Riscos de Derailment** *(só contas de aluno)*: renderizada apenas quando há dados em `app_profiles` (alunos respondem as 78 questões — 28 DISC + 50 sabotadores). Avaliados de sessão respondem só as 28 DISC, então a seção não aparece. Fonte: `getAvaliadoLikeFromUid` (campos `saboteurPatterns`/`derailmentRisks`). Paridade com o "Ver perfil" (`ProfileDetail`).
- **§ 4 — Indicadores Clínicos** *(admin only — não impresso para o avaliado)*: nível de atenção, nota interna, disclaimer ético
- **§ 5 — Observações do Instrutor**: textarea livre, incluída na impressão. **Persistida (DELTA 13):** botão "Salvar observação" grava em `app_report_meta` (acompanhamento do facilitador por relatório); recarrega ao reabrir.
- **Barra de controles** (não impressa):
  - 🤖 Gerar Análise IA
  - 🚩 Verificar Indicadores Clínicos
  - 📤 WhatsApp (envia link limpo `/resultado/:token` para o avaliado)
  - 🖨️ Imprimir / Exportar PDF
- **Rodapé legal**: LGPD art. 7° e 11°, aviso de uso pericial/policial, assinatura do admin
- **CSS `@media print`**: A4, sem controles, indicadores clínicos omitidos, fontes ajustadas

### 6.9 Relatórios de Grupo
- Distribuição DISC da equipe
- Médias por dimensão
- Análise de complementaridade de perfis
- **Relatórios individuais**: lista de pessoas (Central de Pessoas) com **contagem de quantas vezes foram avaliadas**. Pessoas com 2+ avaliações **expandem o histórico** com data, perfil e a **anotação de acompanhamento** salva por relatório (DELTA 13). Componente: `components/admin/PessoaRelatorioRow.jsx`.

### 6.8.1 Dashboard Administrativo (`/admin/dashboard`)
- 4 **stat cards** (Total de Alunos, Grupos, Avaliações, Taxa de Conclusão) — **clicáveis**, navegam para Alunos/Grupos/Relatórios.
- **Painel de perfis DISC**: os 4 cards (D/I/S/C) são **expansíveis** ("Saiba mais" → descrição do perfil inline).
- **Atividade recente**: feed dos últimos eventos (avaliação concluída, perfil identificado, entrada em grupo, grupo criado); clique navega ao grupo.

### 6.9.1 Gestão de Alunos (`/admin/students`)
- Lista unificada (contas de aluno + avaliados de sessão), busca e filtros por grupo/perfil
- **Mover aluno para outro grupo**: ação por linha (só contas de aluno) — reatribui `app_users.groupid` + `memberids` dos grupos de origem/destino. Avaliados de sessão pertencem a um grupo pela sessão, não por aqui.
- Atribuir/reavaliar, lembrete por e-mail, avaliação avulsa por WhatsApp (ver §6.4), exclusão

### 6.10 Módulos Personalizados
- Admin cria módulos com perguntas customizadas
- Editor de módulo com drag-and-drop de perguntas
- Associação de módulos a grupos

### 6.11 Configurações (`/admin/settings`)
- **Perfil do admin** (nome) e **Empresa** (nome/logo nos relatórios)
- **Preferências**: app é **PT-BR exclusivo** (seletor de idioma removido)
- **Notificações**: preferências persistidas em `app_users.notifications` (DELTA 11). Entrega por e-mail/push ainda não implementada.
- **Inteligência Artificial**: card informativo — IA é **gerenciada pelo servidor (DeepSeek)**, sem chave para o usuário configurar.
- **Equipe de administradores** (DELTA 12): convidar profissionais como **admin independente** (workspace próprio) por link; listar e **revogar/reativar** o acesso dos admins que o próprio admin convidou.
  - **Promover conta já existente** (`manageTeamAdmins` ação `promoteByEmail`): quando o convidado já tinha conta (o link de convite acusa "e-mail já em uso"), o admin digita o e-mail e promove a pessoa a admin. A promoção é apenas um **interruptor de `role`** — `groupid`/`adminuid` ficam intactos, então **revogar** (volta a `student`) devolve a pessoa exatamente ao estado anterior. **Reversível N vezes**, sem perda de dados.
  - Promoção/revogação via Edge Functions `consumeInvite` / `manageTeamAdmins` (service_role) — o trigger `protect_user_privileges` continua bloqueando o app comum.
  - Escopo: cada admin só gerencia quem ele convidou ou promoveu (`app_users.invitedby`); não promove quem já é admin nem reivindica conta de outra equipe.
- **Aparência**: alternância de **tema claro/escuro** (botão sol/lua no TopBar), persistida por dispositivo (`localStorage`). App é dark-first; o tema claro reaplica as variáveis e sobrepõe as classes estruturais (`html.light` em `index.css`).
- **Zona de Perigo**: excluir conta — reapresenta o risco e **exige a senha** (validada no servidor) antes de prosseguir. Exclusão completa de dados (Edge `deleteAccount`) ainda pendente.

### 6.12 Mestre — chatbot local (chat flutuante)
Assistente do facilitador, **100% local** — nenhuma chamada a IA externa no chat. A API de IA (DeepSeek) fica reservada à análise nos relatórios (`insightPerfil`) e ao pipeline de avaliação.

- **Acesso**: botão "Perguntar ao Mestre" no cabeçalho do **Painel** (`/admin/dashboard`). Abre um **chat flutuante** (canto inferior direito) montado no `AdminLayout` — permanece disponível ao navegar entre telas. A antiga sub-aba Central › "Mestre (IA)" foi removida (rota redireciona ao Painel).
- **Motor** (`src/lib/mestreLocal.js`): roteia a pergunta por palavras-chave para uma de 4 consultas fixas — `inteligencia_grupos` (RPC `central_group_insights`, k-anonimato), `visao_geral` (RPC `central_observabilidade` + `computeObservabilidade`; janelas: "últimos N dias", "semana", "mês", "24 horas"/"hoje"), `saude_status` (alertas derivados: avaliações paradas, taxa baixa, inatividade, versão/atualização) e `contagem` ("quantos alunos/grupos tenho" — **replica o cálculo do card "Total de Alunos" do Painel**, incluindo a deduplicação de avaliados convertidos em conta do DELTA 19, para chat e Painel mostrarem o mesmo número). A narrativa é montada por templates PT-BR a partir dos números, com plural correto. Perguntas de data/hora ("que dia é hoje") são respondidas localmente pelo relógio do dispositivo.
- **Base de conhecimento** (modo conversa): explica DISC, Sabotadores/PQ, avaliação avulsa, convites, redefinição de senha, conversão de avaliado em conta, relatórios, privacidade/k-anonimato, Central, módulos e notificações.
- **Persistência do contexto**: a conversa fica no `mestreStore` (Zustand + `localStorage`, chave `profileai.mestre.chat`) — sobrevive a navegação e reload e é **apagada apenas no logout** (`authStore.clearUser`).
- **Miss-log (evolução do vocabulário)**: perguntas sem resposta e erros de execução são registrados em `localStorage` (`profileai.mestre.misslog`, máx. 200, com contador de repetição). Serve de insumo para enriquecer palavras-chave e respostas em atualizações. Ler no console do navegador: `JSON.parse(localStorage.getItem('profileai.mestre.misslog'))`. O miss-log **não** é apagado no logout (não contém PII de conversa além da pergunta digitada).
- **Privacidade**: só números agregados do escopo do facilitador; nomes/e-mails/CPF nunca entram nas respostas; nada sai do app pelo chat.
- **Exportação**: respostas com dados podem ser exportadas em PDF local (`centralPdf.js`, import dinâmico), com evento `report_exported` na trilha de auditoria.

---

## 7. Fluxo de IA — Edge Functions

> **Escopo da IA (desde jul/2026):** a API DeepSeek é consumida **apenas** na avaliação/relatório (`insightPerfil`, `therapyFlag`, `analyzeResponse`, `buildProfile`). O chat do Mestre **não** usa IA externa (ver § 6.12); a Edge Function `assistenteCentral` segue deployada, mas não é mais chamada pelo frontend.

### 7.1 `insightPerfil`
**Input:** `{ perfil: { dominantProfile, secondaryProfile, scores }, nome, geminiKey? }`  
**Output:**
```json
{
  "insight": "Texto narrativo do perfil",
  "forcas": ["Liderança", "Comunicação", "..."],
  "desafios": ["Impaciência", "..."],
  "carreiras": ["CEO", "Gestor de Projetos", "..."],
  "comunicacao": "Estilo de comunicação ideal",
  "desenvolvimento": "Área de desenvolvimento prioritária",
  "palavrasChave": ["Dominante", "Direto", "..."]
}
```
**Uso:** Modal de Sessões (aba Admin) + RelatorioOficial § 3 + ResultadoPublico

### 7.2 `therapyFlag`
**Input:** `{ profileData: { dominantProfile, secondaryProfile, scores }, answers?, geminiKey? }`  
**Output:**
```json
{
  "flagged": false,
  "level": "none | watch | suggest",
  "note": "Nota interna discreta (se flagged)"
}
```
**Uso:** Modal de Sessões (aba Admin) + RelatorioOficial § 4  
**Restrição:** NUNCA enviado ao avaliado; excluído da impressão/WhatsApp

### 7.3 `buildProfile`
**Input:** `{ answers: [...], geminiKey? }`  
**Uso:** Avaliação wizard do aluno (com login)

### 7.4 `buscarPorToken`
**Input:** `{ token: "uuid" }`  
**Output:** `{ nome, status, sessaoid, perfil }`  
**Uso:** AvaliacaoPublica + ResultadoPublico (sem autenticação)

### 7.5 `atualizarStatus`
**Input:** `{ token, status, perfil? }`  
**Uso:** AvaliacaoPublica ao finalizar questionário

---

## 8. Segurança e Privacidade

### 8.1 LGPD (Lei 13.709/2018)
- Dados de avaliação coletados com finalidade explícita (desenvolvimento profissional)
- Acesso a dados sensíveis restrito ao admin responsável
- Indicadores de bem-estar (§ 4 do relatório) são de uso exclusivamente interno
- Não há diagnósticos clínicos — apenas indicadores de atenção para suporte
- Documento oficial contém aviso de conformidade LGPD no rodapé

### 8.2 Rastreabilidade Legal
- Cada relatório possui ID único: `DISC-{ANO}-{8-hex-chars-do-token}`
- Token derivado do UUID do avaliado — imutável e auditável no banco
- Rodapé do relatório menciona uso em processos periciais/policiais quando solicitado
- Assinatura digital do admin (nome/email) no documento

### 8.3 Chave de API
- Chave Gemini do admin nunca é enviada ao cliente final (avaliado)
- Armazenada no localStorage do admin e sincronizada no Supabase `settings`
- Nunca exposta em respostas públicas das Edge Functions

### 8.4 CORS
- Apenas origens autorizadas podem chamar as Edge Functions
- Tokens JWT Supabase validados em todas as rotas protegidas

---

## 9. Requisitos Não-Funcionais

| Requisito | Meta |
|-----------|------|
| Performance (FCP) | < 2 s em 3G (PWA com lazy loading) |
| Disponibilidade | 99,5 % (Netlify + Supabase SLA) |
| Suporte a dispositivos | Mobile-first; testado em iOS 16+, Android 12+, Chrome/Safari/Edge |
| Acessibilidade | Contraste WCAG AA nas telas públicas |
| Tamanho do bundle | < 500 KB gzipped (code splitting por rota) |
| Tempo de geração IA | < 15 s (Gemini Flash) |

---

## 10. Rotas da Aplicação

| Rota | Acesso | Componente |
|------|--------|-----------|
| `/` | Público | RootRedirect |
| `/login` | Público | Login |
| `/register` | Público | Register |
| `/forgot-password` | Público | ForgotPassword |
| `/join/:token` | Público | JoinHandler → redireciona para Register |
| `/avaliacao/:token` | Público (sem login) | AvaliacaoPublica |
| `/resultado/:token` | Público (sem login) | ResultadoPublico |
| `/admin/dashboard` | Admin | AdminDashboard |
| `/admin/groups` | Admin | Groups |
| `/admin/groups/:id` | Admin | GroupDetail |
| `/admin/students` | Admin | Students |
| `/admin/modules` | Admin | Modules |
| `/admin/modules/:id` | Admin | ModuleBuilder |
| ~~`/admin/sessoes`~~ | — | _Rota removida (jun/2026); função em Alunos/Grupos_ |
| ~~`/admin/pessoas`~~ | — | _Rota removida (jun/2026); Central de Pessoas ocultada_ |
| `/admin/relatorio/:token` | Admin | RelatorioOficial |
| `/admin/reports` | Admin | Reports |
| `/admin/settings` | Admin | Settings |
| `/student/dashboard` | Aluno | StudentDashboard |
| `/student/assessment/:id` | Aluno | Assessment |
| `/student/assessment-wizard` | Aluno | AssessmentWizard |
| `/student/profile` | Aluno | MyProfile |

---

## 11. Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-primary` | `#0F1117` | Background global |
| `bg-card` | `#1A1D2E` | Cards e painéis |
| `bg-elevated` | `#242736` | Inputs e elementos elevados |
| `accent` | `#6366F1` | Botões primários, destaques, links |
| `text-primary` | `#F7F8FC` | Texto principal |
| `text-muted` | `#A0A3B1` | Texto secundário e placeholders |
| `success` | `#22C55E` | Status OK, nível "none" |
| `warning` | `#F59E0B` | Avisos, nível "watch"/"suggest" |
| `error` | `#EF4444` | Erros críticos |

**Fontes:** Inter (corpo) + Sora ou similar (headings — `font-heading`)  
**Raio de borda padrão:** `rounded-xl` (12 px)  
**Animações:** fade-in, slide-up nos modais e resultado público

**Tema claro/escuro:** dark-first. O tema claro é ativado pela classe `html.light` (toggle no TopBar, persistido em `localStorage` via `themeStore`), que redefine as variáveis CSS (`--bg-*`, `--text-*`, `--border`) e sobrepõe as classes estruturais de fundo/texto/borda. Os acentos DISC (D/I/S/C) e o indigo são preservados nos dois temas.

---

## 12. Integrações Externas

| Serviço | Finalidade |
|---------|-----------|
| **Google Gemini 2.0 Flash** | Análise de perfil DISC, indicadores de bem-estar |
| **WhatsApp (wa.me)** | Envio de link de resultado e convites |
| **Supabase Auth** | Autenticação e autorização |
| **Supabase Postgres** | Banco de dados relacional |
| **Supabase Edge Functions** | Lógica server-side (IA, tokens, relatórios) |
| **Netlify** | Hosting + CDN + CI/CD |

---

## 13. Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | Mai 2026 | Versão inicial — DISC wizard, grupos, convites, sessões básicas |
| 1.1 | Mai 2026 | Auditoria autônoma — documentação de arquitetura |
| 2.0 | Mai 2026 | Google Gemini (migração de Anthropic), `insightPerfil`, `therapyFlag` com chave do usuário, RelatorioOficial (documento legal com ID único + LGPD), ResultadoPublico (página pública para avaliado), configuração de API key no painel, CORS localhost:3001, erros de IA humanizados |
| 1.0.43 | Jun 2026 | Rebrand **Perfil Master**; IA **DeepSeek server-side** (provider único, sem chave do admin); abas Sessões/Pessoas ocultadas; DELTAs 8–13; **tema claro/escuro**; **Dashboard interativo** (stat cards clicáveis + DISC expansível); **Equipe de administradores** com convite, **promoção de conta existente** (`promoteByEmail`) e revogação reversível |
| 1.1.0 | Jun 2026 | **Central de Gestão** (admin/superadmin) — DELTAs 14–17. 4 módulos: Visão Geral (observabilidade das 2 fontes, com visão global do superadmin), Pessoas & Histórico + **Trilha de Auditoria append-only**, Inteligência de Grupos (agregados anonimizados com **k-anonimato**, DISC + conclusão + **PQ Score/Sabotadores** agora persistidos), Assistente IA (camada semântica fixa, sem PII ao DeepSeek, cache + rate limit, **PDF local**). Superadmin via allowlist `app_superadmins`/`is_superadmin()` |

> **Nota:** as seções 1–5 e 12 deste PRD ainda descrevem o estado v2.0 (Google Gemini, naming "ProfileAI"). A **fonte da verdade atual** da arquitetura é o `CLAUDE.md` na raiz do projeto: IA é **DeepSeek server-side** (provider único), o produto chama-se **Perfil Master** e a camada de dados é Supabase (pasta `src/firebase/` com nomes legados).

---

*Perfil Master © 2026 — Vianexx AI / Breno Luis*  
*Documento elaborado por Breno Luis — Confidencial · v2.0 + addendum 1.0.43*
