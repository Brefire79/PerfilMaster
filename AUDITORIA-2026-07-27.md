# Auditoria Perfil Master — 27/07/2026

> Varredura completa: código (`profileai/src`), Edge Functions, migrations, build/deploy, PWA e fluxos de uso.
> Gatilho: o app caiu hoje com "Carregando..." infinito porque o projeto Supabase estava pausado.
> Autor da varredura: Claude · Solicitante: Breno (Vianexx AI)

---

## Resumo em uma tela

O app está **mais maduro do que o `CLAUDE.md` descreve**. Já existe suíte de contratos (`npm test`), RLS por facilitador bem fechada, CSP e headers de segurança, `deleteAccount` implementada, migration de hardening. A arquitetura está sólida.

O que quebra hoje não é arquitetura — é **resiliência e operação**:

| # | Achado | Severidade |
|---|---|---|
| C1 | Nenhum `fetch` tem timeout → backend lento/pausado = "Carregando..." eterno | **Crítico** |
| C2 | `/api/generate-profile-analysis` é um proxy de IA **aberto, sem auth, CORS `*`** — e ninguém o chama | **Crítico** |
| C3 | `atualizarStatus` grava e responde `success:true` **sem checar erro do UPDATE** | **Crítico** |
| A1 | Avaliação pode ser concluída **incompleta** (1 resposta basta) e vira perfil oficial | Alto |
| A2 | Falha ao ler `app_users` rebaixa **admin → student** silenciosamente | Alto |
| A3 | `respostas` do fluxo público aceitas sem validar chaves, faixa ou tamanho | Alto |
| A4 | Edge públicas sem rate limit; `catch` devolve `err.message` cru | Alto |
| M1 | `public/sw.js` legado conflita com o Service Worker do `vite-plugin-pwa` | Médio |
| M2 | Erros do cliente e miss-log do Mestre morrem no navegador (zero telemetria) | Médio |
| M3 | `npm run deploy` não roda `npm test`; não há CI | Médio |
| M4 | `changePassword` não pede a senha atual | Médio |
| M5 | Sabotadores: front casa por `dimension`, Edge por regex do `id` — fora do contrato | Médio |
| B1..B6 | Código morto, i18n pela metade, paginação, docs desatualizados | Baixo |

---

## 1. Críticos

### C1 — Nenhuma requisição tem timeout (causa-raiz do incidente de hoje)

**Onde:** `src/firebase/firestore.js:184` (`sbRequest`), `src/firebase/functions.js:15` (`callFunction`), `src/firebase/auth.js:89` (`authRequest`), `src/lib/apiKeyManager.js:20`.

Busca por `AbortController` / `navigator.onLine` em `src/`: **zero ocorrências**.

**Cadeia de falha comprovada hoje:**

1. Sessão existe no `localStorage` → `useAuth` chama `getUser(uid)` (`src/hooks/useAuth.js:30`).
2. `sbRequest` faz `fetch` sem timeout. Supabase pausado → a promise nunca resolve.
3. `setUser` nunca roda → `initialized` fica `false`.
4. `RootRedirect` / `ProtectedRoute` renderizam `<PageLoader/>` para sempre (`src/routes/index.jsx:76`).

Resultado: **"Carregando..." infinito, sem erro, sem retry, sem explicação.** O mesmo vale para o avaliado em `buscarPorToken` — ele fica preso em "Verificando seu link..." e some (perda de conversão direta).

**Correção:**

```js
// src/firebase/http.js (novo) — usado por firestore.js, functions.js e auth.js
export async function fetchComTimeout(url, options = {}, ms = 12000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('BACKEND_TIMEOUT');
      e.code = 'backend/timeout';
      throw e;
    }
    if (!navigator.onLine) {
      const e = new Error('OFFLINE');
      e.code = 'backend/offline';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}
```

Junto com isso:

- `authStore` ganha `initError`; `useAuth` seta em vez de deixar pendurado.
- Tela `BackendIndisponivel` (em vez do spinner) com "Tentar novamente" e texto honesto: *"não conseguimos falar com o servidor"*.
- Retry com backoff (2 tentativas) só em `GET`.

**Ganho:** o mesmo incidente vira uma tela de erro clara em 12s, em vez de um app aparentemente quebrado.

---

### C2 — Proxy de IA aberto ao público (e órfão)

**Onde:** `netlify/functions/generate-profile-analysis.mjs`

```js
'Access-Control-Allow-Origin': '*',   // linha 73 — qualquer origem
// nenhuma verificação de JWT, origem ou rate limit em todo o handler
```

Qualquer pessoa pode fazer `POST https://perfilmaster.netlify.app/api/generate-profile-analysis` e **queimar a cota DeepSeek na conta do Breno**. Pior: `localAnalysis.summary` entra direto no prompt (linha 60) sem sanitização — o atacante controla parte do prompt e pode extrair texto arbitrário do modelo (LLM grátis às suas custas).

**E o mais importante:** `generateAnalysis()` — a única consumidora dessa função — **não é chamada por nenhum arquivo do `src/`**. Verificado por grep: só aparece na própria definição em `apiKeyManager.js:51`. A IA dos relatórios roda pela Edge `insightPerfil`.

Ou seja: **superfície de ataque e risco de custo, com zero benefício.**

**Correção (escolher uma):**

- **Recomendada — remover:** apagar `netlify/functions/generate-profile-analysis.mjs`, `src/lib/apiKeyManager.js` e o redirect `/api/*` do `netlify.toml`. Menos código, menos risco, menos custo.
- **Se quiser manter:** exigir JWT Supabase válido no header, trocar CORS `*` pelo domínio próprio, limitar body a ~8 KB e adicionar rate limit por IP.

---

### C3 — Gravação sem verificação de erro no fluxo público

**Onde:** `supabase/functions/atualizarStatus/index.ts:154-180`

```ts
await supabase.from('app_sessao_respostas').insert({ ... });   // erro ignorado
await supabase.from('app_avaliados').update(payload).eq('token', token);  // erro ignorado
return jsonResponse({ success: true, ...(perfil ? { perfil } : {}) }, 200, req);
```

Se o `update` ou o `insert` falharem (RLS, coluna, constraint, disco), a função **responde `success: true` com o perfil calculado**. O avaliado vê o resultado bonito na tela, é redirecionado para `/resultado/:token`… e no banco não há nada. O facilitador nunca recebe o resultado e ninguém fica sabendo do erro.

Isso também torna o passo não-atômico: as respostas podem entrar e o perfil não.

**Correção:**

```ts
const { error: respErr } = await supabase.from('app_sessao_respostas').insert({ ... });
if (respErr) return jsonResponse({ error: 'Falha ao salvar respostas.' }, 500, req);

const { error: updErr } = await supabase.from('app_avaliados').update(payload).eq('token', token);
if (updErr) return jsonResponse({ error: 'Falha ao concluir avaliação.' }, 500, req);
```

Melhor ainda: mover os dois passos para uma RPC transacional (`concluir_avaliacao(token, respostas, perfil)`) e chamar uma vez só.

---

## 2. Altos

### A1 — Avaliação incompleta vira perfil oficial

`atualizarStatus/index.ts:143` só verifica que `respostas` não está vazio:

```ts
if (!respostas || typeof respostas !== 'object' || Object.keys(respostas).length === 0)
```

Uma requisição com **uma única resposta** conclui a avaliação, gera perfil DISC, calcula PQ Score, dispara `assessment_completed` na auditoria e alimenta a Inteligência de Grupos. No front, `AvaliacaoPublica` também não valida completude antes de ir para `ANALISANDO` — se o rascunho retomado do `localStorage` tiver buracos, o envio sai furado.

**Correção:** exigir cobertura mínima no Edge (ex.: ≥ 26 das 28 DISC e ≥ 45 das 50 Sabotadores) e devolver 422 com a lista de ids faltantes. No front, checar antes de submeter e levar o usuário à primeira pendência.

### A2 — Falha de rede rebaixa admin para student

`src/hooks/useAuth.js:37-40`:

```js
} catch (err) {
  console.error('[useAuth] Failed to fetch user document:', err);
  setUser(firebaseUser, 'student');   // ← assume student
}
```

Um blip de rede na leitura de `app_users` faz o facilitador entrar como aluno e ser jogado em `/student/dashboard`. Não é escalada de privilégio (o RLS continua correto), mas parece um bug grave para quem está usando — e agora que existe `initError`, dá para tratar direito.

**Correção:** no catch, não chutar papel — setar `initError` e mostrar a tela de erro com retry.

### A3 — `respostas` aceitas sem validação

Ainda em `atualizarStatus`: `payload.respostas = respostas` grava o objeto **cru** vindo do cliente.

- Chaves não são validadas contra os 78 ids conhecidos → lixo entra no banco.
- Valores não são clampados. `calcularPerfil` clampa em 0..1, mas **`calcularSabotadores` não** (linha 84: `Math.round((media / 5) * 100)`) — mandar `valor: 500` produz `saboteurScores` acima de 100, que contamina `central_group_insights`.
- Não há limite de tamanho do body → gravação de JSON gigante numa função pública sem rate limit.

**Correção:** filtrar por allowlist de ids, forçar `Number` inteiro em 1..5, rejeitar body acima de ~64 KB.

### A4 — Edge públicas sem rate limit e com vazamento de erro

`buscarPorToken` e `atualizarStatus` são as duas funções mais expostas (token UUID é a credencial) e **não têm rate limit** — grep confirma que só as funções autenticadas o implementam.

Além disso, ambas terminam com:

```ts
catch (err) { return jsonResponse({ error: (err as Error).message || '...' }, 500, req); }
```

Isso devolve mensagem crua do Postgres/Deno para um chamador anônimo (nomes de tabela, coluna, constraint).

**Correção:** rate limit simples por IP em `_shared` (mesma base do `app_central_ai`), e no catch: logar o detalhe no servidor, devolver mensagem genérica ao cliente.

---

## 3. Médios

### M1 — Dois Service Workers disputando

`public/sw.js` é um SW legado (ainda fala de `firebaseapp.com`, linhas 47-51) que o Vite copia para `dist/`. O `vite-plugin-pwa` com `registerType: 'autoUpdate'` **também gera `sw.js`**. Dois arquivos, o mesmo nome de saída, estratégias de cache diferentes — receita para "o app não atualiza" e cache incoerente em produção.

**Correção:** apagar `public/sw.js`. O Workbox já cobre tudo (`vite.config.js:41-85`). Bônus: apagar `public/netlify.toml`, que é redundante e vai para `dist/` sem efeito.

### M2 — Telemetria que não sai do navegador

`src/lib/clientErrors.js` grava em `sessionStorage` (some ao fechar a aba). O miss-log do Mestre vive em `localStorage` do usuário. Ou seja: **quando um avaliado ou facilitador tem erro, o Breno nunca fica sabendo.** Toda a operação depende de alguém reclamar no WhatsApp.

**Correção:** Edge Function `logClientError` (best-effort, sem PII — o `safeText` já redige e-mail, CPF e token) gravando em `audit_log` ou tabela própria, e um painel simples na Central. Sem isso, não há como saber se C1/C3 estão acontecendo em produção.

### M3 — Deploy sem gate de qualidade

`package.json:15`:

```json
"deploy": "node bump-version.mjs && npm run build && netlify deploy --prod --dir=dist"
```

Os contratos (`verify-scoring-contract.mjs`, `verify-security-contract.mjs`) existem e são bons — mas `npm run deploy` **não os executa**, e não há `.github/workflows` no repo. O contrato só roda se alguém lembrar de digitar `npm test`.

**Correção:** `"deploy": "npm run check && node bump-version.mjs && netlify deploy --prod --dir=dist"` (o `check` já encadeia test + build). Depois, GitHub Action rodando `npm run check` em todo push.

### M4 — Troca de senha sem confirmar a senha atual

`src/firebase/auth.js:248`:

```js
export async function changePassword(_currentPassword, newPassword) {
```

O parâmetro é recebido e **ignorado**. Quem sentar numa sessão aberta troca a senha sem saber a antiga. E a função `verifyPassword` (linha 138) já existe justamente para isso — só não foi ligada.

**Correção:** `await verifyPassword(currentPassword)` antes do `PUT`.

### M5 — Sabotadores fora do contrato de scoring

O front deriva a chave do sabotador pelo campo `dimension` (`saboteurScoring.js:49`); o Edge deriva por **regex no id** (`atualizarStatus/index.ts:68`: `/^q_sab_([a-z]+)_\d+$/`). Hoje os dez slugs batem — verificado. Mas se um id mudar de padrão, **o Edge ignora a questão em silêncio e o front não**, e as duas fontes divergem sem erro.

E `verify-scoring-contract.mjs` só valida os ids/pesos **DISC** no Edge (linhas 24-32) — os sabotadores do lado servidor não são cobertos.

**Correção:** estender o contrato para verificar que todo `q_sab_*` de `sampleQuestions.js` casa com o regex e com o mapa `SAB_SLUG_TO_KEY` do Edge, e que front e Edge produzem o mesmo `pqScore` para um vetor de teste.

---

## 4. Baixos

| ID | Achado | Ação |
|---|---|---|
| B1 | `functions/ai/*.js` (Firebase Functions legado), `_shared/claude.ts` e `_shared/cors.ts` (substituídos por `anthropic.ts`/`response.ts`), `Sessoes.jsx`/`Pessoas.jsx`/`AssistenteIA.jsx` sem rota, Edge `assistenteCentral` sem chamador | Arquivar em `_legacy/` ou remover, com nota no CLAUDE.md |
| B2 | `bump-version.mjs` duplicado: raiz (usado) e `scripts/` (órfão) | Manter um |
| B3 | i18n pela metade: 3 locales e 25 arquivos com `useTranslation`, mas os fluxos novos (avaliação pública, resultado, Central, relatório) são PT-BR hardcoded | Decidir: assumir PT-BR-only e remover i18next (menos bundle), ou completar |
| B4 | `getPessoas` / `getStudentsByAdmin` carregam tudo sem paginação | Paginar acima de ~500 registros |
| B5 | `CLAUDE.md` diz "não há testes automatizados" — desatualizado desde a criação dos contratos; e não menciona `deleteAccount` (já implementada) nem a migration `harden_security_definer` | Atualizar |
| B6 | Likert sem atalho de teclado (1-5) na avaliação pública | Melhoria de UX, ~10 linhas |

---

## 5. Forma de desenvolvimento proposta — "Ciclo DELTA"

O projeto já evolui em DELTAs numerados (8 a 19), e isso funciona bem: cada um tem migration versionada, deploy de Edge e nota no CLAUDE.md. O problema é que **o ciclo é informal** — depende da memória de quem executa. A proposta é transformar o que já é hábito em processo com portões automáticos.

### O ciclo, em cinco portões

```
┌── 1. DEFINIR ──────────────────────────────────────────────┐
│  Um DELTA = uma migration + N Edge + N telas.              │
│  Arquivo: deltas/DELTA-NN.md — problema, escopo,           │
│  o que NÃO entra, como verificar que funcionou.            │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌── 2. CONTRATO ANTES DO CÓDIGO ─────────────────────────────┐
│  Toda regra duplicada (front ↔ Edge) ganha assertion em    │
│  scripts/verify-*.mjs ANTES da implementação.              │
│  Regra: nada duplicado sem contrato que prove a igualdade. │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌── 3. IMPLEMENTAR ──────────────────────────────────────────┐
│  Migration em supabase/migrations/ (nunca só no SQL Editor)│
│  Edge Functions + telas. Commit por camada.                │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌── 4. PORTÃO AUTOMÁTICO ────────────────────────────────────┐
│  npm run check  (test + build) — bloqueia o deploy.        │
│  GitHub Action roda o mesmo em todo push.                  │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌── 5. VERIFICAR EM PRODUÇÃO ────────────────────────────────┐
│  Smoke test do caminho crítico + telemetria (M2) por 48h.  │
│  Fecha o DELTA no CLAUDE.md com data e o que mudou.        │
└────────────────────────────────────────────────────────────┘
```

### Três regras que sustentam o ciclo

**1. Nada duplicado sem contrato.**
O projeto tem lógica espelhada de propósito (DISC e Sabotadores em JS e em TS/Deno — é uma escolha certa, o cálculo público precisa ser server-side). O erro não é duplicar; é duplicar sem prova. O `verify-scoring-contract.mjs` já provou seu valor: foi ele que fixou a divergência de pesos DISC. Toda nova duplicação entra com assertion no mesmo dia.

**2. Migration versionada é a única fonte da verdade.**
Os `RODAR-NO-SUPABASE*.sql` são gitignored, o que significa que parte do estado do banco só existe na cabeça de quem rodou. Todo DELTA novo nasce em `supabase/migrations/` — o script solto vira cópia descartável, não o original.

**3. O caminho do avaliado é sagrado.**
`/avaliacao/:token` é onde o produto ganha ou perde. Qualquer mudança que toque nele exige um smoke test manual antes do `--prod`: abrir o link num anônimo, responder 3 questões, dar refresh (testa a retomada), concluir, conferir o registro no banco. São 4 minutos e cobrem C1, C3 e A1 de uma vez.

### Smoke test do caminho crítico (rodar antes de todo deploy de produção)

1. Anônimo abre `/avaliacao/:token` → tela de boas-vindas carrega em < 3s.
2. Responder 3 questões → **F5** → volta na 4ª (retomada do `localStorage`).
3. Concluir → redireciona para `/resultado/:token` com perfil.
4. `app_avaliados.status = 'concluido'` **e** `perfil` preenchido no banco.
5. Facilitador abre `/admin/relatorio/:token` → relatório monta com DISC + PQ.

Automatizar isso depois com Playwright fecha o ciclo — mas mesmo manual já é o maior ganho por minuto investido.

---

## 6. Ordem sugerida de execução

**Sprint 1 — parar de sangrar — ✅ APLICADO em 27/07/2026**

1. ✅ C2: `[functions]` e redirect `/api/*` removidos do `netlify.toml`.
2. ✅ C1: `src/firebase/http.js` (`fetchComTimeout`/`fetchComRetry`), `authStore.initError`, `<BackendIndisponivel/>` nas três rotas-guarda, tela `SEM_CONEXAO` no fluxo público. Brindes: `useAuth` parou de rebaixar admin→student (A2) e `refreshSession` parou de deslogar em queda de rede.
3. ✅ C3: erro do INSERT e do UPDATE verificados em `atualizarStatus`.
4. ✅ M1: `public/sw.js` e `public/netlify.toml` removidos.
5. ✅ M3: `deploy` e `deploy:preview` rodam `npm test` antes.

**Pendente de execução do Sprint 1** (não dá para fazer só editando arquivo):

```bash
# 1. Apagar os órfãos
del profileai\netlify\functions\generate-profile-analysis.mjs
del profileai\src\lib\apiKeyManager.js
del profileai\public\sw.js
del profileai\public\netlify.toml

# 2. Validar
cd profileai && npm run check

# 3. Publicar
supabase functions deploy atualizarStatus --project-ref zlbynxjeefqxcgrsmkjp
npm run deploy
```

**Sprint 2 — integridade do dado — ✅ APLICADO em 27/07/2026**

6. ✅ A3: allowlist de ids, valores forçados a inteiro 1-5, teto de payload e clamp em `calcularSabotadores`.
7. ✅ A1: cobertura mínima (≥26/28 DISC, ≥45/50 Sab) → **422** com ids faltantes; front leva à primeira pendência em vez de enviar furado. Avaliado DISC-only antigo segue válido.
8. ✅ A2: resolvido junto com o C1 no Sprint 1 (`useAuth` não chuta mais `student`).
9. ✅ M5: contrato prova que Edge (regex do id) e front (`dimension`) mapeiam para a mesma chave, que a allowlist cobre os 50 ids e que o `pqScore` bate nos dois lados.
10. ✅ M4: `changePassword` reautentica com `verifyPassword`; recuperação usa `definirSenhaAposRecuperacao`.

**Pendente de execução do Sprint 2:**

```bash
cd profileai && npm run check
supabase functions deploy atualizarStatus --project-ref zlbynxjeefqxcgrsmkjp
npm run deploy
```

Depois do deploy, confirmar no ar: responder 3 questões e forçar o envio (DevTools) deve devolver **422**, não um perfil.

**Sprint 3 — enxergar a operação (3 a 5 dias) — próximo**

11. M2: `logClientError` + painel na Central.
12. A4: rate limit nas Edge públicas + mensagens de erro genéricas no `catch`.
13. Anti-pausa do Supabase: ping semanal ou upgrade para Pro *(a causa do incidente que abriu esta auditoria)*.
14. GitHub Action com `npm run check` — os contratos só rodam localmente hoje.

**Contínuo**

15. B1..B6: limpeza de código morto, decisão sobre i18n, paginação da Central de Pessoas.

---

## 7. O que já está bom (não mexer)

Vale registrar, porque auditoria só com problema distorce a leitura:

- **RLS por facilitador** (`20260609_delta8_seguranca.sql`): sem `USING (true)`, sem `TO public`, sem `is_admin()` global. Isolamento entre facilitadores está correto.
- **Hardening** (`20260711014738_harden_security_definer.sql`): `REVOKE CREATE ON SCHEMA public`, execução de funções revogada por padrão e reaberta item a item. Bem feito.
- **Chaves de IA**: nenhuma no bundle. O `verify-security-contract.mjs` inclusive impede que volte.
- **CSP e headers** no `netlify.toml`, com `frame-ancestors 'none'` e HSTS.
- **Motor DISC canônico** em `discScoring.js` lendo `sampleQuestions.js` em runtime — sincroniza sozinho quando um peso muda.
- **Recovery link com `?token_hash=`**: a solução para o preview do WhatsApp queimar o token de uso único está certa e bem documentada no código (`auth.js:206-231`).
- **Retomada da avaliação pública** via `localStorage` por token, com limpeza no sucesso.
- **`updateRows`/`deleteRows` recusam operar sem filtro** — proteção simples contra apagar a tabela inteira.

---

*Perfil Master · Vianexx AI · auditoria de 27/07/2026*
