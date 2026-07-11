# Manual oficial de uso e funcionamento

## 1. Visão geral

O Perfil Master aplica avaliações DISC + PQ/Sabotadores para alunos com conta ou pessoas convidadas por WhatsApp. O facilitador organiza grupos, envia avaliações, acompanha conclusões e gera relatórios individuais e coletivos.

## 2. Primeiro acesso do facilitador

1. Entre em `/login` com a conta administrativa.
2. Em Configurações, revise nome, empresa, idioma e equipe administrativa.
3. Crie o primeiro grupo em Grupos.
4. Convide alunos ou use “Avaliação avulsa” para uma pessoa sem conta.

## 3. Aluno com conta

1. O facilitador gera um convite de grupo ou individual.
2. O aluno abre o link, cria a conta e entra no aplicativo.
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

## 7. Senha e suporte

O facilitador pode gerar um link de recuperação para enviar por WhatsApp. O link usa `token_hash` e só é consumido quando a pessoa abre a página e confirma a troca.

## 8. Privacidade

- Cada facilitador acessa apenas seu próprio escopo.
- Links públicos usam token como credencial.
- CPF é opcional, não aparece publicamente e depende de consentimento.
- Exclusão de conta exige senha. Administradores com dados de terceiros são protegidos contra exclusão automática.
- Documentos públicos: `/privacidade`, `/termos` e `/suporte`.

## 9. Procedimento de publicação

Use `DEPLOY-READY.md`. Nunca publique frontend que dependa de uma Edge Function ainda ausente. Execute testes, build, migrações, Edge Functions, preview, smoke test e somente então produção.

