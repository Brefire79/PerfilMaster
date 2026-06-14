# PRD — Central de Pessoas
**Perfil Master · Identidade Unificada da Pessoa Física (CPF + Nome)** · Versão 0.1 (rascunho para revisão) · 2026-06-11

> Sequência das Fases 2 (convergência por CPF — vínculo manual) e 3 (evolução).
> Esta é a **terceira entrega do épico de identidade**. Reusa toda a base já implementada
> (`app_identity_links`, `cpf.js`, `getSugestoesVinculo`, `createIdentityLink`, `getHistoricoEvolucao`).

---

## 1. Problema

A mesma pessoa física aparece hoje em **três lugares desconectados**, cada um com sua própria UI e seu próprio "diagnóstico":

| Contexto | Tabela | Como entra | Identidade |
|---|---|---|---|
| **Sessão** (esporádico, sem conta) | `app_avaliados` | Admin pré-cadastra, link por token | `token` (1 por avaliação) |
| **Grupo / Aluno** (com conta) | `app_users` (role=student) | Convite → cadastro | `uid` (auth) |
| **Avulso** (conta sem grupo) | `app_users` (adminuid) | Convite avulso | `uid` |

A Fase 2 criou a chave de identidade (CPF) e um **painel de sugestões** (`IdentityLinkPanel`) onde o admin confirma manualmente "essas duas linhas são a mesma pessoa". Mas:

- **Não há um lugar único** para ver "todas as pessoas" do facilitador — o admin pula entre Sessões, Grupos e Alunos para achar alguém.
- A unificação é **100% manual**: mesmo quando o CPF é **idêntico** (zero ambiguidade), o admin precisa clicar para confirmar. Atrito desnecessário.
- O **mesmo diagnóstico não está sincronizado**: a Bianca avaliada na Sessão X e a Bianca com conta de aluno mostram perfis separados; não há "o perfil consolidado da Bianca".
- Risco de **duplicatas**: a mesma pessoa cadastrada como avaliado e como aluno fica contada duas vezes nas listagens.

**Pedido do Breno (aprovado):** _"confrontar os nomes e CPF; se igual, juntar em um único local — seja nos grupos, nos alunos ou na sessão, fica sincronizado o mesmo diagnóstico."_

## 2. Objetivo

Criar a **Central de Pessoas**: uma tela única do admin que consolida **toda pessoa física** (independente de estar em sessão, grupo ou conta) sob uma **identidade unificada**, com:

1. **Auto-unificação por CPF idêntico** (sem clique) — híbrido.
2. **Sugestão quando ambíguo** (mesmo nome, CPF ausente ou divergente) — admin confirma.
3. **Diagnóstico sincronizado**: um perfil DISC consolidado por pessoa, visível em qualquer contexto onde ela apareça.
4. **Zero duplicatas** nas contagens e listagens.

> Não substitui Sessões/Grupos/Alunos — é a **camada de pessoas** acima deles. As telas atuais continuam; a Central é a visão "por indivíduo".

## 3. Decisões já tomadas (Breno)

| # | Decisão | Valor |
|---|---------|-------|
| D1 | Estratégia de unificação | **Híbrida** — auto-unifica em CPF idêntico; sugere quando ambíguo |
| D2 | Chave forte | **CPF** (11 dígitos, sem máscara, igualdade exata) |
| D3 | Chave fraca (descoberta) | **Nome normalizado** — gera *sugestão*, nunca auto-unifica sozinho |
| D4 | Onde mora | Nova tela **`/admin/pessoas`** (Central de Pessoas) |
| D5 | Diagnóstico consolidado | A avaliação **concluída mais recente** é o perfil "oficial" da pessoa (demais entram no histórico — Fase 3) |
| D6 | Isolamento | Cada admin vê **só as suas** pessoas (por `adminuid`/grupo) — regra inviolável de RLS |
| D7 | Privacidade | CPF sempre **mascarado** na UI; nunca em URL; consentimento LGPD já tratado na Fase 2 |

## 4. Regras de unificação (o coração do híbrido)

Para cada par de registros (avaliado×avaliado, avaliado×conta, conta×conta) **do mesmo admin**:

| Caso | CPF | Nome | Ação |
|---|---|---|---|
| **A — Match forte** | ambos têm CPF e são **iguais** | qualquer | **Auto-unifica** (cria/garante `app_identity_links` automaticamente, sem clique) |
| **B — Conflito** | ambos têm CPF e são **diferentes** | iguais | **Não unifica** + **não sugere** (CPF é a verdade; nomes iguais com CPF diferente = pessoas diferentes / homônimos) |
| **C — Sugestão por nome** | um ou ambos **sem** CPF | **nome normalizado igual** | **Sugere** (admin confirma; não auto-unifica) |
| **D — Sem relação** | — | nomes diferentes, sem CPF comum | Pessoas separadas |

**Normalização de nome** (`normalizeName`): minúsculas, sem acento, espaços colapsados, sem pontuação. Usada **só** para gerar sugestão (caso C) — nunca para auto-unificar (nome não é identidade).

> A auto-unificação (caso A) apenas **materializa o que o CPF já garante**. É segura e auditável: grava em `app_identity_links` com `linked_by` = adminuid e `metadata.auto = true`, distinguindo do vínculo manual. Reversível pelo admin.

## 5. Modelo da "Pessoa" (entidade derivada, em memória)

Não há tabela nova de "pessoa". A Pessoa é **computada** cruzando o que já existe (mesma abordagem de `getSugestoesVinculo`, agora elevada a entidade de 1ª classe):

```
Pessoa {
  id            // CPF (se houver) OU chave sintética (uid/avaliadoId âncora)
  nome          // melhor nome disponível (conta > avaliado mais recente)
  cpf           // mascarado na UI; dígitos só no backend/match
  contextos: {
    conta:     { uid, email, grupoId? } | null
    avaliacoes: [{ avaliadoId, sessaoTitulo, criadoEm, concluidoEm, perfil }]
  }
  diagnostico   // perfil consolidado = avaliação concluída mais recente (D5)
  origem        // ['sessão','grupo','aluno'] — onde ela aparece
  vinculo       // 'auto' | 'manual' | 'sugerido' | 'isolado'
}
```

- **Match forte (A)** e vínculos manuais já confirmados → uma única Pessoa.
- **Sugestões (C)** → aparecem como pessoas *separadas* com um badge "possível duplicata" + ação "unificar".
- O **diagnóstico** segue a regra D5 (concluída mais recente); o histórico completo é o da Fase 3 (`getHistoricoEvolucao`).

## 6. Modelo de dados (migração — DELTA 9, mínima)

A base da Fase 2 já cobre quase tudo. Esta fase adiciona **só** o flag de auto-vínculo, para auditoria:

```sql
-- DELTA 9 — Central de Pessoas (idempotente)
-- Distingue vínculo automático (CPF idêntico) de confirmação manual do admin.
-- (Opcional: também dá para guardar isso em metadata.auto = true sem coluna nova.)
ALTER TABLE public.app_identity_links
  ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;
```

> **Nenhuma policy nova.** `app_identity_links` já tem RLS por `linked_by` (DELTA 8). A auto-unificação roda com a sessão do próprio admin (não service_role): ele só pode criar vínculos `linked_by = auth.uid()`. **Não** introduzir `is_admin()` global nem `USING(true)`.

> **Sem `UNIQUE` no CPF** (mantém decisão da Fase 2: a mesma pessoa tem N linhas em `app_avaliados`). Deduplicação é na camada de Pessoa, não por constraint.

## 7. Mudanças de código

### 7.1 `src/lib/cpf.js`
- Já tem `cleanCpf`, `isValidCpf`, `maskCpf`. **Adicionar** `normalizeName(s)` (acentos/caixa/espaços) — ou criar `src/lib/people.js` com isso.

### 7.2 `firestore.js` — montagem da Central
- **Novo** `getPessoas(adminUid)`: evolui `getSugestoesVinculo`. Cruza `getAvaliadosByAdmin` + `getStudentsByAdmin` + `getIdentityLinksByAdmin` e aplica as regras §4, retornando a lista de `Pessoa` (§5) já com diagnóstico consolidado (D5).
- **Novo** `autoVincularPorCpf(adminUid)`: detecta caso A ainda sem link e cria os `createIdentityLink({ ..., metadata:{auto:true}, auto:true })` faltantes. Idempotente (não duplica link já existente). Chamado ao abrir a Central.
- `createIdentityLink`: aceitar `auto` (default false) e propagar para a coluna/metadata.

### 7.3 Nova página `src/pages/admin/Pessoas.jsx` (rota `/admin/pessoas`, lazy)
- Lista de pessoas (busca por nome/CPF mascarado), com:
  - **Badges de origem**: Sessão · Grupo · Aluno (uma pessoa pode ter vários).
  - **Diagnóstico consolidado**: chip do perfil primário (cores DISC canônicas) + PQ Score.
  - **Seção "Possíveis duplicatas"** (caso C): pares por nome para o admin unificar — reusa a lógica do `IdentityLinkPanel`.
  - **Detalhe da pessoa** (slideover/rota): contextos onde aparece + atalho para o Relatório/Evolução (Fase 3) + ação "desvincular" (reverter).
- Entrada no menu do admin (sidebar) e, opcionalmente, contador no dashboard.

### 7.3.1 Atualização (13/06/2026) — diagnóstico de contas de aluno
- `getPessoas` passou a buscar os perfis das contas em uma query (`getProfilesByUids`) e expor:
  - `conta.diagnostico` (perfil DISC + scores + PQ vindos de `app_profiles`) e `conta.assessmentStatus`;
  - `concluiu` (booleano de conclusão real): cobre **avaliados de sessão** (`status='concluido'`) **e contas de aluno** (perfil gerado ou `assessmentStatus='completed'`).
- **Motivo:** alunos de grupo/avulsos concluem pelo `AssessmentWizard` (grava em `app_profiles`), que a Central ignorava (só lia `app_avaliados`). Antes apareciam como "Sem avaliação concluída" mesmo tendo concluído.
- **UI (`Pessoas.jsx`):** lista mostra o badge do perfil para contas concluídas (ou "Concluída · perfil processando" se o perfil ainda não foi gravado). No detalhe, a seção foi renomeada para **"Avaliações de sessão (n)"** e, quando n=0 mas a conta concluiu, exibe "concluiu pela conta de aluno (veja acima)" em vez de "Nenhuma avaliação".

### 7.4 Sincronização do diagnóstico (D5)
- Onde hoje se mostra o perfil de um aluno/avaliado isolado, passar a resolver via Pessoa quando ela for unificada (ex.: card do aluno mostra também "avaliações de sessão vinculadas"). **Incremental** — não reescrever as telas; só ligar o "ver pessoa completa".

### 7.5 i18n
- Strings novas em `pt-BR.json` (`pessoas.*`). 100% pt-BR.

## 8. Fora de escopo
- **Merge destrutivo** de linhas (fundir `app_avaliados`/`app_users` numa só) — nunca; unificação é por vínculo, não por apagar dados.
- Auto-unificação por **nome** (só CPF auto-unifica; nome é sempre sugestão).
- Deduplicação de **contas** duplicadas (dois `uid` para a mesma pessoa) — fica como sugestão manual.
- Direito ao esquecimento / exclusão LGPD em massa (fase futura de privacidade).
- Central de Pessoas para o **aluno** (é tela de **admin** apenas).
- IA sobre a pessoa consolidada (Painel Estratégico já existe por perfil; não muda aqui).

## 9. Regras invioláveis (mantidas)
- Cálculo DISC/PQ intocado · cores DISC canônicas (D `#EF4444` · I `#F59E0B` · S `#22C55E` · C `#6366F1`).
- **RLS por admin**: cada facilitador vê só as suas pessoas. **Nunca** `is_admin()` global nem `USING(true)`/`TO public` em `app_*`.
- CPF: dado sensível — mascarado na UI, **nunca** em URL/query, nunca em resposta pública de Edge Function.
- Fluxos públicos seguem via Edge Functions com service_role; a Central é tela autenticada de admin (usa a sessão do admin, sem service_role).
- Build verde (`npm run build`) · lazy loading · 100% pt-BR · IA só DeepSeek (não afeta esta fase).

## 10. Riscos
| Risco | Mitigação |
|-------|-----------|
| Homônimos com CPFs diferentes unificados por engano | Caso B: CPF diferente **nunca** unifica nem sugere |
| Auto-unificação indesejada | Reversível (desvincular) + `auto=true` audita a origem; só caso CPF idêntico |
| CPF digitado errado não casa | Validação de dígitos na coleta (Fase 2) reduz; resta como sugestão por nome |
| Performance (muitos avaliados) | Cruzamento em memória já usado em `getSugestoesVinculo`; paginar a lista se crescer |
| Sugestão por nome poluída (muitos "João Silva") | Sugestão só quando CPF ausente; admin decide; nunca automático |
| Vazar CPF entre admins | RLS por `linked_by`/`adminuid`; CPF mascarado; sem service_role na tela |

## 11. Critérios de aceite
1. `/admin/pessoas` lista cada pessoa **uma única vez**, mesmo aparecendo em sessão + grupo + conta.
2. CPF idêntico entre registros do mesmo admin → **auto-unificado** (sem clique), com `app_identity_links.auto = true`.
3. Mesmo nome sem CPF (ou CPF divergente sem igualdade) → aparece como **sugestão**, não auto-unifica.
4. CPF **diferente** → nunca unifica nem sugere (homônimos preservados separados).
5. Diagnóstico consolidado (perfil primário + PQ Score) exibido por pessoa = avaliação concluída mais recente.
6. CPF mascarado em toda a Central; isolamento por admin verificado (admin A não vê pessoas de B).
7. Vínculo reversível (desvincular volta ao estado separado).
8. DELTA 9 idempotente; build verde; pt-BR; nenhuma regra inviolável quebrada.

## 12. Plano de implementação (após aprovação)
- **CP.0** — `normalizeName` (em `cpf.js`/`people.js`) + DELTA 9 (coluna `auto`).
- **CP.1** — `getPessoas(adminUid)` + `autoVincularPorCpf(adminUid)` no `firestore.js` (regras §4) + teste de agrupamento.
- **CP.2** — Página `Pessoas.jsx` + rota lazy + item no menu (lista, busca, badges, diagnóstico consolidado).
- **CP.3** — Seção "Possíveis duplicatas" (sugestão por nome) reusando `IdentityLinkPanel` + ação desvincular.
- **CP.4** — Detalhe da pessoa (contextos + atalho Relatório/Evolução) + ligações incrementais nas telas de aluno/sessão.
- **CP.5** — Validação E2E (mesma pessoa em sessão + conta com CPF igual → 1 pessoa; nomes iguais CPF diferente → 2 pessoas) + deploy sob demanda.

_Cada subfase: build local, commit ao final (preview verde, telas verificadas), sem deploy até autorização._

---

*Perfil Master · Vianexx AI · Breno Luis · Central de Pessoas v0.1 · 2026-06-11*
*Reusa `app_identity_links`, `cpf.js`, `getSugestoesVinculo`, `createIdentityLink`, `getHistoricoEvolucao` (Fases 2 e 3).*
