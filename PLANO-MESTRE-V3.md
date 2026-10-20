# Plano — Mestre v3: responder melhor e orientar o facilitador

*Avaliação feita em 19/10/2026 sobre a v1.0.80, com 35 perguntas reais rodadas contra os dados de produção (só leitura; gravação de auditoria bloqueada durante o teste).*

---

## 1. Diagnóstico

### O que já funciona bem
- Perguntas de dado com a forma "certa" respondem rápido (~1–1,5 s) e com números reais: pendências por nome, contagem igual ao Painel, abordagem de uma pessoa ("me fala da Claudia" → perfil, próximo teste, justificativa).
- Motor determinístico, local, auditável e sem PII para IA externa. **Manter esse princípio.**
- Slot-filling ("Para quem?") e desambiguação de nomes.

### Resultado do teste (35 perguntas)

| Situação | Qtd | Exemplos |
|---|---|---|
| Respondeu certo | 13 | "quem não respondeu ainda?", "quantos alunos eu tenho?", "me fala da Claudia", "como exporto para excel?" |
| **Não entendeu (fallback)** | 13 (37%) | "por onde começo?", "como começo a usar o app?", "qual o perfil da minha equipe?", "quem são os mais influentes?", "o que é o juiz?", "como reenvio o link?", **"quais testes estão vencidos?"**, "o que eu faço hoje?", "próximos passos", "o app está lento" |
| **Respondeu outra coisa** | 9 | "como crio um grupo?" → tabela DISC · "como envio a avaliação?" → taxa de conclusão · "o que significa PQ score?" → dados do grupo · "como dar devolutiva para um Dominante?" → dados do grupo · "quem tem o PQ mais baixo?" → média do grupo · "qual grupo tem mais dominantes?" → só 1 grupo, sem responder · "quanto tempo leva a avaliação?" → taxa · "como faço uma reavaliação?" → lista de ciclos · "como mudo **minha** senha?" → instrução de senha **do aluno** |

### Causas (no código)

1. **Roteamento por "primeira regex que casa"** (`mestreIntencao.js` `INTENCOES`, `mestreLocal.js` `CONVERSAS`). Palavras soltas como `grupo`, `pq`, `avaliac`, `dias` sequestram perguntas de "como faço". Não há distinção entre **tipo** de pergunta (como fazer / o que é / quero um número / o que devo fazer).
2. **Bug de regex**: `pendencias` usa `vencend\w*|vence\w*` — "venc**idos**" não casa. Mesmo caso em outras flexões.
3. **Base de conhecimento curta e espalhada** em regex dentro do motor. Conteúdo rico que já existe no app **não é usado**: `DISC_PROFILES` (forças, comunicação, sob pressão) e `SABOTADORES_DATA` (descrição, gatilhos, como lidar) em `src/lib/localEngine.js`.
4. **Sem memória de conversa**: "me fala da Claudia" → "e ela evoluiu?" pede o nome de novo; "e o grupo dela?" vira consulta genérica.
5. **Não sabe em que tela o usuário está**: `contexto.tela` é sempre `'chat-flutuante'`. Não dá para responder "o que faço aqui?" nem usar o grupo aberto como padrão.
6. **Números que não batem com o Painel**: Painel mostra **74%** de conclusão (14 de 19); o Mestre diz **100%** (15 concluídas ÷ 15 iniciadas) e "15 concluídas" contra "14 avaliações realizadas". Denominadores diferentes minam a confiança.
7. **Respostas sem ação**: texto puro (`white-space: pre-wrap`), sem links para a tela, sem botão "copiar lembrete do WhatsApp", sem sugestões de próxima pergunta. Fallback lista 7 frases genéricas.
8. **Texto que contradiz o comportamento**: a saudação e "quem é você" dizem "nunca nome, e-mail ou CPF", mas pendências e abordagem listam nomes (correto, é o escopo do facilitador — o que não vai para IA é o nome). O selo "sem PII" confunde.
9. **Custo por mensagem**: `catalogoDoEscopo` chama `getPessoas` a cada pergunta (é a maior parte do ~1,5 s).
10. "quantas avaliações essa semana?" sem resultado responde "Para começar, use Avaliação avulsa…" — soa como se o usuário nunca tivesse usado o app.

---

## 2. Objetivo e métricas

- **Fallback ≤ 10%** e **resposta errada ≤ 5%** num conjunto-ouro de ~120 perguntas reais (as 35 acima + misses do `audit_log` `mestre_miss` + variações).
- Toda resposta de dado **bate com o número da tela correspondente** (mesma função de cálculo).
- Toda resposta termina com **uma ação clicável** ou **2–3 sugestões de próxima pergunta**.
- Continua 100% local por padrão; IA só no botão explícito.

---

## 3. Fases

### Fase 1 — Roteador por tipo + base de conhecimento estruturada — ✅ feita em 19/10/2026

> Resultado: as 35 perguntas do teste agora vão para a rota certa (antes 13). Conjunto-ouro com 115 perguntas passando; 5 marcadas para as Fases 2–3. Escopo entregue: 1.1–1.5 abaixo.

**1.1 Classificar o TIPO antes da intenção** — novo passo em `mestreIntencao.js`:

| Tipo | Gatilhos | Vai para |
|---|---|---|
| `como_fazer` | "como (faço\|crio\|envio\|reenvio\|mudo\|aplico)", "onde (vejo\|fica)", "posso…?" | base de conhecimento (nunca consulta de dado) |
| `conceito` | "o que é/significa", "explica", "diferença entre" | base de conhecimento + `DISC_PROFILES`/`SABOTADORES_DATA` |
| `orientacao` | "como lidar/abordar/dar devolutiva", "o que fazer com" | pessoa/turma citada → motor; perfil citado (ex. "analítico") → guia do perfil |
| `dado` | "quantos", "quem", "qual grupo", "taxa", "ranking", nomes | consultas |
| `agenda` | "o que faço hoje", "próximos passos", "por onde começo", "resumo" | nova consulta `agenda` (Fase 3) |

**1.2 Intenção por pontuação, não primeira-que-casa.** Cada intenção tem `palavras` com peso e `exemplos`; somar pontos (tipo + palavras + entidades encontradas) e escolher o maior. Empate/baixa confiança → perguntar "Você quis dizer A ou B?" com 2 botões, em vez de chutar.

**1.3 Base de conhecimento em arquivo próprio** — `src/lib/mestreConhecimento.js` (puro):

```js
{ id: 'criar_grupo', tipo: 'como_fazer', exemplos: ['como crio um grupo', 'novo grupo', 'abrir turma'],
  resposta: '…passo a passo curto…', acoes: [{ label: 'Ir para Grupos', rota: '/admin/groups' }],
  telas: ['/admin/groups'] }
```
- Migrar as entradas de `CONVERSAS` para cá.
- **Gerar automaticamente** entradas a partir de `DISC_PROFILES` (4 perfis: "o que é um Dominante", "como lidar/comunicar com um Analítico", "como dar devolutiva para um Influente") e `SABOTADORES_DATA` (10 sabotadores: "o que é o Juiz", gatilhos, como lidar). Isso sozinho cobre ~30 perguntas novas.
- Entradas novas que faltam hoje: começar a usar (onboarding), criar grupo, enviar/reenviar link, quanto tempo leva (≈15 min / 78 questões), reavaliação (como fazer, não lista), conta × avulsa (diferença), PQ Score (conceito), **minha senha** (admin: Esqueci a senha / Configurações) × **senha do aluno**, app lento (recarregar, conexão, versão).

**1.4 Corrigir bugs pontuais**: `venc\w*` (vencido/vencidos/vencendo), "minha senha", saudação/"quem é você" com texto honesto ("vejo os nomes do seu escopo, como nas telas; para a IA só vão números").

**1.5 Contrato ampliado** — `scripts/verify-mestre-contract.mjs` ganha o **conjunto-ouro** (`scripts/mestre-golden.json`: pergunta → tipo/intenção/id esperado) e falha se a taxa de acerto cair abaixo do alvo. Toda pergunta do miss-log corrigida entra no ouro.

### Fase 2 — Contexto: conversa e tela *(~1 dia)*

- **Memória curta** em `mestreStore`: `foco = { pessoa, grupo, intencao, quando }` da última resposta. Pronomes e elipses ("ela", "dele", "essa turma", "e o grupo dela?", "e a evolução?") resolvem para o foco se não houver nome novo. Expira em 10 min ou ao limpar a conversa.
- **Saber a tela**: `MestreChat` lê `useLocation()` + params e envia `contexto = { rota, grupoId?, uid?, token? }`.
  - Na página de um grupo, "o que trabalhar?" usa esse grupo sem perguntar.
  - No Relatório Oficial, "o que fazer com ela?" usa a pessoa aberta.
  - Pergunta "o que faço aqui?/como funciona esta tela?" → entrada da base com `telas` correspondente.
- Sugestões iniciais do chat mudam conforme a tela (ex.: em Grupos › Convite: "como funcionam as vagas?", "como abrir a janela de horário?").

### Fase 3 — Respostas acionáveis + novas consultas *(~2 dias)*

**3.1 Formato de resposta estruturado** (mantém `narrativa` para PDF/compatibilidade):
```js
{ modo, narrativa, resumo, itens: [{ texto, rota? }], acoes: [{ label, rota | acao }], seguir: ['…', '…'], dados, queryUsada }
```
- `MestreChat` renderiza **negrito/bullets simples**, botões de ação (navegam com `useNavigate` e fecham/minimizam o chat no mobile) e **chips de próxima pergunta** (`seguir`).
- Ação **"Copiar lembrete"**: gera o texto pronto do WhatsApp para quem está pendente (com o link quando houver token) — o facilitador cola e envia. Nada é enviado automaticamente.
- Nomes de pessoas nas respostas viram links para o relatório (`/admin/relatorio/aluno/:uid` ou `/admin/relatorio/:token`).

**3.2 Consultas novas** (`mestreConsultas.js`):
- `agenda` — "o que faço hoje?/próximos passos/por onde começo?": junta pendências, avaliações paradas > 7 dias, testes vencidos/vencendo, concluídos recentes sem teste dirigido aplicado e grupos sem convite. Conta vazia → checklist de primeiros passos (criar grupo → convidar → acompanhar). Ordena por urgência, no máximo 5 itens, cada um com ação.
- `ranking` — "quem tem o PQ mais baixo?", "quem são os mais influentes?", "maiores sabotadores": top/bottom N por D/I/S/C/PQ/sabotador, opcionalmente filtrado por grupo (local, nomes do escopo — mesmo que as telas mostram).
- `perfil_equipe` — "qual o perfil da minha equipe/turma?": distribuição DISC + PQ + sabotador dominante de um grupo citado/atual, **incluindo grupos pequenos** (k-anonimato continua valendo só para o que vai à IA e para a Inteligência de Grupos).
- `comparar_grupos` — responde de verdade "qual grupo tem mais X" e "compare os grupos".
- `guia_perfil` — "como lidar/dar devolutiva para um Analítico": `DISC_PROFILES` (comunicação, motivações, sob pressão) + 3 dicas práticas de devolutiva por perfil (texto novo, curto).

**3.3 Fallback útil**: em vez da lista fixa, sugerir as 3 entradas/intenções **mais próximas** (por sobreposição de tokens com `exemplos`) como chips clicáveis.

### Fase 4 — Números consistentes e desempenho *(~0,5 dia)*

- Extrair o cálculo do Painel (`Dashboard.jsx`: total, realizadas, taxa) para `src/lib/metricasPainel.js` e usar **a mesma função** no Painel e no Mestre (`visao_geral`, `contagem`, `saude_status`). Quando o Mestre usar outra definição, dizer qual ("das que começaram, 100% terminaram; do total convidado, 74%").
- Cache do `catalogoDoEscopo` e de `getPessoas` por 60 s no módulo (invalidar ao limpar conversa/logout).
- "Nenhuma avaliação nos últimos 7 dias" quando existem anteriores → citar a última data e o total histórico, sem o texto de "para começar".

### Fase 5 — Proativo e onboarding *(~1 dia, opcional)*

- Ponto no botão "Perguntar ao Mestre" quando há pendência relevante (testes vencidos, avaliação parada); ao abrir, primeira mensagem = `agenda` resumida.
- Primeiro acesso (sem grupos) → Mestre abre com o checklist de primeiros passos.
- Selo do cabeçalho: trocar "sem PII" por "local · nada vai para IA sem você pedir".

### Fase 6 — IA como reserva para o que o local não sabe *(opcional, depois de medir a Fase 1)*

- No fallback, botão "Perguntar à IA sobre o app": envia **só a pergunta** + a base de conhecimento (sem dados do escopo) para uma ação nova em `mestreAprofundar` (`modo: 'ajuda'`), com o mesmo rate limit. A resposta vira candidata a entrada nova da base (registrada no miss-log para revisão).

---

## 4. Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/lib/mestreIntencao.js` | tipo de pergunta, pontuação, resolução de pronomes/foco, regex corrigidas |
| `src/lib/mestreConhecimento.js` *(novo)* | base estruturada + geração a partir de `DISC_PROFILES`/`SABOTADORES_DATA` |
| `src/lib/mestreLocal.js` | usa a base nova, formato estruturado, cache, fallback por proximidade |
| `src/lib/mestreConsultas.js` | `agenda`, `ranking`, `perfil_equipe`, `comparar_grupos`, `guia_perfil`; ações/links nas existentes |
| `src/lib/metricasPainel.js` *(novo)* | cálculo único Painel ↔ Mestre |
| `src/pages/admin/Dashboard.jsx` | passa a usar `metricasPainel.js` |
| `src/components/mestre/MestreChat.jsx` | contexto de rota, render de bullets/ações/chips, copiar lembrete, sugestões por tela |
| `src/store/mestreStore.js` | `foco` da conversa |
| `scripts/verify-mestre-contract.mjs` + `scripts/mestre-golden.json` *(novo)* | conjunto-ouro com taxa mínima |
| `supabase/functions/mestreAprofundar/index.ts` | (Fase 6) `modo: 'ajuda'`; liberar novas consultas na allowlist |

## 5. Ordem sugerida

1. **Fase 1** (roteador + base + contrato) — resolve a maior parte das 22 respostas ruins.
2. **Fase 4** (números iguais ao Painel + cache) — pequena e evita perda de confiança.
3. **Fase 2** (contexto de conversa e tela).
4. **Fase 3** (ações, agenda, ranking).
5. Fases 5 e 6 conforme o miss-log depois de 2–3 semanas de uso.

Cada fase fecha com `npm run check` + rodar o conjunto-ouro no navegador com dados reais antes de `npm run deploy`.
