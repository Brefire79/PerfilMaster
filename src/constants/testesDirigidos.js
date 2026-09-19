// ─────────────────────────────────────────────────────────────────────────────
// Testes Dirigidos — catálogo (Fase 2 do PLANO-EVOLUCAO-2026-09-19.md)
//
// Cada teste aprofunda UM foco de desenvolvimento apontado pelo motor de
// abordagem (src/lib/abordagem.js) a partir do perfil DISC + Sabotadores.
// Formato: 12 itens likert5 (1 = discordo totalmente … 5 = concordo
// totalmente), 3 subescalas de 4 itens, com itens INVERTIDOS (concordar =
// MENOS da competência) para reduzir o viés de aquiescência que o DISC v1 tem.
//
// Pontuação (src/lib/testeDirigidoScoring.js): por subescala, média de
// ((valor ajustado − 1) / 4) × 100, onde valor ajustado = 6 − valor nos
// itens invertidos. Escala 0–100 em que MAIOR = competência mais presente.
// `versao` sobe quando qualquer item muda — resultados só se comparam
// dentro da mesma versão.
//
// Ids: td_<codigo>_<subescala>_<nn>. Contrato: scripts/verify-testes-dirigidos-contract.mjs
// ─────────────────────────────────────────────────────────────────────────────

const it = (id, subescala, texto, invertido = false) => ({
  id, subescala, type: 'likert5', invertido, weight: 1.0, text: { ptBR: texto },
});

export const TESTES_DIRIGIDOS = [
  {
    codigo: 'TD-ASSERTIVIDADE',
    versao: 1,
    titulo: 'Assertividade e limites',
    foco: 'Dizer não, sustentar posição e negociar sem ceder por medo de desagradar',
    prazoDias: 60,
    subescalas: {
      limites:  'Estabelecer limites',
      posicao:  'Sustentar posição',
      conflito: 'Tolerância ao conflito',
    },
    itens: [
      it('td_assert_limites_01',  'limites',  'Quando alguém me pede algo que não cabe na minha agenda, consigo recusar com clareza.'),
      it('td_assert_limites_02',  'limites',  'Aceito tarefas extras mesmo sabendo que vou me sobrecarregar, só para não decepcionar.', true),
      it('td_assert_limites_03',  'limites',  'Digo o que preciso de forma direta, sem rodeios ou justificativas em excesso.'),
      it('td_assert_limites_04',  'limites',  'Costumo dizer "sim" na hora e me arrepender depois.', true),
      it('td_assert_posicao_01',  'posicao',  'Mantenho minha opinião numa reunião mesmo quando a maioria discorda.'),
      it('td_assert_posicao_02',  'posicao',  'Mudo de ideia rapidamente quando percebo que alguém ficou incomodado com o que eu disse.', true),
      it('td_assert_posicao_03',  'posicao',  'Consigo discordar do meu superior de forma respeitosa quando acredito que ele está errado.'),
      it('td_assert_posicao_04',  'posicao',  'Prefiro concordar em público e reclamar em particular.', true),
      it('td_assert_conflito_01', 'conflito', 'Encaro uma conversa difícil como parte normal do trabalho, não como algo a evitar.'),
      it('td_assert_conflito_02', 'conflito', 'Adio conversas desconfortáveis até que o problema cresça demais.', true),
      it('td_assert_conflito_03', 'conflito', 'Depois de um desentendimento, consigo retomar a relação sem guardar mágoa nem me culpar.'),
      it('td_assert_conflito_04', 'conflito', 'Fico remoendo por dias quando alguém demonstra insatisfação comigo.', true),
    ],
  },
  {
    codigo: 'TD-DELEGACAO',
    versao: 1,
    titulo: 'Delegação e escuta',
    foco: 'Confiar no outro, soltar o controle e ouvir antes de decidir',
    prazoDias: 60,
    subescalas: {
      confianca: 'Confiança ao delegar',
      escuta:    'Escuta ativa',
      controle:  'Soltar o controle',
    },
    itens: [
      it('td_deleg_confianca_01', 'confianca', 'Quando delego, deixo a pessoa decidir o "como", desde que o resultado esteja combinado.'),
      it('td_deleg_confianca_02', 'confianca', 'Acabo refazendo o trabalho dos outros porque "do meu jeito fica melhor".', true),
      it('td_deleg_confianca_03', 'confianca', 'Distribuo tarefas importantes, não só as operacionais.'),
      it('td_deleg_confianca_04', 'confianca', 'Tenho dificuldade de entregar algo relevante sem acompanhar cada etapa.', true),
      it('td_deleg_escuta_01',    'escuta',    'Deixo a pessoa terminar de falar antes de responder, mesmo quando já sei o que vou dizer.'),
      it('td_deleg_escuta_02',    'escuta',    'Interrompo para corrigir ou acelerar quando a explicação está demorando.', true),
      it('td_deleg_escuta_03',    'escuta',    'Pergunto a opinião da equipe antes de fechar uma decisão que afeta todos.'),
      it('td_deleg_escuta_04',    'escuta',    'Costumo já chegar com a decisão tomada e só comunicar.', true),
      it('td_deleg_controle_01',  'controle',  'Fico tranquilo quando um processo sai diferente do que eu faria, se o resultado é bom.'),
      it('td_deleg_controle_02',  'controle',  'Sinto desconforto quando não sei exatamente o que cada pessoa está fazendo.', true),
      it('td_deleg_controle_03',  'controle',  'Aceito que outras pessoas tenham prioridades diferentes das minhas.'),
      it('td_deleg_controle_04',  'controle',  'Quando algo foge do meu controle, minha primeira reação é assumir tudo de volta.', true),
    ],
  },
  {
    codigo: 'TD-EQUILIBRIO',
    versao: 1,
    titulo: 'Equilíbrio e propósito',
    foco: 'Separar valor pessoal de resultado, descansar sem culpa e escolher pelo que importa',
    prazoDias: 90,
    subescalas: {
      valor:     'Valor além do resultado',
      descanso:  'Descanso sem culpa',
      proposito: 'Escolhas com propósito',
    },
    itens: [
      it('td_equil_valor_01',     'valor',     'Consigo me sentir bem comigo mesmo num dia em que não entreguei nada de destaque.'),
      it('td_equil_valor_02',     'valor',     'Meu humor depende muito de ter sido reconhecido pelo que fiz.', true),
      it('td_equil_valor_03',     'valor',     'Valorizo pessoas pelo que elas são, não só pelo que produzem.'),
      it('td_equil_valor_04',     'valor',     'Quando alguém entrega mais que eu, sinto que perdi.', true),
      it('td_equil_descanso_01',  'descanso',  'Tiro folgas e pausas de verdade, sem checar mensagens de trabalho.'),
      it('td_equil_descanso_02',  'descanso',  'Sinto culpa ou inquietação quando estou descansando.', true),
      it('td_equil_descanso_03',  'descanso',  'Tenho atividades fora do trabalho que me dão prazer por si mesmas.'),
      it('td_equil_descanso_04',  'descanso',  'Costumo trocar sono ou lazer por mais uma entrega.', true),
      it('td_equil_proposito_01', 'proposito', 'Sei dizer por que faço o que faço, além de metas e números.'),
      it('td_equil_proposito_02', 'proposito', 'Aceito projetos só porque dão visibilidade, mesmo sem me interessar por eles.', true),
      it('td_equil_proposito_03', 'proposito', 'Consigo recusar uma oportunidade que não combina com o que quero para minha vida.'),
      it('td_equil_proposito_04', 'proposito', 'Quando paro para pensar, não sei bem para onde estou correndo.', true),
    ],
  },
  {
    codigo: 'TD-DECISAO',
    versao: 1,
    titulo: 'Decisão sob pressão',
    foco: 'Decidir com informação incompleta, enfrentar o desconforto e assumir a escolha',
    prazoDias: 60,
    subescalas: {
      agilidade:       'Agilidade para decidir',
      enfrentamento:   'Enfrentar em vez de adiar',
      responsabilidade: 'Assumir a decisão',
    },
    itens: [
      it('td_decis_agilidade_01',        'agilidade',        'Consigo decidir com 70% da informação quando esperar custaria mais.'),
      it('td_decis_agilidade_02',        'agilidade',        'Peço "só mais um dado" repetidamente antes de me comprometer.', true),
      it('td_decis_agilidade_03',        'agilidade',        'Sob prazo apertado, mantenho a clareza para escolher um caminho.'),
      it('td_decis_agilidade_04',        'agilidade',        'Travo quando duas opções parecem igualmente boas.', true),
      it('td_decis_enfrentamento_01',    'enfrentamento',    'Abordo um problema assim que ele aparece, antes que se acumule.'),
      it('td_decis_enfrentamento_02',    'enfrentamento',    'Evito tomar decisões que possam desagradar alguém, mesmo sendo necessárias.', true),
      it('td_decis_enfrentamento_03',    'enfrentamento',    'Dou a notícia difícil pessoalmente em vez de deixar para outra pessoa.'),
      it('td_decis_enfrentamento_04',    'enfrentamento',    'Prefiro que as coisas se resolvam sozinhas a intervir.', true),
      it('td_decis_responsabilidade_01', 'responsabilidade', 'Quando decido, assumo o resultado sem culpar as circunstâncias.'),
      it('td_decis_responsabilidade_02', 'responsabilidade', 'Deixo a decisão para o grupo para não carregar o peso sozinho.', true),
      it('td_decis_responsabilidade_03', 'responsabilidade', 'Consigo rever uma decisão errada sem me paralisar na próxima.'),
      it('td_decis_responsabilidade_04', 'responsabilidade', 'Depois de decidir, fico com medo de ter escolhido errado por muito tempo.', true),
    ],
  },
  {
    codigo: 'TD-FOCO',
    versao: 1,
    titulo: 'Foco e conclusão',
    foco: 'Terminar o que começa, sustentar atenção e tolerar a rotina',
    prazoDias: 60,
    subescalas: {
      conclusao: 'Levar até o fim',
      atencao:   'Sustentar atenção',
      rotina:    'Tolerar a rotina',
    },
    itens: [
      it('td_foco_conclusao_01', 'conclusao', 'Termino uma tarefa antes de começar a próxima que me empolga.'),
      it('td_foco_conclusao_02', 'conclusao', 'Tenho vários projetos iniciados e poucos concluídos.', true),
      it('td_foco_conclusao_03', 'conclusao', 'Entrego a versão final, não fico só na ideia ou no protótipo.'),
      it('td_foco_conclusao_04', 'conclusao', 'Perco o interesse quando a novidade passa.', true),
      it('td_foco_atencao_01',   'atencao',   'Consigo trabalhar uma hora seguida numa coisa só sem me dispersar.'),
      it('td_foco_atencao_02',   'atencao',   'Abro outras abas, mensagens ou assuntos a cada poucos minutos.', true),
      it('td_foco_atencao_03',   'atencao',   'Quando algo é importante, protejo meu tempo para fazê-lo com atenção.'),
      it('td_foco_atencao_04',   'atencao',   'Aceito qualquer interrupção como desculpa para sair da tarefa.', true),
      it('td_foco_rotina_01',    'rotina',    'Faço bem tarefas repetitivas quando elas fazem parte do resultado.'),
      it('td_foco_rotina_02',    'rotina',    'Fico inquieto e ansioso quando o dia não tem nada novo.', true),
      it('td_foco_rotina_03',    'rotina',    'Mantenho uma rotina básica (horários, revisões) sem precisar de estímulo externo.'),
      it('td_foco_rotina_04',    'rotina',    'Mudo de plano no meio do caminho só para sentir movimento.', true),
    ],
  },
  {
    codigo: 'TD-FEEDBACK',
    versao: 1,
    titulo: 'Autocrítica e feedback',
    foco: 'Errar sem se punir, receber crítica como dado e avaliar os outros com justiça',
    prazoDias: 60,
    subescalas: {
      autocompaixao: 'Lidar com o próprio erro',
      receber:       'Receber feedback',
      julgar:        'Avaliar os outros com justiça',
    },
    itens: [
      it('td_feedb_autocompaixao_01', 'autocompaixao', 'Quando erro, consigo separar "cometi um erro" de "sou um fracasso".'),
      it('td_feedb_autocompaixao_02', 'autocompaixao', 'Repito mentalmente meus erros por muito tempo depois que aconteceram.', true),
      it('td_feedb_autocompaixao_03', 'autocompaixao', 'Falo comigo mesmo com o mesmo respeito que uso com um colega que errou.'),
      it('td_feedb_autocompaixao_04', 'autocompaixao', 'Exijo de mim um padrão que eu jamais exigiria de outra pessoa.', true),
      it('td_feedb_receber_01',       'receber',       'Ouço uma crítica até o fim antes de explicar ou me defender.'),
      it('td_feedb_receber_02',       'receber',       'Uma crítica ao meu trabalho me deixa abalado pelo resto do dia.', true),
      it('td_feedb_receber_03',       'receber',       'Peço feedback ativamente, inclusive sobre pontos fracos.'),
      it('td_feedb_receber_04',       'receber',       'Evito situações em que meu trabalho possa ser avaliado.', true),
      it('td_feedb_julgar_01',        'julgar',        'Antes de julgar alguém, procuro entender o contexto em que a pessoa agiu.'),
      it('td_feedb_julgar_02',        'julgar',        'Rotulo rapidamente as pessoas como competentes ou incompetentes.', true),
      it('td_feedb_julgar_03',        'julgar',        'Dou feedback sobre o comportamento, não sobre o caráter da pessoa.'),
      it('td_feedb_julgar_04',        'julgar',        'Fico irritado com erros dos outros mais do que a situação justifica.', true),
    ],
  },
  {
    codigo: 'TD-PQ-BASE',
    versao: 1,
    titulo: 'Fundamentos de inteligência positiva',
    foco: 'Perceber o sabotador em ação, recuperar o foco e responder em vez de reagir',
    prazoDias: 45,
    subescalas: {
      percepcao:   'Perceber o sabotador',
      recuperacao: 'Recuperar o foco',
      resposta:    'Responder em vez de reagir',
    },
    itens: [
      it('td_pqbase_percepcao_01',   'percepcao',   'Percebo quando um pensamento negativo repetitivo tomou conta de mim.'),
      it('td_pqbase_percepcao_02',   'percepcao',   'Só noto que estava estressado depois que já explodi ou me fechei.', true),
      it('td_pqbase_percepcao_03',   'percepcao',   'Reconheço qual é o "padrão" que mais me sabota (julgar, controlar, agradar…).'),
      it('td_pqbase_percepcao_04',   'percepcao',   'Acredito que meus pensamentos negativos são simplesmente a verdade dos fatos.', true),
      it('td_pqbase_recuperacao_01', 'recuperacao', 'Consigo, em poucos minutos, voltar a um estado mais calmo depois de um estresse.'),
      it('td_pqbase_recuperacao_02', 'recuperacao', 'Um contratempo de manhã costuma estragar meu dia inteiro.', true),
      it('td_pqbase_recuperacao_03', 'recuperacao', 'Tenho pelo menos uma prática (respiração, pausa, caminhada) que uso para me recentrar.'),
      it('td_pqbase_recuperacao_04', 'recuperacao', 'Quando estou tenso, não sei o que fazer para sair disso.', true),
      it('td_pqbase_resposta_01',    'resposta',    'Diante de um problema, procuro primeiro o que ele pode me ensinar ou abrir de oportunidade.'),
      it('td_pqbase_resposta_02',    'resposta',    'Minha primeira reação a um problema é culpa, raiva ou medo.', true),
      it('td_pqbase_resposta_03',    'resposta',    'Consigo ter curiosidade e empatia mesmo com pessoas que me irritam.'),
      it('td_pqbase_resposta_04',    'resposta',    'Ajo no impulso e depois vejo que a reação foi maior que o fato.', true),
    ],
  },
];

export const TESTES_POR_CODIGO = Object.fromEntries(TESTES_DIRIGIDOS.map((t) => [t.codigo, t]));

export function getTesteDirigido(codigo) {
  return TESTES_POR_CODIGO[codigo] || null;
}
