# ProfileAI — Manual de Uso
**Versão 2.0 · Maio 2026 · AmbFusi AI / Vianexx AI**

---

## Visão Geral

O **ProfileAI** é uma plataforma de avaliação comportamental baseada no modelo DISC, potencializada por Inteligência Artificial (Google Gemini). Permite que instrutores, coaches e profissionais de RH realizem avaliações individuais ou em grupo, gerem relatórios oficiais rastreáveis e compartilhem resultados com os avaliados de forma segura e profissional.

| Perfil | Função principal |
|--------|-----------------|
| **Admin** | Criar sessões, gerenciar avaliados, analisar com IA, emitir relatórios oficiais |
| **Aluno** | Responder avaliação DISC, visualizar perfil, acessar resultado público |

**Acesso:** `https://profileai.netlify.app`  
**Idioma:** Português do Brasil (PT-BR)

---

# PARTE 1 — GUIA DO ADMINISTRADOR

---

## 1. Primeiro Acesso como Admin

### 1.1 Login
1. Acesse `https://profileai.netlify.app`
2. Digite seu e-mail e senha cadastrados
3. Clique em **Entrar**
4. Você será redirecionado automaticamente para `/admin/dashboard`

> **Atenção:** Se você for redirecionado para o dashboard de aluno, sua conta não tem `role = 'admin'`. Veja a seção **Troubleshooting** ao final deste manual.

### 1.2 Estrutura do Painel Admin

O menu lateral esquerdo contém:
- **Dashboard** — Visão geral e estatísticas
- **Grupos** — Turmas e equipes
- **Alunos** — Lista de alunos cadastrados
- **Módulos** — Questionários personalizados
- **Sessões** — Avaliações públicas via WhatsApp *(módulo principal)*
- **Relatórios** — Análise de grupos
- **Configurações** — Perfil e integrações de IA

---

## 2. Configurar Chave de API do Google Gemini

> **Passo obrigatório** para que as análises de IA funcionem. A chave gratuita do servidor pode esgotar — use a sua própria.

1. Acesse **Configurações** no menu lateral
2. Role até a seção **Integrações de IA**
3. No campo **Chave de API**, cole sua chave do Google AI Studio
   - A chave começa com `AIza...`
   - Obtenha gratuitamente em: `https://aistudio.google.com/apikey`
4. Clique em **Salvar**

A chave é salva localmente no seu navegador e no banco de dados da plataforma. Ela será usada automaticamente em todas as análises de IA que você gerar.

> **Segurança:** A chave nunca é enviada para o avaliado nem aparece no relatório do aluno.

---

## 3. Módulo de Sessões — Fluxo Completo

O módulo de **Sessões** é o coração do ProfileAI para uso externo. Permite avaliar pessoas sem que precisem criar conta no sistema — ideal para workshops, processos seletivos, treinamentos e dinâmicas de equipe.

### 3.1 Criar uma Sessão

1. No menu lateral, clique em **Sessões**
2. Clique em **Nova Sessão**
3. Preencha:
   - **Nome da sessão** (ex: "Workshop Liderança — Turma Maio/2026")
   - **Descrição** (opcional)
4. Confirme a criação

### 3.2 Adicionar Avaliados

1. Dentro da sessão criada, clique em **Adicionar Avaliado**
2. Preencha:
   - **Nome completo** *(obrigatório)*
   - **Telefone** *(obrigatório — formato: 11999998888)*
   - **E-mail** *(opcional)*
3. Clique em **Adicionar**

O sistema gera automaticamente um **token único** por avaliado. Esse token:
- Identifica o avaliado sem exigir login
- Compõe o link público de avaliação
- É a base do **ID do documento oficial** (`DISC-ANO-TOKEN`)

### 3.3 Enviar Link de Avaliação por WhatsApp

1. Localize o avaliado na lista da sessão
2. Clique no botão **📤 WhatsApp** ao lado do nome
3. Uma janela do WhatsApp abrirá com a mensagem pré-formatada:

```
Olá, [Nome]! 👋

Você foi convidado(a) para realizar sua Avaliação Comportamental DISC.

🔗 Acesse pelo link abaixo:
https://profileai.netlify.app/avaliacao/SEU_TOKEN

✅ Não precisa criar conta — responda diretamente pelo link!
O questionário leva cerca de 5 a 10 minutos.
```

4. Selecione o contato e envie

### 3.4 Acompanhar Status em Tempo Real

Na lista de avaliados da sessão, cada card exibe:

| Status | Cor | Significado |
|--------|-----|-------------|
| `Pendente` | Cinza | Link enviado, avaliado ainda não iniciou |
| `Em Andamento` | Amarelo | Avaliado abriu o link e está respondendo |
| `Concluído` | Verde | Avaliação finalizada com sucesso |

Clique em **🔄 Atualizar** para recarregar os status.

### 3.5 Visualizar Resultado e Gerar Análise IA

Quando o status do avaliado for **Concluído**, dois botões aparecem:

**Botão 👁 (Modal de Análise):**
1. Clique no ícone 👁 no card do avaliado
2. O modal abre com duas abas:

   **Aba Admin:**
   - Perfil DISC calculado (perfil dominante, secundário, pontuações)
   - 🤖 **Refinar com IA** → Gera análise completa (insight narrativo, forças, desafios, carreiras, comunicação)
   - 🚩 **Verificar Indicadores** → Analisa indicadores de bem-estar internos (NUNCA compartilhado)
   - Resultado dos indicadores: `✓ Sem alerta` / `⚠️ Atenção` / `⚠️ Suporte Sugerido`

   **Aba Aluno:**
   - Pré-visualização exata da mensagem que será enviada via WhatsApp
   - Inclui: perfil dominante, pontuações, top 3 forças, link para resultado público
   - Não inclui indicadores clínicos ou de bem-estar

3. Clique **📤 Liberar para Aluno** para enviar a mensagem via WhatsApp

**Botão 📄 (Relatório Oficial):**
- Abre o Relatório Oficial em tela cheia
- Ver seção 4 deste manual

---

## 4. Relatório Oficial — Documento Legal

O **Relatório Oficial** é um documento de identificação única destinado a uso profissional e, quando necessário, em processos periciais ou solicitações oficiais.

### 4.1 Acessar o Relatório

- Clique no botão **📄** no card do avaliado (sessão)
- Ou acesse diretamente: `/admin/relatorio/:token`

### 4.2 Estrutura do Documento

**§ 1 — Identificação**
- Nome do avaliado, telefone, e-mail
- Nome da sessão, data da avaliação
- **ID do Documento:** `DISC-2026-XXXXXXXX` (único e rastreável)

**§ 2 — Perfil DISC**
- Gráfico de barras com as 4 dimensões (D, I, S, C)
- Tabela oficial com valores absolutos e percentuais
- Interpretação dos perfis dominante e secundário

**§ 3 — Análise por Inteligência Artificial**
- Insight narrativo do perfil
- Forças identificadas
- Áreas de desenvolvimento
- Carreiras e posições sugeridas
- Estilo de comunicação recomendado

**§ 4 — Indicadores de Bem-Estar** *(exclusivo admin — não impresso)*
- Nível de atenção: Nenhum / Observar / Suporte Sugerido
- Nota interna discreta (quando aplicável)
- Disclaimer ético: análise não diagnóstica, uso exclusivamente organizacional

**§ 5 — Observações do Instrutor**
- Campo de texto livre para o admin registrar observações
- Incluído na impressão/PDF

**Rodapé Legal**
- Conformidade LGPD (Lei 13.709/2018)
- Aviso de uso em processos periciais/policiais quando solicitado
- Assinatura digital do admin (nome e e-mail)
- Data e hora de emissão

### 4.3 Gerar Análise IA no Relatório

1. No relatório, clique em **🤖 Gerar Análise IA** na barra de controles
2. Aguarde (~5–15 segundos)
3. As seções § 3 são preenchidas automaticamente

> Se aparecer mensagem de erro sobre cota esgotada, acesse **Configurações → Integrações de IA** e insira sua chave do Google AI Studio.

### 4.4 Verificar Indicadores de Bem-Estar

1. Clique em **🚩 Verificar Indicadores** na barra de controles
2. O sistema analisa discretamente padrões do perfil
3. Resultado aparece em § 4 (visível apenas no painel — **não impresso**)

Níveis possíveis:
- **Sem alerta** (verde): sem padrões identificados
- **Atenção** (amarelo): padrões sutis que merecem observação do instrutor
- **Suporte Sugerido** (amarelo): padrões mais evidentes onde suporte seria benéfico

> **Importante:** Esses indicadores são ferramentas de apoio ao instrutor — NÃO são diagnósticos clínicos. Em caso de dúvida, encaminhe o avaliado para um profissional de saúde mental.

### 4.5 Enviar Resultado para o Avaliado

1. Clique em **📤 WhatsApp** na barra de controles
2. O avaliado receberá mensagem com:
   - Parabéns pela conclusão da avaliação
   - Link para ver o resultado completo: `/resultado/:token`
   - **Sem** nenhum dado clínico ou indicador de bem-estar

### 4.6 Imprimir / Exportar como PDF

1. Clique em **🖨️ Imprimir / PDF** na barra de controles
2. A janela de impressão do navegador abre
3. Para salvar como PDF:
   - **Chrome/Edge**: Selecione "Salvar como PDF" no destino da impressão
   - **Safari**: Selecione "Abrir PDF no Visualizador"
4. O documento é formatado automaticamente para **A4** na impressão
5. Controles da tela e indicadores clínicos são ocultados no PDF

---

## 5. Gerenciar Grupos

### 5.1 Criar um Grupo

1. Clique em **Grupos** no menu lateral
2. Clique em **Novo Grupo**
3. Preencha nome e descrição
4. Confirme

### 5.2 Convidar Alunos via Link

1. Acesse o grupo desejado
2. Clique em **Convidar Aluno** ou **Gerar Link**
3. Um link único é gerado: `https://profileai.netlify.app/join/TOKEN`
4. Envie por e-mail, WhatsApp ou qualquer canal
5. O aluno acessa, se cadastra e é automaticamente vinculado ao grupo

> Tokens de convite são de **uso único** e expiram em **7 dias**.

### 5.3 Acompanhar Membros

Na página do grupo, aba **Membros**:
- Lista de todos os alunos do grupo
- Status da avaliação por aluno
- Perfil DISC (quando concluído)

---

## 6. Relatórios de Grupo

1. Acesse **Relatórios** no menu lateral
2. Selecione o grupo desejado
3. Veja:
   - Distribuição de perfis DISC na equipe
   - Médias por dimensão
   - Análise de complementaridade de perfis
   - Pontos de força coletivos e áreas de atenção

---

## 7. Configurações Avançadas

### 7.1 Integrações de IA
Ver seção 2 deste manual.

### 7.2 Perfil do Admin
- Acesse **Configurações → Perfil**
- Atualize nome e foto de exibição
- O nome será exibido como assinatura nos relatórios oficiais

---

# PARTE 2 — GUIA DO ALUNO

---

## 8. Cadastro e Primeiro Acesso (Alunos com Conta)

### 8.1 Cadastro via Convite

1. Receba o link de convite do admin pelo e-mail ou WhatsApp
   - Formato: `https://profileai.netlify.app/join/TOKEN`
2. Acesse o link
3. Preencha:
   - Nome completo
   - E-mail
   - Senha (mínimo 8 caracteres)
4. Clique em **Criar Conta**
5. Você será direcionado automaticamente para o dashboard

### 8.2 Dashboard do Aluno

No dashboard (`/student/dashboard`) você verá:
- **Card de avaliação**: "Iniciar Avaliação DISC" (se ainda não respondeu)
- **Perfil DISC**: gráfico e detalhes (após concluir a avaliação)
- **Histórico**: avaliações anteriores

---

## 9. Responder à Avaliação DISC (Com Login)

1. No dashboard, clique em **Iniciar Avaliação** ou acesse a aba **Avaliação**
2. O wizard guia você pelas 28 perguntas
3. Para cada pergunta, escolha a opção que melhor descreve você (escala 1–5)
4. Clique em **Próxima** para avançar
5. Ao responder todas as perguntas, o resultado é calculado automaticamente
6. Seu perfil DISC é exibido e salvo

---

## 10. Ver Meu Perfil (Aluno com Login)

- Acesse a aba **Meu Perfil** (`/student/profile`)
- Você verá:
  - Perfil comportamental dominante (D, I, S ou C)
  - Gráfico de barras com as 4 dimensões
  - Descrição do seu perfil
  - Análise gerada por IA (quando disponível)

---

## 11. Avaliação Pública (Sem Login — Via WhatsApp)

Quando o admin te enviar um link pelo WhatsApp, você pode responder **sem criar conta**:

1. Toque no link recebido
   - Formato: `https://profileai.netlify.app/avaliacao/TOKEN`
2. A página abre com seu nome pré-carregado
3. Responda as 28 perguntas do questionário DISC
4. Clique em **Finalizar Avaliação**
5. Você é automaticamente redirecionado para ver seu resultado

---

## 12. Ver Resultado Público (`/resultado/:token`)

Após finalizar a avaliação pública, você é levado para a página de resultado:

### O que você verá:

**Banner do Perfil**
- Perfil dominante (ex: "Perfil Dominante — D")
- Descrição do estilo comportamental

**Gráfico DISC**
- Barras animadas mostrando seus valores em D, I, S e C
- As barras são ordenadas da maior para a menor pontuação

**Análise Profissional** *(gerada por IA)*
- ✨ **Insight**: Descrição narrativa do seu perfil
- 💪 **Forças**: Suas principais competências comportamentais
- 🚀 **Carreiras**: Áreas e posições que combinam com seu perfil
- 🌱 **Desenvolvimento**: Áreas para crescimento
- 💬 **Comunicação**: Como você prefere se comunicar e como os outros devem se comunicar com você

> A página pode ser salva como favorito para consulta futura. O link é único para você.

---

# PARTE 3 — REFERÊNCIA DISC

---

## 13. Os 4 Perfis DISC

### D — Dominante
**Características:** Direto, orientado a resultados, decisivo, competitivo, assertivo  
**Motivação:** Desafios, conquistas, autonomia  
**Ambiente ideal:** Dinâmico, com autonomia para decidir  
**Comunicação:** Prefere mensagens diretas, objetivas e sem rodeios

### I — Influente
**Características:** Comunicativo, entusiasta, persuasivo, otimista, colaborativo  
**Motivação:** Reconhecimento, interação social, criatividade  
**Ambiente ideal:** Social, colaborativo, cheio de possibilidades  
**Comunicação:** Prefere conversas animadas, histórias e conexão emocional

### S — Estável
**Características:** Paciente, confiável, empático, leal, colaborativo  
**Motivação:** Segurança, harmonia, relacionamentos duradouros  
**Ambiente ideal:** Estável, previsível, com suporte e cooperação  
**Comunicação:** Prefere escuta ativa, tom gentil e consistência

### C — Consciente
**Características:** Analítico, preciso, meticuloso, orientado a qualidade, sistemático  
**Motivação:** Exatidão, expertise, qualidade  
**Ambiente ideal:** Organizado, com processos claros e autonomia técnica  
**Comunicação:** Prefere dados, fatos, documentação e comunicação estruturada

---

## 14. Combinações de Perfil

Raramente uma pessoa tem apenas um perfil dominante — a maioria apresenta uma combinação. Exemplos comuns:

| Combinação | Característica principal |
|------------|------------------------|
| D/I | Líder visionário e persuasivo |
| D/C | Líder analítico e estratégico |
| I/S | Comunicador empático e colaborativo |
| S/C | Apoiador meticuloso e confiável |
| C/D | Analista decisivo e orientado a resultados |

---

# PARTE 4 — TROUBLESHOOTING

---

## 15. Problemas Comuns e Soluções

### "Fui redirecionado para o dashboard de aluno sendo admin"

Sua conta não tem `role = 'admin'` no banco de dados.

**Solução** — Execute no Supabase SQL Editor:
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

Para descobrir seu UID:
```sql
SELECT id, email FROM auth.users WHERE email = 'seu@email.com';
```

Depois faça **logout e login novamente**.

---

### "Erro ao gerar análise IA / Cota da API esgotada"

A cota gratuita do servidor foi consumida.

**Solução:**
1. Obtenha sua chave gratuita em `https://aistudio.google.com/apikey`
2. Acesse **Configurações → Integrações de IA**
3. Cole a chave no campo e salve

---

### "Chave de API inválida (403)"

A chave inserida está incorreta ou sem permissão.

**Solução:**
1. Acesse `https://aistudio.google.com/apikey`
2. Gere uma nova chave
3. Substitua em **Configurações → Integrações de IA**

---

### "Link de convite diz 'inválido' ou 'expirado'"

- Tokens expiram após **7 dias**
- Tokens são de **uso único**

**Solução:** Gere um novo link no painel do grupo.

---

### "Avaliação não carrega / tela em branco"

1. Limpe o cache: `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. Verifique conexão com a internet
3. Tente em outro navegador (Chrome recomendado)

---

### "Erro 401 — sessão expirada"

O sistema detecta automaticamente e redireciona para o login. Faça login novamente.

---

### "O relatório não imprime corretamente"

1. Use **Google Chrome** ou **Microsoft Edge** para melhor compatibilidade
2. Na janela de impressão, selecione **Papel A4** e **Margens: padrão**
3. Para PDF: selecione **Destino: Salvar como PDF**
4. Marque **Imprimir plano de fundo** nas configurações avançadas da impressão

---

## 16. Suporte

Para dúvidas técnicas ou suporte, entre em contato:

**AmbFusi AI — ProfileAI Support**  
E-mail: breno.luis@gmail.com  
WhatsApp: disponível via painel administrativo

---

## 17. Informações Legais

### LGPD — Lei Geral de Proteção de Dados

Os dados coletados pela plataforma ProfileAI são tratados em conformidade com a Lei 13.709/2018 (LGPD):

- **Finalidade:** Avaliação comportamental para fins de desenvolvimento profissional
- **Base legal:** Consentimento do titular (art. 7°, I) e legítimo interesse do responsável (art. 7°, IX)
- **Dados sensíveis:** Indicadores de bem-estar são tratados como dados sensíveis (art. 11°) e acessíveis exclusivamente pelo admin responsável
- **Direitos do titular:** Acesso, correção, exclusão e portabilidade mediante solicitação formal

### Rastreabilidade de Documentos

Cada relatório oficial possui um ID único no formato `DISC-ANO-XXXXXXXX`, derivado do identificador único do avaliado. Este ID permite:
- Verificação de autenticidade do documento
- Rastreamento em auditorias internas
- Apresentação como documento comprobatório em processos periciais ou administrativos, quando solicitado por autoridade competente

---

*ProfileAI © 2026 — AmbFusi AI / Vianexx AI*  
*Manual elaborado por Breno Luis — Versão 2.0*
