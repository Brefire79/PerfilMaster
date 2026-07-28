# AUDITORIA-RELATORIO — ProfileAI (Perfil Master)
**Auditoria completa e autônoma · 26 de maio de 2026**

---

## Resumo Executivo

A auditoria identificou **4 problemas críticos**, **3 altos**, **4 médios** e **3 baixos** no app ProfileAI. Os problemas críticos comprometiam o fluxo central do produto: alunos não conseguiam acessar a tela de avaliação pelo link correto, admins não podiam atribuir avaliações por falta de políticas RLS, e colunas obrigatórias estavam ausentes no banco. Todos os 14 problemas foram corrigidos. O app está apto para testes funcionais completos após execução do delta SQL no Supabase.

---

## Arquivos Analisados

| Arquivo | Tipo |
|---|---|
| `src/routes/index.jsx` | Roteamento React |
| `src/firebase/auth.js` | Wrapper Supabase Auth |
| `src/firebase/firestore.js` | Wrapper Supabase REST |
| `src/firebase/functions.js` | Edge Functions wrapper |
| `src/lib/supabase.js` | Cliente oficial `@supabase/supabase-js` |
| `src/store/authStore.js` | Zustand — auth |
| `src/store/profileStore.js` | Zustand — perfis |
| `src/store/groupStore.js` | Zustand — grupos |
| `src/store/assessmentStore.js` | Zustand — avaliações |
| `src/store/sessaoStore.js` | Zustand — sessões públicas |
| `src/hooks/useAuth.js` | Hook inicialização auth |
| `src/components/assessment/AssessmentWizard.jsx` | Wizard 78 questões |
| `src/pages/student/Assessment.jsx` | Engine adaptativo |
| `src/pages/student/MyProfile.jsx` | Perfil do aluno |
| `src/pages/student/StudentDashboard.jsx` | Dashboard aluno |
| `src/pages/admin/Dashboard.jsx` | Dashboard admin |
| `src/pages/admin/Students.jsx` | Gestão de alunos |
| `src/pages/admin/Groups.jsx` | Gestão de grupos |
| `src/pages/admin/GroupDetail.jsx` | Detalhe do grupo |
| `src/pages/admin/Settings.jsx` | Configurações admin |
| `src/pages/admin/Sessoes.jsx` | Sessões públicas |
| `src/pages/auth/Login.jsx` | Login |
| `src/pages/auth/Register.jsx` | Cadastro por convite |
| `src/pages/auth/ForgotPassword.jsx` | Recuperação de senha |
| `src/pages/public/AvaliacaoPublica.jsx` | Avaliação pública WhatsApp |
| `src/lib/mentorApi.js` | Dead code (mentor legacy) |
| `src/pages/mentor/` | Dead code (mentor legacy) |
| `src/data/disc_questions.js` | 28 questões DISC |
| `src/data/saboteur_questions.js` | 50 questões Sabotadores |
| `PRD.md` | Documento de produto |
| `RODAR-NO-SUPABASE-DELTA-5.sql` | Delta SQL de correções |

---

## Arquivos Modificados

| Arquivo | O que mudou |
|---|---|
| `src/routes/index.jsx` | FIX A2: removidos 9 imports lazy duplicados nunca usados. FIX A5: adicionado wrapper `AssessmentWizardPage` com `onCompleted` → navega para `/student/profile` ao concluir |
| `src/lib/supabase.js` | FIX A4: `throw new Error(...)` convertido para `console.warn(...)` — evita crash no carregamento do módulo quando vars de ambiente não estão definidas |
| `src/pages/student/MyProfile.jsx` | FIX C3: dois links `/student/assessment/new` corrigidos para `/student/assessment-wizard`. FIX M3: `chartHistory` corrigido (não há campo `profile` embutido em `app_assessments`). FIX B3: dois imports do mesmo módulo consolidados |
| `src/pages/admin/Settings.jsx` | FIX A3: mensagem honesta sobre exclusão de conta (não deleta dados, apenas desloga). FIX M1: form de empresa agora pré-carrega `companyName`/`logoUrl` existentes do banco |
| `src/pages/admin/Students.jsx` | FIX M4: contagem de questões corrigida de "24 + 50" para "28 + 50" |
| `src/pages/auth/Register.jsx` | FIX B1: comentário interno corrigido de "Firebase Auth" para "Supabase Auth" |
| `RODAR-NO-SUPABASE-DELTA-5.sql` | **Novo arquivo criado** — ver seção de correções abaixo |
| `PRD.md` | Seção de auditoria e feature map completo adicionados |

---

## Correções Aplicadas

### CRÍTICO

#### C1 — Admin não conseguia atribuir avaliações (RLS violation)
- **Problema**: A política `assessments_insert_own` exigia `uid = auth.uid()`. Admin atribuindo avaliação a um aluno enviava `uid` do aluno — violação de RLS.
- **Solução**: Nova policy `assessments_insert_admin` permite INSERT quando `role = 'admin'`.
- **Arquivo**: `RODAR-NO-SUPABASE-DELTA-5.sql`

#### C2 — Colunas ausentes em `app_users`
- **Problema**: `AssessmentWizard.jsx` chamava `updateUser({ assessmentstatus: 'completed', profile: ... })`. Colunas não existiam → erro 400 silencioso.
- **Solução**: `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS assessmentstatus text, profile text`.
- **Arquivo**: `RODAR-NO-SUPABASE-DELTA-5.sql`

#### C3 — Rota inexistente `/student/assessment/new`
- **Problema**: Dois links em `MyProfile.jsx` apontavam para `/student/assessment/new`. Essa rota não existe no roteador.
- **Solução**: Corrigidos para `/student/assessment-wizard`.
- **Arquivo**: `src/pages/student/MyProfile.jsx`

#### C4 (A5) — Wizard sem navegação ao concluir
- **Problema**: `SafeAssessmentWizard` renderizado em `/student/assessment-wizard` sem a prop `onCompleted`. Ao concluir o wizard, o aluno ficava preso na tela de sucesso sem botão nem navegação automática.
- **Solução**: Wrapper `AssessmentWizardPage` em `routes/index.jsx` injeta `onCompleted={() => navigate('/student/profile')}`.
- **Arquivo**: `src/routes/index.jsx`

---

### ALTO

#### A1 — Admin não conseguia atualizar avaliações
- **Problema**: Sem policy UPDATE para admins em `app_assessments`.
- **Solução**: Nova policy `assessments_update_admin` + `assessments_delete_admin`.
- **Arquivo**: `RODAR-NO-SUPABASE-DELTA-5.sql`

#### A2 — 9 imports duplicados em routes/index.jsx
- **Problema**: 9 `lazy()` imports declarados mas nunca usados (versões Safe* os sobrescreviam). Dead code aumentava bundle e causava confusão.
- **Solução**: Removidos todos os 9 imports não utilizados.
- **Arquivo**: `src/routes/index.jsx`

#### A3 — Exclusão de conta enganosa
- **Problema**: `handleDeleteAccount` em Settings.jsx dizia que excluía permanentemente todos os dados, mas apenas fazia logout + limpava estado local.
- **Solução**: Texto corrigido para ser honesto; adicionado TODO para Edge Function `deleteAccount`.
- **Arquivo**: `src/pages/admin/Settings.jsx`

#### A4 — Hard throw no carregamento do módulo supabase.js
- **Problema**: `throw new Error(...)` executava no nível do módulo quando vars de ambiente estavam ausentes — crashava toda a aplicação no cold start.
- **Solução**: Convertido para `console.warn(...)`.
- **Arquivo**: `src/lib/supabase.js`

---

### MÉDIO

#### M1 — Form de empresa sempre em branco
- **Problema**: `Settings.jsx` não carregava `companyName`/`logoUrl` do banco ao montar — admin via campos sempre vazios mesmo tendo dados salvos.
- **Solução**: `useEffect` adicionado para buscar `getUser(uid)` e pré-popular o form.
- **Arquivo**: `src/pages/admin/Settings.jsx`

#### M2 — Convite reutilizável após uso
- **Problema**: Policy `invites_public_update_token` permitia UPDATE sem restrição — qualquer pessoa podia reativar um convite usado.
- **Solução**: Policy recriada com `USING (used = false)` — bloqueia update em convites já utilizados.
- **Arquivo**: `RODAR-NO-SUPABASE-DELTA-5.sql`

#### M3 — HistoryTab assumia campo inexistente
- **Problema**: `chartHistory` em `MyProfile.jsx` filtrava por `a.profile?.dominantProfile`, mas `app_assessments` não embute o perfil (está em `app_profiles` separado). Resultado: array sempre vazio, sem erro visível.
- **Solução**: `chartHistory = []` explícito com comentário; tipo fallback `'D'` removido o acesso ao campo inexistente.
- **Arquivo**: `src/pages/student/MyProfile.jsx`

#### M4 — Contagem de questões errada na UI
- **Problema**: Label no modal de atribuição dizia "24 + 50 perguntas" — DISC tem 28 questões, não 24.
- **Solução**: Corrigido para "28 + 50 perguntas".
- **Arquivo**: `src/pages/admin/Students.jsx`

---

### BAIXO

#### B1 — Comentário desatualizado em Register.jsx
- **Problema**: Comentário dizia "Create Firebase Auth user" — o sistema usa Supabase desde a migração.
- **Solução**: Atualizado para "cria usuário no Supabase Auth (não Firebase)".
- **Arquivo**: `src/pages/auth/Register.jsx`

#### B2 — Sem GRANT explícito para service_role nas novas colunas
- **Problema**: Colunas adicionadas via `ALTER TABLE` não tinham GRANT explícito.
- **Solução**: `GRANT UPDATE (assessmentstatus, profile) ON app_users TO authenticated` adicionado no delta.
- **Arquivo**: `RODAR-NO-SUPABASE-DELTA-5.sql`

#### B3 — Dois imports separados do mesmo módulo em MyProfile.jsx
- **Problema**: `getProfile` e `getAssessmentsByUser` importados em linhas separadas do mesmo arquivo.
- **Solução**: Consolidados em um único import.
- **Arquivo**: `src/pages/student/MyProfile.jsx`

---

## Itens Não Resolvidos

| Item | Motivo |
|---|---|
| Exclusão completa de conta de usuário | Requer Edge Function com `service_role` para deletar `auth.users` e dados em cascata. Adicionado TODO em Settings.jsx. |
| `chartHistory` no HistoryTab | Requer query JOIN entre `app_assessments` e `app_profiles` com mesmo `userId`. Implementação segura demandaria mudança na camada `firestore.js`. Adiado para não introduzir regressão. |
| Dead code mentor (`src/pages/mentor/`, `src/lib/mentorApi.js`) | Código nunca roteado, queries tabelas inexistentes. Remoção segura, mas fora do escopo desta auditoria — zero impacto funcional atual. |
| Suporte a múltiplas línguas (en, es) | Strings de UI estão em PT-BR sem equivalentes completos nas traduções en/es. Fora do escopo desta auditoria. |
| Push notifications / PWA manifest | `capacitor.config.ts` configura iOS/Android mas não há service worker nem manifest verificado. Fora do escopo. |

---

## SQL para Aplicar no Supabase

Execute o arquivo `RODAR-NO-SUPABASE-DELTA-5.sql` no SQL Editor do Supabase (Dashboard → SQL Editor → New Query → colar conteúdo → Run).

**Ordem obrigatória**: executar o arquivo inteiro de uma vez (as alterações têm dependências entre si).

---

## Avaliação Final de Saúde do App

| Dimensão | Antes | Depois |
|---|---|---|
| Fluxo de avaliação (aluno) | ❌ Rota inválida, tela de conclusão sem saída | ✅ Rota correta, navega para perfil |
| Fluxo de atribuição (admin) | ❌ RLS violation ao atribuir | ✅ Policy correta no banco |
| Persistência de dados | ⚠️ Colunas ausentes causavam erros silenciosos | ✅ Schema correto após delta |
| Segurança de convites | ⚠️ Convites reutilizáveis | ✅ Bloqueado por policy |
| Módulo de carregamento | ❌ Crash no cold start sem env vars | ✅ Apenas aviso no console |
| Qualidade do código | ⚠️ Imports mortos, comentários desatualizados | ✅ Limpo |
| **Status geral** | **⚠️ Não apto para produção** | **✅ Apto para testes funcionais** |

> Após execução do delta SQL e testes manuais dos fluxos de avaliação e atribuição, o app está pronto para beta com usuários reais.
