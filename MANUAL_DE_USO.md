# ProfileAI — Manual de Uso

> Versão 1.0 · Stack: React 18 + Vite + Supabase + Netlify

---

## Visão Geral

O **ProfileAI** é uma plataforma de avaliação comportamental baseada no modelo DISC.  
Possui dois perfis de usuário:

| Perfil | Função |
|--------|--------|
| **Admin** | Gerencia grupos, convida alunos, acompanha resultados e gera relatórios |
| **Aluno** | Responde ao questionário DISC e visualiza seu perfil comportamental |

---

## 1. Primeiro Acesso — Admin

### 1.1 Login
1. Acesse o endereço do sistema (ex: `https://profileai.netlify.app`)
2. Insira seu e-mail e senha cadastrados no Supabase Auth
3. Ao confirmar, você será redirecionado para `/admin/dashboard`

> **Atenção**: Caso o sistema redirecione para o dashboard de *aluno*, significa que  
> o seu usuário não tem `role = 'admin'` na tabela `app_users`. Veja a seção **Troubleshooting**.

### 1.2 Dashboard Admin
Após login você verá:
- **Cards de estatísticas**: Total de alunos, grupos, avaliações e taxa de conclusão
- **Ações rápidas**: Criar grupo, convidar alunos, ver relatórios, gerenciar módulos
- **Atividade recente**: Histórico de ações no sistema
- **Legenda DISC**: Referência dos 4 perfis (D, I, S, C)

---

## 2. Fluxo Admin — Gerenciar Grupos

### 2.1 Criar um Grupo
1. No menu lateral, clique em **Grupos** (`/admin/groups`)
2. Clique em **Novo Grupo**
3. Preencha nome e descrição
4. Confirme a criação

### 2.2 Convidar Alunos
1. Acesse o grupo criado (clique no card do grupo)
2. Clique em **Convidar Aluno** ou **Gerar Link**
3. O sistema gera um link único com token (válido por **7 dias**)  
   Exemplo: `https://seudominio.com/join/TOKEN_UUID`
4. Envie o link por e-mail, WhatsApp ou qualquer canal
5. O aluno acessa, preenche nome/e-mail/senha e já entra no grupo

> Os tokens de convite são de **uso único** — após o cadastro, expiram automaticamente.

### 2.3 Ver Membros do Grupo
- Na página do grupo, aba **Membros**, você vê todos os alunos cadastrados
- Para cada aluno é exibido: nome, e-mail, status da avaliação e perfil DISC (quando concluído)

---

## 3. Fluxo Admin — Avaliações e Relatórios

### 3.1 Módulos
1. Acesse **Módulos** (`/admin/modules`)
2. Crie módulos de avaliação com perguntas personalizadas
3. Associe módulos a grupos

### 3.2 Sessões (Avaliação via WhatsApp / Link Público)
1. Acesse **Sessões** (`/admin/sessoes`)
2. Crie uma sessão (nome + grupo opcional)
3. Adicione avaliados manualmente (nome, telefone, e-mail)
4. O sistema gera um token público por avaliado
5. Envie o link: `https://seudominio.com/avaliacao/TOKEN`
6. O avaliado responde sem precisar criar conta
7. Acompanhe o status em tempo real na sessão

### 3.3 Relatórios
1. Acesse **Relatórios** (`/admin/reports`)
2. Selecione o grupo
3. Veja distribuição DISC, médias por dimensão e análise de equipe

---

## 4. Fluxo Aluno

### 4.1 Cadastro via Convite
1. Receba o link de convite do admin
2. Acesse o link — ele redireciona para `/register?token=xxx`
3. Preencha: nome completo, e-mail, senha (mín. 8 caracteres)
4. Clique em **Criar Conta**
5. Redirecionado automaticamente para o dashboard do aluno

### 4.2 Dashboard Aluno
- Se **ainda não completou** a avaliação: exibe card "Iniciar Avaliação DISC"
- Se **já completou**: exibe o perfil DISC com gráfico de barras e detalhes

### 4.3 Responder a Avaliação DISC
1. No dashboard, clique em **Iniciar Avaliação** ou acesse a aba **Avaliação**
2. O wizard guia passo a passo pelas perguntas (escala Likert 1–5)
3. Ao concluir todas as perguntas, o resultado é calculado automaticamente
4. O perfil é salvo e exibido no dashboard

### 4.4 Ver Meu Perfil
- Acesse a aba **Meu Perfil** (`/student/profile`)
- Exibe: tipo primário DISC, pontuações por dimensão, descrição do perfil
- Disponível para download/exportação (PDF)

---

## 5. Avaliação Pública (Sem Login)

Para avaliados externos (sem conta no sistema):
- Link: `https://seudominio.com/avaliacao/TOKEN_DO_AVALIADO`
- Não requer login
- O avaliado preenche o questionário e ao final o resultado é salvo na sessão
- O admin acompanha via painel de sessões

---

## 6. Idiomas

O sistema suporta 3 idiomas, selecionáveis no canto superior direito da TopBar:
- 🇧🇷 **PT** — Português (padrão)
- 🇪🇸 **ES** — Espanhol
- 🇺🇸 **EN** — Inglês

---

## 7. Logout

- Clique no ícone de **sair** (→|) no canto superior direito
- Em desktop (admin): botão de logout também disponível no rodapé do menu lateral
- Todos os dados locais são limpos ao sair

---

## 8. Troubleshooting

### "Entrei com meu login mas fui para o dashboard de aluno"
O usuário não tem `role = 'admin'` na tabela `app_users`.  
**Solução**: Execute o SQL abaixo no Supabase SQL Editor:
```sql
INSERT INTO app_users (uid, email, role, displayname, createdat, updatedat)
VALUES (
  'SEU_UID_AQUI',
  'seu@email.com',
  'admin',
  'Seu Nome',
  now(),
  now()
)
ON CONFLICT (uid) DO UPDATE SET role = 'admin';
```
Depois **faça logout e login novamente**.

Para descobrir seu UID:
```sql
SELECT id, email FROM auth.users WHERE email = 'seu@email.com';
```

### "Link de convite diz 'inválido' ou 'expirado'"
- Tokens expiram após 7 dias — gere um novo no painel do grupo
- Tokens são de uso único — se já foram usados, gere um novo

### "Avaliação não carrega / tela em branco"
- Limpe o cache do navegador (`Ctrl+Shift+R`)
- Verifique o console do navegador por erros de rede
- Confirme que as variáveis de ambiente estão configuradas corretamente

### "Erro 401 / sessão expirada"
- O sistema detecta automaticamente e redireciona para o login
- Faça login novamente

---

## 9. Perfis DISC — Referência Rápida

| Tipo | Nome | Característica |
|------|------|----------------|
| **D** | Dominante | Direto, orientado a resultados, decisivo |
| **I** | Influente | Comunicativo, entusiasta, persuasivo |
| **S** | Estável | Paciente, confiável, colaborativo |
| **C** | Consciente | Analítico, preciso, orientado a qualidade |

---

*ProfileAI © 2026 — AmbFusi AI*
