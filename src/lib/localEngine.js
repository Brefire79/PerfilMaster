/**
 * ProfileAI — Motor de Avaliação Local (offline)
 * Gera análises completas DISC + PQ sem depender de API externa.
 */

// ─── DISC Profiles ────────────────────────────────────────────────────────────
export const DISC_PROFILES = {
  D: {
    key: 'D',
    label: 'Dominante',
    color: '#EF4444',
    hex: '#EF4444',
    strengths: ['Decisivo', 'Orientado a resultados', 'Direto', 'Corajoso', 'Competitivo'],
    weaknesses: ['Impaciente', 'Inflexível', 'Pode ser autoritário', 'Pouco empático'],
    motivations: ['Desafios', 'Autonomia', 'Vitória', 'Progresso rápido'],
    fears: ['Perda de controle', 'Fraqueza', 'Ser explorado'],
    communicationStyle: 'Direto e objetivo, prefere respostas rápidas e ao ponto',
    leadership: 'Lidera pelo exemplo e pela assertividade, assume o controle em situações de crise',
    underPressure: 'Torna-se mais controlador e agressivo',
    bestPairs: ['I', 'C'],
    sabotadorCorrelation: ['controller', 'hyperAchiever', 'judge'],
  },
  I: {
    key: 'I',
    label: 'Influente',
    color: '#F59E0B',
    hex: '#F59E0B',
    strengths: ['Entusiasta', 'Persuasivo', 'Criativo', 'Otimista', 'Colaborativo'],
    weaknesses: ['Desorganizado', 'Impulsivo', 'Evita conflitos difíceis', 'Pode ser superficial'],
    motivations: ['Reconhecimento', 'Liberdade', 'Interação social', 'Novas ideias'],
    fears: ['Rejeição', 'Perda de aprovação', 'Ser ignorado'],
    communicationStyle: 'Expressivo e emocional, gosta de contar histórias e inspirar pessoas',
    leadership: 'Lidera através do entusiasmo e da motivação, cria ambientes colaborativos',
    underPressure: 'Torna-se excessivamente emocional ou superficial',
    bestPairs: ['D', 'S'],
    sabotadorCorrelation: ['restless', 'pleaser', 'hyperAchiever'],
  },
  S: {
    key: 'S',
    label: 'Estável',
    color: '#22C55E',
    hex: '#22C55E',
    strengths: ['Leal', 'Paciente', 'Confiável', 'Excelente ouvinte', 'Colaborativo'],
    weaknesses: ['Resistente a mudanças', 'Evita conflitos', 'Dificuldade em dizer não'],
    motivations: ['Harmonia', 'Segurança', 'Cooperação', 'Estabilidade'],
    fears: ['Mudança brusca', 'Conflito', 'Perda de segurança'],
    communicationStyle: 'Calmo e empático, prefere ouvir antes de falar e valoriza o consenso',
    leadership: 'Lidera pelo suporte e pela consistência, cria equipes coesas e estáveis',
    underPressure: 'Retrai-se e torna-se passivo-agressivo',
    bestPairs: ['I', 'C'],
    sabotadorCorrelation: ['pleaser', 'avoider', 'victim'],
  },
  C: {
    key: 'C',
    label: 'Analítico',
    color: '#6366F1',
    hex: '#6366F1',
    strengths: ['Preciso', 'Sistemático', 'Analítico', 'Orientado a qualidade', 'Organizado'],
    weaknesses: ['Perfeccionista', 'Lento para decidir', 'Excessivamente crítico', 'Isolado'],
    motivations: ['Qualidade', 'Precisão', 'Dados concretos', 'Processos claros'],
    fears: ['Críticas ao seu trabalho', 'Imprecisão', 'Caos'],
    communicationStyle: 'Preciso e detalhista, prefere dados concretos e análises completas',
    leadership: 'Lidera pela expertise e pelo rigor, garante qualidade e processos bem definidos',
    underPressure: 'Torna-se mais crítico e perfeccionista',
    bestPairs: ['D', 'S'],
    sabotadorCorrelation: ['stickler', 'hyperRational', 'hyperVigilant'],
  },
};

// ─── Sabotadores Data ─────────────────────────────────────────────────────────
export const SABOTADORES_DATA = {
  judge: {
    key: 'judge',
    label: 'Juiz',
    description: 'O mestre sabotador que julga a si mesmo, outros e as circunstâncias',
    triggers: ['Erros próprios', 'Erros alheios', 'Situações imperfeitas', 'Resultados abaixo do esperado'],
    impact: ['Auto-crítica intensa', 'Julgamento constante dos outros', 'Dificuldade de aceitar imperfeições'],
    coping: ['Praticar autocompaixão', 'Separar fatos de interpretações', 'Cultivar perspectiva do "sábio"'],
  },
  stickler: {
    key: 'stickler',
    label: 'Insistente',
    description: 'Busca perfeição e ordem além do que é razoável ou necessário',
    triggers: ['Desordem', 'Imprecisão', 'Desvios de processo', 'Trabalho inacabado'],
    impact: ['Perfeccionismo paralisante', 'Dificuldade de delegar', 'Tensão com pessoas menos meticulosas'],
    coping: ['Definir "bom o suficiente"', 'Praticar soltar o controle', 'Focar no impacto, não na perfeição'],
  },
  pleaser: {
    key: 'pleaser',
    label: 'Prestativo',
    description: 'Foca em agradar e ajudar os outros frequentemente em detrimento de si mesmo',
    triggers: ['Conflitos', 'Desaprovação', 'Pedidos de ajuda', 'Situações de tensão interpessoal'],
    impact: ['Sacrifica próprias necessidades', 'Ressentimento acumulado', 'Dificuldade de dizer não'],
    coping: ['Praticar limites saudáveis', 'Distinguir ajuda genuína de necessidade de aprovação', 'Cuidar de si primeiro'],
  },
  hyperAchiever: {
    key: 'hyperAchiever',
    label: 'Hiper-Realizador',
    description: 'Depende de conquistas e desempenho para manter auto-estima e senso de identidade',
    triggers: ['Estagnação', 'Mediocridade', 'Falta de metas', 'Comparação com outros'],
    impact: ['Workaholic', 'Identidade = performance', 'Dificuldade de descansar sem culpa'],
    coping: ['Cultivar identidade além das conquistas', 'Valorizar o ser, não o fazer', 'Celebrar o processo'],
  },
  victim: {
    key: 'victim',
    label: 'Vítima',
    description: 'Foco nas dores e sofrimentos como forma de obter atenção e afeto',
    triggers: ['Sentir-se injustiçado', 'Falta de reconhecimento', 'Percepção de injustiça', 'Fracassos'],
    impact: ['Passividade', 'Culpa os outros', 'Dificuldade de assumir responsabilidade'],
    coping: ['Reconhecer o poder de escolha', 'Focar no que pode controlar', 'Cultivar resiliência proativa'],
  },
  hyperRational: {
    key: 'hyperRational',
    label: 'Hiper-Racional',
    description: 'Aplicação exclusiva da racionalidade a situações que requerem emoção e intuição',
    triggers: ['Emoções', 'Subjetividade', 'Decisões sem dados', 'Ambiguidade emocional'],
    impact: ['Frio e desconectado emocionalmente', 'Dificuldade de empatia', 'Relacionamentos superficiais'],
    coping: ['Praticar escuta empática', 'Validar emoções próprias e alheias', 'Integrar intuição na tomada de decisão'],
  },
  hyperVigilant: {
    key: 'hyperVigilant',
    label: 'Hiper-Vigilante',
    description: 'Vigilância constante sobre possíveis perigos e situações que podem dar errado',
    triggers: ['Incerteza', 'Ameaças percebidas', 'Ambiguidade', 'Novidades e mudanças'],
    impact: ['Ansiedade crônica', 'Paranoia leve', 'Dificuldade de relaxar e confiar'],
    coping: ['Técnicas de mindfulness', 'Distinguir ameaças reais de percebidas', 'Cultivar confiança no processo'],
  },
  restless: {
    key: 'restless',
    label: 'Inquieto',
    description: 'Busca constante de maior excitação em novas atividades, evitando o presente',
    triggers: ['Rotina', 'Tédio', 'Tarefas repetitivas', 'Silêncio e quietude'],
    impact: ['Distração constante', 'Fuga do presente', 'Dificuldade de aprofundar e concluir'],
    coping: ['Praticar presença plena', 'Encontrar profundidade no que já tem', 'Completar antes de iniciar'],
  },
  controller: {
    key: 'controller',
    label: 'Controlador',
    description: 'Ansiedade em assumir o controle e dobrar a vontade dos outros',
    triggers: ['Imprevisibilidade', 'Perda de controle', 'Dependência dos outros', 'Incerteza no ambiente'],
    impact: ['Microgerenciamento', 'Tensão nas relações', 'Dificuldade de confiar e delegar'],
    coping: ['Praticar delegação consciente', 'Aceitar o que não pode controlar', 'Cultivar confiança nas pessoas'],
  },
  avoider: {
    key: 'avoider',
    label: 'Esquivo',
    description: 'Foco no positivo e agradável, evitando tarefas difíceis e conflitos',
    triggers: ['Confronto', 'Desconforto emocional', 'Tarefas áridas', 'Conversas difíceis'],
    impact: ['Procrastinação', 'Evitação', 'Problemas acumulam até explodir'],
    coping: ['Abordar dificuldades diretamente', 'Praticar tolerância ao desconforto', 'Dividir tarefas difíceis em pequenos passos'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sortDesc(obj) {
  return Object.entries(obj).sort(([, a], [, b]) => b - a);
}

function getRiskLevel(pqScore) {
  if (pqScore > 70) return 'baixo';
  if (pqScore >= 40) return 'moderado';
  return 'alto';
}

// ─── Gerador determinístico de Deep Insights ─────────────────────────────────
/**
 * buildDeepInsights — gera 5-6 insights derivados do perfil DISC + sabotadores.
 * Puro, sem efeitos colaterais, sem fetch, sem random. 100% PT-BR.
 */
function buildDeepInsights(primary, secondary, top3, pqScore, riskLevel) {
  const insights = [];

  // 1. Sinergia entre perfil primário e secundário (comunicação + motivações)
  insights.push(
    `Como perfil ${primary.label} com traços ${secondary.label}, você combina um estilo `
    + `de comunicação ${primary.communicationStyle.toLowerCase()} com a valorização de `
    + `${secondary.motivations[0].toLowerCase()} e ${secondary.motivations[1]?.toLowerCase() ?? secondary.motivations[0].toLowerCase()}. `
    + `Essa combinação gera um profissional ao mesmo tempo assertivo e versátil, capaz de `
    + `adaptar sua abordagem conforme o contexto exige.`
  );

  // 2. Padrão sob pressão + liderança
  insights.push(
    `Sob estresse ou alta demanda, seu padrão natural é: ${primary.underPressure.toLowerCase()}. `
    + `Seu estilo de liderança — ${primary.leadership.toLowerCase()} — é muito eficaz quando `
    + `aliado à consciência desse gatilho, permitindo escolhas estratégicas no lugar de reações automáticas.`
  );

  // 3. Complementaridade de perfis e colaboração
  const bestPairsLabels = primary.bestPairs.map(k => DISC_PROFILES[k]?.label ?? k);
  insights.push(
    `Profissionais de perfil ${primary.label} costumam atingir seu potencial máximo ao colaborar `
    + `com perfis ${bestPairsLabels.join(' e ')}. Essa parceria compensa pontos de atenção como `
    + `${primary.weaknesses[0].toLowerCase()} e gera resultados superiores ao trabalho individual.`
  );

  // 4-6. Um insight personalizado por sabotador do top3
  top3.slice(0, 3).forEach(sabKey => {
    const sab = SABOTADORES_DATA[sabKey];
    if (!sab) return;
    const trigger0 = sab.triggers[0]?.toLowerCase() ?? 'situações desafiadoras';
    const trigger1 = sab.triggers[1]?.toLowerCase() ?? trigger0;
    const impact   = sab.impact[0]?.toLowerCase()   ?? sab.description.toLowerCase();
    const coping0  = sab.coping[0]?.toLowerCase()   ?? 'autoconhecimento';
    insights.push(
      `O sabotador ${sab.label} tende a se ativar diante de ${trigger0} ou ${trigger1}. `
      + `Seu principal impacto é ${impact}. `
      + `Praticar "${coping0}" é a forma mais direta de reduzir sua influência no dia a dia.`
    );
  });

  // Insight de PQ Score (contextualizador geral)
  if (pqScore < 60) {
    insights.push(
      `Com um PQ Score de ${pqScore}/100, há uma oportunidade real de ampliar desempenho e `
      + `bem-estar. Pesquisas em Inteligência Positiva indicam que práticas diárias de 10 a 15 `
      + `minutos produzem resultados mensuráveis em 6 a 8 semanas.`
    );
  } else {
    insights.push(
      `Seu PQ Score de ${pqScore}/100 reflete uma boa base de inteligência positiva. `
      + `O próximo nível é antecipar a ativação dos sabotadores identificados — `
      + `reconhecendo os gatilhos antes de reagir, e não apenas depois.`
    );
  }

  return insights.filter(Boolean);
}

// ─── Gerador determinístico de Perguntas de Coaching ─────────────────────────
/**
 * buildCoachingQuestions — gera 5-7 perguntas reflexivas abertas.
 * Puro, sem efeitos colaterais, sem fetch, sem random. 100% PT-BR.
 */
function buildCoachingQuestions(primary, top3) {
  const questions = [];

  // Q1: padrão sob pressão → reflexão sobre gatilho e resposta
  // underPressure está em 3ª pessoa ("Torna-se mais X"); reformulamos para 2ª pessoa direta
  const pressurePattern = primary.underPressure
    .replace(/^Torna-se\s+/i,  'você está ')
    .replace(/^Retrai-se\s+/i, 'você está ')
    .replace(/^Torna,\s+/i,    'você está ');
  questions.push(
    `Em situações de alta pressão, seu padrão é: ${pressurePattern.toLowerCase()}. `
    + `O que costuma ter acontecido imediatamente antes de você chegar a esse estado? `
    + `Que resposta diferente você poderia escolher nesse momento?`
  );

  // Q2: ponto de atenção secundário do perfil
  if (primary.weaknesses[1]) {
    questions.push(
      `"${primary.weaknesses[1]}" é um ponto de atenção recorrente no seu perfil. `
      + `Em quais situações isso aparece com mais frequência, `
      + `e qual seria o custo de manter esse padrão por mais um ano?`
    );
  }

  // Q3: tensão entre motivação central e medo central
  questions.push(
    `Você valoriza profundamente ${primary.motivations[0].toLowerCase()}, `
    + `mas teme ${primary.fears[0].toLowerCase()}. `
    + `Em que momentos esse medo te impede de buscar o que realmente importa para você?`
  );

  // Q4-Q6: uma pergunta por sabotador do top3 (trigger + coping)
  top3.slice(0, 3).forEach(sabKey => {
    const sab = SABOTADORES_DATA[sabKey];
    if (!sab) return;
    const trigger = sab.triggers[0]?.toLowerCase() ?? 'situações desafiadoras';
    const coping  = sab.coping[0]?.toLowerCase()   ?? 'autoconhecimento';
    questions.push(
      `Em que situações o padrão de "${trigger}" costuma aparecer para você, `
      + `e o que mudaria se você praticasse "${coping}" antes de reagir?`
    );
  });

  return questions.filter(Boolean);
}

// ─── Main Analysis Function ───────────────────────────────────────────────────
export function generateLocalAnalysis(discScores, sabotadorScores) {
  const discSorted = sortDesc(discScores);
  const [primaryKey] = discSorted[0];
  const [secondaryKey] = discSorted[1];
  const primary = DISC_PROFILES[primaryKey];
  const secondary = DISC_PROFILES[secondaryKey];
  const subtype = `${primaryKey}${secondaryKey}`;

  // Sabotadores
  const sabSorted = sortDesc(sabotadorScores);
  const top3 = sabSorted.slice(0, 3).map(([k]) => k);
  const top3Avg = top3.reduce((sum, k) => sum + (sabotadorScores[k] || 0), 0) / 3;
  const pqScore = Math.round(100 - top3Avg * 10);
  const riskLevel = getRiskLevel(pqScore);

  const discChartData = ['D', 'I', 'S', 'C'].map(k => ({
    label: DISC_PROFILES[k].label,
    value: discScores[k] || 0,
    color: DISC_PROFILES[k].color,
  }));

  const sabChartData = sabSorted.map(([k, v]) => ({
    label: SABOTADORES_DATA[k]?.label || k,
    value: v,
  }));

  // Correlations
  const correlations = [];
  top3.forEach(sabKey => {
    if (primary.sabotadorCorrelation.includes(sabKey)) {
      const sab = SABOTADORES_DATA[sabKey];
      correlations.push({
        disc: primary.label,
        sabotador: sab?.label || sabKey,
        insight: `Perfis ${primary.label} com ${sab?.label} ativo tendem a usar a energia de ação para compensar inseguranças internas — atenção para decisões impulsivas motivadas pelo medo.`,
      });
    }
  });

  if (primaryKey === 'D' && top3.includes('controller')) {
    correlations.push({ disc: 'Dominante', sabotador: 'Controlador', insight: 'A combinação D + Controlador pode gerar liderança eficaz mas tóxica — a necessidade de controle amplifica a tendência autoritária.' });
  }
  if (primaryKey === 'I' && top3.includes('restless')) {
    correlations.push({ disc: 'Influente', sabotador: 'Inquieto', insight: 'I + Inquieto cria muita energia criativa mas pouca conclusão — projetos começam com entusiasmo e ficam incompletos.' });
  }
  if (primaryKey === 'S' && top3.includes('pleaser')) {
    correlations.push({ disc: 'Estável', sabotador: 'Prestativo', insight: 'S + Prestativo é a combinação do "sim eterno" — harmonia externa à custa de necessidades pessoais ignoradas.' });
  }
  if (primaryKey === 'C' && top3.includes('stickler')) {
    correlations.push({ disc: 'Analítico', sabotador: 'Insistente', insight: 'C + Insistente pode paralisar por excesso de análise — a busca por perfeição bloqueia a entrega e a tomada de decisão.' });
  }

  // Recommendations (rules-based)
  const recommendations = [];

  if (pqScore < 40) {
    recommendations.push({ category: 'Desenvolvimento Urgente', action: 'Buscar acompanhamento de mentoria ou coaching focado em Inteligência Positiva (PQ) — seu nível atual indica alta influência de sabotadores no desempenho.', priority: 'alta' });
  }
  if (top3.includes('judge') && primaryKey === 'D') {
    recommendations.push({ category: 'Liderança Consciente', action: 'Pratique pausar antes de julgar resultados — como líder Dominante, o Juiz interno pode contaminar o ambiente com críticas que desmotivam a equipe.', priority: 'alta' });
  }
  if (top3.includes('pleaser') && primaryKey === 'S') {
    recommendations.push({ category: 'Estabelecer Limites', action: 'Trabalhe conscientemente sua habilidade de dizer não — perfis Estável com Prestativo ativo sacrificam necessidades próprias em prol da harmonia do grupo.', priority: 'alta' });
  }
  if (top3.includes('restless') && primaryKey === 'I') {
    recommendations.push({ category: 'Foco e Conclusão', action: 'Implemente um sistema de priorização de projetos e pratique "completar antes de iniciar" — o binômio Influente + Inquieto gera muitas ideias mas poucas entregas.', priority: 'média' });
  }
  if (top3.includes('hyperAchiever')) {
    recommendations.push({ category: 'Equilíbrio Vida-Trabalho', action: 'Identifique atividades que geram satisfação além do desempenho — a identidade não pode depender apenas de conquistas e resultados.', priority: 'média' });
  }
  if (top3.includes('controller') && primaryKey === 'D') {
    recommendations.push({ category: 'Delegação Eficaz', action: 'Pratique delegar com confiança — a combinação Dominante + Controlador limita o crescimento da equipe e cria dependência excessiva do líder.', priority: 'alta' });
  }
  if (top3.includes('hyperRational') && primaryKey === 'C') {
    recommendations.push({ category: 'Inteligência Emocional', action: 'Invista em desenvolver empatia e conexão emocional — o perfil Analítico com Hiper-Racional pode comprometer relacionamentos e liderança de pessoas.', priority: 'média' });
  }
  if (top3.includes('avoider') && primaryKey === 'S') {
    recommendations.push({ category: 'Coragem Conversacional', action: 'Pratique ter conversas difíceis diretamente — Estável + Esquivo pode deixar conflitos acumularem até o ponto de ruptura.', priority: 'alta' });
  }
  if (top3.includes('victim')) {
    recommendations.push({ category: 'Protagonismo Pessoal', action: 'Foque no que está sob seu controle — substituir narrativas de vítima por protagonismo aumenta significativamente o PQ Score.', priority: 'alta' });
  }
  if (top3.includes('stickler') && primaryKey === 'C') {
    recommendations.push({ category: 'Progresso vs Perfeição', action: 'Defina critérios claros de "bom o suficiente" para cada contexto — Analítico + Insistente pode paralisar projetos em busca de uma perfeição inatingível.', priority: 'média' });
  }

  // Fill to minimum 5
  const fillers = [
    { category: 'Mindfulness e Presença', action: 'Dedique 10 minutos diários à prática de mindfulness — reduz a influência dos sabotadores e aumenta o PQ Score ao longo de semanas.', priority: 'média' },
    { category: 'Autoconhecimento', action: `Como perfil ${primary.label}, invista em atividades que potencializem suas forças naturais: ${primary.strengths.slice(0, 2).join(' e ')}.`, priority: 'baixa' },
    { category: 'Gestão de Pontos Cegos', action: `Peça feedback regular sobre seus pontos de atenção: ${primary.weaknesses.slice(0, 2).join(' e ')} — a perspectiva externa acelera o desenvolvimento.`, priority: 'baixa' },
    { category: 'Comunicação Estratégica', action: `Adapte seu estilo de comunicação ao perfil das pessoas com quem interage para maximizar a influência positiva.`, priority: 'baixa' },
    { category: 'Regulação Emocional', action: `Em situações de pressão, use técnicas de respiração para ativar o sistema nervoso parassimpático antes de agir — especialmente quando você tende a: ${primary.underPressure.toLowerCase()}.`, priority: 'média' },
  ];
  for (const filler of fillers) {
    if (recommendations.length >= 5) break;
    recommendations.push(filler);
  }

  // Watchouts
  const watchouts = [
    ...primary.weaknesses.slice(0, 2),
    ...top3.map(k => SABOTADORES_DATA[k]?.impact[0]).filter(Boolean).slice(0, 2),
  ];

  // Deep Insights e Coaching Questions determinísticos (T1)
  const deepInsights      = buildDeepInsights(primary, secondary, top3, pqScore, riskLevel);
  const coachingQuestions = buildCoachingQuestions(primary, top3);

  // Summary
  const riskMessages = {
    baixo: 'nível saudável — boa capacidade de enfrentar desafios com clareza mental',
    moderado: 'nível moderado — há espaço significativo para reduzir limitações internas',
    alto: 'nível de atenção — os padrões limitantes têm impacto elevado no seu potencial',
  };
  const top3Labels = top3.map(k => SABOTADORES_DATA[k]?.label || k);

  const summary = `Seu perfil predominante é ${primary.label}, o que significa que você tende a ser ${primary.strengths.slice(0, 2).join(' e ').toLowerCase()}. Combinado com traços ${secondary.label.toLowerCase()}, você apresenta um estilo de comunicação ${primary.communicationStyle.toLowerCase()}. Seus principais sabotadores são ${top3Labels.join(', ')}, com PQ Score de ${pqScore} — indicando ${riskMessages[riskLevel]}. Pontos de atenção: ${watchouts.slice(0, 2).join(', ').toLowerCase()}. Suas maiores forças: ${primary.strengths.slice(0, 2).join(', ').toLowerCase()}.`;

  return {
    disc: {
      primary: primaryKey,
      secondary: secondaryKey,
      subtype,
      profile: primary,
      scores: discScores,
      chartData: discChartData,
    },
    sabotadores: {
      top3,
      pqScore,
      scores: sabotadorScores,
      chartData: sabChartData,
      riskLevel,
    },
    correlations,
    recommendations: recommendations.slice(0, 7),
    strengths: primary.strengths,
    watchouts,
    summary,
    deepInsights,
    coachingQuestions,
    generatedBy: 'local',
  };
}
