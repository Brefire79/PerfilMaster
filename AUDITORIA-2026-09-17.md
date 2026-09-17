# Auditoria 17/09/2026 — Perfil Master

Escopo pedido: bugs e ortografia em todo o app, refino das questões, orientação
sobre os módulos ainda não desenvolvidos, criptografia dos dados, fluidez e
velocidade, e login com Google ativado pelo convite no banco — **sem ativar nada
pago**. Tudo o que foi feito roda no Free tier do Supabase e no plano atual do
Netlify.

Relatórios anteriores: `AUDITORIA-2026-07-27.md` (rede, proxy de IA, writes,
validação, telemetria), `docs/AUDITORIA-2026-06-12.md`, `docs/AUDITORIA-2026-05-26.md`.

---

## 0. O que você precisa fazer (nada acontece sem isto)

A auditoria **não conseguiu aplicar nada em produção** (DDL no banco e deploy de
Edge são bloqueados para o agente). Os três passos, na ordem:

1. **SQL Editor do Supabase (projeto MentoriaX `zlbynxjeefqxcgrsmkjp`)** — colar e
   rodar `supabase/migrations/20260917_delta21_google_login_cpf_pseudonimo.sql`
   (DELTA 21). É idempotente. Ele:
   - cria `app_invites.email` + trigger em `auth.users` que ativa a conta pelo e-mail;
   - cria o *pepper* no Vault e **substitui os CPFs em claro** pelo pseudônimo
     (9 contas + 1 avaliado + 1 vínculo hoje). Não há volta: o CPF legível deixa de
     existir no banco (é o objetivo).
2. **Edge Functions** (depois do SQL, porque `convertAvaliado` passa a ler `cpf_mask`):
   ```bash
   npx supabase functions deploy consumeInvite --project-ref zlbynxjeefqxcgrsmkjp
   npx supabase functions deploy convertAvaliado --project-ref zlbynxjeefqxcgrsmkjp
   ```
3. **Google no Supabase** (grátis; ~10 min):
   - Google Cloud Console → *APIs & Services → Credentials → Create OAuth client ID*
     (tipo *Web application*). Em *Authorized redirect URIs* coloque
     `https://zlbynxjeefqxcgrsmkjp.supabase.co/auth/v1/callback`.
     Se pedir *OAuth consent screen*, tipo *External*, publique (sem verificação
     é suficiente para login básico — só e-mail/perfil).
   - Supabase → *Authentication → Providers → Google*: ligar e colar Client ID e
     Client Secret.
   - Supabase → *Authentication → URL Configuration → Redirect URLs*: adicionar
     `https://perfilmaster.netlify.app/auth/callback` e
     `http://localhost:3000/auth/callback`.
   - O botão "Continuar com Google" fica **escondido por padrão**: só aparece com
     `VITE_ENABLE_GOOGLE_AUTH=true` no Netlify (*Site settings → Environment
     variables*) e no `.env.local`. Ligue depois de configurar o provedor — assim o
     deploy do frontend pode sair antes do Google.
4. `npm run deploy` (confira a conta do Netlify CLI: **breno.luis@gmail.com**).

---

## 1. Login com Google + convite ativado no banco (DELTA 21)

**Como funciona agora**

| Cenário | O que acontece |
|---|---|
| Facilitador preenche **e-mail** em *Alunos › Convidar aluno* | O convite guarda o e-mail (`app_invites.email`). Vira **pessoal (uso único)**, mesmo com grupo. |
| Convidado clica **Continuar com Google** no `/login` com esse e-mail | O Supabase cria o usuário no Auth → o trigger `on_auth_user_created_perfilmaster` acha o convite pendente pelo e-mail, cria `app_users` (role/grupo/adminuid vindos do **convite**), entra no grupo, queima o convite e grava `invite_used` no `audit_log`. A pessoa cai direto no painel. |
| Convidado abre o link `/join/:token` e escolhe **Criar conta com Google** | O token fica em `localStorage` (`profileai.invite.pending`); depois do Google, `/auth/callback` chama `consumeInvite({ token })`. |
| Conta Google **sem** convite | `/auth/callback` desloga e explica que o acesso é por convite. Ninguém entra "como aluno solto". |
| Conta antiga no Auth sem `app_users`, com e-mail no convite | `consumeInvite({ byEmail: true })` resolve no callback. |
| Cadastro por **e-mail/senha** com o e-mail do convite | **Não** ativa pelo e-mail (de propósito: sem confirmação de e-mail, qualquer um poderia se cadastrar com o e-mail alheio e roubar o convite). O link com token continua sendo o caminho. |

**Arquivos**: `src/firebase/auth.js` (`signInWithGoogle`, `applyOAuthCallback`,
`takePendingInviteToken`), `src/pages/auth/AuthCallback.jsx` (rota
`/auth/callback`), `src/components/ui/GoogleButton.jsx` (Login e Register),
`supabase/functions/consumeInvite/index.ts` (modo `byEmail`, convite com e-mail
= uso único, nome/foto do Google), `src/firebase/firestore.js` (`createInvite`
aceita `{ email }`), `InviteStudentModal.jsx`.

**Sem custo**: provedor Google do Supabase e OAuth client do Google Cloud são
gratuitos. Não há SMTP envolvido.

---

## 2. Criptografia dos dados

### O que já estava protegido
- **Em trânsito**: TLS em tudo (Netlify, Supabase REST/Auth/Edge).
- **Em repouso**: o Supabase criptografa os discos (AES-256) e os backups.
- **Acesso**: RLS por facilitador em todas as `app_*`; anon sem GRANT; fluxos
  públicos só por Edge com `service_role`; chave de IA só nos Secrets.

### O que faltava — e foi feito: CPF pseudonimizado (DELTA 21)
O CPF é o único dado que o app **nunca precisa ler de volta**: ele serve só para
reconhecer "a mesma pessoa" entre avaliação avulsa e conta. Então ele deixou de
existir em texto legível:

- `cpf` passa a guardar `HMAC-SHA256(cpf, pepper)` (64 hex). Mesma pessoa → mesmo
  código, então toda a lógica de vínculo (`getPessoas`, `getSugestoesVinculo`,
  `autoVincularPorCpf`, `getHistoricoEvolucao`) continua funcionando **sem
  alteração**.
- `cpf_mask` (`***.***.*89-09`) é a única coisa exibível — Central de Pessoas,
  painel de vínculos e Relatório Oficial mostram a máscara (`cpfParaExibir()` em
  `src/lib/cpf.js`).
- O *pepper* mora no **Supabase Vault** (grátis, chave gerenciada fora do banco).
  Um dump do banco sem o Vault não permite reverter nem testar CPFs por força
  bruta (o espaço de 11 dígitos seria trivial sem pepper).
- Triggers `BEFORE INSERT/UPDATE OF cpf` em `app_users`, `app_avaliados` e
  `app_identity_links` fazem a troca — o app e as Edge continuam mandando os 11
  dígitos, nada muda para quem grava.
- **Mudança visível**: o Relatório Oficial deixa de imprimir o CPF completo
  (mostra a máscara). Se você precisar do número completo no documento, isso
  exige guardar o CPF cifrado (pgp_sym_encrypt) em vez de hash — decisão de
  produto; hoje a máscara atende rastreabilidade sem expor o dado.

### O que NÃO foi feito, e por quê
- **Telefone/e-mail cifrados na coluna**: o facilitador precisa deles legíveis
  (WhatsApp, e-mail) em dezenas de telas. Cifrar com chave no Vault e decifrar
  numa `view`/RPC só protegeria contra um vetor (dump bruto do disco) que o
  Supabase já cobre com criptografia em repouso — e adicionaria latência e
  complexidade em toda leitura. Não compensa agora.
- **Criptografia ponta-a-ponta no navegador**: incompatível com o Relatório
  Oficial, a IA e a Inteligência de Grupos (o servidor precisa ler as respostas).

### Higiene revisada
- Tokens de sessão em `localStorage` (padrão do GoTrue; `/auth/callback` limpa o
  `#access_token` da URL com `history.replaceState` para não ficar no histórico).
- Rascunho da avaliação (pública e do wizard) em `localStorage`, limpo no envio.
- `buscarPorToken` continua sem devolver telefone/CPF (só `temCpf`).

---

## 3. Bugs encontrados e corrigidos

| # | Onde | Problema | Correção |
|---|---|---|---|
| B1 | `AssessmentWizard.jsx` | Dizia "Progresso salvo automaticamente", mas as 78 respostas viviam só no estado React — um refresh perdia tudo (o fluxo público já salvava). | Rascunho em `localStorage` por usuário (`profileai.wizard.respostas.<uid>`), retomada na primeira questão pendente, aviso "Você já respondeu N de 78", limpo no envio. |
| B2 | `AssessmentWizard.jsx` | DISC/Sabotadores escolhidos por **posição** no array (`slice(0, 28)`); reordenar `sampleQuestions.js` quebraria o cálculo. | Seleção por `dimension`. |
| B3 | `Register.jsx` | Se `signUp` passava e `consumeInvite` falhava (rede), a conta ficava órfã no Auth e a pessoa via "e-mail já em uso" para sempre. | Com convite válido e `auth/email-already-in-use`, tenta entrar com a senha digitada e retoma o consumo do convite. |
| B4 | `index.css` | Google Fonts carregadas **duas vezes** (`<link>` no `index.html` e `@import` no CSS); o `@import` ainda bloqueia o parse do CSS. | `@import` removido. |
| B5 | `Dashboard.jsx`, `Students.jsx`, `Reports.jsx` | 3 requisições **por grupo** (membros, avaliações, perfis) em cascata — com 10 grupos, 32 chamadas antes do painel aparecer. | Leitura em lote (`getUsersByGroupIds`, `getAssessmentsByGroupIds`, `getProfilesByGroupIds`, filtro `in`): **3 chamadas no total**. |
| B6 | idem | Listagens baixavam `app_assessments.answers` (jsonb com 78 respostas por pessoa) sem usar. | Lote de avaliações só com colunas leves (`id,uid,groupid,status,datas`). |
| B7 | `sampleQuestions.js` | 30 KB no bundle da avaliação pública, 2/3 em `en`/`es` — idiomas removidos em jul/2026. | Só `ptBR`: **15 KB** (−50 %). |
| B8 | `lib/cpf.js` | Após o DELTA 21, `formatCpf(hash)` extrairia dígitos do hex e imprimiria um CPF **falso** no Relatório Oficial. | `maskCpf` reconhece o pseudônimo; `cpfParaExibir()` usa `cpf_mask`. |
| B9 | `auth.js` | `toUserShape` só lia `display_name`/`avatar_url` (cadastro por e-mail); conta Google ficava sem nome/foto. | Lê também `full_name`/`name`/`picture`; `provider` vai ao store. |

**Ortografia**: varredura automática de ~30 mil linhas (strings JSX, `pt-BR.json`,
`localEngine.js`, questões) procurando 200+ palavras sem acento e erros comuns
("excessão", "a nível", "houveram", palavras dobradas…). **Nenhum erro real
encontrado** — os únicos hits eram identificadores (`concluido`, `sessao`) e
regex do Mestre, que são intencionais. A correção de texto ficou concentrada
nas questões (§4) e em "do que delegar" → "a delegar" (`q_sab_controller_02`).

**Verificado e OK** (sem mudança): timeouts da camada de rede, `refreshSession`
que não desloga em queda de rede, sanitização/cobertura no `atualizarStatus`,
rate limit nas Edge públicas, RLS por `adminuid`, contrato de scoring (78
questões, front ↔ Edge) — `npm test` verde após todas as mudanças.

---

## 4. Refino das questões (ids e pesos intocados)

Critérios: cada item mede **uma** ideia (sem "faço X e Y"), linguagem direta,
sem marcação de gênero quando dava para evitar ("energizado" → "ganho energia"),
e cada Sabotador medindo o **seu** construto (não o do vizinho).

23 itens reescritos — os principais:

| Id | Antes (problema) | Agora |
|---|---|---|
| `q_d_05` | "…tomo a decisão sozinho **e** comunico para executar…" (duplo) | "Quando a equipe trava diante de um prazo urgente, eu decido e aciono a execução, mesmo sem consenso." |
| `q_i_06` | "…de acordo com o humor e personalidade de quem estou falando" (gramática) | "Adapto meu jeito de falar, quase sem pensar, ao humor e ao estilo de quem está na minha frente." |
| `q_s_05` | "…entender bem o que está acontecendo **e** apoiar os colegas…" (duplo) | "…minha prioridade é dar apoio a quem está inseguro." |
| `q_s_06` | "calma **e** consistência… pressão intensa **e** prazos agressivos" | "Mantenho o mesmo ritmo e a mesma calma mesmo sob pressão intensa." |
| `q_c_04` | "trabalhar de forma **independente**, seguindo processos…" (independência não é C) | "Trabalho melhor quando existe um processo claro e documentado para seguir." |
| `q_c_05` | 3 ações numa frase | "…recomendo adiar e sustento a decisão com dados, mesmo sob pressão." |
| `q_sab_hyperach_03` | "A opinião que os outros têm de mim…" (isso é **Prestativo**, não Hiper-realizador) | "Preciso que reconheçam meus resultados para me sentir bem comigo." |
| `q_sab_stickler_02` | "dificuldade em delegar" (duplicava `controller_02`) | "Refaço trabalhos que já estavam bons porque ainda dava para ficar melhor." |
| `q_sab_controller_02` | "Prefiro… **do que** delegar" | "Prefiro fazer as coisas do meu jeito **a** delegar…" |

Os demais são ajustes de gênero/fluência (`q_i_01`, `q_i_03`, `q_i_07`,
`q_d_04`, `q_sab_controller_03`, `q_sab_stickler_04`, `q_sab_pleaser_02`,
`q_sab_restless_01`, `q_sab_hypervig_05`, `q_sab_victim_05`,
`q_sab_hyperach_05`, `q_sab_hyperrat_04/05`, `q_i_05`).

**Limite conhecido (não mudado — exige decisão sua):** os 28 itens DISC são
todos "concordo = mais daquele perfil". Quem tende a concordar com tudo sai com
os 4 perfis altos e a diferença entre eles fica pequena. A correção clássica é
ter 1–2 itens **invertidos** por dimensão (ex.: "Prefiro que outra pessoa tome a
decisão final") pontuados `6 − valor`. Isso muda `discScoring.js`,
`atualizarStatus/index.ts`, o contrato e torna perfis antigos não comparáveis —
por isso ficou como recomendação, não como mudança silenciosa.

---

## 5. Módulos ainda por desenvolver — orientação

O seletor "Modelo de Perfil" (Módulos › criar) mostra **Social Style, OCAI e
Personalizado** como "(em breve)". Só o DiSC tem motor + relatório. Veredito por
modelo:

| Modelo | O que é | Viável? | Recomendação |
|---|---|---|---|
| **Social Style** (Merrill-Reid) | 2 eixos (assertividade × responsividade) → Driver, Expressive, Amiable, Analytical. Praticamente o mesmo espaço do DISC (D≈Driver, I≈Expressive, S≈Amiable, C≈Analytical). | Sim, **sem questionário novo** | **Derivar do DISC** como uma "lente" no relatório: assertividade = (D+I)−(S+C), responsividade = (I+S)−(D+C). 1–2 dias. Valor real baixo; só faça se algum cliente pedir o vocabulário Social Style. |
| **OCAI** (Cameron & Quinn) | Cultura **organizacional**: 6 dimensões, em cada uma a pessoa distribui 100 pontos entre Clã/Adhocracia/Mercado/Hierarquia, "atual" e "desejada". Mede a empresa, não o indivíduo. | Sim, mas é outro produto | Precisa de: tipo de questão novo (distribuir 100 pontos), agregação por grupo (a unidade de análise é a organização), relatório atual × desejado. ~2–3 semanas. Só vale com demanda de consultoria organizacional/RH — hoje o público é coach/mentor. **Adiar.** |
| **Personalizado** | Facilitador monta o próprio questionário | Parcialmente | Não faça um "construtor de qualquer coisa". Faça um **motor genérico por dimensões**: dimensões nomeadas + itens Likert com peso e opção de inversão + relatório de barras. É a generalização do `discScoring.js`; o Social Style e futuros modelos (Big Five simplificado, âncoras de carreira) nascem dele. ~1–2 semanas. **Este é o próximo módulo com melhor custo-benefício**, quando houver um cliente pagando por ele. |

Ordem sugerida: (1) itens invertidos no DISC (qualidade do produto principal) →
(2) motor genérico por dimensões → (3) Social Style como preset desse motor →
(4) OCAI só com cliente. Até lá, manter os três como "(em breve)" está correto —
melhor do que gerar relatório DISC com nome de outro modelo (o que acontecia
antes de jun/2026).

Também vale saber: o `AssessmentWizard` principal ignora módulos (usa o banco
fixo de 78); só `/student/assessment/:id` usa questões de módulo. Qualquer
modelo novo precisa entrar pelos dois caminhos ou o "módulo" fica cosmético.

---

## 6. Performance ("mais fluido e rápido")

Feito nesta auditoria:

- **Painel/Alunos/Relatórios**: 3N+2 → 3–4 requisições (§3 B5/B6). É o ganho
  mais perceptível para quem tem vários grupos.
- **Fontes**: um download em vez de dois; CSS não bloqueia mais no `@import`.
- **Avaliação pública**: −15 KB de questões (B7). Bundle da tela `/avaliacao/:token`
  é o que o avaliado baixa no celular pelo 4G.
- **Wizard**: rascunho local evita refazer 78 questões (é "velocidade" para o aluno).

Já estava bom (mantido): rotas todas `lazy`, `recharts`/`jspdf` em chunks
separados só carregados nas telas que usam, SW com cache de fontes e
`NetworkFirst` para o Supabase, `fetchComRetry` para cold start.

Próximos, se ainda sentir lentidão (não feitos — precisam de medição real):
1. **Central › Pessoas** faz 4 fetches e cruza em memória; com centenas de
   pessoas, mover o cruzamento para uma RPC (`central_pessoas`) como já é feito
   em `central_observabilidade`.
2. **Cache de leitura em memória** (30 s) para `getGroupsByAdmin`/lotes, evitando
   refetch ao alternar Painel ↔ Alunos ↔ Grupos.
3. `GroupDetail` recalcula DISC a partir de `answers` quando o perfil não tem
   scores — só perfis antigos (pré-07/07); pode ser removido após um recálculo
   único em SQL.

---

## 7. Arquivos alterados

- **Banco**: `supabase/migrations/20260917_delta21_google_login_cpf_pseudonimo.sql` (novo).
- **Edge**: `consumeInvite/index.ts`, `convertAvaliado/index.ts`.
- **Auth/rotas**: `src/firebase/auth.js`, `src/pages/auth/AuthCallback.jsx` (novo),
  `src/components/ui/GoogleButton.jsx` (novo), `Login.jsx`, `Register.jsx`,
  `src/routes/index.jsx`, `src/store/authStore.js`.
- **Dados**: `src/firebase/firestore.js` (lotes, `createInvite` com e-mail, `cpfMask`),
  `src/lib/cpf.js`, `Pessoas.jsx`, `RelatorioOficial.jsx`, `IdentityLinkPanel.jsx`,
  `InviteStudentModal.jsx`, `Dashboard.jsx`, `Students.jsx`, `Reports.jsx`.
- **Avaliação**: `AssessmentWizard.jsx`, `src/constants/sampleQuestions.js`.
- **Performance**: `src/index.css`.
- **Landing**: `Landing.jsx` (recurso "Convites pelo WhatsApp ou pelo Google", FAQ).
- **Docs**: este arquivo, `CLAUDE.md`, `PRD.md`, `README.md`, `MANUAL-OFICIAL.md`,
  `manual_usuario.md`, `manual_tecnico.md`, `docs/MANUAL_ADMIN.md`, `docs/MANUAL_ALUNO.md`.
