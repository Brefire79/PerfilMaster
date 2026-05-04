/**
 * sampleQuestions.js
 *
 * 24 sample DISC assessment questions used as fallback when no Firestore data exists.
 * Distribution: 6 per dimension (D/I/S/C), 2 per difficulty level (1/2/3).
 * Types mixed across: likert5, forced_choice, scenario.
 */

export const SAMPLE_QUESTIONS = [
  // ─── D — Dominante ────────────────────────────────────────────────────────

  {
    id: 'q_d_01',
    difficulty: 1,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro tomar decisões rapidamente, mesmo com informações incompletas.',
      es: 'Prefiero tomar decisiones rápidamente, incluso con información incompleta.',
      en: 'I prefer making decisions quickly, even with incomplete information.',
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
      ptBR: 'Quando há um obstáculo no caminho, meu primeiro impulso é superá-lo diretamente.',
      es: 'Cuando hay un obstáculo en el camino, mi primer impulso es superarlo directamente.',
      en: 'When there is an obstacle in the way, my first impulse is to overcome it directly.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_d_03',
    difficulty: 2,
    dimension: 'D',
    type: 'forced_choice',
    text: {
      ptBR: 'Em uma situação de conflito no trabalho, qual abordagem você tende a adotar?',
      es: '¿En una situación de conflicto en el trabajo, qué enfoque tiende a adoptar?',
      en: 'In a work conflict situation, which approach do you tend to take?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Assumo o controle e resolvo diretamente com a pessoa envolvida.',
          es: 'Tomo el control y lo resuelvo directamente con la persona involucrada.',
          en: 'I take control and resolve it directly with the person involved.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Aguardo o momento certo para abordar o assunto com cuidado.',
          es: 'Espero el momento adecuado para abordar el tema con cuidado.',
          en: 'I wait for the right moment to address the matter carefully.',
        },
      },
    ],
    weight: 1.2,
  },
  {
    id: 'q_d_04',
    difficulty: 2,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Sinto-me confortável assumindo riscos calculados para atingir resultados superiores.',
      es: 'Me siento cómodo asumiendo riesgos calculados para lograr resultados superiores.',
      en: 'I feel comfortable taking calculated risks to achieve superior results.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_d_05',
    difficulty: 3,
    dimension: 'D',
    type: 'scenario',
    text: {
      ptBR: 'Sua equipe está dividida sobre qual caminho seguir em um projeto crítico. O prazo é amanhã.',
      es: 'Su equipo está dividido sobre qué camino seguir en un proyecto crítico. El plazo es mañana.',
      en: 'Your team is divided on which path to take in a critical project. The deadline is tomorrow.',
    },
    scenario: {
      ptBR: 'Com a equipe paralisada e o prazo se aproximando, como você age?',
      es: 'Con el equipo paralizado y el plazo acercándose, ¿cómo actúa?',
      en: 'With the team stalled and the deadline approaching, how do you act?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Tomo a decisão sozinho e comunico ao time para executar imediatamente.',
          es: 'Tomo la decisión solo y comunico al equipo para ejecutar de inmediato.',
          en: 'I make the decision alone and communicate it to the team for immediate execution.',
        },
      },
      {
        value: 3,
        label: {
          ptBR: 'Conduzo uma votação rápida e acato a maioria, mas monitoro de perto.',
          es: 'Conduzco una votación rápida y acato la mayoría, pero supervisando de cerca.',
          en: 'I conduct a quick vote and go with the majority, but monitor closely.',
        },
      },
      {
        value: 2,
        label: {
          ptBR: 'Peço ao líder sênior para decidir e me comprometo a apoiar a decisão.',
          es: 'Pido al líder senior que decida y me comprometo a apoyar la decisión.',
          en: 'I ask the senior leader to decide and commit to supporting the decision.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Promovo uma discussão longa para garantir que todos concordem.',
          es: 'Promuevo una discusión larga para asegurar que todos estén de acuerdo.',
          en: 'I promote a long discussion to ensure everyone agrees.',
        },
      },
    ],
    weight: 1.5,
  },
  {
    id: 'q_d_06',
    difficulty: 3,
    dimension: 'D',
    type: 'likert5',
    text: {
      ptBR: 'Quando identifico que uma estratégia está errada, questiono a liderança abertamente mesmo que isso gere tensão.',
      es: 'Cuando identifico que una estrategia está equivocada, cuestiono el liderazgo abiertamente aunque eso genere tensión.',
      en: 'When I identify that a strategy is wrong, I openly question leadership even if it creates tension.',
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
      ptBR: 'Sinto-me energizado ao estar em ambientes com muitas pessoas e interações.',
      es: 'Me siento energizado cuando estoy en entornos con muchas personas e interacciones.',
      en: 'I feel energized when in environments with many people and interactions.',
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
      ptBR: 'Gosto de convencer outras pessoas sobre minhas ideias usando entusiasmo e histórias.',
      es: 'Me gusta convencer a otras personas de mis ideas usando entusiasmo e historias.',
      en: 'I enjoy convincing others about my ideas using enthusiasm and stories.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_i_03',
    difficulty: 2,
    dimension: 'I',
    type: 'forced_choice',
    text: {
      ptBR: 'Ao iniciar um novo projeto, o que mais te motiva?',
      es: '¿Al iniciar un nuevo proyecto, qué es lo que más te motiva?',
      en: 'When starting a new project, what motivates you most?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'A oportunidade de colaborar com pessoas diferentes e criar algo juntos.',
          es: 'La oportunidad de colaborar con personas distintas y crear algo juntos.',
          en: 'The opportunity to collaborate with different people and create something together.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'A clareza do escopo e a previsibilidade do processo a ser seguido.',
          es: 'La claridad del alcance y la previsibilidad del proceso a seguir.',
          en: 'The clarity of the scope and the predictability of the process to follow.',
        },
      },
    ],
    weight: 1.2,
  },
  {
    id: 'q_i_04',
    difficulty: 2,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Tenho facilidade em manter conversas com pessoas que acabei de conhecer.',
      es: 'Tengo facilidad para mantener conversaciones con personas que acabo de conocer.',
      en: 'I find it easy to maintain conversations with people I have just met.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_i_05',
    difficulty: 3,
    dimension: 'I',
    type: 'scenario',
    text: {
      ptBR: 'Você precisa apresentar uma ideia impopular para convencer sua equipe a mudar de direção.',
      es: 'Necesitas presentar una idea impopular para convencer a tu equipo de cambiar de dirección.',
      en: 'You need to present an unpopular idea to convince your team to change direction.',
    },
    scenario: {
      ptBR: 'Como você aborda essa apresentação?',
      es: '¿Cómo abordas esa presentación?',
      en: 'How do you approach this presentation?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Crio uma narrativa envolvente com exemplos inspiradores para gerar entusiasmo.',
          es: 'Creo una narrativa envolvente con ejemplos inspiradores para generar entusiasmo.',
          en: 'I craft an engaging narrative with inspiring examples to generate enthusiasm.',
        },
      },
      {
        value: 3,
        label: {
          ptBR: 'Apresento os dados e deixo os fatos falarem por si mesmos.',
          es: 'Presento los datos y dejo que los hechos hablen por sí mismos.',
          en: 'I present the data and let the facts speak for themselves.',
        },
      },
      {
        value: 2,
        label: {
          ptBR: 'Converso individualmente com cada pessoa antes da reunião para ganhar apoio.',
          es: 'Hablo individualmente con cada persona antes de la reunión para ganar apoyo.',
          en: 'I speak individually with each person before the meeting to gain support.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Prefiro que outra pessoa mais influente apresente a ideia.',
          es: 'Prefiero que otra persona más influyente presente la idea.',
          en: 'I prefer to have a more influential person present the idea.',
        },
      },
    ],
    weight: 1.5,
  },
  {
    id: 'q_i_06',
    difficulty: 3,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Adapto meu estilo de comunicação instintivamente de acordo com o humor e personalidade de quem estou falando.',
      es: 'Adapto instintivamente mi estilo de comunicación según el humor y la personalidad de la persona con quien hablo.',
      en: 'I instinctively adapt my communication style according to the mood and personality of the person I am talking to.',
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
      es: 'Prefiero entornos de trabajo estables con rutinas bien definidas.',
      en: 'I prefer stable work environments with well-defined routines.',
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
      ptBR: 'Sinto satisfação genuína em apoiar colegas de trabalho quando eles precisam de ajuda.',
      es: 'Siento satisfacción genuina al apoyar a compañeros de trabajo cuando necesitan ayuda.',
      en: 'I feel genuine satisfaction in supporting coworkers when they need help.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_s_03',
    difficulty: 2,
    dimension: 'S',
    type: 'forced_choice',
    text: {
      ptBR: 'Quando um colega comete um erro que afeta o time, sua reação natural é:',
      es: 'Cuando un colega comete un error que afecta al equipo, tu reacción natural es:',
      en: 'When a colleague makes a mistake that affects the team, your natural reaction is:',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Oferecer ajuda para corrigir o erro sem fazer julgamentos.',
          es: 'Ofrecer ayuda para corregir el error sin emitir juicios.',
          en: 'Offer help to correct the mistake without making judgments.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Identificar a causa raiz e propor um processo para evitar recorrência.',
          es: 'Identificar la causa raíz y proponer un proceso para evitar recurrencias.',
          en: 'Identify the root cause and propose a process to prevent recurrence.',
        },
      },
    ],
    weight: 1.2,
  },
  {
    id: 'q_s_04',
    difficulty: 2,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Evito mudanças abruptas no trabalho e prefiro transições graduais e planejadas.',
      es: 'Evito los cambios abruptos en el trabajo y prefiero transiciones graduales y planificadas.',
      en: 'I avoid abrupt changes at work and prefer gradual, planned transitions.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_s_05',
    difficulty: 3,
    dimension: 'S',
    type: 'scenario',
    text: {
      ptBR: 'Sua empresa anuncia uma reestruturação que muda completamente sua equipe e função.',
      es: 'Tu empresa anuncia una reestructuración que cambia completamente tu equipo y función.',
      en: 'Your company announces a restructuring that completely changes your team and role.',
    },
    scenario: {
      ptBR: 'Como você reage nos primeiros dias após o anúncio?',
      es: '¿Cómo reaccionas en los primeros días después del anuncio?',
      en: 'How do you react in the first days after the announcement?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Busco entender bem a mudança antes de agir e apoio os colegas que estão inseguros.',
          es: 'Busco entender bien el cambio antes de actuar y apoyo a los colegas que se sienten inseguros.',
          en: 'I seek to understand the change well before acting and support colleagues who feel uncertain.',
        },
      },
      {
        value: 3,
        label: {
          ptBR: 'Aceito e me adapto rapidamente, focando nas oportunidades que a mudança traz.',
          es: 'Acepto y me adapto rápidamente, centrándome en las oportunidades que trae el cambio.',
          en: 'I accept and adapt quickly, focusing on the opportunities the change brings.',
        },
      },
      {
        value: 2,
        label: {
          ptBR: 'Analiso os impactos detalhadamente e preparo um plano de adaptação estruturado.',
          es: 'Analizo los impactos en detalle y preparo un plan de adaptación estructurado.',
          en: 'I analyze the impacts in detail and prepare a structured adaptation plan.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Manifesto minhas preocupações abertamente e proponho alternativas à liderança.',
          es: 'Expreso mis preocupaciones abiertamente y propongo alternativas al liderazgo.',
          en: 'I openly express my concerns and propose alternatives to leadership.',
        },
      },
    ],
    weight: 1.5,
  },
  {
    id: 'q_s_06',
    difficulty: 3,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Consigo manter a calma e a consistência mesmo quando há pressão intensa e prazos agressivos.',
      es: 'Puedo mantener la calma y la consistencia incluso cuando hay una presión intensa y plazos agresivos.',
      en: 'I can maintain calm and consistency even when there is intense pressure and aggressive deadlines.',
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
      es: 'Antes de tomar una decisión, necesito recopilar y analizar todos los datos disponibles.',
      en: 'Before making a decision, I need to collect and analyze all available data.',
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
      ptBR: 'Sinto desconforto quando tenho que entregar um trabalho que não atingiu meu padrão de qualidade.',
      es: 'Me siento incómodo cuando tengo que entregar un trabajo que no ha alcanzado mi estándar de calidad.',
      en: 'I feel uncomfortable when I have to deliver work that has not met my quality standard.',
    },
    options: null,
    weight: 1.0,
  },
  {
    id: 'q_c_03',
    difficulty: 2,
    dimension: 'C',
    type: 'forced_choice',
    text: {
      ptBR: 'Ao revisar o trabalho de outra pessoa, o que você prioriza?',
      es: '¿Al revisar el trabajo de otra persona, qué priorizas?',
      en: 'When reviewing someone else\'s work, what do you prioritize?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Verifico cada detalhe para garantir precisão, mesmo que leve mais tempo.',
          es: 'Verifico cada detalle para garantizar la precisión, aunque tome más tiempo.',
          en: 'I check every detail to ensure accuracy, even if it takes more time.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Foco na visão geral e no impacto do trabalho, deixando detalhes para depois.',
          es: 'Me enfoco en la visión general y el impacto del trabajo, dejando los detalles para después.',
          en: 'I focus on the big picture and the impact of the work, leaving details for later.',
        },
      },
    ],
    weight: 1.2,
  },
  {
    id: 'q_c_04',
    difficulty: 2,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Prefiro trabalhar de forma independente, seguindo processos bem definidos e documentados.',
      es: 'Prefiero trabajar de forma independiente, siguiendo procesos bien definidos y documentados.',
      en: 'I prefer to work independently, following well-defined and documented processes.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_c_05',
    difficulty: 3,
    dimension: 'C',
    type: 'scenario',
    text: {
      ptBR: 'Você identifica uma falha crítica no sistema que está prestes a ser lançado. A correção levaria uma semana a mais.',
      es: 'Identificas una falla crítica en el sistema que está a punto de lanzarse. La corrección tardaría una semana más.',
      en: 'You identify a critical flaw in the system that is about to be launched. The fix would take one more week.',
    },
    scenario: {
      ptBR: 'O lançamento está marcado para amanhã. Qual é sua decisão?',
      es: 'El lanzamiento está programado para mañana. ¿Cuál es tu decisión?',
      en: 'The launch is scheduled for tomorrow. What is your decision?',
    },
    options: [
      {
        value: 4,
        label: {
          ptBR: 'Documento a falha detalhadamente e recomendo o adiamento com argumentação técnica sólida.',
          es: 'Documento la falla en detalle y recomiendo el aplazamiento con una argumentación técnica sólida.',
          en: 'I document the flaw in detail and recommend postponement with solid technical argumentation.',
        },
      },
      {
        value: 3,
        label: {
          ptBR: 'Trabalho horas extras para tentar corrigir antes do prazo sem atrasar o lançamento.',
          es: 'Trabajo horas extra para intentar corregir antes del plazo sin retrasar el lanzamiento.',
          en: 'I work overtime to try to fix it before the deadline without delaying the launch.',
        },
      },
      {
        value: 2,
        label: {
          ptBR: 'Escalo imediatamente para a liderança e deixo a decisão final com eles.',
          es: 'Escalo de inmediato al liderazgo y dejo la decisión final en sus manos.',
          en: 'I escalate immediately to leadership and leave the final decision with them.',
        },
      },
      {
        value: 1,
        label: {
          ptBR: 'Lanço mesmo com a falha e monitoro de perto para corrigir na versão seguinte.',
          es: 'Lanzo aunque haya falla y monitoreo de cerca para corregir en la siguiente versión.',
          en: 'I launch despite the flaw and monitor closely to fix it in the next version.',
        },
      },
    ],
    weight: 1.5,
  },
  {
    id: 'q_c_06',
    difficulty: 3,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Quando recebo uma diretriz que contradiz minha análise, questiono com dados antes de aceitar.',
      es: 'Cuando recibo una directriz que contradice mi análisis, la cuestiono con datos antes de aceptarla.',
      en: 'When I receive a directive that contradicts my analysis, I question it with data before accepting.',
    },
    options: null,
    weight: 1.5,
  },
];

/** Estimated total questions in a typical adaptive assessment session */
export const ESTIMATED_TOTAL = 20;

/** Minimum questions before completion is allowed */
export const MIN_QUESTIONS = 20;

/** Minimum answers per dimension before completion */
export const MIN_PER_DIMENSION = 3;
