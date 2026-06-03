# PRD — Fase 2: Convergência Sessões ↔ Alunos
**ProfileAI · Épico de Identidade Unificada via CPF**
Versão 0.1 (rascunho para revisão) · 2026-06-03

---

## 1. Problema

Hoje existem **dois mundos paralelos e desconectados**:

| | Avaliado de Sessão | Aluno cadastrado |
|---|---|---|
| Tabela | `app_avaliados` | `app_users` (role=student) |
| Acesso | Link público + token (sem login) | Conta (email/senha) |
| Quem cria | Admin pré-cadastra (nome, telefone, email) | A própria pessoa, via convite |
| Identidade | `token` (uuid por avaliação) | `uid` (auth) |

A **mesma pessoa física** pode ser avaliada várias vezes (em sessões diferentes) e também ter conta — mas o sistema os trata como entidades distintas. Não há como:
- Saber que "Maria avaliada na sessão X" é a mesma "Maria com conta de aluno"
- Acompanhar a evolução comportamental de uma pessoa ao longo do tempo
- Auditar/rastrear avaliações de um indivíduo (uso pericial/LGPD)

## 2. Objetivo

Estabelecer o **CPF como chave de identidade única** da pessoa física no ProfileAI, ligando avaliações de sessão e contas de aluno sob a mesma identidade — com o **admin** controlando a vinculação (não automático).

> Esta fase é **pré-requisito** da Fase 3 (Histórico de Evolução), que depende de "identificar a mesma pessoa".

## 3. Decisões já tomadas (Breno, 2026-06-03)

| # | Decisão | Valor |
|---|---------|-------|
| D1 | Chave de identidade | **CPF** |
| D2 | Reivindicação de resultados antigos | **Só o admin vincula** (match vira sugestão no painel; admin confirma) |
| D3 | Onde o CPF é coletado | **Avaliação pública + cadastro de conta** |
| D4 | Obrigatoriedade | **OPCIONAL** (revisado 2026-06-03 — ver §4) |
| D5 | Privacidade | **Mascarado na UI** (`***.***.**X-XX`) + **consentimento LGPD** na coleta |

## 4. Obrigatoriedade: OPCIONAL (decisão revisada)

**Decisão final: CPF é OPCIONAL.** O trunfo do ProfileAI (PRD v2.0) é "responder em 1 clique, sem cadastro" — CPF obrigatório no fluxo público adicionaria fricção no ponto de maior conversão. Então:

- Quem **informar** CPF → habilita matching e histórico de evolução (Fase 3)
- Quem **não informar** → tudo segue funcionando como hoje (sem vínculo)
- Adoção **gradual**: o valor cresce conforme as pessoas preenchem, sem quebrar nada existente

**Coleta (Opção C aplicada de forma opcional):**
- **`AvaliadoForm`** (admin): campo CPF opcional ao cadastrar o avaliado — admin preenche se tiver
- **`AvaliacaoPublica`** (público): se o avaliado não tem CPF registrado, a tela de boas-vindas **oferece** (não exige) informar o CPF antes de iniciar, com explicação do benefício ("para acompanhar sua evolução")
- **`Register`** (conta): campo CPF opcional no cadastro

> Como é opcional, **não há etapa bloqueante** em nenhum fluxo. O consentimento LGPD só aparece/é exigido **quando** a pessoa decide preencher o CPF.

## 5. Modelo de dados (migração SQL — DELTA 7)

### 5.1 Coluna `cpf`
```sql
-- Identidade unificada da pessoa física
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf text NULL;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf text NULL;

-- Índices para o matching por CPF
CREATE INDEX IF NOT EXISTS idx_app_avaliados_cpf ON public.app_avaliados (cpf);
CREATE INDEX IF NOT EXISTS idx_app_users_cpf     ON public.app_users (cpf);
```
> CPF armazenado **apenas com dígitos** (11 chars, sem máscara) para matching consistente. Máscara é aplicada só na exibição.

> ⚠️ NÃO usar `UNIQUE` no CPF inicialmente: a mesma pessoa legitimamente terá várias linhas em `app_avaliados` (uma por avaliação). Unicidade só faria sentido em `app_users`, mas mesmo lá há risco de duplicatas legadas — tratar via UI de vinculação, não via constraint rígida.

### 5.2 Tabela de vínculos auditável (LGPD)
```sql
-- Liga avaliações públicas a uma conta de aluno — quem vinculou e quando (auditoria)
CREATE TABLE IF NOT EXISTS public.app_identity_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf         text NOT NULL,
  avaliado_id uuid NULL REFERENCES public.app_avaliados(id),
  user_uid    text NULL,
  linked_by   text NOT NULL,           -- adminuid que confirmou
  linked_at   timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
);
```

### 5.3 Consentimento LGPD
```sql
-- Registro de consentimento na coleta do CPF (titular dos dados)
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_avaliados ADD COLUMN IF NOT EXISTS cpf_consent_at timestamptz NULL;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_users     ADD COLUMN IF NOT EXISTS cpf_consent_at timestamptz NULL;
```

## 6. Mudanças de código

### 6.1 Utilitário de CPF (novo) — `src/lib/cpf.js`
- `formatCpf(digits)` → `***.***.**X-XX` (mascarado) e `XXX.XXX.XXX-XX` (completo)
- `cleanCpf(value)` → só dígitos
- `isValidCpf(value)` → validação de dígitos verificadores (algoritmo oficial)
- `maskCpf(digits)` → exibição segura na UI

### 6.2 Coleta
- **`AvaliadoForm`** (admin): novo campo CPF (com máscara, validação, consentimento)
- **`AvaliacaoPublica`** (público): na boas-vindas, campo CPF **opcional** + checkbox de consentimento (só exigido se preencher) — não bloqueia "Iniciar avaliação"
- **`Register`** (conta): campo CPF **opcional** + consentimento (se preenchido)

### 6.3 Matching e vinculação (admin)
- `firestore.js`: `findAvaliadosByCpf(cpf)`, `findUserByCpf(cpf)`, `createIdentityLink(...)`
- Painel admin (provavelmente em `Students` ou nova tela "Pessoas"): mostra **sugestões de vínculo** ("CPF X tem 2 avaliações de sessão + 1 conta — vincular?"); admin confirma → grava em `app_identity_links`

### 6.4 Privacidade
- CPF sempre **mascarado** na UI (`maskCpf`)
- Valor completo só no Relatório Oficial (admin, já protegido) e no banco
- Checkbox de consentimento obrigatório antes de salvar CPF

## 7. Fora de escopo (Fase 2)
- Gráfico de evolução temporal → **Fase 3**
- Migração retroativa de avaliados antigos sem CPF (eles seguem sem vínculo até reidentificação)
- Deduplicação automática de contas
- Direito ao esquecimento / exclusão LGPD (fase futura de privacidade)

## 8. Regras invioláveis (mantidas)
- Cálculo DISC/PQ intocado · cores DISC canônicas · dados clínicos admin-only + no-print · lazy loading · build verde · **100% pt-BR**
- CPF é dado sensível: nunca em URL/query string, nunca exposto em resposta pública de Edge Function

## 9. Riscos
| Risco | Mitigação |
|-------|-----------|
| Admin não tem CPF do avaliado | Opcional: avaliado pode preencher na tela pública |
| Fricção de CPF na conversão | RESOLVIDO: CPF é opcional, não bloqueia nenhum fluxo |
| CPF inválido/digitado errado quebra match | Validação de dígitos verificadores na coleta |
| Adoção baixa (pouca gente preenche) | Aceitável: valor cresce gradual; sem CPF = comportamento atual |
| Mesma pessoa, dois CPFs digitados diferente | Vínculo é manual (admin confirma) — erro humano controlável |
| LGPD — dado sensível exposto | Máscara na UI + consentimento + sem UNIQUE público |

## 10. Critérios de aceite
1. CPF **opcional** coletado e validado (dígitos verificadores) em avaliação pública, AvaliadoForm e Register — nenhum fluxo bloqueado se vazio
2. CPF exibido mascarado em toda a UI; completo só no Relatório Oficial
3. Consentimento LGPD registrado (`cpf_consent` + timestamp) **quando** o CPF é preenchido
4. Admin vê sugestões de vínculo por CPF e confirma manualmente
5. Vínculo gravado em `app_identity_links` com auditoria (quem/quando)
6. Migração DELTA-7 idempotente; build verde; pt-BR
7. Nenhuma regra inviolável quebrada

---

## 11. Plano de implementação (após aprovação deste PRD)
- **F2.0** — Migração DELTA-7 (SQL) + `src/lib/cpf.js` + validação
- **F2.1** — Coleta: AvaliadoForm + Register (campos CPF + consentimento)
- **F2.2** — Coleta pública: etapa de identificação em AvaliacaoPublica (Opção C)
- **F2.3** — Matching + painel de vínculos do admin + `app_identity_links`
- **F2.4** — Privacidade: máscara em toda UI, CPF completo só no Relatório Oficial
- **F2.5** — Validação end-to-end + deploy (sob demanda)

_Cada subfase: build local, commit, sem deploy até autorização._
