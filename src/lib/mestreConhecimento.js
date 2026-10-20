// ─────────────────────────────────────────────────────────────────────────────
// Mestre v3 — base de conhecimento estruturada (puro, sem I/O, sem `@/`).
//
// Cada entrada: { id, re, resposta, tipos?, soCurta?, exemplos? }
//   re        regex sobre o texto NORMALIZADO (minúsculas, sem acento)
//   tipos     só casa quando o tipo da pergunta está na lista (ver
//             classificarTipo em mestreIntencao.js); ausente = qualquer tipo
//   soCurta   só vale para mensagens curtas (saudação não sequestra pergunta)
//   exemplos  frases usadas para sugerir a entrada mais próxima no fallback
// A ORDEM importa: a primeira entrada que casa responde — específicas antes.
//
// Perfis DISC e Sabotadores são GERADOS a partir de localEngine.js, o mesmo
// conteúdo do relatório, para o chat e o relatório nunca divergirem.
// Travado por scripts/verify-mestre-contract.mjs (conjunto-ouro).
// ─────────────────────────────────────────────────────────────────────────────
import { DISC_PROFILES, SABOTADORES_DATA } from './localEngine.js';

const RE_DIACRITICOS = /[̀-ͯ]/g;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(RE_DIACRITICOS, '');
const lista = (xs, n = 3) => xs.slice(0, n).join(', ').toLowerCase();

// ─── Entradas escritas à mão ────────────────────────────────────────────────

const MANUAIS = [
  // ── Social ──
  {
    id: 'data_hora',
    re: /\bque (dia|data)\b.*\b(hoje|agora)\b|\bdata de hoje\b|\bque dia (e|eh)\b|dia estamos|\bque horas\b|hora atual|hoje e que dia/,
    resposta: () => {
      const agora = new Date();
      const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `Hoje é ${data}, ${hora} no seu dispositivo. Se quiser, pergunte "qual a taxa de conclusão nas últimas 24 horas?" que eu trago o movimento do dia.`;
    },
  },
  {
    id: 'saudacao',
    re: /\b(oi|ola|bom dia|boa tarde|boa noite|e ai|eai|hey|hello)\b/,
    soCurta: true,
    resposta: 'Olá! Sou o Mestre. Posso te dizer quem ainda não concluiu, sugerir o próximo foco de uma pessoa ou turma, mostrar a evolução de alguém e explicar como usar o app. Por exemplo: "o que faço hoje?" ou "como crio um grupo?".',
  },
  {
    id: 'agradecimento',
    re: /\b(obrigad[oa]|valeu|show|perfeito|otimo|top|legal|beleza)\b/,
    soCurta: true,
    resposta: 'De nada! Estou por aqui quando precisar.',
  },
  {
    id: 'ajuda',
    re: /(o que (voce|vc) (faz|sabe)|como (voce|vc) funciona|\bajuda\b|\bhelp\b|o que (posso|da pra) perguntar)/,
    exemplos: ['o que você faz', 'ajuda', 'o que posso perguntar'],
    resposta: 'Posso ajudar de três jeitos:\n• Seus dados: "quem ainda não concluiu?", "quantos alunos tenho?", "taxa de conclusão nos últimos 30 dias", "distribuição DISC dos grupos".\n• Orientação: "o que fazer com [nome]?", "como [nome] evoluiu?", "o que trabalhar com a [turma]?", "como lidar com um perfil Analítico?".\n• Como usar o app: "como crio um grupo?", "como envio a avaliação?", "como reenvio o link?", "o que é PQ Score?".',
  },
  {
    id: 'quem_sou',
    re: /quem (e|sao) (voce|vc|o mestre)|\bseu nome\b|voce e uma ia/,
    exemplos: ['quem é você', 'você é uma IA'],
    resposta: 'Sou o Mestre, o assistente do Perfil Master. Funciono dentro do app: leio os mesmos dados que você já vê nas telas (incluindo nomes do seu escopo) e monto a resposta aqui, sem IA externa. Só quando você clica em "Aprofundar com IA" eu mando números anonimizados para a IA — nunca nomes.',
  },
  {
    id: 'privacidade',
    re: /\b(privacidade|anonim\w*|lgpd|pii|dados pessoais|k-?anonimato)\b/,
    exemplos: ['privacidade', 'lgpd', 'meus dados vão para a IA'],
    resposta: 'Aqui no chat eu vejo o mesmo que você vê nas telas, e nada sai do app. No botão "Aprofundar com IA" o servidor remove nomes, e-mails, telefones e ids antes de enviar, e listas de pessoas viram só contagens. CPF é opcional, com consentimento LGPD, e fica guardado de forma irreversível (só a máscara aparece). Na Inteligência de Grupos, turmas com menos de 5 pessoas ficam suprimidas (k-anonimato).',
  },

  // ── Primeiros passos ──
  {
    id: 'comecar',
    re: /por onde (comeco|comecar)|como (comeco|comecar|inicio|iniciar)\b|primeiros passos|(comecar|aprender) a usar|como (uso|usar|funciona) (o )?(app|aplicativo|sistema|perfil master)|\bsou novo\b|\btutorial\b/,
    exemplos: ['por onde começo', 'como começo a usar o app', 'primeiros passos', 'como funciona o app'],
    resposta: 'O caminho mais curto:\n1. Grupos › "Novo Grupo" — crie a turma (ou "Turma empresarial" se for uma empresa com N vagas).\n2. Abra o grupo › aba Convite — copie o link e mande para as pessoas. Quem não tem e-mail entra só com nome e celular.\n3. Acompanhe no Painel e em Grupos › Membros quem já concluiu; para cobrar, use o botão WhatsApp ao lado de quem está pendente.\n4. Com os resultados, abra o Relatório Oficial de cada pessoa e, em Grupos › Comparativo, veja a turma lado a lado.\nPara uma pessoa só, sem grupo: Alunos › "Avaliação avulsa".',
  },
  {
    id: 'criar_grupo',
    re: /\b(criar|crio|cria|abrir|abro|montar|monto|novo|nova|cadastrar|cadastro) (um |uma |o |a )?(grupo|turma|equipe|time)\b|\b(grupo|turma) novo\b/,
    exemplos: ['como crio um grupo', 'criar turma', 'novo grupo'],
    resposta: 'Em Grupos, clique em "Novo Grupo", dê um nome e salve. Se for uma empresa que contratou N avaliações, escolha "Turma empresarial": o app cria o grupo já com um convite de N vagas, o nome da empresa e o contato. Depois abra o grupo › aba Convite para pegar o link.',
  },
  {
    id: 'turma_empresarial',
    re: /turma empresarial|convite (com )?vagas|vagas do convite|quantas vagas|\bvagas?\b/,
    exemplos: ['turma empresarial', 'vagas do convite'],
    resposta: 'Turma empresarial (Grupos › Novo Grupo › "Turma empresarial") cria o grupo com um convite de N vagas, nome da empresa e contato. Cada cadastro (com conta ou só pelo celular) gasta 1 vaga. Na aba Convite você vê "12 de 40", quem entrou e a situação de cada avaliação, e pode pausar, encerrar ou ajustar as vagas.',
  },
  {
    id: 'conta_vs_avulsa',
    re: /diferenca .*(conta|avulsa|sessao|link)|(conta|avulsa) (ou|x|vs) (conta|avulsa)|com conta (ou|e) sem conta/,
    exemplos: ['diferença entre conta e avaliação avulsa', 'com conta ou sem conta'],
    resposta: 'Com conta: a pessoa se cadastra pelo convite do grupo, faz login, vê o próprio perfil e a evolução, e recebe testes dirigidos dentro do app. Avaliação avulsa: você gera um link único (Alunos › "Avaliação avulsa"), a pessoa responde pelo celular sem login e o resultado fica no Relatório Oficial. Dá para transformar um avulso em conta depois com "Tornar conta", levando o perfil junto.',
  },
  {
    id: 'reenviar_link',
    re: /\b(reenvi\w*|mandar de novo|enviar de novo|cobr(ar|o|a)|lembrar|lembrete)\b|link (expirou|nao (chegou|abre|funciona))|perdeu o link/,
    exemplos: ['como reenvio o link', 'cobrar quem não respondeu', 'mandar lembrete'],
    resposta: 'Para cobrar quem ainda não concluiu: Grupos › a turma › Membros — ao lado de cada pendente há o botão WhatsApp, que abre a mensagem pronta com o link. Avaliados sem conta: Alunos › a pessoa › copie o link da avaliação e reenvie. Teste dirigido aguardando: Relatório Oficial › § 3.3 › WhatsApp/copiar link, ou "Lembrar por e-mail" no card Próximo foco da turma. Pergunte "quem ainda não concluiu?" para ver a lista.',
  },
  {
    id: 'avaliacao_avulsa',
    re: /avaliacao (avulsa|esporadica|sem conta)|\b(envi\w*|mand\w*|aplic\w*|fazer) (a |uma )?avaliac\w*|whatsapp.*avalia|link.*avalia/,
    exemplos: ['como envio a avaliação para alguém', 'avaliação avulsa', 'mandar avaliação pelo WhatsApp'],
    resposta: 'Duas formas:\n• Turma: Grupos › a turma › aba Convite — copie o link do convite e mande para todos.\n• Uma pessoa, sem conta: Alunos › "Avaliação avulsa" (ou Grupos › Membros › "Avaliação avulsa (WhatsApp)"). O app gera um link único para enviar pelo WhatsApp; a pessoa responde as 78 questões no celular, sem login, e você vê o resultado no Relatório Oficial.',
  },
  {
    id: 'convite',
    re: /\bconvite|\bconvidar|\bconvido|(adicion|cadastr|inclu)\w* (um |uma |o |a )?(aluno|pessoa|participante)/,
    exemplos: ['como convido alguém', 'adicionar aluno', 'link de convite'],
    resposta: 'Abra o grupo em Grupos › aba Convite e copie o link: quem se cadastra por ele já entra no grupo. Para convidar uma pessoa específica por e-mail, use "Convidar aluno" (o convite fica de uso único). Para alguém da sua equipe de facilitadores, o convite de admin fica em Configurações.',
  },
  {
    id: 'tempo_avaliacao',
    re: /quanto tempo (leva|demora|dura|gasta)|tempo (de|para|pra) responder|quantas (questoes|perguntas)|duracao da avaliacao|e (longa|demorada)/,
    exemplos: ['quanto tempo leva a avaliação', 'quantas questões tem'],
    resposta: 'A avaliação completa tem 78 questões (28 DISC + 50 Sabotadores), todas de concordo/discordo em 5 níveis, e leva em torno de 15 minutos. Dá para parar e continuar depois: as respostas ficam salvas no aparelho. Os testes dirigidos são bem mais curtos: 12 perguntas, uns 3 minutos.',
  },
  {
    id: 'janela',
    re: /janela (de horario|da avaliacao)|responder\w* junt|horario da avaliacao|abrir e fechar a avaliacao|prazo da avaliacao/,
    exemplos: ['janela de horário', 'todos responderem juntos'],
    resposta: 'A janela de horário (Grupos › a turma › aba Convite › "Janela da avaliação") define quando a avaliação abre e fecha para a turma responder junta. Quem começou dentro da janela pode terminar até 2 h depois do fim; o servidor recusa envios fora dela.',
  },

  // ── Senhas ──
  {
    id: 'minha_senha',
    re: /\b(minha|meu) (senha|acesso|login)\b|(mudar|trocar|alterar|redefinir|esqueci) (a )?(minha )?senha\b(?!.*\b(aluno|pessoa|participante|dele|dela)\b)/,
    exemplos: ['como mudo minha senha', 'esqueci minha senha'],
    resposta: 'Para a sua senha de facilitador: saia da conta e, na tela de login, clique em "Esqueci a senha" — chega um link para o seu e-mail. Se você entra com o Google, a senha é a da sua conta Google. Se a dúvida for a senha de um aluno, pergunte "senha do aluno".',
  },
  {
    id: 'senha_aluno',
    re: /\bsenha|resetar? .*acesso|esqueceu/,
    exemplos: ['senha do aluno', 'aluno esqueceu a senha'],
    resposta: 'Para redefinir a senha de um aluno: na aba Alunos, clique no botão "Senha" ao lado dele. O app gera um link de redefinição para você mandar pelo WhatsApp, sem depender de e-mail. A pessoa abre o link e escolhe a nova senha.',
  },
  {
    id: 'converter_conta',
    re: /convert\w*|tornar conta|virar conta|transform\w* .*\bconta\b|avaliado em (conta|aluno)/,
    exemplos: ['tornar conta', 'converter avaliado em aluno'],
    resposta: 'Para transformar um avaliado sem conta em aluno: na aba Alunos, use "Tornar conta". O perfil já respondido vai junto e você recebe um link de senha para mandar à pessoa.',
  },

  // ── Ranking (até a Fase 3 existir, orienta para o Comparativo) ──
  {
    id: 'ranking',
    re: /\bquem (tem|e|sao|esta|estao|ficou)\b.*\b(mais|menos|maior|menor|melhor|pior)\b|\branking\b|\bordenar\b|\bdo maior para o menor\b/,
    exemplos: ['quem tem o PQ mais baixo', 'quem são os mais influentes', 'ranking da turma'],
    resposta: 'Ainda não faço ranking por pessoa aqui no chat. O lugar certo é Grupos › a turma › aba Comparativo: clique no cabeçalho D, I, S, C ou PQ para ordenar do maior para o menor, e use os chips de perfil para filtrar. Dá também para exportar para o Excel. Para uma pessoa específica, pergunte "o que fazer com [nome]?".',
  },

  // ── Relatórios, comparativo, exportação ──
  {
    id: 'comparativo',
    re: /\bcomparativo\b|tabela da turma|\bcsv\b|excel|planilha|exportar (a )?turma/,
    exemplos: ['como exporto para excel', 'comparativo da turma'],
    resposta: 'O Comparativo (Grupos › a turma › aba Comparativo) mostra uma linha por pessoa que concluiu, com D/I/S/C, PQ, perfil e data. Dá para ordenar, filtrar por perfil dominante e exportar CSV que abre direto no Excel. No topo fica o card "Próximo foco da turma", que aplica um teste dirigido a todos de uma vez.',
  },
  {
    id: 'relatorio',
    re: /\brelatorio|exportar|\bpdf\b|imprimir/,
    exemplos: ['onde vejo o relatório', 'exportar pdf'],
    resposta: 'O Relatório Oficial de cada pessoa abre pela aba Alunos (clique no nome) ou por Grupos › a turma › Membros. Lá ficam o perfil DISC, PQ e sabotadores, a análise com IA, a sua observação e o próximo passo (§ 3.3). As respostas com números aqui do chat têm o botão "Exportar PDF".',
  },

  // ── Testes dirigidos e reavaliação ──
  {
    id: 'reavaliacao',
    re: /(fazer|faco|aplicar|aplico|refazer|marcar|agendar) (uma |a )?reavaliac\w*|refazer (a )?avaliacao|avaliar de novo|nova avaliacao (da|do|de) mesm/,
    exemplos: ['como faço uma reavaliação', 'refazer a avaliação'],
    resposta: 'Há dois caminhos:\n• Teste dirigido (o mais comum): 12 perguntas sobre um foco só. Relatório Oficial da pessoa › § 3.3 › "Aplicar"; para a turma inteira, Grupos › Comparativo › "Próximo foco da turma". O resultado fica comparável ao anterior.\n• Avaliação completa de novo: a pessoa refaz as 78 questões. O resultado anterior não se perde — vira um ciclo na Linha do Tempo (Central › Pessoas & Histórico), com o antes e depois.\nPergunte "quem está em reavaliação?" para ver o que está em andamento.',
  },
  {
    id: 'testes_dirigidos',
    re: /o que (e|sao) (os |um )?testes? dirigid|como (funciona|aplico|aplicar) (o |um )?teste dirigid|\bcatalogo de testes\b|quais (sao )?os testes (dirigidos )?(existem|disponiveis|do app)/,
    exemplos: ['o que são os testes dirigidos', 'como aplico um teste dirigido'],
    resposta: 'Testes Dirigidos são questionários curtos (12 perguntas, ~3 min) que aprofundam UM foco apontado pelo perfil: Assertividade e limites, Delegação e escuta, Equilíbrio e propósito, Decisão sob pressão, Foco e conclusão, Autocrítica e feedback e Fundamentos de inteligência positiva. Metade dos itens é invertida, então "concordar com tudo" não infla o resultado. Para aplicar a uma pessoa: Relatório Oficial › § 3.3 › "Aplicar". Para a turma: Grupos › Comparativo › "Próximo foco da turma".',
  },
  {
    id: 'motor_abordagem',
    re: /motor de abordagem|como (voce|vc|o app) (sugere|escolhe|decide)|por que (esse|este) teste|regra r\d/,
    exemplos: ['como você escolhe o teste', 'motor de abordagem'],
    resposta: 'O próximo passo vem de regras fixas (sem IA): PQ abaixo de 60 → Fundamentos; sabotador mais intenso acima de 65 → o teste ligado a ele (Prestativo → Assertividade, Controlador/Insistente → Delegação, Hiper-Realizador → Equilíbrio, Esquivo → Decisão, Inquieto → Foco, Juiz/Vítima → Feedback); só DISC → pela dimensão mais extrema; teste já aplicado → passa ao próximo sinal. Toda sugestão guarda o id da regra e a versão, então dá para saber depois por que aquele teste foi escolhido.',
  },
  {
    id: 'linha_do_tempo',
    re: /linha do tempo|historico (da|de|do) pessoa|onde vejo a evolucao|historico de avaliac/,
    exemplos: ['linha do tempo', 'onde vejo a evolução'],
    resposta: 'Refazer a avaliação não apaga o resultado anterior: cada avaliação vira um ciclo, e a Linha do Tempo (Central › Pessoas & Histórico) mostra ciclo a ciclo com a variação de D/I/S/C e PQ, além dos testes dirigidos. O aluno vê a própria evolução em Meu Perfil › Histórico. Pergunte "como a [nome] evoluiu?".',
  },

  // ── Conceitos ──
  {
    id: 'disc',
    re: /\bdisc\b|\bmetodologia\b|\bperfis comportamentais\b/,
    tipos: ['conceito'],
    exemplos: ['o que é DISC'],
    resposta: 'DISC é a metodologia comportamental das avaliações. Mapeia quatro perfis: Dominante (resultado e decisão), Influente (comunicação e entusiasmo), Estável (consistência e harmonia) e Analítico (precisão e qualidade). As 28 questões DISC dão uma nota de 0 a 100 em cada eixo; o maior é o perfil primário, o segundo é o secundário. Ninguém é um perfil só — a combinação é que conta.',
  },
  {
    id: 'pq_score',
    re: /\bpq\b|\bpq ?score\b|inteligencia positiva|quociente/,
    tipos: ['conceito'],
    exemplos: ['o que significa PQ score', 'o que é inteligência positiva'],
    resposta: 'PQ Score (Quociente de Inteligência Positiva) mostra quanto os sabotadores interferem no dia a dia: quanto MAIOR, menor a interferência. Vai de 0 a 100 e é calculado a partir dos 3 sabotadores mais fortes da pessoa. Acima de 75 é saudável; entre 60 e 75 pede atenção; abaixo de 60 o motor sugere o teste "Fundamentos de inteligência positiva".',
  },
  {
    id: 'sabotadores',
    re: /\bsabotador\w*\b/,
    tipos: ['conceito', 'orientacao'],
    exemplos: ['o que são os sabotadores'],
    resposta: `Sabotadores são padrões mentais que atrapalham a performance. A avaliação mede a intensidade de 10: ${Object.values(SABOTADORES_DATA).map((s) => s.label).join(', ')}. O Juiz é o principal (aparece em quase todo mundo); os outros variam de pessoa para pessoa. Pergunte "o que é o [nome do sabotador]?" para ver gatilhos e como lidar.`,
  },
  {
    id: 'social_style',
    re: /social style|\bocai\b|\bmodulos?\b/,
    exemplos: ['o que é social style', 'módulos'],
    resposta: 'O Social Style aparece no Relatório Oficial (§ 2.1) e no Meu Perfil: é calculado a partir do DISC, sem questionário extra — Condutor, Expressivo, Amigável ou Analítico. Em Módulos você monta avaliações personalizadas; hoje só o modelo DiSC tem cálculo e relatório, OCAI e Custom estão marcados como "em breve".',
  },

  // ── App ──
  {
    id: 'app_lento',
    re: /\b(lento|demorando|demora|travando|travou|nao carrega|carregando|nao abre|caiu|fora do ar)\b/,
    exemplos: ['o app está lento', 'não carrega'],
    resposta: 'Algumas coisas resolvem quase sempre:\n• Recarregue a página (e, se aparecer o aviso de atualização, aceite).\n• Confira a internet — o app avisa quando o servidor não responde, em vez de ficar carregando para sempre.\n• Se persistir, a aba Central › Diagnóstico mostra os erros recentes do app. Pergunte "está tudo certo?" para eu checar os seus dados.',
  },
  {
    id: 'central',
    re: /\bcentral (de gestao)?\b|\bauditoria\b|\btrilha\b|\bobservabilidade\b/,
    exemplos: ['o que tem na central', 'trilha de auditoria'],
    resposta: 'A Central de Gestão tem quatro abas: Visão Geral (volume e conclusão do período), Pessoas & Histórico (situação de cada pessoa, linha do tempo e trilha de auditoria), Inteligência de Grupos (DISC, PQ e sabotadores por grupo) e Diagnóstico (erros do app e perguntas que eu não entendi).',
  },
  {
    id: 'notificacoes',
    re: /\bnotificac\w*|aviso sonoro|\bbeep\b|\bsom\b|\be-?mail (de|da) (devolutiva|conclusao)/,
    exemplos: ['notificações', 'desligar o som'],
    resposta: 'As preferências de som, avisos e e-mail de conclusão ficam em Configurações. Quando alguém conclui, a pessoa e você recebem a devolutiva por e-mail (se houver e-mail cadastrado).',
  },
];

// ─── Entradas GERADAS: perfis DISC ──────────────────────────────────────────

const DISC_RE = {
  D: 'dominan\\w*',
  I: 'influen\\w*',
  S: 'estave\\w*|estavel',
  C: 'analitic\\w*',
};

// Dicas de devolutiva por perfil (o resto vem de DISC_PROFILES).
const DEVOLUTIVA = {
  D: 'Vá direto ao ponto, comece pelo resultado e pelos números, e dê opções em vez de ordens. Aponte os riscos como obstáculos para a meta da pessoa, não como defeitos.',
  I: 'Comece pelo reconhecimento e por uma conversa leve, use exemplos e histórias. Feche com combinados concretos e por escrito — o Influente se empolga e esquece o detalhe.',
  S: 'Prepare o terreno: avise antes, fale com calma e em particular. Mostre que a mudança é gradual e que vai ter apoio. Pergunte e espere: esse perfil raramente discorda em voz alta.',
  C: 'Leve dados e o método: como o perfil foi calculado, o que cada número quer dizer. Dê tempo para a pessoa analisar e responder depois. Seja preciso; exagero ou generalização derrubam a confiança.',
};

const PERFIS = Object.entries(DISC_PROFILES).flatMap(([k, p]) => {
  const nome = DISC_RE[k];
  return [
    {
      id: `lidar_${k}`,
      re: new RegExp(`\\b(${nome})\\b`),
      tipos: ['orientacao'],
      exemplos: [`como lidar com alguém ${norm(p.label)}`, `devolutiva para perfil ${norm(p.label)}`],
      resposta: `Com um perfil ${p.label}:\n• Comunicação: ${p.communicationStyle.toLowerCase()}.\n• O que motiva: ${lista(p.motivations)}. O que teme: ${lista(p.fears)}.\n• Sob pressão: ${p.underPressure.toLowerCase()}.\n• Devolutiva: ${DEVOLUTIVA[k]}\nPara uma pessoa específica, pergunte "o que fazer com [nome]?" que eu trago o próximo passo dela.`,
    },
    {
      id: `perfil_${k}`,
      re: new RegExp(`\\b(${nome})\\b`),
      tipos: ['conceito'],
      exemplos: [`o que é um perfil ${norm(p.label)}`],
      resposta: `Perfil ${p.label}: ${lista(p.strengths, 4)}. ${p.leadership}. Pontos de atenção: ${lista(p.weaknesses)}. Motivações: ${lista(p.motivations)}. Pergunte "como lidar com um ${p.label}?" para dicas de conversa e devolutiva.`,
    },
  ];
});

// ─── Entradas GERADAS: sabotadores ──────────────────────────────────────────

const SABOTADORES = Object.values(SABOTADORES_DATA).map((s) => {
  const nome = norm(s.label).replace(/-/g, '[- ]?');
  return {
    id: `sab_${s.key}`,
    re: new RegExp(`\\b${nome}\\b`),
    tipos: ['conceito', 'orientacao'],
    exemplos: [`o que é o ${norm(s.label)}`, `como lidar com o sabotador ${norm(s.label)}`],
    resposta: `Sabotador ${s.label}: ${s.description.charAt(0).toLowerCase()}${s.description.slice(1)}.\n• Gatilhos: ${lista(s.triggers)}.\n• Como aparece: ${lista(s.impact)}.\n• Como lidar: ${lista(s.coping)}.`,
  };
});

// Sabotadores e perfis antes das manuais genéricas de conceito ("sabotadores",
// "disc"), para "o que é o juiz" não cair na explicação geral.
export const CONHECIMENTO = [...MANUAIS.slice(0, 6), ...SABOTADORES, ...PERFIS, ...MANUAIS.slice(6)];

// ─── Busca ──────────────────────────────────────────────────────────────────

/**
 * Primeira entrada cujo `re` casa e cujo `tipos` aceita o tipo da pergunta.
 * @param {string} perguntaNorm  texto já normalizado
 * @param {string} tipo          resultado de classificarTipo
 * @returns {object|null}        a entrada (use `respostaDe` para o texto)
 */
export function buscarConhecimento(perguntaNorm, tipo) {
  for (const e of CONHECIMENTO) {
    if (e.soCurta && perguntaNorm.length >= 25) continue;
    if (e.tipos && !e.tipos.includes(tipo)) continue;
    if (e.re.test(perguntaNorm)) return e;
  }
  return null;
}

export function respostaDe(entrada) {
  return typeof entrada.resposta === 'function' ? entrada.resposta() : entrada.resposta;
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'como', 'que', 'eu', 'com', 'para', 'pra', 'no', 'na', 'em', 'meu', 'minha', 'qual', 'quais', 'se', 'por', 'mais']);
const toks = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));

/** As `n` entradas cujos exemplos mais se parecem com a pergunta (fallback). */
export function sugerirProximas(perguntaNorm, n = 3) {
  const pt = new Set(toks(perguntaNorm));
  if (pt.size === 0) return [];
  const pontuadas = [];
  for (const e of CONHECIMENTO) {
    if (!e.exemplos) continue;
    let melhor = 0;
    for (const ex of e.exemplos) {
      const et = toks(ex);
      // prefixo de 5 letras: "reenvio" ~ "reenviar", "grupos" ~ "grupo"
      const comuns = et.filter((t) => pt.has(t) || [...pt].some((q) => q.length >= 5 && t.length >= 5 && q.slice(0, 5) === t.slice(0, 5))).length;
      if (comuns > melhor) melhor = comuns;
    }
    if (melhor > 0) pontuadas.push({ e, melhor });
  }
  return pontuadas.sort((a, b) => b.melhor - a.melhor).slice(0, n).map((x) => x.e.exemplos[0]);
}
