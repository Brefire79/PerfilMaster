# PRD — ProfileAI
**Documento de Requisitos de Produto**
Versão 1.0 · Breno Luis (AmbFusi AI / Vianexx AI) · Maio 2026

---

## 1. Visão Geral

**ProfileAI** é uma plataforma SaaS de avaliação comportamental que combina o modelo **DISC** com o framework **Positive Intelligence (PQ Sabotadores)** para gerar perfis comportamentais profundos e personalizados usando IA.

A plataforma atende dois públicos principais: **facilitadores/coaches (Admin)** que criam e gerenciam grupos de avaliação, e **participantes/avaliados (Student)** que respondem às avaliações e visualizam seu perfil comportamental.

**Tagline:** *Conheça o comportamento que move pessoas.*

---

## 2. Problema

Coaches, RHs e educadores precisam entender o perfil comportamental de suas equipes e clientes de forma rápida e escalável. As ferramentas existentes são caras, complicadas e não geram insights acionáveis com linguagem empática. A maioria não combina DISC com análise de padrões limitantes (Sabotadores PQ).

---

## 3. Solução

Uma plataforma PWA + Mobile (Capacitor) que:

- Aplica avaliação DISC + PQ Sabotadores de forma guiada e adaptativa
- Envia link de avaliação via WhatsApp sem exigir cadastro do avaliado
- Gera análise comportamental personalizada via IA (Claude / Grok)
- Permite ao facilitador gerenciar grupos, sessões, relatórios e módulos customizados
- Funciona em português (pt-BR), inglês e espanhol

---

## 4. Usuários e Papéis

### 4.1 Admin (Facilitador / Coach / RH)
- Cria e gerencia grupos de participantes
- Convida participantes via e-mail ou link (token único)
- Cria módulos de questionário customizados
- Gerencia sessões de avaliação
- Visualiza dashboard com métricas gerais
- Acessa relatórios individuais e por grupo
- Pode participar de avaliações como student

### 4.2 Student (Participante / Avaliado)
- Recebe link de convite ou token de avaliação
- Responde ao questionário DISC + PQ
- Visualiza seu perfil comportamental com scores e análise
- Acessa histórico de avaliações

### 4.3 Público (sem login)
- Acessa avaliação via link token enviado por WhatsApp
- Completa avaliação sem cadastro
- Visualiza resultado ao final da sessão

---

## 5. Funcionalidades

### 5.1 Autenticação
- Login com e-mail/senha
- Login com Google (feature flag: `VITE_ENABLE_GOOGLE_AUTH`)
- Recuperação de senha
- Cadastro via convite (token na URL: `/register?token=xxx`)
- Redirecionamento por papel (admin → `/admin/dashboard`, student → `/student/dashboard`)

### 5.2 Dashboard Admin
- Cards de estatísticas: Total de alunos, Total de grupos, Avaliações concluídas, Taxa de conclusão
- Feed de atividade recente (últimos 30 dias): avaliações concluídas, perfis gerados, novos membros, grupos criados
- Ações rápidas: Criar grupo, Convidar alunos, Ver relatórios, Gerenciar módulos
- Legenda dos 4 perfis DISC com taglines

### 5.3 Gestão de Grupos
- CRUD de grupos
- Listagem de membros por grupo
- Visualização de perfis do grupo
- Convite de participantes por e-mail ou link compartilhável
- Detalhes do grupo com membros, avaliações e relatórios do grupo

### 5.4 Gestão de Alunos
- Listagem de todos os participantes
- Visualização de perfil individual
- Filtros por grupo e status de avaliação

### 5.5 Módulos de Questionário
- Criação de módulos customizados com questões próprias
- Editor de módulo (ModuleBuilder)
- Listagem de módulos ativos

### 5.6 Sessões
- Criação e gerenciamento de sessões de avaliação
- Envio de token de avaliação (link para WhatsApp ou e-mail)
- Controle de status da sessão (pendente, em andamento, concluída)
- Visualização de respostas por sessão

### 5.7 Relatórios
- Relatório individual por participante
- Relatório de grupo com distribuição de perfis (D/I/S/C)
- Geração de PDF do relatório
- Insights de grupo via IA (Edge Function `groupInsights`)

### 5.8 Configurações Admin
- Gerenciamento de API keys de IA
- Configurações da conta
- Preferências de idioma

### 5.9 Dashboard Student
- Saudação personalizada
- Card de perfil DISC com scores em barras se já avaliado
- CTA para iniciar avaliação se ainda não concluída
- Visão geral dos 4 perfis DISC
- Acesso ao perfil completo

### 5.10 Avaliação (AssessmentWizard)
- Questionário adaptativo com 28 questões DISC + 50 questões PQ Sabotadores (total 78)
- Questões do tipo Likert 5 pontos
- Mínimo de 20 respostas para conclusão, mínimo 3 por dimensão
- Progresso visual durante a avaliação
- Fallback para questões de amostra quando não há módulo configurado
- Análise local dos scores + enriquecimento via IA (Grok via Netlify Function)

### 5.11 Avaliação Pública (sem login)
- Acesso via URL `/avaliacao/:token`
- Busca sessão pelo token (Supabase Edge Function `buscarPorToken`)
- Estados: carregando → boas-vindas → avaliando → analisando → resultado
- Atualização de status via Edge Function `atualizarStatus`
- Análise via Edge Function `analyzeResponse` (Claude/Anthropic)
- Flag de indicação de acompanhamento terapêutico via Edge Function `therapyFlag`
- Error boundary para recuperação de erros

### 5.12 Meu Perfil (Student)
- Visualização do perfil DISC completo
- Scores por dimensão
- Análise de sabotadores
- Insights e recomendações personalizadas geradas por IA
- Histórico de avaliações

### 5.13 PWA + Mobile
- PWA com vite-plugin-pwa para instalação no navegador
- Banner de atualização automático quando nova versão disponível (UpdateBanner)
- Build mobile via Capacitor (Android e iOS)
- Suporte a StatusBar e SplashScreen via Capacitor

---

## 6. Arquitetura Técnica

### 6.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 |
| Estilização | Tailwind CSS 3 |
| Roteamento | React Router v6 |
| Estado | Zustand |
| i18n | i18next + react-i18next |
| Gráficos | Recharts |
| QR Code | qrcode + react-qr-code |
| PDF | html2pdf.js |
| Mobile | Capacitor 6 |
| PWA | vite-plugin-pwa |

### 6.2 Backend / Serviços

| Serviço | Uso |
|---------|-----|
| Supabase (Postgres + Auth) | Banco de dados principal, autenticação, RLS |
| Supabase Edge Functions (Deno) | analyzeResponse, buscarPorToken, atualizarStatus, therapyFlag, groupInsights |
| Firebase Firestore | Dados legados (grupos, usuários, avaliações, perfis) |
| Firebase Auth | Autenticação legada |
| Netlify Functions | Proxy seguro para xAI Grok (generate-profile-analysis) |
| xAI Grok (via Netlify) | Enriquecimento de análise DISC + PQ no wizard |
| Claude / Anthropic (via Supabase) | Análise de respostas na avaliação pública |

### 6.3 Deploy

| Ambiente | Serviço |
|---------|---------|
| Hosting | Netlify |
| Edge Functions | Supabase |
| Repositório | GitHub (Brefire79) |
| Node version | 20 |

### 6.4 Tabelas Supabase

| Tabela | Propósito |
|--------|-----------|
| `app_users` | Usuários da plataforma |
| `app_groups` | Grupos de avaliação |
| `app_modules` | Módulos de questionário |
| `app_assessments` | Avaliações individuais |
| `app_profiles` | Perfis comportamentais gerados |
| `app_invites` | Convites pendentes |
| `app_sessoes` | Sessões de avaliação públicas |
| `app_avaliados` | Participantes avaliados por sessão |
| `app_sessao_respostas` | Respostas das sessões |
| `app_group_reports` | Relatórios de grupo |

### 6.5 Segurança

- RLS (Row Level Security) ativo em todas as tabelas
- API keys de IA nunca expostas no frontend
- Proxy server-side para xAI (Netlify Function)
- Secrets de IA configurados nas variáveis de ambiente do Supabase e Netlify
- CSP configurado no `netlify.toml` (bloqueio de scripts externos não autorizados)
- Headers de segurança: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy

---

## 7. Modelo de Avaliação

### 7.1 DISC
- **D (Dominância):** Orientado a resultados, direto, decisivo, competitivo
- **I (Influência):** Entusiasmado, persuasivo, comunicativo, otimista
- **S (Estabilidade):** Paciente, confiável, colaborativo, resistente a mudanças
- **C (Conformidade / Analítico):** Preciso, analítico, sistemático, orientado a qualidade

### 7.2 PQ Sabotadores (10 tipos)
Judge (Juiz), Avoider (Evitador), Controller (Controlador), Hyper-Achiever (Hiper-Realizador), Hyper-Rational (Hiper-Racional), Hyper-Vigilant (Hiper-Vigilante), Pleaser (Agradador), Restless (Agitado), Stickler (Perfeccionista), Victim (Vítima)

### 7.3 Scoring
- Escala Likert 5 pontos por questão
- Pesos por questão (1.0 a 1.5) e por dificuldade (1, 2 ou 3)
- Score DISC normalizado 0–100 por dimensão
- PQ Score geral 0–100
- Perfil primário e secundário identificados pelo maior score
- Subtipo gerado pela combinação de perfil primário + secundário

### 7.4 Output da IA (Grok/Claude)
```json
{
  "enrichedSummary": "Parágrafo de 150-200 palavras sobre o perfil",
  "deepInsights": ["5 insights personalizados"],
  "personalizedRecommendations": [
    { "category": "Autogestão", "action": "...", "priority": "alta" },
    ...5 recomendações
  ],
  "coachingQuestions": ["4 perguntas reflexivas"]
}
```

---

## 8. Internacionalização

| Idioma | Código | Status |
|--------|--------|--------|
| Português (Brasil) | pt-BR | Completo (primário) |
| Inglês | en | Completo |
| Espanhol | es | Completo |

Todas as questões do questionário possuem texto em pt-BR, en e es.

---

## 9. Rotas da Aplicação

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/` | RootRedirect | Público |
| `/login` | Login | Público |
| `/register` | Register | Público (+ token) |
| `/forgot-password` | ForgotPassword | Público |
| `/join/:token` | JoinHandler | Público |
| `/avaliacao/:token` | AvaliacaoPublica | Público (sem login) |
| `/admin/dashboard` | AdminDashboard | Admin |
| `/admin/groups` | Groups | Admin |
| `/admin/groups/:id` | GroupDetail | Admin |
| `/admin/students` | Students | Admin |
| `/admin/modules` | Modules | Admin |
| `/admin/modules/:id` | ModuleBuilder | Admin |
| `/admin/sessoes` | Sessoes | Admin |
| `/admin/reports` | Reports | Admin |
| `/admin/settings` | Settings | Admin |
| `/student/dashboard` | StudentDashboard | Student |
| `/student/assessment/:id` | Assessment | Student |
| `/student/assessment-wizard` | AssessmentWizard | Student |
| `/student/profile` | MyProfile | Student |

---

## 10. Edge Functions (Supabase)

| Função | Descrição |
|--------|-----------|
| `analyzeResponse` | Analisa respostas e gera perfil DISC completo via Claude |
| `buscarPorToken` | Retorna sessão e dados do avaliado pelo token público |
| `atualizarStatus` | Atualiza status da sessão (pendente → concluída) |
| `therapyFlag` | Identifica indicadores de acompanhamento terapêutico |
| `groupInsights` | Gera insights coletivos para o grupo |

---

## 11. Netlify Functions

| Função | Descrição |
|--------|-----------|
| `generate-profile-analysis` | Proxy seguro para xAI Grok; recebe discScores, sabScores, localAnalysis e retorna análise enriquecida em JSON |

---

## 12. Roadmap / Sprints

### Sprint 1 (Atual) — Fundação
- [x] Auth (login, registro, recuperação)
- [x] Dashboard Admin com stats e atividade recente
- [x] Dashboard Student com perfil e CTA
- [x] AssessmentWizard com 78 questões
- [x] Avaliação Pública via token (WhatsApp)
- [x] Integração IA Grok (Netlify) + Claude (Supabase)
- [x] PWA + UpdateBanner
- [x] i18n (pt-BR / en / es)
- [x] Sessões (admin)
- [x] Relatórios (admin)
- [x] Configurações (admin)

### Sprint 2 — Grupos e Convites
- [ ] CRUD completo de Grupos
- [ ] Envio de convite por e-mail
- [ ] Link de convite compartilhável (WhatsApp)
- [ ] Detalhes do Grupo com perfis dos membros
- [ ] CRUD de Módulos customizados

### Sprint 3 — Relatórios e Analytics
- [ ] Relatório individual em PDF
- [ ] Relatório de grupo com gráficos DISC
- [ ] Insights de grupo via IA (`groupInsights`)
- [ ] Dashboard com gráficos (Recharts)

### Sprint 4 — Mobile e Distribuição
- [ ] Build Android via Capacitor
- [ ] Build iOS via Capacitor
- [ ] Push Notifications (`VITE_ENABLE_PUSH_NOTIFICATIONS`)
- [ ] Analytics (`VITE_ENABLE_ANALYTICS`)

---

## 13. Critérios de Aceite (MVP)

1. Admin consegue criar grupo e convidar participante via e-mail → participante recebe link → se cadastra → responde avaliação → perfil é gerado
2. Admin consegue enviar link de avaliação pública via WhatsApp → participante acessa sem login → responde → vê resultado
3. Análise de IA retorna enriquedSummary + deepInsights + recomendações em português
4. App funciona como PWA instalável no celular
5. Dados sensíveis (API keys) nunca aparecem no bundle do frontend

---

## 14. Restrições e Premissas

- Firebase Firestore é legado — migração progressiva para Supabase
- xAI API Key configurada somente nas variáveis de ambiente do Netlify (nunca no `.env.local` commitado)
- Anthropic API Key configurada somente nos Supabase Secrets
- Node 20 exigido no build (Netlify)
- Sem frameworks CSS além de Tailwind; sem Redux (Zustand apenas)
- Código em React (exceção à regra Vanilla JS por decisão de stack do projeto)

---

## 15. Glossário

| Termo | Definição |
|-------|-----------|
| DISC | Modelo comportamental com 4 dimensões: Dominância, Influência, Estabilidade, Conformidade |
| PQ | Positive Intelligence — framework de Shirzad Chamine para identificar sabotadores mentais |
| Sabotador | Padrão comportamental negativo identificado pelo modelo PQ |
| Facilitador | Admin que conduz as avaliações |
| Avaliado | Participant/student que responde ao questionário |
| Sessão | Conjunto de avaliações com token público |
| Token | Código único que identifica uma sessão ou convite |
| DXA | Unidade de medida usada em documentos Office (1440 DXA = 1 polegada) |

---

*Documento gerado em 23/05/2026 · ProfileAI v1.0.0*
