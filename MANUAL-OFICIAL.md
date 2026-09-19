# Manual oficial de uso e funcionamento

## 1. Visão geral

O Perfil Master aplica avaliações DISC + PQ/Sabotadores para alunos com conta ou pessoas convidadas por WhatsApp. O facilitador organiza grupos, envia avaliações, acompanha conclusões e gera relatórios individuais e coletivos.

## 2. Primeiro acesso do facilitador

1. Entre em `/login` com a conta administrativa.
2. Em Configurações, revise nome, empresa, idioma e equipe administrativa.
3. Crie o primeiro grupo em Grupos.
4. Convide alunos ou use “Avaliação avulsa” para uma pessoa sem conta.

## 3. Aluno com conta

1. O facilitador gera um convite de grupo ou individual. Se informar o **e-mail** do aluno no convite, ele passa a ser pessoal (uso único).
2. O aluno abre o link e cria a conta — com e-mail e senha **ou** com o botão **Criar conta com Google**. Quem tem o e-mail registrado no convite pode ir direto em `/login` → **Continuar com Google**: a conta é ativada na hora, sem link e sem senha.
3. A avaliação completa possui 78 questões: 28 DISC e 50 de Sabotadores.
4. Ao concluir, o perfil é calculado e persistido.
5. O aluno consulta Meu Perfil; o facilitador consulta o relatório completo.

## 4. Avaliação avulsa por WhatsApp

1. Em Alunos ou dentro de um Grupo, selecione “Avaliação avulsa”.
2. Informe nome e telefone; e-mail e CPF são opcionais.
3. Se houver CPF, registre o consentimento.
4. Envie o link gerado pelo WhatsApp.
5. A pessoa responde sem conta. As respostas em andamento ficam preservadas no aparelho.
6. Após a conclusão, o resultado resumido fica no link público e o relatório oficial no painel administrativo.
7. Se necessário, use “Tornar conta” para converter o avaliado em aluno.

## 5. Áreas administrativas

- **Painel:** resumo operacional, atalhos e acesso ao Mestre local.
- **Central:** observabilidade, pessoas/histórico, auditoria e inteligência agregada de grupos.
- **Grupos:** membros, convites, avaliação avulsa e análise coletiva.
- **Alunos:** contas e avaliados avulsos, movimentação, senha, conversão e exclusão permitida.
- **Módulos:** criação de módulos DiSC personalizados. Outros modelos permanecem indisponíveis até possuírem motor e relatório próprios.
- **Relatórios:** relatórios de grupo e individuais, histórico, IA e exportações.
- **Configurações:** perfil, empresa, idioma, notificações locais, equipe e segurança da conta.

## 6. Relatórios e IA

Os scores DISC e PQ são determinísticos. A IA DeepSeek, chamada somente no servidor, enriquece a narrativa. Se a IA estiver indisponível, o motor local mantém uma análise básica. Relatórios não substituem avaliação médica ou psicológica.

O Relatório Oficial traz, além do DISC e dos Sabotadores: **§ 2.1 Social Style** (lente derivada dos mesmos quatro scores — Condutor, Expressivo, Amigável ou Analítico, com aviso quando o estilo é pouco marcado) e **§ 3.3 Próxima abordagem sugerida** (ver seção 6.1). Desde 19/09/2026 o questionário DISC é a **versão 2**: 8 dos 28 itens são invertidos, para que quem tende a concordar com tudo não saia com as quatro dimensões altas. O relatório indica a versão; perfis antigos (v1) continuam válidos e a comparação entre versões é sinalizada como aproximada.

## 6.1 Ciclo de desenvolvimento: histórico, próximo passo e testes dirigidos

- **Refazer a avaliação não apaga a anterior.** Cada avaliação de uma conta vira um *ciclo*. Em Central › Pessoas & Histórico, a **Linha do Tempo** da pessoa mostra ciclo a ciclo, com a variação de D/I/S/C e PQ em relação ao anterior; o aluno vê a própria evolução em Meu Perfil › Histórico.
- **Próximo passo sugerido.** Um motor de regras (sem IA) lê o perfil — PQ baixo, sabotador mais intenso, dimensão DISC extrema — e sugere um foco de desenvolvimento e o **teste dirigido** correspondente, com o prazo de reavaliação. A sugestão sai com o identificador da regra e a versão do motor: dá para saber depois por que aquele teste foi sugerido. O facilitador decide se aplica, troca por outro ou descarta.
- **Testes dirigidos.** Sete questionários curtos (12 perguntas, ~3 min, metade invertida): Assertividade e limites, Delegação e escuta, Equilíbrio e propósito, Decisão sob pressão, Foco e conclusão, Autocrítica e feedback, Fundamentos de inteligência positiva. Três formas de aplicar:
  - **Individual**: Relatório Oficial › § 3.3 › *Aplicar*. Aluno com conta vê o teste no Início do app; pessoa sem conta recebe um link (`/teste/...`) pelo WhatsApp.
  - **Turma**: Grupos › a turma › aba *Comparativo* › card *Próximo foco da turma* — agrega as sugestões ("62% da turma → Assertividade") e aplica a todos que concluíram de uma vez.
  - **Lembrete**: quem tem um teste pendente com prazo próximo ou vencido recebe e-mail (toda segunda, automaticamente, ou pelo botão *Lembrar por e-mail* na turma).
- **Rastreabilidade.** Aplicar, concluir e descartar um teste entram na Trilha de Auditoria da Central, para qualquer canal.

## 6.2 Mestre — o assistente da Central

Chat flutuante (botão *Perguntar ao Mestre* no Painel) que responde com os dados do seu escopo, no seu aparelho, sem enviar nomes a nenhuma IA. Entende nomes de pessoas e turmas: "quem ainda não concluiu?", "o que trabalhar com a Turma Piloto?", "o que fazer com a Ana?", "como a Ana evoluiu?", "quem está em reavaliação?". Se faltar a pessoa ou a turma, ele pergunta de volta; se o nome for ambíguo, lista as opções. O botão **Aprofundar com IA**, em respostas com dados, envia apenas números agregados e anonimizados ao servidor para uma leitura mais longa. Perguntas que ele não entende ficam registradas em Central › Diagnóstico, para evoluir o vocabulário.

## 7. Senha e suporte

O facilitador pode gerar um link de recuperação para enviar por WhatsApp. O link usa `token_hash` e só é consumido quando a pessoa abre a página e confirma a troca.

## 8. Privacidade

- Cada facilitador acessa apenas seu próprio escopo.
- Links públicos usam token como credencial.
- CPF é opcional, não aparece publicamente e depende de consentimento. Desde set/2026 o banco guarda apenas um código irreversível do CPF (para reconhecer a mesma pessoa) e uma máscara `***.***.*89-09` para exibição — o número completo não existe mais no sistema.
- Login com Google não abre o acesso a ninguém: sem convite (link ou e-mail registrado) a sessão é encerrada.
- Exclusão de conta exige senha. Administradores com dados de terceiros são protegidos contra exclusão automática.
- Documentos públicos: `/privacidade`, `/termos` e `/suporte`.

## 9. Procedimento de publicação

Use `DEPLOY-READY.md`. Nunca publique frontend que dependa de uma Edge Function ainda ausente. Execute testes, build, migrações, Edge Functions, preview, smoke test e somente então produção.

