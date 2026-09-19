# Plano de evolução — Perfil Master (19/09/2026)

> Avaliação do app + dados reais de produção + planejamento dos módulos previstos
> e do **Ciclo de Desenvolvimento** (resultado → abordagem → próximo teste → histórico → auditoria)
> e da evolução do chat Mestre.

---

## 1. Como o app está (avaliação)

### 1.1 Código

| Área | Estado | Observação |
|---|---|---|
| Três fluxos de avaliação (grupo, individual, avulso por token) | **Sólido** | Scoring canônico único (`discScoring.js` ↔ `atualizarStatus`), 78 questões, contratos automatizados (`npm test`) travando pesos/ids. |
| Segurança | **Sólido** | RLS por facilitador, Edge com service_role, rate limit, erros neutros, CPF pseudonimizado, auditoria append-only. |
| Central de Gestão | **Bom** | Visão Geral, Pessoas & Histórico, Inteligência de Grupos (k-anonimato), Diagnóstico. |
| Convite empresarial / janela / comparativo (DELTAs 22–24) | **Recém-entregue** | Funcional; aguarda redeploy das Edge (`validateInviteToken` deu 404 em produção em 18/09 — ver §1.3). |
| Módulos personalizados (`Modules.jsx`, `ModuleBuilder.jsx`) | **Cosmético** | Editor existe, mas **0 módulos criados em produção**, nenhum motor de scoring próprio e o wizard principal ignora módulos. |
| Social Style / OCAI / Custom | **Não existe** | Só opções desabilitadas no seletor. |
| Mestre (chat local) | **Funcional, raso** | 4 consultas fixas + 16 respostas de FAQ por regex. Não conhece pessoas, pendências, evolução nem abordagem. Miss-log só no `localStorage` do admin (você não vê os misses dos outros facilitadores). |
| **Reavaliação** | **Quebrada por desenho** | `createProfile` faz **upsert por `uid`** — a 2ª avaliação **sobrescreve** a 1ª em `app_profiles`. `app_assessments` guarda as respostas antigas, mas nada lê. Não há evolução antes→depois. |
| Auditoria | **Parcial** | `assessment_completed` só é gravado no fluxo público (`atualizarStatus`). O wizard de conta **não registra** conclusão — 13 avaliações submetidas, 1 evento no `audit_log`. |

### 1.2 Dados reais (Supabase, 19/09/2026)

| Métrica | Valor | Leitura |
|---|---|---|
| Usuários | 17 (1 admin) | 1 facilitador em produção — **você**. Tudo o que for "multi-tenant comercial" ainda não tem cliente. |
| Grupos | 3 | |
| Avaliações de conta | 26 (13 `submitted`, **13 `pending`**) | **50 % de conclusão** — abaixo do indicador de prontidão do roadmap (75 %). |
| Perfis (`app_profiles`) | 14 — **todos com 1 perfil por pessoa** | Ninguém foi reavaliado (ou foi, e o anterior sumiu). |
| Perfis com PQ/Sabotadores | 4 (pós-DELTA 17) | 10 perfis antigos são DISC-only. |
| Perfis com texto de orientação da IA (`developmentareas`, `evolutionnotes`) | 11 | **O app já produz "onde abordar"** — é este insumo que alimenta o ciclo (§3). |
| `adminstrategy` / `app_admin_strategies` | 0 / 1 | Estratégia do facilitador quase não usada. |
| Avaliados avulsos (token) | 1 (convertido em conta) | Fluxo público quase sem uso real ainda. |
| Convites | 30 criados, 6 usados (20 %) | Muito convite gerado para pouca entrada. |
| `app_report_meta` | 8 análises salvas, 1 observação | Observação do facilitador pouco usada. |
| Erros do cliente | 38 — 33 são React #31 **em `dev`** (corrigido em `d7be709`), 1 `validateInviteToken 404` em prod (18/09) | Produção limpa; o 404 indica Edge do DELTA 22 ainda não deployada. |

**Alerta psicométrico confirmado nos dados**: perfil mais recente = I 85 · S 80 · C 75 · D 50. Quatro dimensões altas — o viés de aquiescência descrito em `AUDITORIA-2026-09-17.md` §4 (todos os 28 itens são "concordo = mais perfil"). Qualquer motor de recomendação vai herdar esse ruído se não for tratado (ver §5, decisão 1).

### 1.3 Pendências operacionais (antes de qualquer evolução)

1. Redeploy das Edge pendentes: `buscarPorToken`, `atualizarStatus`, `validateInviteToken`, `consumeInvite`, `consumeInviteAvulso`, `buildProfile`, `logClientError` + `npm run deploy` (DELTAs 20–24 e devolutiva).
2. DELTA 20 no banco: `app_client_errors` já existe (38 linhas) — confirmar `app_rate_limit` e `podar_telemetria()`.
3. Secret `SUPABASE_ANON_KEY` no GitHub Actions (keepalive).
4. Registrar `assessment_completed` também no fluxo de conta (`buildProfile` → `logAuditEvent`). Sem isso a trilha de auditoria do ciclo (§3.5) nasce furada.

---

## 2. Veredito sobre os módulos previstos

Critério: **só constrói o que os dados reais pedem hoje** (1 facilitador, 14 perfis, 0 reavaliações).

| Módulo previsto | Veredito | Por quê |
|---|---|---|
| **Módulos personalizados** (banco de questões livre, drag-and-drop) | **Não construir como está.** Reaproveitar a estrutura (`app_modules` + `ModuleBuilder`) como **catálogo de Testes Dirigidos** (§3.3) | Questionário livre sem motor de scoring gera relatório DISC errado. O que você descreveu — "montar o teste a aplicar de acordo com o resultado" — é exatamente um catálogo de módulos *com regra*, não um editor livre. |
| **Social Style** | **Lente derivada do DISC**, sem questionário (roadmap §5 da auditoria) | Custo baixo, entra como seção do relatório. Fica na Fase 3 do ciclo, não antes. |
| **OCAI** (cultura organizacional) | **Adiar** | Outro produto; nenhum cliente pedindo. |
| **Planos/limites comerciais, onboarding do facilitador** (Fase 2 do roadmap) | **Adiar** até existir 2º facilitador pagante | Com 1 admin, é infraestrutura sem uso. |
| **Mobile (Capacitor)** | **Adiar** | O fluxo é web/WhatsApp; nenhum erro ou pedido de app nativo. |
| **Ciclo de Desenvolvimento** (novo — o que você pediu) | **Construir — é o núcleo da próxima fase** | Transforma "avaliação única" em "acompanhamento". É o único diferencial que os dados atuais sustentam. |
| **Mestre v2** | **Construir junto com o ciclo** | O chat só fica útil quando tiver pessoas, pendências e ciclos para consultar. |

---

## 3. Proposta central — Ciclo de Desenvolvimento

### 3.1 Conceito

```
Avaliação (78 itens)  →  Perfil + Orientação (IA/local)  →  Plano de Abordagem  →  Teste Dirigido sugerido
        ↑                                                                                     │
        └──────────────── Reavaliação (Δ DISC, Δ PQ, Δ sabotadores) ←────── aplicação ←──────┘
                                        tudo na Linha do Tempo da pessoa, com auditoria
```

Cada conclusão de avaliação gera **automaticamente** um *Plano de Abordagem* (o que trabalhar) e uma *Próxima avaliação sugerida* (qual teste dirigido, quando). O facilitador aceita, edita ou descarta. Tudo fica rastreado por pessoa e por turma.

### 3.2 Motor de abordagem (`src/lib/abordagem.js` — determinístico, local, auditável)

Entrada: `{ scores DISC, pq_score, saboteur_scores, developmentareas, ciclo anterior }`
Saída: `{ focos[], moduloSugerido, prazoDias, justificativa[], regraId }`

Regras iniciais (extraídas do que o `localEngine`/IA já escreve hoje):

| Sinal no perfil | Foco | Teste dirigido sugerido | Prazo |
|---|---|---|---|
| Sabotador **Agradador ≥ 65** ou `developmentareas` cita assertividade | Assertividade / dizer não | `TD-ASSERTIVIDADE` | 60 d |
| **Controlador ≥ 65** + D alto | Delegação e escuta | `TD-DELEGACAO` | 60 d |
| **Hiper-Realizador ≥ 65** | Equilíbrio / propósito | `TD-EQUILIBRIO` | 90 d |
| **Evitador ≥ 65** ou D ≤ 40 | Decisão sob pressão / conflito | `TD-DECISAO` | 60 d |
| **Inquieto ≥ 65** | Foco e conclusão | `TD-FOCO` | 60 d |
| **Juiz ≥ 65** | Autocrítica / feedback | `TD-FEEDBACK` | 60 d |
| **PQ < 60** (qualquer) | Fundamentos PQ antes de tudo | `TD-PQ-BASE` | 45 d |
| Aquiescência (≥ 3 dimensões DISC ≥ 70) | **Reaplicar DISC com itens invertidos** | `DISC-V2` | imediato |
| Ciclo ≥ 2 sem Δ | Mudar foco (2º sabotador) | próximo da lista | 90 d |

Cada regra tem `id` e `versao` — a sugestão grava **qual regra disparou** (auditável e reproduzível). A IA (`insightPerfil`) só **redige** a justificativa a partir da regra; nunca decide sozinha.

**Turma** (por grupo): agrega os focos individuais com k-anonimato (≥ 5) → "62 % da turma tem Agradador alto → módulo coletivo `TD-ASSERTIVIDADE`". Entra como card na aba *Comparativo* (DELTA 24) e no Mestre.

### 3.3 Catálogo de Testes Dirigidos (reaproveita `app_modules`)

- `app_modules` ganha `kind` (`disc_full` | `dirigido`), `codigo` (`TD-ASSERTIVIDADE`…), `scoring` (jsonb: dimensões + fórmula) e `versao`. Seeds do sistema (`adminuid NULL`, somente leitura); facilitador pode **clonar** e ajustar.
- Cada teste dirigido: 10–15 itens likert5, 2–3 subescalas, **com itens invertidos** desde o início, fórmula = média ponderada 0–100 (mesmo motor genérico `discScoring.js` parametrizado por `scoring`).
- Aplicação: **mesmos três canais** já existentes — wizard de conta, link por token (`/avaliacao/:token?modulo=`), convite de turma. `atualizarStatus` e o wizard passam a receber `moduloId`; scoring genérico no servidor lê o `scoring` do módulo (fim da duplicação manual de pesos).
- Contrato novo: `verify-modules-contract.mjs` — cada seed tem ids únicos, itens invertidos marcados, extremos 0/100.

### 3.4 Histórico por pessoa (o que hoje não existe)

**Banco**
- `app_profiles`: **parar de sobrescrever**. Nova coluna `ciclo` (int, default 1), `modulo_id`, `origem_profile_id`; chave única passa a `(uid, ciclo)`; `app_profiles_atual` (view) devolve o mais recente por uid — as telas atuais trocam a tabela pela view (mudança pequena em `firestore.js`).
- `app_ciclos` (nova): `id, pessoa_ref (uid|avaliadotoken), pessoa_tipo (conta|avulso), adminuid, groupid, n_ciclo, perfil_base_id, modulo_id, focos jsonb, regra_id, regra_versao, prazo_em, status (sugerido|aceito|aplicado|concluido|descartado), perfil_resultado_id, observacao, criadoem, atualizadoem`.
- Chave de pessoa unificada: `uid` ↔ `avaliadotoken` via `converted_uid` / `app_identity_links` (já existem) → um único `pessoa_ref`.

**Tela** — *Pessoas & Histórico* vira **Linha do Tempo**: avaliação → plano → teste aplicado → reavaliação com **Δ** (D/I/S/C e PQ antes→depois, setas), observações do facilitador (`app_report_meta` migra para dentro do ciclo). *Meu Perfil* do aluno ganha "sua evolução".

**Backfill**: os 13 `app_assessments` submetidos têm `answers` — recalcula perfis históricos com o motor canônico e cria `ciclo 1` para todo mundo (sem apagar nada).

### 3.5 Rastreabilidade e auditoria

Novos eventos no `audit_log` (allowlist de `logAudit` + Edge): `cycle_suggested` (regra + versão), `cycle_accepted`, `cycle_edited` (diff dos focos), `cycle_applied` (módulo + canal), `cycle_completed` (Δ), `cycle_discarded` (motivo), `assessment_completed` (**também no fluxo de conta**).
- Cada evento carrega `regra_id/versao` e `modulo_id/versao` → dá para responder "por que este teste foi sugerido em 20/10?" um ano depois.
- Exportação da linha do tempo em PDF (`centralPdf.js`) já gera `report_exported`.

---

## 4. Mestre v2 — chat que entende o app e os dados

**Diagnóstico**: o roteador é 4 regex → 4 RPCs agregados. Não sabe responder "quem ainda não concluiu?", "o que faço com a turma X?", "como o Fulano evoluiu?". Miss-log invisível para você.

**Evoluções em ordem de valor**

1. **Novas consultas** (mesmo padrão `dados* → narrar*`):
   - `pendencias` — quem não concluiu, convites vencendo, ciclos com prazo estourado (`app_assessments pending` + `app_invites` + `app_ciclos`).
   - `abordagem_turma` — "o que trabalhar com o grupo X?" → motor §3.2 agregado.
   - `abordagem_pessoa` / `evolucao_pessoa` — por nome, **só dentro do escopo RLS do admin** (dados que ele já vê nas telas), gravando `admin_viewed_history`. Nomes ficam no dispositivo; nada sai para IA externa.
   - `ciclos` — "quem está em reavaliação?", "quantos ciclos concluídos este mês?".
2. **Roteador por intenção + entidades** (`intencao`, `grupo`, `pessoa`, `periodo`) em vez de regex plano — com slot-filling ("de qual grupo?"). Continua 100 % local.
3. **Miss-log no servidor**: `app_mestre_misslog (adminuid, pergunta_norm, tipo, n, ultimo)` via Edge `logAudit` (ação `mestre_miss`) — você passa a ver o vocabulário que falta de **todos** os facilitadores; a aba *Diagnóstico* ganha um card.
4. **Ações a partir do chat** (após 1–3): "aceitar sugestão do ciclo para o grupo X" → abre o card pré-preenchido (não executa sozinho — o facilitador confirma na tela).
5. **Modo aprofundado com IA (opcional, Fase 4)**: reativar `assistenteCentral` só sobre **agregados anonimizados** para perguntas abertas — ligado por toggle, com cache/rate limit já prontos.

---

## 5. Decisões que só você pode tomar (bloqueiam a execução)

1. **Itens invertidos no DISC (DISC-V2)** — recomendo **sim, agora**, com `versao` no perfil e comparação só dentro da mesma versão. Sem isso o motor de abordagem trabalha em cima de aquiescência. Quebra comparabilidade com os 14 perfis antigos (marcados `v1`).
2. **Mestre pode citar pessoas pelo nome** (dados do próprio escopo, no dispositivo)? Recomendo **sim** — sem isso "como o Fulano evoluiu?" não existe. Mantém a regra: nada nominal sai para IA externa.
3. **Quem escreve os Testes Dirigidos** — eu redijo os seeds (10–15 itens cada, 7 módulos) e você valida como psicólogo/facilitador, ou você fornece o conteúdo? Recomendo a primeira, com sua revisão item a item.
4. **Prazo padrão de reavaliação** (60/90 dias) e se o app **envia lembrete** (e-mail via Resend já existe) ou só sinaliza no painel.

---

## 6. Roadmap

| Fase | Entrega | Esforço | Depende de |
|---|---|---|---|
| **0 — Higiene** (esta semana) | Redeploys pendentes (§1.3); `assessment_completed` no fluxo de conta; secret do keepalive; contrato de auditoria (`verify-security-contract` exige o log nos dois fluxos). | 1–2 dias | — |
| **1 — Histórico** | `app_profiles` versionado por ciclo + view "atual"; `app_ciclos`; backfill dos 13 assessments; Linha do Tempo em *Pessoas & Histórico*; Δ antes/depois; "sua evolução" no *Meu Perfil*. | 2 semanas | Fase 0 |
| **2 — Motor de abordagem + Testes Dirigidos** | `abordagem.js` (regras versionadas + contrato); seeds dos 7 TDs + `DISC-V2`; scoring genérico por módulo (front + `atualizarStatus`); card *Próxima avaliação* no relatório e no comparativo da turma; aplicação pelos 3 canais; eventos `cycle_*`. | 3–4 semanas | Fase 1 + decisões 1 e 3 |
| **3 — Mestre v2** | Consultas `pendencias`/`abordagem_*`/`evolucao`/`ciclos`; roteador por intenção; miss-log no servidor + card no Diagnóstico. | 2 semanas | Fase 2 (usa `app_ciclos`) + decisão 2 |
| **4 — Lentes e IA** | Social Style derivado do DISC no relatório; lembrete de reavaliação por e-mail; modo aprofundado do Mestre (`assistenteCentral` sobre agregados). | 2 semanas | Fase 3 + decisão 4 |
| **Adiado** | Planos comerciais, onboarding, OCAI, mobile. | — | 2º facilitador pagante |

**Indicadores para saber se funcionou** (medidos na Central, sem nada novo):
- ≥ 1 reavaliação concluída por pessoa ativa em 90 dias (hoje: 0).
- Taxa de conclusão de conta ≥ 75 % (hoje: 50 %).
- ≥ 70 % das sugestões de ciclo aceitas ou editadas (não descartadas).
- Miss-log do Mestre caindo mês a mês.

---

*Gerado a partir do código em `main` (`ff3153c`) e do banco `zlbynxjeefqxcgrsmkjp` em 19/09/2026.*
