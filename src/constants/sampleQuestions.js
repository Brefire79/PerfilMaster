/**
 * sampleQuestions.js — FONTE ÚNICA das 78 questões da avaliação Completa.
 *
 * 28 DISC (7 por dimensão D/I/S/C, ids q_<dim>_01..07) + 50 Sabotadores
 * (5 por tipo, ids q_sab_<slug>_01..05). Todas do tipo likert5 (1-5).
 *
 * ATENÇÃO — espelhos que precisam ficar em sincronia ao mudar qualquer questão:
 *   - supabase/functions/atualizarStatus/index.ts (ids/pesos DISC + slugs sab)
 *   - src/lib/discScoring.js (lê pesos daqui em runtime — sincroniza sozinho)
 *   - src/lib/saboteurScoring.js (mapeia por `dimension` SAB_*)
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
    type: 'likert5',
    text: {
      ptBR: 'Em situações de conflito, costumo confrontar o problema diretamente em vez de esperar que se resolva.',
      es: 'En situaciones de conflicto, suelo confrontar el problema directamente en lugar de esperar que se resuelva.',
      en: 'In conflict situations, I tend to confront the problem directly rather than waiting for it to resolve.',
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
    type: 'likert5',
    text: {
      ptBR: 'Quando a equipe está travada com prazo urgente, tomo a decisão sozinho e comunico para executar imediatamente.',
      es: 'Cuando el equipo está bloqueado con un plazo urgente, tomo la decisión solo y comunico para ejecutar de inmediato.',
      en: 'When the team is stuck with an urgent deadline, I make the decision alone and communicate it for immediate execution.',
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
    type: 'likert5',
    text: {
      ptBR: 'Fico mais motivado quando posso trabalhar com pessoas diferentes e criar conexões durante um projeto.',
      es: 'Me motivo más cuando puedo trabajar con personas distintas y crear conexiones durante un proyecto.',
      en: 'I am most motivated when I can work with different people and build connections during a project.',
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
    type: 'likert5',
    text: {
      ptBR: 'Para defender uma ideia impopular, crio uma narrativa envolvente com exemplos que gerem entusiasmo nas pessoas.',
      es: 'Para defender una idea impopular, creo una narrativa envolvente con ejemplos que generen entusiasmo en las personas.',
      en: 'To defend an unpopular idea, I create an engaging narrative with examples that generate enthusiasm in people.',
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
    type: 'likert5',
    text: {
      ptBR: 'Quando um colega erra, minha primeira reação é oferecer ajuda sem julgá-lo.',
      es: 'Cuando un colega se equivoca, mi primera reacción es ofrecer ayuda sin juzgarlo.',
      en: 'When a colleague makes a mistake, my first reaction is to offer help without judging them.',
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
    type: 'likert5',
    text: {
      ptBR: 'Diante de uma grande mudança organizacional, priorizo entender bem o que está acontecendo e apoiar os colegas que estão inseguros.',
      es: 'Ante un gran cambio organizacional, priorizo entender bien lo que ocurre y apoyar a los colegas que se sienten inseguros.',
      en: 'Faced with a major organizational change, I prioritize understanding what is happening and supporting insecure colleagues.',
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
    type: 'likert5',
    text: {
      ptBR: 'Ao revisar um trabalho, verifico cada detalhe para garantir precisão mesmo que isso tome mais tempo.',
      es: 'Al revisar un trabajo, verifico cada detalle para garantizar la precisión aunque tome más tiempo.',
      en: 'When reviewing work, I check every detail to ensure accuracy even if it takes more time.',
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
    type: 'likert5',
    text: {
      ptBR: 'Se identifico uma falha crítica antes de um lançamento, documento tudo detalhadamente e recomendo o adiamento com argumentação técnica, mesmo sob pressão.',
      es: 'Si identifico una falla crítica antes de un lanzamiento, documento todo en detalle y recomiendo el aplazamiento con argumentación técnica, incluso bajo presión.',
      en: 'If I identify a critical flaw before a launch, I document everything in detail and recommend postponement with technical argumentation, even under pressure.',
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
      es: 'Cuando recibo una directriz que contradice mi análisis, la cuestiono con datos antes de aceptarla.',
      en: 'When I receive a directive that contradicts my analysis, I question it with data before accepting.',
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
      ptBR: 'Prefiro liderar projetos a participar como membro de equipe.',
      es: 'Prefiero liderar proyectos que participar como miembro del equipo.',
      en: 'I prefer leading projects to participating as a team member.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_i_07',
    difficulty: 2,
    dimension: 'I',
    type: 'likert5',
    text: {
      ptBR: 'Fico motivado quando posso inspirar e animar outras pessoas ao meu redor.',
      es: 'Me motivo cuando puedo inspirar y animar a otras personas a mi alrededor.',
      en: 'I am motivated when I can inspire and encourage those around me.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_s_07',
    difficulty: 2,
    dimension: 'S',
    type: 'likert5',
    text: {
      ptBR: 'Valorizo relacionamentos de longo prazo e invisto tempo em construí-los.',
      es: 'Valoro las relaciones a largo plazo e invierto tiempo en construirlas.',
      en: 'I value long-term relationships and invest time in building them.',
    },
    options: null,
    weight: 1.1,
  },
  {
    id: 'q_c_07',
    difficulty: 2,
    dimension: 'C',
    type: 'likert5',
    text: {
      ptBR: 'Organizo minhas tarefas em listas e processos detalhados antes de começar.',
      es: 'Organizo mis tareas en listas y procesos detallados antes de comenzar.',
      en: 'I organize my tasks into detailed lists and processes before starting.',
    },
    options: null,
    weight: 1.1,
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
      es: 'Suelo criticar mis propios errores de forma intensa y repetida.',
      en: 'I tend to criticize my own mistakes intensely and repeatedly.',
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
      es: 'Juzgo rápidamente a otras personas cuando cometen errores o no cumplen mis expectativas.',
      en: 'I quickly judge others when they make mistakes or fail to meet my expectations.',
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
      es: 'Me quedo pensando en lo que podría haber hecho diferente en situaciones pasadas.',
      en: 'I get stuck thinking about what I could have done differently in past situations.',
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
      es: 'Me cuesta aceptar situaciones difíciles sin atribuir culpa a alguien.',
      en: 'I have difficulty accepting difficult situations without attributing blame to someone.',
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
      es: 'Mi voz interior tiende a centrarse en los aspectos negativos y los fallos antes de reconocer lo que salió bien.',
      en: 'My inner voice tends to focus on negatives and failures before recognizing what went well.',
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
      es: 'Tengo tendencia a evitar conversaciones difíciles o situaciones de conflicto.',
      en: 'I tend to avoid difficult conversations or conflict situations.',
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
      es: 'Prefiero posponer decisiones incómodas en vez de enfrentarlas directamente.',
      en: 'I prefer to postpone uncomfortable decisions rather than face them directly.',
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
      es: 'Cuando surge un problema interpersonal, mi tendencia es esperar que se resuelva solo.',
      en: 'When an interpersonal problem arises, my tendency is to wait for it to resolve itself.',
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
      es: 'Me enfoco en lo positivo y agradable para no tener que lidiar con lo difícil.',
      en: 'I focus on positive and pleasant things to avoid dealing with what is difficult.',
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
      es: 'Siento un intenso malestar al tener que dar comentarios negativos o poner límites a otras personas.',
      en: 'I feel intense discomfort when I have to give negative feedback or set limits with others.',
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
      es: 'Siento ansiedad cuando no tengo control sobre cómo se están haciendo las cosas.',
      en: 'I feel anxious when I do not have control over how things are being done.',
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
      ptBR: 'Prefiro fazer as coisas do meu jeito do que delegar e arriscar que saiam errado.',
      es: 'Prefiero hacer las cosas a mi manera que delegar y arriesgarme a que salgan mal.',
      en: 'I prefer to do things my way rather than delegate and risk them going wrong.',
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
      ptBR: 'Fico frustrado quando outras pessoas não seguem minha maneira de conduzir as tarefas.',
      es: 'Me frustro cuando otras personas no siguen mi manera de llevar las tareas.',
      en: 'I get frustrated when others do not follow my way of conducting tasks.',
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
      es: 'En situaciones de incertidumbre, siento un fuerte impulso de tomar el control.',
      en: 'In situations of uncertainty, I feel a strong impulse to take control.',
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
      es: 'Me cuesta confiar en que las cosas saldrán bien sin mi intervención directa.',
      en: 'I have difficulty trusting that things will work out without my direct intervention.',
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
      es: 'Mi sentido de valor personal está fuertemente ligado a mis logros y resultados.',
      en: 'My sense of personal worth is strongly tied to my achievements and results.',
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
      es: 'Me siento incómodo cuando no estoy progresando o alcanzando metas.',
      en: 'I feel uncomfortable when I am not progressing or meeting goals.',
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
      ptBR: 'A opinião que os outros têm de mim afeta significativamente como me sinto sobre mim mesmo.',
      es: 'La opinión que otros tienen de mí afecta significativamente cómo me siento conmigo mismo.',
      en: 'The opinion others have of me significantly affects how I feel about myself.',
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
      es: 'Rara vez me permito descansar o celebrar sin estar ya pensando en el siguiente objetivo.',
      en: 'I rarely allow myself to rest or celebrate without already thinking about the next goal.',
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
      ptBR: 'Sinto que meu valor como pessoa depende do quanto sou produtivo e bem-sucedido.',
      es: 'Siento que mi valor como persona depende de cuánto soy productivo y exitoso.',
      en: 'I feel that my worth as a person depends on how productive and successful I am.',
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
      es: 'Confío mucho más en la lógica y los datos que en las emociones para tomar decisiones.',
      en: 'I rely much more on logic and data than emotions to make decisions.',
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
      es: 'Me resulta incómodo cuando las discusiones se vuelven emocionales en lugar de objetivas.',
      en: 'I find it uncomfortable when discussions become emotional rather than objective.',
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
      es: 'Me cuesta entender por qué las personas dejan que las emociones interfieran en decisiones racionales.',
      en: 'I have difficulty understanding why people let emotions interfere with rational decisions.',
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
      ptBR: 'Prefiro resolver problemas sozinho a ter que lidar com as dinâmicas emocionais de um grupo.',
      es: 'Prefiero resolver problemas solo que tener que lidiar con las dinámicas emocionales de un grupo.',
      en: 'I prefer to solve problems alone rather than deal with a group\'s emotional dynamics.',
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
      ptBR: 'As pessoas próximas a mim já me disseram que sou frio ou distante emocionalmente.',
      es: 'Las personas cercanas me han dicho que soy frío o emocionalmente distante.',
      en: 'People close to me have told me that I am emotionally cold or distant.',
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
      es: 'Estoy frecuentemente alerta ante posibles riesgos o problemas que puedan surgir.',
      en: 'I am frequently alert to possible risks or problems that may arise.',
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
      es: 'Me cuesta relajarme porque mi mente siempre identifica lo que puede salir mal.',
      en: 'I have difficulty relaxing because my mind always identifies what could go wrong.',
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
      es: 'Suelo anticipar escenarios negativos incluso en situaciones que parecen seguras.',
      en: 'I tend to anticipate negative scenarios even in situations that seem safe.',
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
      es: 'La sensación de que algo puede salir mal me hace gastar mucha energía preventiva.',
      en: 'The feeling that something could go wrong makes me spend a lot of preventive energy.',
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
      ptBR: 'Mesmo quando as coisas estão indo bem, fico desconfiado de que algo ainda pode sair errado.',
      es: 'Incluso cuando las cosas van bien, desconfío de que algo todavía puede salir mal.',
      en: 'Even when things are going well, I am suspicious that something may still go wrong.',
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
      es: 'Me cuesta decir no cuando alguien pide ayuda, aunque eso me sobrecargue.',
      en: 'I have difficulty saying no when someone asks for help, even if it overloads me.',
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
      ptBR: 'Fico muito afetado quando percebo que alguém está desapontado comigo.',
      es: 'Me afecto mucho cuando percibo que alguien está decepcionado conmigo.',
      en: 'I am greatly affected when I perceive that someone is disappointed with me.',
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
      es: 'Suelo poner las necesidades de los demás antes que las mías para mantener la armonía.',
      en: 'I tend to put others\' needs before my own to maintain harmony.',
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
      es: 'Evito expresar opiniones contrarias para no generar conflictos o desagradar a las personas.',
      en: 'I avoid expressing contrary opinions so as not to create conflict or displease people.',
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
      es: 'Siento que mi aceptación y aprobación por parte de los demás depende de cuánto hago por ellos.',
      en: 'I feel that my acceptance and approval by others depends on how much I do for them.',
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
      ptBR: 'Sinto-me entediado ou inquieto quando não há novidades, desafios ou estímulos constantes.',
      es: 'Me siento aburrido o inquieto cuando no hay novedades, retos o estímulos constantes.',
      en: 'I feel bored or restless when there are no new developments, challenges, or constant stimulation.',
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
      es: 'Me cuesta mantener el foco en una tarea por un largo período sin buscar algo nuevo.',
      en: 'I have difficulty maintaining focus on a task for a long period without seeking something new.',
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
      es: 'Comienzo muchos proyectos con entusiasmo, pero pierdo el interés antes de terminarlos.',
      en: 'I start many projects with enthusiasm, but lose interest before completing them.',
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
      es: 'Prefiero actividades que ofrecen variedad y novedad a rutinas predecibles.',
      en: 'I prefer activities that offer variety and novelty to predictable routines.',
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
      es: 'Me cuesta simplemente estar presente en el momento sin pensar en lo que viene después.',
      en: 'I have difficulty simply being present in the moment without thinking about what comes next.',
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
      es: 'Tengo estándares muy altos y me molesta cuando las cosas no alcanzan el nivel esperado.',
      en: 'I have very high standards and it bothers me when things do not meet the expected level.',
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
      ptBR: 'Sinto dificuldade em delegar tarefas porque temo que não sejam feitas da maneira correta.',
      es: 'Me cuesta delegar tareas porque temo que no se hagan de la manera correcta.',
      en: 'I find it difficult to delegate tasks because I fear they will not be done the right way.',
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
      es: 'El desorden o la falta de organización a mi alrededor me causa estrés y dificulta mi concentración.',
      en: 'Disorder or lack of organization around me causes stress and makes it hard to concentrate.',
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
      ptBR: 'Fico frustrado quando regras, procedimentos ou padrões não são seguidos corretamente.',
      es: 'Me frustro cuando las reglas, procedimientos o estándares no se siguen correctamente.',
      en: 'I get frustrated when rules, procedures, or standards are not followed correctly.',
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
      es: 'Mi perfeccionismo a veces me impide completar o entregar trabajos porque nunca parecen "suficientemente buenos".',
      en: 'My perfectionism sometimes prevents me from finishing or delivering work because it never seems "good enough".',
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
      es: 'Cuando algo sale mal, siento que las circunstancias u otras personas son las principales responsables.',
      en: 'When something goes wrong, I feel that circumstances or other people are mainly responsible.',
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
      es: 'Siento que mi vida sería muy diferente si las circunstancias a mi alrededor fueran distintas.',
      en: 'I feel that my life would be very different if the circumstances around me were different.',
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
      es: 'Suelo quejarme o desahogarme sobre los problemas con más frecuencia que actuar para resolverlos.',
      en: 'I tend to complain or vent about problems more often than acting to resolve them.',
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
      es: 'Me cuesta ver cómo mis propias elecciones han contribuido a situaciones negativas.',
      en: 'I find it hard to see how my own choices contributed to negative situations.',
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
      ptBR: 'Frequentemente me sinto incompreendido ou injustiçado em situações de trabalho ou relacionamentos.',
      es: 'Con frecuencia me siento incomprendido o tratado injustamente en situaciones de trabajo o relaciones.',
      en: 'I frequently feel misunderstood or treated unfairly in work situations or relationships.',
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
