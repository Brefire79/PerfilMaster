# 📘 Manual do Usuário — Perfil Master

> Plataforma de avaliação comportamental **DISC + Sabotadores (PQ)**
> *Vianexx AI · perfilmaster.netlify.app*

Bem-vindo(a)! Este guia explica, passo a passo, como usar o Perfil Master — desde criar sua conta até interpretar seus resultados.

---

## 👥 Quem usa o Perfil Master?

A plataforma atende a **dois tipos de usuário**:

| Perfil | Quem é | O que faz |
|---|---|---|
| 🧑‍🏫 **Facilitador (Admin)** | Mentor, coach, RH ou consultor | Cria grupos e sessões, envia avaliações, lê os relatórios |
| 🧑‍🎓 **Avaliado** | A pessoa que responde o teste | Responde a avaliação e vê o próprio perfil |

> 💡 Há **duas formas de ser avaliado**: com uma conta (aluno de um grupo) ou **sem conta nenhuma**, recebendo um link pelo WhatsApp. Veja abaixo.

---

## 1. 🔑 Como criar uma conta

> ⚠️ **O cadastro é feito apenas por convite.** Você precisa receber um link de um facilitador. Não existe cadastro aberto ao público.

### Passo a passo

1. **Receba o convite** — o facilitador envia um link parecido com:
   `https://perfilmaster.netlify.app/join/SEU-TOKEN`
2. **Abra o link** — o sistema valida o convite automaticamente.
   - ✅ Convite válido → aparece o formulário de cadastro com um selo verde *"Convite válido"*.
   - ❌ Convite expirado/inválido → mensagem de erro e botão para voltar ao login.
3. **Preencha o formulário:**
   | Campo | Obrigatório? | Observação |
   |---|---|---|
   | Nome completo | ✅ | — |
   | E-mail | ✅ | Será seu login |
   | Senha | ✅ | Mínimo **8 caracteres** (há um medidor de força) |
   | Confirmar senha | ✅ | Precisa ser igual à senha |
   | CPF | ⬜ Opcional | Permite acompanhar a **evolução do seu perfil** ao longo do tempo (LGPD). O sistema guarda só um código irreversível e a máscara `***.***.*89-09` — o número nunca fica legível |
4. Se informar o **CPF**, marque a caixa de **consentimento** (exigência da LGPD).
5. Clique em **Criar conta**.
6. Pronto! Você entra direto no seu **painel** (`/student/dashboard`).

### Prefere entrar com o Google?

- Na tela do convite, clique em **Criar conta com Google** em vez de preencher senha. O Google confirma quem você é e o convite é aplicado automaticamente.
- Se o facilitador registrou o **seu e-mail** no convite, nem precisa do link: abra `perfilmaster.netlify.app/login` e clique em **Continuar com Google** com a conta desse e-mail. Sua conta é ativada na hora.
- Se aparecer *"Esta conta ainda não tem convite"*, é porque a conta Google usada não é a do e-mail convidado. Peça ao facilitador para registrar esse e-mail ou use o link do convite.

> 🔒 **Segurança:** todo usuário criado é um **aluno** — ninguém vira administrador pelo cadastro. Promoções a admin são feitas só pela equipe técnica.

### 🤝 E se eu não tiver conta?

Se você recebeu um link de avaliação **direto no WhatsApp** (formato `.../avaliacao/SEU-TOKEN`), **não precisa criar conta**. Basta abrir o link e responder — veja a seção [Avaliação sem conta](#-modo-c--avaliação-sem-conta-link-do-whatsapp).

---

## 2. ⭐ Como usar a funcionalidade principal

A funcionalidade central é a **Avaliação Comportamental**. Ela tem **2 etapas**:

- 🧭 **Etapa 1 — DISC:** 28 perguntas (~5 min)
- 🧠 **Etapa 2 — Sabotadores (PQ):** 50 perguntas (~10 min)

> Não existem respostas certas ou erradas — responda com sinceridade.

### 🧑‍🎓 Modo A — Você é o avaliado (com conta)

1. No painel, inicie a avaliação atribuída a você.
2. Leia a tela de introdução e clique em **Iniciar Avaliação**.
3. Para cada pergunta, escolha uma opção na escala de **1 a 5**:

   | 1 | 2 | 3 | 4 | 5 |
   |---|---|---|---|---|
   | Discordo totalmente | Discordo | Neutro | Concordo | Concordo totalmente |

   > ⌨️ **Dica (computador):** pressione as teclas **1–5** para responder e **Enter** para avançar.
4. Use **Avançar** / **Voltar** para navegar. O progresso é **salvo automaticamente**.
5. Ao terminar o DISC, aparece uma tela de transição → continue para os **Sabotadores**.
6. Na última pergunta, clique em **Enviar Avaliação**.
7. Seu **perfil é calculado na hora** e fica disponível no seu painel.

### 🧑‍🏫 Modo B — Você é o facilitador (avaliando outras pessoas)

O fluxo mais usado é a **avaliação avulsa** (avaliar pessoas que **não têm conta**):

1. Acesse **Alunos** (ou **Grupos › Membros**) e clique em **Avaliação avulsa**.
2. Não é preciso criar sessão — o app cuida disso.
3. **Cadastre os avaliados** (nome + telefone com DDD).
4. Cada avaliado recebe um **link único**. Clique em **enviar pelo WhatsApp** 📱 — abre o WhatsApp com a mensagem e o link prontos.
5. Acompanhe o **status** de cada um:
   - 🟡 **Pendente** · 🔵 **Em andamento** · 🟢 **Concluído**
6. Quando concluído, abra o **resultado**. Você verá:
   - 📊 As 4 barras DISC (Dominante, Influente, Estável, Analítico)
   - 🤖 Botão **Refinar com IA** → gera insights, forças, carreiras e dicas de comunicação
   - 🩺 Botão de **verificação de indicadores** (uso interno do facilitador)
   - 📄 **Relatório Oficial** imprimível (Imprimir / PDF)
7. Para entregar ao avaliado, clique em **Liberar** — abre o WhatsApp com um **resumo amigável** + link do relatório completo (`/resultado/:token`). *As anotações internas nunca são enviadas ao avaliado.*

> Há também o modo **Grupos** (alunos com conta) — com **Turma empresarial** (convite com vagas), **janela de horário** para todos responderem juntos e a aba **Comparativo** (tabela da turma com D/I/S/C e PQ, exportável para Excel) — e a **Central de Gestão** (Pessoas & Histórico, Inteligência de Grupos, Diagnóstico).

### 🔁 Próximo passo e testes dirigidos

Depois que alguém conclui, o Relatório Oficial mostra em **§ 3.3** o **próximo passo sugerido**: um foco de desenvolvimento e um **teste dirigido** (12 perguntas, ~3 min) para aprofundá-lo. Clique em **Aplicar**: quem tem conta vê o teste no Início do app; quem não tem recebe um link para o WhatsApp. Na aba **Comparativo** da turma, o card **Próximo foco da turma** aplica um teste a todos de uma vez, e **Lembrar por e-mail** avisa quem ainda não respondeu.

Refazer a avaliação **não apaga** a anterior: em **Central › Pessoas & Histórico**, a **Linha do Tempo** mostra cada ciclo com o quanto cada dimensão mudou, os testes aplicados e o resultado de cada um.

### 🧭 Mestre — pergunte em português

No Painel, o botão **Perguntar ao Mestre** abre um chat que responde com os seus dados, sem enviar nomes a nenhuma IA: *"quem ainda não concluiu?"*, *"o que trabalhar com a minha turma?"*, *"o que fazer com o Carlos?"*, *"como a Ana evoluiu?"*, *"quem está em reavaliação?"*. Se faltar o nome, ele pergunta de volta. **Aprofundar com IA** manda só números agregados e anonimizados para uma leitura mais longa.

### 🔗 Modo C — Avaliação sem conta (link do WhatsApp)

1. Abra o link recebido (`.../avaliacao/SEU-TOKEN`).
2. Responda as **78 perguntas** (28 DISC + 50 Sabotadores). Pode fechar e voltar: o app guarda de onde parou.
3. Ao enviar, seu perfil é calculado.
4. Quando o facilitador liberar, você recebe **outro link** (`.../resultado/SEU-TOKEN`) com seu relatório completo.

> Se o link estiver errado ou expirado, aparece **"Link inválido ou expirado"** — peça um novo ao facilitador.

---

## 3. ⚙️ Como alterar as configurações

Acesse **Configurações** (menu do facilitador). As seções disponíveis:

| Seção | O que dá pra fazer |
|---|---|
| 👤 **Perfil** | Alterar seu **nome**. *(O e-mail não pode ser alterado.)* |
| 🏢 **Empresa** | Definir **nome da empresa** e **URL do logo** (aparece nos relatórios) |
| 🌐 **Preferências** | O app é em português (PT-BR); tema claro/escuro fica no botão do topo |
| 🔔 **Notificações** | Ligar/desligar avisos (novo membro, avaliação concluída, resumo semanal, novidades) |
| 🤖 **Inteligência Artificial** | Apenas informativo — a IA é **gerenciada pelo servidor** (DeepSeek). Não há chave para configurar. |
| ⚠️ **Zona de Perigo** | **Excluir conta** (encerra a sessão) |

**Como salvar:** edite o campo e clique em **Salvar** na seção. Um ✅ *"Salvo!"* confirma.

---

## 4. ❓ Perguntas Frequentes (FAQ)

**🔹 Não consigo me cadastrar — pede um convite. Por quê?**
O cadastro é exclusivo por convite. Peça o link a um facilitador. Sem um convite válido, o cadastro não abre.

**🔹 Meu convite diz "inválido" ou "expirado".**
Convites têm prazo de validade e só podem ser usados uma vez. Peça um novo link ao facilitador.

**🔹 Preciso informar meu CPF?**
Não, é **opcional**. Ele serve só para vincular avaliações futuras e acompanhar sua **evolução** ao longo do tempo. Se informar, é preciso aceitar o consentimento (LGPD). O CPF **nunca** aparece em telas públicas.

**🔹 Posso pausar a avaliação e continuar depois?**
O progresso é **salvo automaticamente** enquanto você responde. Responda com calma; use **Voltar** para revisar respostas anteriores.

**🔹 Quanto tempo leva a avaliação?**
Cerca de **15 minutos** no total (≈5 min do DISC + ≈10 min dos Sabotadores). O fluxo público (sem conta) é mais curto (só DISC).

**🔹 O que significam D, I, S e C?**
São os quatro perfis comportamentais:
- 🔴 **D — Dominante:** focado em resultados, direto, decisivo
- 🟠 **I — Influente:** comunicativo, entusiasta, persuasivo
- 🟢 **S — Estável:** paciente, colaborativo, leal
- 🔵 **C — Analítico:** preciso, organizado, criterioso

**🔹 A avaliação é um diagnóstico médico/psicológico?**
**Não.** É uma ferramenta de **autoconhecimento e desenvolvimento**. Não faz diagnóstico clínico.

**🔹 Quem vê o meu resultado?**
Seu facilitador vê o relatório completo. Você recebe um link com a versão para o avaliado — **sem as anotações internas** do facilitador.

**🔹 Posso usar no celular?**
Sim. É um app responsivo (PWA) — funciona no navegador do celular e pode ser "instalado" na tela inicial.

**🔹 Como troco o idioma?**
Em **Configurações → Preferências → Idioma padrão**, escolha o idioma e clique em **Salvar**.

**🔹 Esqueci minha senha.**
Na tela de login, clique em **Esqueci minha senha** e siga as instruções.

**🔹 O Relatório Oficial mostra os sabotadores?**
Para **alunos com conta** (que responderam as 78 questões — DISC + Sabotadores), o Relatório inclui a seção **"Padrões Sabotadores e Riscos de Derailment"**, igual ao "Ver perfil". Para avaliações **de sessão** (link público), que respondem só as 28 questões DISC, essa seção não aparece — pois esses dados não foram coletados.

**🔹 Por que alguns avaliados não têm o botão "Enviar resultado ao aluno"?**
Esse botão é só para avaliações **de sessão** (link público por WhatsApp). **Contas de aluno** veem o resultado dentro da própria conta, então o botão não aparece — use "Imprimir / PDF" para gerar o documento.

---

*Perfil Master · Vianexx AI · Manual do Usuário*
