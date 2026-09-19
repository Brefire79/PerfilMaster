// GERADO por scripts/gen-testes-dirigidos-edge.mjs a partir de
// src/constants/testesDirigidos.js — NÃO EDITE À MÃO. Rode o gerador.
// O contrato (verify-testes-dirigidos-contract.mjs) falha se este arquivo
// estiver desatualizado em relação ao JS.

export interface ItemTD { id: string; subescala: string; invertido: boolean; weight: number; texto: string }
export interface TesteDirigido {
  codigo: string; versao: number; titulo: string; foco: string; prazoDias: number;
  subescalas: Record<string, string>; itens: ItemTD[];
}

export const TESTES_DIRIGIDOS: TesteDirigido[] = [
  {
    "codigo": "TD-ASSERTIVIDADE",
    "versao": 1,
    "titulo": "Assertividade e limites",
    "foco": "Dizer não, sustentar posição e negociar sem ceder por medo de desagradar",
    "prazoDias": 60,
    "subescalas": {
      "limites": "Estabelecer limites",
      "posicao": "Sustentar posição",
      "conflito": "Tolerância ao conflito"
    },
    "itens": [
      {
        "id": "td_assert_limites_01",
        "subescala": "limites",
        "invertido": false,
        "weight": 1,
        "texto": "Quando alguém me pede algo que não cabe na minha agenda, consigo recusar com clareza."
      },
      {
        "id": "td_assert_limites_02",
        "subescala": "limites",
        "invertido": true,
        "weight": 1,
        "texto": "Aceito tarefas extras mesmo sabendo que vou me sobrecarregar, só para não decepcionar."
      },
      {
        "id": "td_assert_limites_03",
        "subescala": "limites",
        "invertido": false,
        "weight": 1,
        "texto": "Digo o que preciso de forma direta, sem rodeios ou justificativas em excesso."
      },
      {
        "id": "td_assert_limites_04",
        "subescala": "limites",
        "invertido": true,
        "weight": 1,
        "texto": "Costumo dizer \"sim\" na hora e me arrepender depois."
      },
      {
        "id": "td_assert_posicao_01",
        "subescala": "posicao",
        "invertido": false,
        "weight": 1,
        "texto": "Mantenho minha opinião numa reunião mesmo quando a maioria discorda."
      },
      {
        "id": "td_assert_posicao_02",
        "subescala": "posicao",
        "invertido": true,
        "weight": 1,
        "texto": "Mudo de ideia rapidamente quando percebo que alguém ficou incomodado com o que eu disse."
      },
      {
        "id": "td_assert_posicao_03",
        "subescala": "posicao",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo discordar do meu superior de forma respeitosa quando acredito que ele está errado."
      },
      {
        "id": "td_assert_posicao_04",
        "subescala": "posicao",
        "invertido": true,
        "weight": 1,
        "texto": "Costumo concordar em público mesmo quando, por dentro, discordo."
      },
      {
        "id": "td_assert_conflito_01",
        "subescala": "conflito",
        "invertido": false,
        "weight": 1,
        "texto": "Encaro uma conversa difícil como parte normal do trabalho."
      },
      {
        "id": "td_assert_conflito_02",
        "subescala": "conflito",
        "invertido": true,
        "weight": 1,
        "texto": "Adio conversas desconfortáveis até que o problema cresça demais."
      },
      {
        "id": "td_assert_conflito_03",
        "subescala": "conflito",
        "invertido": false,
        "weight": 1,
        "texto": "Depois de um desentendimento, consigo retomar a relação sem guardar mágoa."
      },
      {
        "id": "td_assert_conflito_04",
        "subescala": "conflito",
        "invertido": true,
        "weight": 1,
        "texto": "Fico remoendo por dias quando alguém demonstra insatisfação comigo."
      }
    ]
  },
  {
    "codigo": "TD-DELEGACAO",
    "versao": 1,
    "titulo": "Delegação e escuta",
    "foco": "Confiar no outro, soltar o controle e ouvir antes de decidir",
    "prazoDias": 60,
    "subescalas": {
      "confianca": "Confiança ao delegar",
      "escuta": "Escuta ativa",
      "controle": "Soltar o controle"
    },
    "itens": [
      {
        "id": "td_deleg_confianca_01",
        "subescala": "confianca",
        "invertido": false,
        "weight": 1,
        "texto": "Quando delego, deixo a pessoa decidir o \"como\", desde que o resultado esteja combinado."
      },
      {
        "id": "td_deleg_confianca_02",
        "subescala": "confianca",
        "invertido": true,
        "weight": 1,
        "texto": "Acabo refazendo o trabalho dos outros porque \"do meu jeito fica melhor\"."
      },
      {
        "id": "td_deleg_confianca_03",
        "subescala": "confianca",
        "invertido": false,
        "weight": 1,
        "texto": "Distribuo tarefas importantes, não só as operacionais."
      },
      {
        "id": "td_deleg_confianca_04",
        "subescala": "confianca",
        "invertido": true,
        "weight": 1,
        "texto": "Tenho dificuldade de entregar algo relevante sem acompanhar cada etapa."
      },
      {
        "id": "td_deleg_escuta_01",
        "subescala": "escuta",
        "invertido": false,
        "weight": 1,
        "texto": "Deixo a pessoa terminar de falar antes de responder, mesmo quando já sei o que vou dizer."
      },
      {
        "id": "td_deleg_escuta_02",
        "subescala": "escuta",
        "invertido": true,
        "weight": 1,
        "texto": "Interrompo para corrigir ou acelerar quando a explicação está demorando."
      },
      {
        "id": "td_deleg_escuta_03",
        "subescala": "escuta",
        "invertido": false,
        "weight": 1,
        "texto": "Pergunto a opinião da equipe antes de fechar uma decisão que afeta todos."
      },
      {
        "id": "td_deleg_escuta_04",
        "subescala": "escuta",
        "invertido": true,
        "weight": 1,
        "texto": "Costumo já chegar com a decisão tomada e só comunicar."
      },
      {
        "id": "td_deleg_controle_01",
        "subescala": "controle",
        "invertido": false,
        "weight": 1,
        "texto": "Fico tranquilo quando um processo sai diferente do que eu faria, se o resultado é bom."
      },
      {
        "id": "td_deleg_controle_02",
        "subescala": "controle",
        "invertido": true,
        "weight": 1,
        "texto": "Sinto desconforto quando não sei exatamente o que cada pessoa está fazendo."
      },
      {
        "id": "td_deleg_controle_03",
        "subescala": "controle",
        "invertido": false,
        "weight": 1,
        "texto": "Aceito que outras pessoas tenham prioridades diferentes das minhas."
      },
      {
        "id": "td_deleg_controle_04",
        "subescala": "controle",
        "invertido": true,
        "weight": 1,
        "texto": "Quando algo foge do meu controle, minha primeira reação é assumir tudo de volta."
      }
    ]
  },
  {
    "codigo": "TD-EQUILIBRIO",
    "versao": 1,
    "titulo": "Equilíbrio e propósito",
    "foco": "Separar valor pessoal de resultado, descansar sem culpa e escolher pelo que importa",
    "prazoDias": 90,
    "subescalas": {
      "valor": "Valor além do resultado",
      "descanso": "Descanso sem culpa",
      "proposito": "Escolhas com propósito"
    },
    "itens": [
      {
        "id": "td_equil_valor_01",
        "subescala": "valor",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo me sentir bem comigo mesmo num dia em que não entreguei nada de destaque."
      },
      {
        "id": "td_equil_valor_02",
        "subescala": "valor",
        "invertido": true,
        "weight": 1,
        "texto": "Meu humor depende muito de ter sido reconhecido pelo que fiz."
      },
      {
        "id": "td_equil_valor_03",
        "subescala": "valor",
        "invertido": false,
        "weight": 1,
        "texto": "Valorizo pessoas pelo que elas são, não só pelo que produzem."
      },
      {
        "id": "td_equil_valor_04",
        "subescala": "valor",
        "invertido": true,
        "weight": 1,
        "texto": "Quando alguém entrega mais que eu, sinto que perdi."
      },
      {
        "id": "td_equil_descanso_01",
        "subescala": "descanso",
        "invertido": false,
        "weight": 1,
        "texto": "Nas folgas e pausas, consigo me desligar do trabalho de verdade."
      },
      {
        "id": "td_equil_descanso_02",
        "subescala": "descanso",
        "invertido": true,
        "weight": 1,
        "texto": "Sinto culpa ou inquietação quando estou descansando."
      },
      {
        "id": "td_equil_descanso_03",
        "subescala": "descanso",
        "invertido": false,
        "weight": 1,
        "texto": "Tenho atividades fora do trabalho que me dão prazer por si mesmas."
      },
      {
        "id": "td_equil_descanso_04",
        "subescala": "descanso",
        "invertido": true,
        "weight": 1,
        "texto": "Costumo trocar sono ou lazer por mais uma entrega."
      },
      {
        "id": "td_equil_proposito_01",
        "subescala": "proposito",
        "invertido": false,
        "weight": 1,
        "texto": "Sei dizer por que faço o que faço, além de metas e números."
      },
      {
        "id": "td_equil_proposito_02",
        "subescala": "proposito",
        "invertido": true,
        "weight": 1,
        "texto": "Aceito projetos só porque dão visibilidade, mesmo sem me interessar por eles."
      },
      {
        "id": "td_equil_proposito_03",
        "subescala": "proposito",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo recusar uma oportunidade que não combina com o que quero para minha vida."
      },
      {
        "id": "td_equil_proposito_04",
        "subescala": "proposito",
        "invertido": true,
        "weight": 1,
        "texto": "Quando paro para pensar, tenho a sensação de estar correndo sem saber para onde."
      }
    ]
  },
  {
    "codigo": "TD-DECISAO",
    "versao": 1,
    "titulo": "Decisão sob pressão",
    "foco": "Decidir com informação incompleta, enfrentar o desconforto e assumir a escolha",
    "prazoDias": 60,
    "subescalas": {
      "agilidade": "Agilidade para decidir",
      "enfrentamento": "Enfrentar em vez de adiar",
      "responsabilidade": "Assumir a decisão"
    },
    "itens": [
      {
        "id": "td_decis_agilidade_01",
        "subescala": "agilidade",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo decidir com informação incompleta quando esperar custaria mais caro."
      },
      {
        "id": "td_decis_agilidade_02",
        "subescala": "agilidade",
        "invertido": true,
        "weight": 1,
        "texto": "Peço \"só mais um dado\" repetidamente antes de me comprometer."
      },
      {
        "id": "td_decis_agilidade_03",
        "subescala": "agilidade",
        "invertido": false,
        "weight": 1,
        "texto": "Sob prazo apertado, mantenho a clareza para escolher um caminho."
      },
      {
        "id": "td_decis_agilidade_04",
        "subescala": "agilidade",
        "invertido": true,
        "weight": 1,
        "texto": "Travo quando duas opções parecem igualmente boas."
      },
      {
        "id": "td_decis_enfrentamento_01",
        "subescala": "enfrentamento",
        "invertido": false,
        "weight": 1,
        "texto": "Abordo um problema assim que ele aparece, antes que se acumule."
      },
      {
        "id": "td_decis_enfrentamento_02",
        "subescala": "enfrentamento",
        "invertido": true,
        "weight": 1,
        "texto": "Evito tomar decisões que possam desagradar alguém, mesmo sendo necessárias."
      },
      {
        "id": "td_decis_enfrentamento_03",
        "subescala": "enfrentamento",
        "invertido": false,
        "weight": 1,
        "texto": "Dou a notícia difícil pessoalmente em vez de deixar para outra pessoa."
      },
      {
        "id": "td_decis_enfrentamento_04",
        "subescala": "enfrentamento",
        "invertido": true,
        "weight": 1,
        "texto": "Prefiro que as coisas se resolvam sozinhas a intervir."
      },
      {
        "id": "td_decis_responsabilidade_01",
        "subescala": "responsabilidade",
        "invertido": false,
        "weight": 1,
        "texto": "Quando decido, assumo o resultado sem culpar as circunstâncias."
      },
      {
        "id": "td_decis_responsabilidade_02",
        "subescala": "responsabilidade",
        "invertido": true,
        "weight": 1,
        "texto": "Deixo a decisão para o grupo para não carregar o peso sozinho."
      },
      {
        "id": "td_decis_responsabilidade_03",
        "subescala": "responsabilidade",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo rever uma decisão errada sem me paralisar na próxima."
      },
      {
        "id": "td_decis_responsabilidade_04",
        "subescala": "responsabilidade",
        "invertido": true,
        "weight": 1,
        "texto": "Depois de decidir, fico com medo de ter escolhido errado por muito tempo."
      }
    ]
  },
  {
    "codigo": "TD-FOCO",
    "versao": 1,
    "titulo": "Foco e conclusão",
    "foco": "Terminar o que começa, sustentar atenção e tolerar a rotina",
    "prazoDias": 60,
    "subescalas": {
      "conclusao": "Levar até o fim",
      "atencao": "Sustentar atenção",
      "rotina": "Tolerar a rotina"
    },
    "itens": [
      {
        "id": "td_foco_conclusao_01",
        "subescala": "conclusao",
        "invertido": false,
        "weight": 1,
        "texto": "Termino uma tarefa antes de começar a próxima que me empolga."
      },
      {
        "id": "td_foco_conclusao_02",
        "subescala": "conclusao",
        "invertido": true,
        "weight": 1,
        "texto": "Tenho vários projetos iniciados e poucos concluídos."
      },
      {
        "id": "td_foco_conclusao_03",
        "subescala": "conclusao",
        "invertido": false,
        "weight": 1,
        "texto": "Levo o que começo até a versão final, em vez de parar na ideia ou no protótipo."
      },
      {
        "id": "td_foco_conclusao_04",
        "subescala": "conclusao",
        "invertido": true,
        "weight": 1,
        "texto": "Perco o interesse quando a novidade passa."
      },
      {
        "id": "td_foco_atencao_01",
        "subescala": "atencao",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo trabalhar uma hora seguida numa coisa só sem me dispersar."
      },
      {
        "id": "td_foco_atencao_02",
        "subescala": "atencao",
        "invertido": true,
        "weight": 1,
        "texto": "Abro outras abas, mensagens ou assuntos a cada poucos minutos."
      },
      {
        "id": "td_foco_atencao_03",
        "subescala": "atencao",
        "invertido": false,
        "weight": 1,
        "texto": "Quando algo é importante, protejo meu tempo para fazê-lo com atenção."
      },
      {
        "id": "td_foco_atencao_04",
        "subescala": "atencao",
        "invertido": true,
        "weight": 1,
        "texto": "Uma interrupção pequena costuma bastar para eu sair da tarefa."
      },
      {
        "id": "td_foco_rotina_01",
        "subescala": "rotina",
        "invertido": false,
        "weight": 1,
        "texto": "Faço bem tarefas repetitivas quando elas fazem parte do resultado."
      },
      {
        "id": "td_foco_rotina_02",
        "subescala": "rotina",
        "invertido": true,
        "weight": 1,
        "texto": "Fico inquieto quando o dia não tem nada novo."
      },
      {
        "id": "td_foco_rotina_03",
        "subescala": "rotina",
        "invertido": false,
        "weight": 1,
        "texto": "Mantenho uma rotina básica (horários, revisões) sem precisar de estímulo externo."
      },
      {
        "id": "td_foco_rotina_04",
        "subescala": "rotina",
        "invertido": true,
        "weight": 1,
        "texto": "Mudo de plano no meio do caminho só para sentir movimento."
      }
    ]
  },
  {
    "codigo": "TD-FEEDBACK",
    "versao": 1,
    "titulo": "Autocrítica e feedback",
    "foco": "Errar sem se punir, receber crítica como dado e avaliar os outros com justiça",
    "prazoDias": 60,
    "subescalas": {
      "autocompaixao": "Lidar com o próprio erro",
      "receber": "Receber feedback",
      "julgar": "Avaliar os outros com justiça"
    },
    "itens": [
      {
        "id": "td_feedb_autocompaixao_01",
        "subescala": "autocompaixao",
        "invertido": false,
        "weight": 1,
        "texto": "Quando erro, consigo separar \"cometi um erro\" de \"sou um fracasso\"."
      },
      {
        "id": "td_feedb_autocompaixao_02",
        "subescala": "autocompaixao",
        "invertido": true,
        "weight": 1,
        "texto": "Repito mentalmente meus erros por muito tempo depois que aconteceram."
      },
      {
        "id": "td_feedb_autocompaixao_03",
        "subescala": "autocompaixao",
        "invertido": false,
        "weight": 1,
        "texto": "Falo comigo mesmo com o mesmo respeito que uso com um colega que errou."
      },
      {
        "id": "td_feedb_autocompaixao_04",
        "subescala": "autocompaixao",
        "invertido": true,
        "weight": 1,
        "texto": "Exijo de mim um padrão bem mais alto do que exijo dos outros."
      },
      {
        "id": "td_feedb_receber_01",
        "subescala": "receber",
        "invertido": false,
        "weight": 1,
        "texto": "Ouço uma crítica até o fim antes de explicar ou me defender."
      },
      {
        "id": "td_feedb_receber_02",
        "subescala": "receber",
        "invertido": true,
        "weight": 1,
        "texto": "Uma crítica ao meu trabalho me deixa abalado pelo resto do dia."
      },
      {
        "id": "td_feedb_receber_03",
        "subescala": "receber",
        "invertido": false,
        "weight": 1,
        "texto": "Peço feedback ativamente, inclusive sobre pontos fracos."
      },
      {
        "id": "td_feedb_receber_04",
        "subescala": "receber",
        "invertido": true,
        "weight": 1,
        "texto": "Evito situações em que meu trabalho possa ser avaliado."
      },
      {
        "id": "td_feedb_julgar_01",
        "subescala": "julgar",
        "invertido": false,
        "weight": 1,
        "texto": "Antes de julgar alguém, procuro entender o contexto em que a pessoa agiu."
      },
      {
        "id": "td_feedb_julgar_02",
        "subescala": "julgar",
        "invertido": true,
        "weight": 1,
        "texto": "Rotulo rapidamente as pessoas como competentes ou incompetentes."
      },
      {
        "id": "td_feedb_julgar_03",
        "subescala": "julgar",
        "invertido": false,
        "weight": 1,
        "texto": "Dou feedback sobre o comportamento, não sobre o caráter da pessoa."
      },
      {
        "id": "td_feedb_julgar_04",
        "subescala": "julgar",
        "invertido": true,
        "weight": 1,
        "texto": "Fico irritado com erros dos outros mais do que a situação justifica."
      }
    ]
  },
  {
    "codigo": "TD-PQ-BASE",
    "versao": 1,
    "titulo": "Fundamentos de inteligência positiva",
    "foco": "Perceber o sabotador em ação, recuperar o foco e responder em vez de reagir",
    "prazoDias": 45,
    "subescalas": {
      "percepcao": "Perceber o sabotador",
      "recuperacao": "Recuperar o foco",
      "resposta": "Responder em vez de reagir"
    },
    "itens": [
      {
        "id": "td_pqbase_percepcao_01",
        "subescala": "percepcao",
        "invertido": false,
        "weight": 1,
        "texto": "Percebo quando um pensamento negativo repetitivo tomou conta de mim."
      },
      {
        "id": "td_pqbase_percepcao_02",
        "subescala": "percepcao",
        "invertido": true,
        "weight": 1,
        "texto": "Só noto que estava estressado depois que já explodi ou me fechei."
      },
      {
        "id": "td_pqbase_percepcao_03",
        "subescala": "percepcao",
        "invertido": false,
        "weight": 1,
        "texto": "Reconheço qual é o \"padrão\" que mais me sabota (julgar, controlar, agradar…)."
      },
      {
        "id": "td_pqbase_percepcao_04",
        "subescala": "percepcao",
        "invertido": true,
        "weight": 1,
        "texto": "Acredito que meus pensamentos negativos são simplesmente a verdade dos fatos."
      },
      {
        "id": "td_pqbase_recuperacao_01",
        "subescala": "recuperacao",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo, em poucos minutos, voltar a um estado mais calmo depois de um estresse."
      },
      {
        "id": "td_pqbase_recuperacao_02",
        "subescala": "recuperacao",
        "invertido": true,
        "weight": 1,
        "texto": "Um contratempo de manhã costuma estragar meu dia inteiro."
      },
      {
        "id": "td_pqbase_recuperacao_03",
        "subescala": "recuperacao",
        "invertido": false,
        "weight": 1,
        "texto": "Tenho pelo menos uma prática (respiração, pausa, caminhada) que uso para me recentrar."
      },
      {
        "id": "td_pqbase_recuperacao_04",
        "subescala": "recuperacao",
        "invertido": true,
        "weight": 1,
        "texto": "Quando estou tenso, fico sem saber como sair disso."
      },
      {
        "id": "td_pqbase_resposta_01",
        "subescala": "resposta",
        "invertido": false,
        "weight": 1,
        "texto": "Diante de um problema, procuro primeiro o que ele pode me ensinar ou abrir de oportunidade."
      },
      {
        "id": "td_pqbase_resposta_02",
        "subescala": "resposta",
        "invertido": true,
        "weight": 1,
        "texto": "Minha primeira reação a um problema é culpa, raiva ou medo."
      },
      {
        "id": "td_pqbase_resposta_03",
        "subescala": "resposta",
        "invertido": false,
        "weight": 1,
        "texto": "Consigo ter curiosidade e empatia mesmo com pessoas que me irritam."
      },
      {
        "id": "td_pqbase_resposta_04",
        "subescala": "resposta",
        "invertido": true,
        "weight": 1,
        "texto": "Ajo no impulso e depois vejo que a reação foi maior que o fato."
      }
    ]
  }
];

export const TESTES_POR_CODIGO: Record<string, TesteDirigido> =
  Object.fromEntries(TESTES_DIRIGIDOS.map((t) => [t.codigo, t]));

const clamp15 = (v: unknown) => Math.min(5, Math.max(1, Math.round(Number(v) || 0)));

/** Espelho exato de src/lib/testeDirigidoScoring.js#pontuarTesteDirigido. */
export function pontuarTesteDirigido(codigo: string, respostas: Record<string, unknown> = {}) {
  const teste = TESTES_POR_CODIGO[codigo];
  if (!teste) return null;
  const acumulado: Record<string, { soma: number; peso: number }> = {};
  const faltantes: string[] = [];
  let respondidos = 0;
  for (const item of teste.itens) {
    const bruto = respostas?.[item.id];
    if (bruto == null || bruto === '') { faltantes.push(item.id); continue; }
    respondidos += 1;
    let valor = clamp15(bruto);
    if (item.invertido) valor = 6 - valor;
    const peso = Number(item.weight) || 1;
    const acc = (acumulado[item.subescala] ||= { soma: 0, peso: 0 });
    acc.soma += ((valor - 1) / 4) * peso;
    acc.peso += peso;
  }
  const subescalas: Record<string, number | null> = {};
  for (const key of Object.keys(teste.subescalas)) {
    const acc = acumulado[key];
    subescalas[key] = acc && acc.peso > 0 ? Math.round((acc.soma / acc.peso) * 100) : null;
  }
  const validas = Object.values(subescalas).filter((v): v is number => v != null);
  const geral = validas.length ? Math.round(validas.reduce((a, b) => a + b, 0) / validas.length) : null;
  return { codigo, versao: teste.versao, subescalas, geral, respondidos, total: teste.itens.length, faltantes };
}

/** Só aceita o envio completo (12 itens) com valores 1..5 — descarta chaves desconhecidas. */
export function sanitizarRespostas(codigo: string, bruto: unknown): Record<string, number> | null {
  const teste = TESTES_POR_CODIGO[codigo];
  if (!teste || !bruto || typeof bruto !== 'object') return null;
  const ids = new Set(teste.itens.map((i) => i.id));
  const limpo: Record<string, number> = {};
  for (const [k, v] of Object.entries(bruto as Record<string, unknown>)) {
    if (!ids.has(k)) continue;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 1 || n > 5) continue;
    limpo[k] = n;
  }
  return Object.keys(limpo).length === ids.size ? limpo : null;
}
