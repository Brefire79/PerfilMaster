/**
 * sampleQuestions.js — FONTE ÚNICA das 78 questões da avaliação Completa.
 *
 * 28 DISC (7 por dimensão D/I/S/C, ids q_<dim>_01..07) + 50 Sabotadores
 * (5 por tipo, ids q_sab_<slug>_01..05). Todas do tipo likert5 (1-5).
 *
 * Texto só em PT-BR (app monolíngue desde jul/2026 — en/es removidos em
 * 17/09/2026 para tirar ~20 KB do bundle da avaliação pública).
 * Revisão de 17/09/2026: cada item mede UMA ideia, sem duplo enunciado, e
 * evita marcação de gênero ("energizado", "frustrado") sempre que possível.
 * Ids e pesos NÃO mudaram — o Edge atualizarStatus continua em sincronia.
 *
 * ATENÇÃO — espelhos que precisam ficar em sincronia ao mudar qualquer questão:
 *   - supabase/functions/atualizarStatus/index.ts (ids/pesos DISC + slugs sab)
 *   - src/lib/discScoring.js (lê pesos daqui em runtime — sincroniza sozinho)
 *   - src/lib/saboteurScoring.js (mapeia por `dimension` SAB_*)
 */

// DISC-V2 (19/09/2026): 8 dos 28 itens DISC são INVERTIDOS (`invertido: true`,
// concordar = menos da dimensão; o scoring aplica 6 − valor). Reduz o viés de
// aquiescência do v1 (quem concordava com tudo saía com 4 perfis altos). Ids e
// pesos intocados. Perfis gravados carregam `discVersao`; comparar ciclos de
// versões diferentes é aproximado. Mudou item DISC → suba DISC_VERSAO.
export const DISC_VERSAO = 2;

export const SAMPLE_QUESTIONS = [
  // ─── D — Dominante ────────────────────────────────────────────────────────

  {
    id: 'q_d_01',
    difficulty: 1,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro tomar decisões rapidamente, mesmo com informações incompletas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_d_02',
    difficulty: 1,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Diante de um obstáculo, prefiro esperar que outra pessoa tome a frente.',
    },
    options: null,
    weight: 1.0,
    invertido: true, // DISC-V2: concordar = MENOS D (6 − valor no scoring)
  },
  {
    id: 'q_d_03',
    difficulty: 2,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Em situações de conflito, costumo confrontar o problema diretamente em vez de esperar que se resolva.',
    },
    options: null,
    weight: 1.2,
  },
  {
    id: 'q_d_04',
    difficulty: 2,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Assumo riscos calculados com tranquilidade para alcançar resultados melhores.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_d_05',
    difficulty: 3,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Quando a equipe trava diante de um prazo urgente, eu decido e aciono a execução, mesmo sem consenso.',
    },
    options: null,
    weight: 1.5,
  },
  {
    id: 'q_d_06',
    difficulty: 3,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Quando identifico que uma estratégia está errada, questiono a liderança abertamente mesmo que isso gere tensão.',
    },
    options: null,
    weight: 1.5,
  },

  // ─── I — Influente ────────────────────────────────────────────────────────

  {
    id: 'q_i_01',
    difficulty: 1,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Ganho energia em ambientes com muitas pessoas e interações.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_i_02',
    difficulty: 1,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Ao apresentar uma ideia, falo de forma contida, sem tentar empolgar quem está ouvindo.',
    },
    options: null,
    weight: 1.0,
    invertido: true, // DISC-V2: concordar = MENOS I (6 − valor no scoring)
  },
  {
    id: 'q_i_03',
    difficulty: 2,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Minha motivação cresce quando posso trabalhar com pessoas diferentes e criar conexões durante um projeto.',
    },
    options: null,
    weight: 1.2,
  },
  {
    id: 'q_i_04',
    difficulty: 2,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Tenho facilidade em manter conversas com pessoas que acabei de conhecer.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_i_05',
    difficulty: 3,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Para defender uma ideia impopular, aposto em uma história envolvente que contagie as pessoas.',
    },
    options: null,
    weight: 1.5,
  },
  {
    id: 'q_i_06',
    difficulty: 3,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Adapto meu jeito de falar, quase sem pensar, ao humor e ao estilo de quem está na minha frente.',
    },
    options: null,
    weight: 1.5,
  },

  // ─── S — Estável ──────────────────────────────────────────────────────────

  {
    id: 'q_s_01',
    difficulty: 1,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro ambientes de trabalho estáveis com rotinas bem definidas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_s_02',
    difficulty: 1,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro que cada um resolva os próprios problemas no trabalho, sem depender do apoio dos colegas.',
    },
    options: null,
    weight: 1.0,
    invertido: true, // DISC-V2: concordar = MENOS S (6 − valor no scoring)
  },
  {
    id: 'q_s_03',
    difficulty: 2,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Quando um colega erra, minha primeira reação é oferecer ajuda sem julgá-lo.',
    },
    options: null,
    weight: 1.2,
  },
  {
    id: 'q_s_04',
    difficulty: 2,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Evito mudanças abruptas no trabalho e prefiro transições graduais e planejadas.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_s_05',
    difficulty: 3,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Diante de uma grande mudança na organização, minha prioridade é dar apoio a quem está inseguro.',
    },
    options: null,
    weight: 1.5,
  },
  {
    id: 'q_s_06',
    difficulty: 3,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Mantenho o mesmo ritmo e a mesma calma mesmo sob pressão intensa.',
    },
    options: null,
    weight: 1.5,
  },

  // ─── C — Analítico ────────────────────────────────────────────────────────

  {
    id: 'q_c_01',
    difficulty: 1,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Antes de tomar uma decisão, preciso coletar e analisar todos os dados disponíveis.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_c_02',
    difficulty: 1,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Entregar algo "bom o bastante" no prazo me satisfaz mais do que lapidar até ficar perfeito.',
    },
    options: null,
    weight: 1.0,
    invertido: true, // DISC-V2: concordar = MENOS C (6 − valor no scoring)
  },
  {
    id: 'q_c_03',
    difficulty: 2,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Ao revisar um trabalho, verifico cada detalhe para garantir precisão mesmo que isso tome mais tempo.',
    },
    options: null,
    weight: 1.2,
  },
  {
    id: 'q_c_04',
    difficulty: 2,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Trabalho melhor quando existe um processo claro e documentado para seguir.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_c_05',
    difficulty: 3,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Se encontro uma falha crítica antes de um lançamento, recomendo adiar e sustento a decisão com dados, mesmo sob pressão.',
    },
    options: null,
    weight: 1.5,
  },
  {
    id: 'q_c_06',
    difficulty: 3,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Quando recebo uma diretriz que contradiz minha análise, questiono com dados antes de aceitar.',
    },
    options: null,
    weight: 1.5,
  },

  // ─── DISC extras (q_d_07, q_i_07, q_s_07, q_c_07) — completar 28 total ──

  {
    id: 'q_d_07',
    difficulty: 2,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Fico mais à vontade seguindo a direção de outra pessoa do que assumindo o comando.',
    },
    options: null,
    weight: 1.1,
    invertido: true, // DISC-V2: concordar = MENOS D (6 − valor no scoring)
  },
  {
    id: 'q_i_07',
    difficulty: 2,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Em um grupo animado, costumo ficar quieto e observar em vez de puxar a energia.',
    },
    options: null,
    weight: 1.1,
    invertido: true, // DISC-V2: concordar = MENOS I (6 − valor no scoring)
  },
  {
    id: 'q_s_07',
    difficulty: 2,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Trocar de equipe ou de parceiros de trabalho com frequência me parece natural, até estimulante.',
    },
    options: null,
    weight: 1.1,
    invertido: true, // DISC-V2: concordar = MENOS S (6 − valor no scoring)
  },
  {
    id: 'q_c_07',
    difficulty: 2,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro começar a fazer e ajustar no caminho a planejar tudo em listas e processos antes.',
    },
    options: null,
    weight: 1.1,
    invertido: true, // DISC-V2: concordar = MENOS C (6 − valor no scoring)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 2 — SABOTADORES (50 questões · 5 por tipo · 10 tipos)
  // Baseado no modelo Positive Intelligence (Shirzad Chamine)
  // Índices 28–77 no array total
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Juiz (Judge) ─────────────────────────────────────────────────────────

  {
    id: 'q_sab_judge_01',
    difficulty: 1,
    dimension: 'SAB_JUDGE',
    type: 'likert5',
    text: {
      ptBR: 'Costumo criticar meus próprios erros de forma intensa e repetida.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_judge_02',
    difficulty: 1,
    dimension: 'SAB_JUDGE',
    type: 'likert5',
    text: {
      ptBR: 'Julgo rapidamente outras pessoas quando elas cometem erros ou não correspondem às minhas expectativas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_judge_03',
    difficulty: 2,
    dimension: 'SAB_JUDGE',
    type: 'likert5',
    text: {
      ptBR: 'Fico preso pensando no que poderia ter feito diferente em situações passadas.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_judge_04',
    difficulty: 2,
    dimension: 'SAB_JUDGE',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em aceitar situações difíceis sem atribuir culpa a alguém.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_judge_05',
    difficulty: 3,
    dimension: 'SAB_JUDGE',
    type: 'likert5',
    text: {
      ptBR: 'Minha voz interior tende a focar nos aspectos negativos e nas falhas antes de reconhecer o que foi bem.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Evitador (Avoider) ───────────────────────────────────────────────────

  {
    id: 'q_sab_avoider_01',
    difficulty: 1,
    dimension: 'SAB_AVOIDER',
    type: 'likert5',
    text: {
      ptBR: 'Tenho tendência a evitar conversas difíceis ou situações de conflito.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_avoider_02',
    difficulty: 1,
    dimension: 'SAB_AVOIDER',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro adiar decisões desconfortáveis em vez de enfrentá-las diretamente.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_avoider_03',
    difficulty: 2,
    dimension: 'SAB_AVOIDER',
    type: 'likert5',
    text: {
      ptBR: 'Quando surge um problema interpessoal, minha tendência é esperar que ele se resolva sozinho.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_avoider_04',
    difficulty: 2,
    dimension: 'SAB_AVOIDER',
    type: 'likert5',
    text: {
      ptBR: 'Foco nas coisas positivas e agradáveis para não ter que lidar com o que é difícil.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_avoider_05',
    difficulty: 3,
    dimension: 'SAB_AVOIDER',
    type: 'likert5',
    text: {
      ptBR: 'Sinto desconforto intenso ao ter que dar feedbacks negativos ou impor limites a outras pessoas.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Controlador (Controller) ─────────────────────────────────────────────

  {
    id: 'q_sab_controller_01',
    difficulty: 1,
    dimension: 'SAB_CONTROLLER',
    type: 'likert5',
    text: {
      ptBR: 'Sinto ansiedade quando não tenho controle sobre como as coisas estão sendo feitas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_controller_02',
    difficulty: 1,
    dimension: 'SAB_CONTROLLER',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro fazer as coisas do meu jeito a delegar e arriscar que saiam erradas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_controller_03',
    difficulty: 2,
    dimension: 'SAB_CONTROLLER',
    type: 'likert5',
    text: {
      ptBR: 'Me frustra quando outras pessoas não seguem a minha maneira de conduzir as tarefas.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_controller_04',
    difficulty: 2,
    dimension: 'SAB_CONTROLLER',
    type: 'likert5',
    text: {
      ptBR: 'Em situações de incerteza, sinto um forte impulso de assumir o controle.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_controller_05',
    difficulty: 3,
    dimension: 'SAB_CONTROLLER',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em confiar que as coisas vão dar certo sem minha intervenção direta.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Hiper-Realizador (Hyper-Achiever) ───────────────────────────────────

  {
    id: 'q_sab_hyperach_01',
    difficulty: 1,
    dimension: 'SAB_HYPER_ACHIEVER',
    type: 'likert5',
    text: {
      ptBR: 'Meu senso de valor pessoal está fortemente ligado às minhas conquistas e resultados.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hyperach_02',
    difficulty: 1,
    dimension: 'SAB_HYPER_ACHIEVER',
    type: 'likert5',
    text: {
      ptBR: 'Sinto desconforto quando não estou progredindo ou atingindo metas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hyperach_03',
    difficulty: 2,
    dimension: 'SAB_HYPER_ACHIEVER',
    type: 'likert5',
    text: {
      ptBR: 'Preciso que reconheçam meus resultados para me sentir bem comigo.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hyperach_04',
    difficulty: 2,
    dimension: 'SAB_HYPER_ACHIEVER',
    type: 'likert5',
    text: {
      ptBR: 'Raramente me permito descansar ou celebrar sem já estar pensando na próxima meta.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hyperach_05',
    difficulty: 3,
    dimension: 'SAB_HYPER_ACHIEVER',
    type: 'likert5',
    text: {
      ptBR: 'Sinto que meu valor como pessoa depende do quanto produzo e do sucesso que alcanço.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Hiper-Racional (Hyper-Rational) ─────────────────────────────────────

  {
    id: 'q_sab_hyperrat_01',
    difficulty: 1,
    dimension: 'SAB_HYPER_RATIONAL',
    type: 'likert5',
    text: {
      ptBR: 'Confio muito mais na lógica e nos dados do que nas emoções para tomar decisões.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hyperrat_02',
    difficulty: 1,
    dimension: 'SAB_HYPER_RATIONAL',
    type: 'likert5',
    text: {
      ptBR: 'Acho desconfortável quando as discussões se tornam emocionais em vez de objetivas.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hyperrat_03',
    difficulty: 2,
    dimension: 'SAB_HYPER_RATIONAL',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em entender por que as pessoas deixam as emoções interferirem em decisões racionais.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hyperrat_04',
    difficulty: 2,
    dimension: 'SAB_HYPER_RATIONAL',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro analisar um problema sozinho a lidar com as emoções envolvidas em um grupo.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hyperrat_05',
    difficulty: 3,
    dimension: 'SAB_HYPER_RATIONAL',
    type: 'likert5',
    text: {
      ptBR: 'Pessoas próximas já me disseram que pareço uma pessoa fria ou distante emocionalmente.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Hiper-Vigilante (Hyper-Vigilant) ────────────────────────────────────

  {
    id: 'q_sab_hypervig_01',
    difficulty: 1,
    dimension: 'SAB_HYPER_VIGILANT',
    type: 'likert5',
    text: {
      ptBR: 'Estou frequentemente alerta para possíveis riscos ou problemas que podem surgir.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hypervig_02',
    difficulty: 1,
    dimension: 'SAB_HYPER_VIGILANT',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em relaxar porque minha mente sempre identifica o que pode dar errado.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_hypervig_03',
    difficulty: 2,
    dimension: 'SAB_HYPER_VIGILANT',
    type: 'likert5',
    text: {
      ptBR: 'Costumo antecipar cenários negativos mesmo em situações que parecem seguras.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hypervig_04',
    difficulty: 2,
    dimension: 'SAB_HYPER_VIGILANT',
    type: 'likert5',
    text: {
      ptBR: 'A sensação de que algo pode dar errado me faz gastar muita energia preventiva.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_hypervig_05',
    difficulty: 3,
    dimension: 'SAB_HYPER_VIGILANT',
    type: 'likert5',
    text: {
      ptBR: 'Mesmo quando tudo vai bem, fico com a sensação de que algo ainda pode sair errado.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Agradador (Pleaser) ──────────────────────────────────────────────────

  {
    id: 'q_sab_pleaser_01',
    difficulty: 1,
    dimension: 'SAB_PLEASER',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em dizer não quando alguém pede ajuda, mesmo que isso me sobrecarregue.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_pleaser_02',
    difficulty: 1,
    dimension: 'SAB_PLEASER',
    type: 'likert5',
    text: {
      ptBR: 'Me abala perceber que alguém está desapontado comigo.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_pleaser_03',
    difficulty: 2,
    dimension: 'SAB_PLEASER',
    type: 'likert5',
    text: {
      ptBR: 'Costumo colocar as necessidades dos outros antes das minhas para manter a harmonia.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_pleaser_04',
    difficulty: 2,
    dimension: 'SAB_PLEASER',
    type: 'likert5',
    text: {
      ptBR: 'Evito expressar opiniões contrárias para não criar conflito ou desagradar as pessoas.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_pleaser_05',
    difficulty: 3,
    dimension: 'SAB_PLEASER',
    type: 'likert5',
    text: {
      ptBR: 'Sinto que minha aceitação e aprovação pelos outros dependem de quanto faço por eles.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Agitado (Restless) ───────────────────────────────────────────────────

  {
    id: 'q_sab_restless_01',
    difficulty: 1,
    dimension: 'SAB_RESTLESS',
    type: 'likert5',
    text: {
      ptBR: 'Sinto tédio ou inquietação quando não há novidades, desafios ou estímulos constantes.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_restless_02',
    difficulty: 1,
    dimension: 'SAB_RESTLESS',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em manter o foco em uma tarefa por um longo período sem buscar algo novo.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_restless_03',
    difficulty: 2,
    dimension: 'SAB_RESTLESS',
    type: 'likert5',
    text: {
      ptBR: 'Começo muitos projetos com entusiasmo, mas perco o interesse antes de concluí-los.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_restless_04',
    difficulty: 2,
    dimension: 'SAB_RESTLESS',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro atividades que oferecem variedade e novidade a rotinas previsíveis.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_restless_05',
    difficulty: 3,
    dimension: 'SAB_RESTLESS',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em simplesmente estar presente no momento sem pensar no que vem a seguir.',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Perfeccionista (Stickler) ────────────────────────────────────────────

  {
    id: 'q_sab_stickler_01',
    difficulty: 1,
    dimension: 'SAB_STICKLER',
    type: 'likert5',
    text: {
      ptBR: 'Tenho padrões muito altos e me incomoda quando as coisas não atingem o nível esperado.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_stickler_02',
    difficulty: 1,
    dimension: 'SAB_STICKLER',
    type: 'likert5',
    text: {
      ptBR: 'Refaço trabalhos que já estavam bons porque ainda dava para ficar melhor.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_stickler_03',
    difficulty: 2,
    dimension: 'SAB_STICKLER',
    type: 'likert5',
    text: {
      ptBR: 'A desordem ou falta de organização ao meu redor me causa estresse e dificulta minha concentração.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_stickler_04',
    difficulty: 2,
    dimension: 'SAB_STICKLER',
    type: 'likert5',
    text: {
      ptBR: 'Me irrita quando regras, procedimentos ou padrões não são seguidos corretamente.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_stickler_05',
    difficulty: 3,
    dimension: 'SAB_STICKLER',
    type: 'likert5',
    text: {
      ptBR: 'Meu perfeccionismo às vezes me impede de concluir ou entregar trabalhos porque nunca parecem "bons o suficiente".',
    },
    options: null,
    weight: 1.3,
  },

  // ─── Vítima (Victim) ──────────────────────────────────────────────────────

  {
    id: 'q_sab_victim_01',
    difficulty: 1,
    dimension: 'SAB_VICTIM',
    type: 'likert5',
    text: {
      ptBR: 'Quando algo dá errado, sinto que as circunstâncias ou outras pessoas são as principais responsáveis.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_victim_02',
    difficulty: 1,
    dimension: 'SAB_VICTIM',
    type: 'likert5',
    text: {
      ptBR: 'Sinto que minha vida seria muito diferente se as circunstâncias ao meu redor fossem diferentes.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_sab_victim_03',
    difficulty: 2,
    dimension: 'SAB_VICTIM',
    type: 'likert5',
    text: {
      ptBR: 'Costumo reclamar ou desabafar sobre problemas com mais frequência do que agir para resolvê-los.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_victim_04',
    difficulty: 2,
    dimension: 'SAB_VICTIM',
    type: 'likert5',
    text: {
      ptBR: 'Tenho dificuldade em ver como minhas próprias escolhas contribuíram para situações negativas.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_sab_victim_05',
    difficulty: 3,
    dimension: 'SAB_VICTIM',
    type: 'likert5',
    text: {
      ptBR: 'Com frequência sinto que as pessoas não me compreendem ou me tratam de forma injusta no trabalho e nos relacionamentos.',
    },
    options: null,
    weight: 1.3,
  },
];

/** Estimated total questions in a typical adaptive assessment session */
export const ESTIMATED_TOTAL = 20;

/** Minimum questions before completion is allowed */
export const MIN_QUESTIONS = 20;

/** Minimum answers per dimension before completion */
export const MIN_PER_DIMENSION = 3;
