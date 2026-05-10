# Manual do Administrador — ProfileAI

Manual completo do instrutor/administrador para operar a plataforma de avaliação comportamental DISC.

---

## 1. Acesso de administrador

### 1.1 Conta de admin
A conta de admin é criada manualmente pelo super-admin (você no Supabase) ou definida no campo `role='admin'` em `app_users`. Após login, você é direcionado para `/admin/dashboard`.

### 1.2 Importante: admin também pode fazer avaliação
Você pode acessar `/student/dashboard` mesmo sendo admin, e fazer a própria avaliação DISC. Isso permite que você experimente o fluxo do aluno e tenha seu próprio perfil cadastrado.

---

## 2. Dashboard administrativo

Tela inicial em `/admin/dashboard`. Mostra:

### Cards de KPIs
- **Total de Alunos** — somatório de membros em todos os seus grupos
- **Total de Grupos** — grupos que você administra
- **Avaliações Realizadas** — UIDs únicos com avaliação concluída
- **Taxa de Conclusão** — percentual

### Atalhos rápidos
- Criar Grupo
- Convidar Alunos
- Ver Relatórios

### Atividade Recente
Feed em tempo real com até 8 eventos:
- **Avaliação concluída** — aluno terminou o teste (verde)
- **Perfil identificado** — IA gerou o perfil DISC (cor do perfil)
- **Aluno entrou no grupo** — novo membro nos últimos 30 dias (azul)
- **Grupo criado** — novo grupo nos últimos 30 dias (laranja)

Click em qualquer evento → navega ao grupo relacionado.

---

## 3. Gestão de Grupos

### 3.1 Criar grupo
1. Menu lateral → **Grupos**
2. Botão **+ Novo Grupo**
3. Preencha **nome, descrição e cor** (a cor identifica visualmente o grupo)
4. Salvar

### 3.2 Convidar alunos via link
Dentro do grupo:
1. Aba **Convidar**
2. Clique em **Gerar link de convite** — gera um token único válido por 7 dias
3. Copie e envie por e-mail/WhatsApp
4. Quando o aluno usar o link, ele entra automaticamente no grupo

### 3.3 Adicionar aluno por e-mail
Dentro do grupo:
1. Aba **Membros** → **Adicionar por e-mail**
2. Se o e-mail já tem conta, é adicionado direto
3. Caso contrário, o sistema cria pré-cadastro

### 3.4 Aba Configurações do grupo
- Editar nome/descrição/cor
- Ver lista de módulos atribuídos
- **Excluir grupo** (botão vermelho — irreversível, remove todos os vínculos)

---

## 4. Página de Alunos (`/admin/students`)

Lista consolidada de todos os alunos de todos os seus grupos, com filtros:
- **Busca** por nome ou e-mail
- **Filtro por grupo**
- **Filtro por perfil DISC** (D, I, S, C, ou "sem perfil")

### Ações disponíveis em cada linha
| Ícone | Ação |
|---|---|
| 👁 Olho | Abrir painel completo do aluno (com Painel Estratégico) |
| ▶ Play verde | Atribuir nova avaliação (modal seleciona módulo + manda e-mail) |
| ✉ Envelope | Enviar lembrete por e-mail (abre cliente de e-mail com mensagem pronta) |

### Atribuir avaliação manualmente
1. Hover no aluno → clique no ícone **Play verde**
2. Modal abre listando os módulos publicados do grupo do aluno
3. Selecione o módulo
4. Clique em **Atribuir avaliação**
5. Sistema cria registro em `app_assessments` e abre cliente de e-mail com texto pronto

---

## 5. Painel Estratégico do Aluno (Slide-Over)

Acessível clicando no olho na lista de Alunos ou em **Ver perfil** dentro do grupo.

### Conteúdo público (mesmo que o aluno vê)
- Cabeçalho com perfil dominante
- Resumo / pontuações / radar
- Pontos fortes e desafios
- Recomendações de função, estilo, equipe, comunicação
- Sabotadores e riscos

### Conteúdo exclusivo do admin
> **Confidencial — não compartilhe com o aluno**

- **Briefing Executivo** — leitura de 60 segundos antes de uma 1:1
- **Como abordar** — tom, ritmo, abertura de conversa
- **Como dar feedback** — formato e momento ideais
- **Perguntas de coaching** — 5 perguntas poderosas para próxima 1:1
- **Plano de ação** — passos com cadência sugerida
- **Alavancas motivacionais** — o que motiva esta pessoa
- **Sinais de alerta** (vermelho) — comportamentos para monitorar
- **Mapa de compatibilidade** — sinergias com cada perfil DISC
- **Áreas de estiramento** — desafios para crescimento
- **Guia de delegação** — que tarefas delegar/evitar
- **Foco da próxima avaliação** — o que medir até o próximo ciclo
- **Indicador de bem-estar** — flag não-diagnóstica de necessidade de suporte adicional

### Botão "Gerar Painel Estratégico"
Para perfis criados antes do upgrade da Edge Function, aparece um banner roxo com botão **🚀 Gerar Painel Estratégico**. Clique para enriquecer o perfil com IA — leva ~30 segundos. Recarrega automaticamente ao terminar.

---

## 6. Módulos

`/admin/modules` — biblioteca de avaliações configuráveis.

### Criar módulo
1. **+ Novo Módulo**
2. Preencha **título, descrição e objetivo**
3. Escolha o **grupo** alvo
4. Status: `draft` (rascunho) ou `published` (atribuível)
5. **ModuleBuilder** permite adicionar/remover perguntas customizadas

### Status do módulo
- **draft** — não atribuível
- **published** — pode ser atribuído a alunos
- **archived** — só leitura, não aparece em novas atribuições

---

## 7. Sessões de Avaliação (`/admin/sessoes`)

Fluxo paralelo para avaliar **pessoas SEM cadastro** (terceirizados, candidatos, convidados externos):

### Criar sessão
1. **+ Nova Sessão** → preencha título e descrição
2. Sessão fica com status `Ativa`

### Adicionar avaliados
1. Sessão selecionada → **+ Adicionar avaliado**
2. Preencha **nome + telefone**
3. Sistema gera **token único** automaticamente

### Enviar via WhatsApp
- Botão verde do WhatsApp → abre `wa.me` com mensagem pronta + link único
- O avaliado acessa o link, responde sem login, resultado fica na sessão

### Copiar link
- Botão de cópia → copia URL para clipboard

### Remover avaliado
- Botão lixeira vermelha → modal de confirmação → remove permanentemente
- **Atenção**: respostas e token são apagados — use com cautela

### Status do avaliado
- **Pendente** — recebeu link, não começou
- **Em andamento** — começou mas não concluiu
- **Concluído** — finalizou, perfil DISC calculado

---

## 8. Relatório de Grupo (`/admin/groups/:id/report`)

Relatório agregado com IA generativa.

### Conteúdo gerado
- **Distribuição visual** dos 4 perfis DISC
- **Perfis individuais** (cards expansíveis)
- **Dinâmica do grupo** — análise de sinergias e conflitos
- **Forças coletivas**
- **Riscos de conflito**
- **Pontos cegos** do grupo
- **Papéis recomendados** (liderança, execução, criatividade, qualidade)
- **Análise de equilíbrio**
- **Prioridades de desenvolvimento**

### Exportar em PDF
Botão **Exportar PDF** no topo do relatório → gera arquivo formatado para apresentação.

---

## 9. Estratégia de uso recomendada

### Antes de uma 1:1
1. Abra o painel completo do aluno (slide-over)
2. Leia o **Briefing Executivo**
3. Anote 2-3 das **Perguntas de Coaching** sugeridas
4. Tenha o **Como abordar** em mente para definir o tom
5. Use **Sinais de alerta** como filtro durante a conversa

### Antes de uma reunião de equipe
1. Abra o **Relatório de Grupo**
2. Analise **Dinâmica do grupo** e **Riscos de conflito**
3. Use **Papéis recomendados** ao distribuir tarefas
4. Considere **Pontos cegos** ao planejar

### Cadência de avaliação
- **Mensal** (recomendado para grupos em desenvolvimento intenso)
- **Trimestral** (cadência padrão de evolução)
- **Semestral** (acompanhamento longitudinal)

Use o campo **Foco da próxima avaliação** do painel estratégico para definir o que observar entre avaliações.

---

## 10. Configurações (`/admin/settings`)

- Idioma da interface (PT-BR / EN / ES)
- Notificações por e-mail
- Dados da conta (nome, e-mail)
- **Encerrar sessão** (logout)

---

## 11. Boas práticas

### Segurança operacional
- **NUNCA compartilhe o painel estratégico** com o aluno — é uso exclusivo do instrutor
- **NUNCA use o app para diagnóstico clínico** — o indicador de bem-estar é apenas orientativo
- **Respeite a confidencialidade** dos dados entre alunos

### Comunicação com alunos
- Use o **e-mail de lembrete** (botão envelope) para incentivar conclusão sem ser intrusivo
- Espace lembretes em pelo menos 5 dias
- Evite enviar links de avaliação para o mesmo aluno mais de 1x por mês

### Análise de resultado
- Considere o **histórico**, não apenas a avaliação atual
- Combine **scores DISC** com observação real de comportamento
- Use os perfis como ponto de partida para conversas, não como rótulos definitivos

---

## 12. Solução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| Aluno aparece "Pendente" mesmo após concluir | Profile salvo sem `groupId` ou sem AI | Use o botão **Gerar Painel Estratégico** no slide-over |
| Não consigo ver o painel estratégico | Profile criado antes do upgrade | Idem acima |
| E-mail de lembrete não dispara | Cliente de e-mail bloqueado | O botão usa `mailto:` — abra manualmente |
| Avaliado não recebeu link no WhatsApp | Telefone com formato errado | Edite o avaliado removendo (ainda não suporta editar — recrie) |
| Token de convite expirou | Token tem validade de 7 dias | Gere novo link nas configurações do grupo |
| Avaliação travada na submissão | Conexão instável | O progresso é salvo — recarregue a página e termine |

---

## 13. Glossário técnico

- **app_users** — tabela de usuários cadastrados (alunos + admins)
- **app_avaliados** — tabela de avaliados externos via Sessões (sem cadastro)
- **app_assessments** — registros de avaliações (respostas brutas)
- **app_profiles** — perfis DISC processados (resultado)
- **Edge Function** — função serverless do Supabase que faz processamento com IA
- **Token de convite** — UUID temporário usado para vincular novo cadastro a um grupo
- **Token de avaliado** — UUID permanente para sessões públicas (sem login)

---

## 14. Suporte

- Bug de UI ou comportamento inesperado: documente passos e fale com o suporte técnico
- Dúvida sobre interpretação de perfil: consulte literatura DISC ou um psicólogo organizacional
- Problemas de acesso: verifique se está com `role='admin'` no Supabase
