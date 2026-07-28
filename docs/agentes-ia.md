# Agentes de IA — Perfil Master

> ⚠️ **DOCUMENTO HISTÓRICO (junho/2026).** A arquitetura descrita aqui mudou:
> - O provider **não é o Gemini** — é **DeepSeek**, único, via `_shared/anthropic.ts` (nome legado).
> - **Não existe mais o proxy xAI/Netlify Function.** Era um endpoint aberto ao público e foi removido em 27/07/2026 (C2 da auditoria). Toda IA passa por Edge Functions do Supabase.
> - O chat "Mestre" virou **motor 100% local** (`src/lib/mestreLocal.js`), sem chamada de IA externa.
>
> Estado atual: `manual_tecnico.md` §1 e §4. Mantido pelo valor do desenho conceitual dos agentes.

> Documento de referência técnica de todos os agentes de IA do projeto.
> Atualizado em: Junho 2026 | Vianexx AI — "Damos vida à inovação"

---

## Visão Geral da Arquitetura

O Perfil Master opera com dois planos de execução de IA:

**Plano Principal** — Supabase Edge Functions (Deno runtime) chamando Google Gemini via `_shared/anthropic.ts`

**Plano Fallback** — Motor local offline (`localEngine.js`) + backend proxy xAI via Netlify Function

```
Usuário → Edge Function → Gemini API (AIza...)
                       ↓ falha
              → Backend xAI (proxy Netlify)
                       ↓ falha
              → localEngine.js (100% offline, zero API)
```

> **Nota importante:** A função `callAnthropic()` em `_shared/anthropic.ts` usa
> internamente o Google Gemini 2.0 Flash — o nome da função é legado. O cliente
> `_shared/claude.ts` usa de fato o modelo `claude-sonnet-4-6` via Anthropic API,
> porém está presente somente como alternativa explícita no código.

---

## Agentes de Edge Function (Supabase/Deno)

### 1. `analyzeResponse`

**Arquivo:** `supabase/functions/analyzeResponse/index.ts`
**Responsabilidade:** Análise comportamental a partir de respostas brutas de um questionário modular.

| Campo | Valor |
|---|---|
| Modelo | Gemini 2.0 Flash (`_shared/anthropic.ts`) |
| Max tokens | 2.048 |
| Autenticação | JWT Supabase obrigatório |
| Input | Array de respostas (`answers[]`) + objetivo do módulo |
| Output | JSON com `scores`, `dominantProfile`, `secondaryProfile`, `summary`, `strengths`, `challenges`, `roleRecommendation`, `workStyleRecommendation`, `teamBehavior`, `communicationTips`, `saboteurPatterns`, `derailmentRisks`, `therapyIndicator` |

**System prompt:** Especialista em psicologia organizacional, usa perfis D/I/S/C em PT-BR, retorna JSON puro.

**Limite:** máx. 200 respostas por chamada.

---

### 2. `buildProfile`

**Arquivo:** `supabase/functions/buildProfile/index.ts`
**Responsabilidade:** Constrói o perfil comportamental completo e aprofundado de um participante, incluindo estratégia exclusiva para o instrutor (`adminStrategy`).

| Campo | Valor |
|---|---|
| Modelo | Gemini 2.0 Flash (`_shared/anthropic.ts`) |
| Max tokens | 6.000 |
| Autenticação | JWT Supabase + verificação `canAccessAssessment()` |
| Input | `assessmentId` + `uid` + respostas da tabela `app_assessments` |
| Output | JSON completo (ver abaixo) + upsert em `app_profiles` |

**Campos do output:**
`scores`, `dominantProfile`, `dominantProfileName`, `secondaryProfile`, `secondaryProfileName`, `summary`, `strengths`, `challenges`, `roleRecommendation`, `workStyleRecommendation`, `teamBehavior`, `communicationTips`, `saboteurPatterns`, `derailmentRisks`, `developmentAreas`, `evolutionNotes`, `leadershipStyle`, `conflictStyle`, `motivators`, `stressors`, `therapyIndicator`, `adminStrategy`

**`adminStrategy` (exclusivo para instrutor/coach):**
`executiveBrief`, `approachStyle`, `coachingQuestions[5]`, `feedbackApproach`, `motivationLevers[3]`, `redFlags[3]`, `nextAssessmentFocus`, `actionPlan[4]`, `compatibilityMap{D,I,S,C}`, `delegationGuide`, `stretchAreas[3]`

> Este é o agente mais pesado do sistema — 6k tokens. Usar com critério.

---

### 3. `calculate-assessment`

**Arquivo:** `supabase/functions/calculate-assessment/index.ts`
**Responsabilidade:** Cálculo puramente matemático dos scores DISC e Sabotadores PQ — **sem chamada de IA**. Salva resultado na tabela `assessment_results`.

| Campo | Valor |
|---|---|
| Modelo | Nenhum (cálculo determinístico) |
| Autenticação | JWT Supabase + RLS |
| Input | `respostas` (Record de Likert 1–5) + `assessment_type` |
| Output | Scores DISC (escala 1–5), scores Sabotadores (1–10), PQ Score, subtipo DISC, intensidades |

**Fórmula PQ Score:**
```
PQ Score = 100 - (média dos top 3 scores brutos × 10)
```

**Subtipo DISC:** combinação primário+secundário → ex: `DC`, `iD`, `SC`, `CS`...

**Escalas:**
- DISC: média Likert por dimensão (7 perguntas/perfil), resultado 1–5
- Sabotadores: média Likert (5 perguntas/sabotador) × 2 → resultado 1–10

> Agente sem IA — rápido, determinístico, crítico para consistência do banco.

---

### 4. `generate-report`

**Arquivo:** `supabase/functions/generate-report/index.ts`
**Responsabilidade:** Gera relatório narrativo personalizado combinando DISC + Sabotadores, com fallback estático se a IA falhar.

| Campo | Valor |
|---|---|
| Modelo | Gemini (tentativa em cascata: `1.5-flash-8b` → `1.5-flash` → `2.0-flash-lite` → `2.0-flash`) |
| Max tokens | 2.048 |
| Autenticação | JWT Supabase + RLS (`user_id`) |
| Input | `assessment_result_id` |
| Output | `resumo_perfil`, `impacto_sabotadores`, `recomendacoes[5]`, `focos_mentoria[3]`, `pontos_fortes[3]`, `relatorio_completo` (Markdown) |
| Cache | Retorna relatório existente se já gerado (sem rechamar a API) |

**Fallback em cascata:**
1. Tenta 4 modelos Gemini em ordem de disponibilidade
2. Se todos falharem → relatório estático gerado por regras com os dados do assessment
3. Modelo usado é registrado no campo `modelo_ia` na tabela `user_reports`

**Correlações DISC × Sabotadores usadas no prompt:**
- D → controller, hyperAchiever, judge
- I → pleaser, avoider, restless
- S → pleaser, avoider, victim
- C → stickler, hyperRational, hyperVigilant

---

### 5. `generateReport`

**Arquivo:** `supabase/functions/generateReport/index.ts`
**Responsabilidade:** Orquestrador leve de montagem de relatórios individual ou grupal — **sem chamada de IA**. Busca dados de `app_profiles` ou `app_group_reports` e retorna payload estruturado.

| Campo | Valor |
|---|---|
| Modelo | Nenhum |
| Autenticação | Não obrigatório (usa service role) |
| Input | `type` (`individual` ou `group`) + `uid` ou `groupId` |
| Output | `reportId`, `reportUrl`, `type`, `generatedAt`, `payload` |

> Agente auxiliar de consulta — sem IA, sem custo de tokens.

---

### 6. `groupInsights`

**Arquivo:** `supabase/functions/groupInsights/index.ts`
**Responsabilidade:** Análise da dinâmica coletiva de um grupo com base na distribuição de perfis DISC dos membros.

| Campo | Valor |
|---|---|
| Modelo | Gemini 2.0 Flash (`_shared/anthropic.ts`) |
| Max tokens | 2.500 |
| Autenticação | JWT Supabase + verificação `isGroupAdmin()` |
| Input | Array `profiles[]` (máx. 100) + `groupId` + `groupName` + `moduleObjective` |
| Output | JSON com `teamDynamics`, `collaborationTips[4]`, `conflictRisks[3]`, `recommendedRoles{Leadership,Execution,Creativity,Quality}`, `groupStrengths[4]`, `groupBlindSpots[3]`, `aiInsight`, `balanceAnalysis`, `developmentPriorities[2]` |

**Acesso restrito:** somente admins do grupo podem chamar este agente.

---

### 7. `insightPerfil`

**Arquivo:** `supabase/functions/insightPerfil/index.ts`
**Responsabilidade:** Gera análise de perfil DISC já calculado — mais leve e rápida que `buildProfile`. Suporta acesso público (sem login) para a rota `/resultado/:token`.

| Campo | Valor |
|---|---|
| Modelo | Gemini 2.0 Flash (`_shared/anthropic.ts`) |
| Max tokens | 1.200 |
| Autenticação | **Opcional** — funciona sem login (rota pública) |
| Input | `perfil` (scores DISC) + `nome` + `geminiKey` (opcional) |
| Output | `insight`, `forcas[5]`, `desafios[3]`, `carreiras[4]`, `comunicacao`, `desenvolvimento`, `palavrasChave[5]` |

**Regras de segurança do system prompt:**
- NUNCA diagnósticos clínicos ou terminologia psiquiátrica
- NUNCA conteúdo sobre suicídio, homicídio ou desvios graves
- Foco exclusivo em desenvolvimento e autoconhecimento

---

### 8. `therapyFlag`

**Arquivo:** `supabase/functions/therapyFlag/index.ts`
**Responsabilidade:** Identifica de forma discreta e não diagnóstica se o participante pode se beneficiar de suporte adicional (coaching, mentoria, apoio profissional). **Uso exclusivo do instrutor/admin.**

| Campo | Valor |
|---|---|
| Modelo | Gemini 2.0 Flash (`_shared/anthropic.ts`) |
| Max tokens | 600 |
| Autenticação | JWT Supabase obrigatório |
| Input | `answers[]` + `profileData` + `language` + `geminiKey` (opcional) |
| Output | `flagged` (boolean), `level` (`none`/`watch`/`suggest`), `note` (máx. 200 palavras) |

**Critérios de nível:**
- `none` → sem padrões identificados
- `watch` → padrões sutis para atenção do instrutor
- `suggest` → padrões mais evidentes onde suporte seria benéfico

**Regra de segurança:** em caso de dúvida, **não sinalizar** (`flagged: false`). O agente falha silenciosamente retornando `{flagged: false, level: 'none', note: ''}`.

---

## Agentes do Frontend (Client-side)

### 9. `localEngine` (Motor Local Offline)

**Arquivo:** `src/lib/localEngine.js`
**Responsabilidade:** Geração de análise comportamental completa sem nenhuma chamada de API. Ativado quando todos os agentes remotos falham.

| Campo | Valor |
|---|---|
| Modelo | Nenhum — lógica determinística pura |
| Custo | Zero |
| Latência | Imediata |
| Fallback de | `apiKeyManager.generateAnalysis()` |

**O que gera localmente:**
- Perfil primário/secundário e subtipo DISC
- Top 3 sabotadores + PQ Score + nível de risco
- Correlações DISC × Sabotadores (regras fixas)
- Recomendações baseadas em regras (mín. 5, máx. 7)
- `deepInsights` — 5-6 insights contextuais determinísticos
- `coachingQuestions` — 5-7 perguntas reflexivas abertas
- `summary` narrativo completo em PT-BR

**Dados embutidos:** `DISC_PROFILES` (D/I/S/C completo) + `SABOTADORES_DATA` (10 sabotadores com triggers, impactos e coping strategies).

---

### 10. `apiKeyManager` (Orquestrador de Análise)

**Arquivo:** `src/lib/apiKeyManager.js`
**Responsabilidade:** Orquestra a geração de análises enriquecidas por IA, gerencia a chave do usuário e define a cascata de fallback.

| Campo | Valor |
|---|---|
| Provider suportado | Google Gemini 2.0 Flash (`AIza...`) |
| Persistência da key | Supabase `settings` (primário) + `localStorage` (fallback) |

**Cascata de execução de `generateAnalysis()`:**
```
1. Chave Gemini do usuário configurada (AIza...) → Gemini direto
      ↓ falha ou sem chave
2. Backend proxy xAI via Netlify Function (/api/generate-profile-analysis)
      ↓ falha
3. localEngine.js — análise 100% offline
```

**Nota D5:** somente chaves com prefixo `AIza` (Gemini) são aceitas. Chaves Anthropic, OpenAI ou outras são ignoradas silenciosamente e o sistema cai para o próximo nível da cascata.

---

## Utilitários Compartilhados (Edge Functions)

### `_shared/anthropic.ts`
Wrapper de chamada ao Gemini API. Apesar do nome, **usa Google Gemini** (não Anthropic). Aceita chave do usuário com prioridade sobre a env var do servidor.

### `_shared/claude.ts`
Wrapper de chamada à Anthropic API (Claude Sonnet 4.6). Presente como alternativa explícita para uso direto do modelo Claude quando necessário.

### `_shared/disc.ts`
Calculador matemático de perfil DISC. 24 questões (6 por dimensão) com pesos por tipo (likert5: 1.0/1.1, forced_choice: 1.2, scenario: 1.5). Retorna `dominante`, `influente`, `estavel`, `analitico`, `perfilPrimario`, `perfilSecundario`.

---

## Mapa de Fluxo por Funcionalidade

| Funcionalidade | Agentes envolvidos (em ordem) |
|---|---|
| Completar avaliação | `calculate-assessment` → `buildProfile` |
| Ver resultado público | `insightPerfil` (sem auth) |
| Gerar relatório individual | `generate-report` |
| Dashboard admin — perfil do aluno | `buildProfile` + `generateReport` |
| Relatório de grupo | `groupInsights` + `generateReport` |
| Sinalização de bem-estar | `therapyFlag` |
| Análise no frontend (offline) | `apiKeyManager` → `localEngine` |
| Análise modular customizada | `analyzeResponse` |

---

## Modelo e Custos de Referência

| Agente | Modelo | Max tokens out | Custo relativo |
|---|---|---|---|
| `buildProfile` | Gemini 2.0 Flash | 6.000 | Alto |
| `generate-report` | Gemini (cascata) | 2.048 | Médio |
| `groupInsights` | Gemini 2.0 Flash | 2.500 | Médio |
| `analyzeResponse` | Gemini 2.0 Flash | 2.048 | Médio |
| `insightPerfil` | Gemini 2.0 Flash | 1.200 | Baixo |
| `therapyFlag` | Gemini 2.0 Flash | 600 | Baixo |
| `calculate-assessment` | Nenhum | — | Zero |
| `generateReport` | Nenhum | — | Zero |
| `localEngine` | Nenhum | — | Zero |

---

## Migração Planejada

> **Vianexx AI — Pendente**

- [ ] Substituir `callAnthropic()` em `_shared/anthropic.ts` por chamada direta ao Claude Sonnet 4.6 via `_shared/claude.ts`
- [ ] Atualizar `apiKeyManager.js` para aceitar chaves Anthropic (`sk-ant-...`) além de Gemini
- [ ] Remover referências a "AMB FUSI" nos prompts de `generate-report` e `buildProfile`
- [ ] Padronizar modelo para `claude-sonnet-4-20250514` em todas as Edge Functions

---

*Perfil Master · Vianexx AI · Breno (mente da integração)*
