-- ============================================================
-- ProfileAI — AMB FUSI | "Damos vida à inovação"
-- schema.sql — Banco de dados completo para Assessment Engine
-- Frameworks: Positive Intelligence (Sabotadores) + DISC
-- Versão: 1.0 | Abril 2026
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: saboteur_types
-- Armazena os 10 sabotadores com todos os metadados
-- ============================================================
CREATE TABLE IF NOT EXISTS saboteur_types (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT UNIQUE NOT NULL,       -- 'judge', 'stickler', etc.
  nome_pt               TEXT NOT NULL,              -- 'Juiz', 'Insistente', etc.
  nome_en               TEXT NOT NULL,              -- 'Judge', 'Stickler', etc.
  tipo                  TEXT NOT NULL CHECK (tipo IN ('mestre', 'cumplice')),
  descricao             TEXT NOT NULL,
  caracteristicas       TEXT[] NOT NULL,
  pensamentos_tipicos   TEXT NOT NULL,
  mentira_justificacao  TEXT NOT NULL,
  impacto               TEXT NOT NULL,
  funcao_sobrevivencia  TEXT NOT NULL,
  cor_hex               TEXT NOT NULL DEFAULT '#6B7280',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: disc_profiles
-- Armazena os 4 perfis DISC com metadados completos
-- ============================================================
CREATE TABLE IF NOT EXISTS disc_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  CHAR(1) UNIQUE NOT NULL CHECK (code IN ('D', 'I', 'S', 'C')),
  nome_pt               TEXT NOT NULL,   -- 'Dominante', 'Influente', 'Estável', 'Analítico'
  nome_en               TEXT NOT NULL,   -- 'Dominance', 'Influence', 'Steadiness', 'Conscientiousness'
  cor_hex               TEXT NOT NULL,   -- Cor padrão do perfil
  descricao             TEXT NOT NULL,
  foco                  TEXT NOT NULL,
  ritmo                 TEXT NOT NULL,
  orientacao            TEXT NOT NULL,
  medo_principal        TEXT NOT NULL,
  pontos_fortes         TEXT[] NOT NULL,
  pontos_atencao        TEXT[] NOT NULL,
  motivacoes            TEXT[] NOT NULL,
  medos                 TEXT[] NOT NULL,
  como_comunicar        TEXT NOT NULL,
  sabotadores_correlatos TEXT[] NOT NULL, -- Codes dos sabotadores mais comuns
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: disc_subtypes
-- Os 12 subtipos DISC (combinações primário + secundário)
-- ============================================================
CREATE TABLE IF NOT EXISTS disc_subtypes (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                    TEXT UNIQUE NOT NULL,   -- 'DC', 'D', 'Di', 'iD', etc.
  combinacao              TEXT NOT NULL,
  caracteristica_principal TEXT NOT NULL,
  perfil_primario         CHAR(1) NOT NULL CHECK (perfil_primario IN ('D', 'I', 'S', 'C')),
  perfil_secundario       CHAR(1) CHECK (perfil_secundario IN ('D', 'I', 'S', 'C')), -- NULL = perfil puro
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: assessment_questions
-- Todas as perguntas dos dois assessments (28 DISC + 50 Sabotadores)
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_questions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_type  TEXT NOT NULL CHECK (assessment_type IN ('disc', 'saboteurs')),
  categoria        TEXT NOT NULL,   -- 'D','I','S','C' ou 'judge','stickler', etc.
  texto            TEXT NOT NULL,
  ordem_exibicao   INTEGER NOT NULL,
  escala_min       INTEGER DEFAULT 1,
  escala_max       INTEGER DEFAULT 5,
  escala_labels    JSONB DEFAULT '{
    "1": "Discordo totalmente",
    "2": "Discordo",
    "3": "Neutro",
    "4": "Concordo",
    "5": "Concordo totalmente"
  }'::jsonb,
  ativo            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_type, categoria, ordem_exibicao)
);

-- ============================================================
-- TABELA: assessment_results
-- Resultados calculados por usuário
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type       TEXT NOT NULL CHECK (assessment_type IN ('disc', 'saboteurs', 'full')),
  respostas_brutas      JSONB NOT NULL,  -- { "question_uuid": 4, ... }

  -- ---- Scores DISC (média 1.0–5.0) ----
  score_dominante       DECIMAL(4,2),
  score_influente       DECIMAL(4,2),
  score_estavel         DECIMAL(4,2),
  score_analitico       DECIMAL(4,2),
  perfil_primario       CHAR(1) CHECK (perfil_primario IN ('D','I','S','C')),
  perfil_secundario     CHAR(1) CHECK (perfil_secundario IN ('D','I','S','C')),
  subtipo_disc          TEXT,            -- 'Di', 'SC', 'iD', etc.

  -- ---- Scores Sabotadores (escala 1.0–10.0 normalizada) ----
  score_juiz            DECIMAL(5,2),
  score_insistente      DECIMAL(5,2),
  score_prestativo      DECIMAL(5,2),
  score_hiper_realizador DECIMAL(5,2),
  score_vitima          DECIMAL(5,2),
  score_hiper_racional  DECIMAL(5,2),
  score_hiper_vigilante DECIMAL(5,2),
  score_inquieto        DECIMAL(5,2),
  score_controlador     DECIMAL(5,2),
  score_esquivo         DECIMAL(5,2),
  pq_score              INTEGER,         -- 0–100
  top_sabotadores       TEXT[],          -- ['judge', 'pleaser', 'restless']

  -- ---- Controle ----
  completed_at          TIMESTAMPTZ DEFAULT NOW(),
  proxima_avaliacao     TIMESTAMPTZ,     -- completed_at + 30 dias
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: user_reports
-- Relatórios gerados pela Anthropic API
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_result_id  UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  resumo_perfil         TEXT NOT NULL,      -- 2-3 parágrafos sobre o perfil
  impacto_sabotadores   TEXT NOT NULL,      -- Como sabotadores afetam este perfil DISC
  recomendacoes         TEXT[] NOT NULL,    -- 5 recomendações práticas
  focos_mentoria        TEXT[] NOT NULL,    -- 3 focos prioritários
  pontos_fortes         TEXT[] NOT NULL,    -- Pontos a potencializar
  relatorio_completo    TEXT NOT NULL,      -- Relatório completo em markdown
  modelo_ia             TEXT DEFAULT 'claude-sonnet-4-6',
  tokens_usados         INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_completed ON assessment_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_result_id ON user_reports(assessment_result_id);
CREATE INDEX IF NOT EXISTS idx_questions_type_categoria ON assessment_questions(assessment_type, categoria);
CREATE INDEX IF NOT EXISTS idx_questions_ordem ON assessment_questions(assessment_type, ordem_exibicao);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS
ALTER TABLE assessment_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saboteur_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE disc_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE disc_subtypes       ENABLE ROW LEVEL SECURITY;

-- assessment_results: usuário vê/insere apenas seus próprios dados
CREATE POLICY "ver_proprios_resultados"
  ON assessment_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "inserir_proprio_resultado"
  ON assessment_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "atualizar_proprio_resultado"
  ON assessment_results FOR UPDATE
  USING (auth.uid() = user_id);

-- user_reports: usuário vê apenas seus próprios relatórios
CREATE POLICY "ver_proprio_relatorio"
  ON user_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "inserir_proprio_relatorio"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Dados de referência: leitura para qualquer usuário autenticado
CREATE POLICY "leitura_autenticada_perguntas"
  ON assessment_questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "leitura_autenticada_sabotadores"
  ON saboteur_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "leitura_autenticada_disc_perfis"
  ON disc_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "leitura_autenticada_disc_subtipos"
  ON disc_subtypes FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- INSERT: saboteur_types (10 sabotadores)
-- ============================================================
INSERT INTO saboteur_types (code, nome_pt, nome_en, tipo, descricao, caracteristicas, pensamentos_tipicos, mentira_justificacao, impacto, funcao_sobrevivencia, cor_hex) VALUES

('judge', 'Juiz', 'Judge', 'mestre',
 'O Juiz é o sabotador universal que aflige todas as pessoas. É o mais destrutivo, pois alimenta autocrítica, perfeccionismo e culpa. Ele te pune repetidamente por erros e deficiências, avisa obsessivamente sobre riscos futuros e te faz fixar no que está errado com os outros ou com sua vida.',
 ARRAY['Autocrítica constante por erros passados ou deficiências atuais', 'Foco no que está errado com os outros em vez de apreciação', 'Comparações de inferioridade/superioridade com outros', 'Insiste que circunstâncias são ruins em vez de vê-las como oportunidades', 'Gera culpa, arrependimento, vergonha e decepcionamento'],
 'O que há de errado comigo? O que há de errado com você? O que há de errado com esta situação?',
 'Sem mim te pressionando, você ficaria preguiçoso e complacente. Sem te punir pelos erros, você não aprenderia.',
 'Toda culpa, arrependimento, vergonha e decepção vem do Juiz. Grande parte da raiva e ansiedade também.',
 'O Juiz fornece uma sensação de controle através da autocrítica e do medo, criando a ilusão de que julgamento constante leva à melhoria.',
 '#DC2626'),

('stickler', 'Insistente', 'Stickler', 'cumplice',
 'Perfeccionismo e necessidade de ordem e organização levados ao extremo. Nada é bom o suficiente.',
 ARRAY['Frustrado quando as coisas não são feitas do jeito certo', 'Crítico dos próprios erros e dos outros quando padrões não são atendidos', 'Tenso, controlado e pode parecer sarcástico', 'Dificuldade em delegar por medo de que não será feito corretamente'],
 'Tem que ser perfeito. Se não vai ser feito direito, eu mesmo faço.',
 'Perfeccionismo é bom e me faz sentir melhor sobre mim mesmo. Há sempre um jeito certo e um errado.',
 'Rigidez que reduz flexibilidade; gera ansiedade e frustração constantes em si e nos outros.',
 'Oferece uma forma de silenciar a voz constante de autojulgamento tentando ser perfeito.',
 '#7C3AED'),

('pleaser', 'Prestativo', 'Pleaser', 'cumplice',
 'Tenta ganhar aceitação e afeto ajudando, agradando, resgatando ou elogiando os outros indiretamente.',
 ARRAY['Perde de vista as próprias necessidades ao focar nos outros', 'Dificuldade em dizer não', 'Pode se tornar ressentido por não ter reciprocidade', 'Busca validação externa constantemente'],
 'Se eu cuidar dos outros, eles vão me amar. Minhas necessidades não são tão importantes.',
 'É uma obrigação pessoal. Cabe a mim consertar a bagunça que encontro.',
 'Perda de identidade própria; ressentimento acumulado; relacionamentos desequilibrados.',
 'Garantir aceitação e pertencimento atendendo às necessidades dos outros.',
 '#DB2777'),

('hyperAchiever', 'Hiper-Realizador', 'Hyper-Achiever', 'cumplice',
 'Depende de desempenho e conquistas constantes para respeito e validação próprios. A última conquista é rapidamente descartada, precisando de mais.',
 ARRAY['Autoestima completamente atrelada ao sucesso externo', 'Medo de intimidade e vulnerabilidade', 'Eficiente e produtivo mas emocionalmente desconectado', 'Burnout recorrente pela busca incessante'],
 'Eu sou meu desempenho. Se eu parar de conquistar, não tenho valor.',
 'A vida é sobre conquistas. Os sentimentos atrapalham o desempenho.',
 'Burnout, desconexão emocional, relacionamentos superficiais baseados em status.',
 'Conseguir amor e respeito através de desempenho e resultados.',
 '#EA580C'),

('victim', 'Vítima', 'Victim', 'cumplice',
 'Usa emoção e senso de martírio para obter atenção dos outros. Responde ao estresse afundando em emoções negativas.',
 ARRAY['Sente-se incompreendido e sobrecarregado pela vida', 'Tendência a se isolar e se retirar quando criticado', 'Atrai atenção através de problemas emocionais', 'Foco excessivo em sentimentos internos dolorosos'],
 'Ninguém me entende. A vida é tão injusta comigo. Eu sou meus sentimentos.',
 'Meus sentimentos profundos me tornam único e especial. Os outros devem reconhecer isso.',
 'Isolamento, depressão, apatia; os outros sentem culpa por não conseguirem ajudar.',
 'Atrair cuidado e proteção demonstrando vulnerabilidade e sofrimento.',
 '#64748B'),

('hyperRational', 'Hiper-Racional', 'Hyper-Rational', 'cumplice',
 'Foco intenso e exclusivo no processamento racional de tudo, incluindo relacionamentos. Pode ser percebido como frio e arrogante.',
 ARRAY['Vê emoções como distração ou fraqueza', 'Dificuldade de se abrir emocionalmente', 'Valoriza intelecto acima de conexão humana', 'Análise excessiva de todas as situações'],
 'Emoções só atrapalham. A lógica é o único caminho confiável.',
 'Os sentimentos são irracionais e atrapalham o bom desempenho.',
 'Relacionamentos empobrecidos; percebido como insensível; decisões sem empatia.',
 'Escapar para uma mente ordeira e racional, gerando segurança e superioridade intelectual.',
 '#2563EB'),

('hyperVigilant', 'Hiper-Vigilante', 'Hyper-Vigilant', 'cumplice',
 'Ansiedade contínua e intensa sobre todos os perigos e o que pode dar errado. Vigilância que nunca descansa.',
 ARRAY['Cético e cínico constantemente', 'Busca reasseguração através de regras e autoridades', 'Suspicaz sobre o que os outros estão fazendo', 'Autoduvidoso sobre si mesmo e os outros o tempo todo'],
 'A vida é cheia de perigos. Algo vai dar errado, preciso estar preparado.',
 'Se eu ficar vigilante, posso evitar os perigos. Confiar nos outros é perigoso.',
 'Ansiedade constante que esgota energia; incapacidade de relaxar e confiar.',
 'Antecipar perigos e ameaças para sobreviver em um ambiente percebido como hostil.',
 '#D97706'),

('restless', 'Inquieto', 'Restless', 'cumplice',
 'Busca constante por maior excitação na próxima atividade. Raramente sente paz ou contentamento.',
 ARRAY['Facilmente distraído e impaciente', 'Pula de atividade em atividade sem foco duradouro', 'Evita foco real em questões ou relacionamentos', 'Busca estimulação constante como substituto para autocuidado'],
 'A próxima coisa vai ser melhor. Preciso de algo novo e excitante.',
 'Se eu fizer mais coisas e mais rápido, serei mais realizado.',
 'Incapacidade de aprofundar em projetos e relacionamentos; ansiedade disfarçada.',
 'Escapar da ansiedade e dor através de estimulação e novidade constantes.',
 '#0891B2'),

('controller', 'Controlador', 'Controller', 'cumplice',
 'Necessidade baseada em ansiedade de tomar conta e controlar situações e ações das pessoas.',
 ARRAY['Impaciência e ansiedade altas quando não está no controle', 'Confrontador e forte na fala', 'Empurra os outros além de seus limites', 'Dificuldade em ser mandado por outros'],
 'Eu preciso do controle. Se eu não fizer, ninguém fará direito.',
 'Sem mim no controle, nada funciona. Os outros precisam que eu assuma.',
 'Outros se sentem ressentidos e sufocados; relacionamentos baseados em dominação.',
 'Criar sensação de segurança exercendo poder e controle sobre o ambiente.',
 '#B45309'),

('avoider', 'Esquivo', 'Avoider', 'cumplice',
 'Foca no positivo e agradável de forma extrema. Evita tarefas difíceis e conflitos.',
 ARRAY['Diz sim para coisas que não quer', 'Minimiza importância de problemas reais', 'Procrastina tarefas desagradáveis', 'Resiste aos outros por meios passivo-agressivos'],
 'Isso é muito desagradável. Se eu ignorar, talvez se resolva sozinho.',
 'Evitar conflito é a melhor estratégia. As coisas se resolvem naturalmente.',
 'Problemas crescem sem serem tratados; passividade que frustra os outros.',
 'Manter paz e conforto evitando situações ameaçadoras ou dolorosas.',
 '#16A34A');

-- ============================================================
-- INSERT: disc_profiles (4 perfis)
-- ============================================================
INSERT INTO disc_profiles (code, nome_pt, nome_en, cor_hex, descricao, foco, ritmo, orientacao, medo_principal, pontos_fortes, pontos_atencao, motivacoes, medos, como_comunicar, sabotadores_correlatos) VALUES

('D', 'Dominante', 'Dominance', '#e74c3c',
 'Pessoas com perfil Dominante priorizam resultados, eficiência e ação. São diretas, assertivas, decididas e orientadas a desafios. Veem o panorama geral e querem controlar o ambiente para produzir resultados. São rápidas na tomada de decisão e não têm medo de confronto.',
 'Resultados', 'Rápido', 'Tarefa', 'Perder controle',
 ARRAY['Decisivo e orientado a resultados', 'Confiante e competitivo', 'Líder natural em situações de pressão', 'Direto e objetivo na comunicação', 'Assume riscos calculados'],
 ARRAY['Pode parecer insensível ou agressivo', 'Impaciente com processos lentos', 'Dificuldade em ouvir opiniões diferentes', 'Pode dominar conversas e decisões', 'Delegação excessiva sem acompanhamento'],
 ARRAY['Poder', 'Autoridade', 'Desafios', 'Resultados tangíveis', 'Autonomia', 'Eficiência'],
 ARRAY['Perder controle', 'Ser aproveitado', 'Vulnerabilidade', 'Parecer fraco'],
 'Seja direto e objetivo. Vá ao ponto rapidamente. Apresente opções com benefícios claros. Evite detalhes desnecessários.',
 ARRAY['controller', 'hyperAchiever', 'judge']),

('I', 'Influente', 'Influence', '#f39c12',
 'Pessoas com perfil Influente priorizam influenciar e persuadir os outros. São entusiastas, otimistas, abertas, confiáveis e energéticas. Prosperam em ambientes sociais e valorizam colaboração e reconhecimento. São expressivas, criativas e têm facilidade em motivar equipes.',
 'Pessoas', 'Rápido', 'Pessoas', 'Rejeição social',
 ARRAY['Comunicador persuasivo e carismático', 'Entusiasta e otimista naturalmente', 'Criativo e bom gerador de ideias', 'Excelente em networking e conexões', 'Motivador de equipes e ambientes positivos'],
 ARRAY['Pode ser impulsivo nas decisões', 'Dificuldade com detalhes e follow-up', 'Tende a falar mais do que ouvir', 'Pode perder foco facilmente', 'Evita conflitos e conversas difíceis'],
 ARRAY['Reconhecimento social', 'Popularidade', 'Colaboração', 'Liberdade de expressão', 'Diversão'],
 ARRAY['Rejeição social', 'Perda de influência', 'Ser ignorado', 'Ambientes restritos'],
 'Seja entusiasta e amigável. Permita espaço para expressão. Reconheça contribuições publicamente. Evite excesso de dados e detalhes técnicos.',
 ARRAY['pleaser', 'avoider', 'restless']),

('S', 'Estável', 'Steadiness', '#2ecc71',
 'Pessoas com perfil Estável priorizam cooperação, sinceridade, lealdade e confiabilidade. Têm disposições calmas e deliberadas, não gostam de ser apressadas. São excelentes ouvintes, pacientes e criam ambientes seguros. Valorizam estabilidade e consistência.',
 'Harmonia', 'Moderado', 'Pessoas', 'Mudança súbita',
 ARRAY['Leal, confiável e consistente', 'Excelente ouvinte e mediador', 'Paciente e calmo sob pressão', 'Colaborador e bom em equipe', 'Cria ambientes seguros e acolhedores'],
 ARRAY['Resistente a mudanças', 'Pode ser indeciso em situações novas', 'Dificuldade em dizer não', 'Evita confrontos necessários', 'Pode acumular tarefas para manter a paz'],
 ARRAY['Estabilidade', 'Harmonia', 'Segurança', 'Pertencimento', 'Ajudar os outros', 'Rotina previsível'],
 ARRAY['Mudança súbita', 'Perda de segurança', 'Conflito', 'Ambientes caóticos'],
 'Seja paciente e sincero. Dê tempo para processar. Explique mudanças gradualmente. Valorize lealdade e contribuições consistentes.',
 ARRAY['pleaser', 'avoider', 'victim']),

('C', 'Analítico', 'Conscientiousness', '#3498db',
 'Pessoas com perfil Analítico priorizam qualidade, precisão, competência e expertise. São detalhistas, sistemáticas, lógicas e disciplinadas. Valorizam independência e exigem os detalhes antes de tomar decisões. São excelentes em análise e resolução de problemas complexos.',
 'Qualidade', 'Cauteloso', 'Tarefa', 'Estar errado',
 ARRAY['Analítico e atento a detalhes', 'Preciso e focado em qualidade', 'Sistemático e organizado', 'Excelente em resolução de problemas', 'Disciplinado e consistente'],
 ARRAY['Paralisia por análise', 'Pode ser percebido como crítico demais', 'Dificuldade em tomar decisões rápidas', 'Emocionalmente reservado', 'Perfeccionismo que atrasa entregas'],
 ARRAY['Qualidade', 'Precisão', 'Expertise', 'Lógica', 'Independência', 'Padrões elevados'],
 ARRAY['Estar errado', 'Trabalho de baixa qualidade', 'Crítica ao seu trabalho', 'Imprecisão'],
 'Seja preciso e forneça dados. Dê tempo para análise. Evite pressão por decisões rápidas. Respeite expertise e independência.',
 ARRAY['stickler', 'hyperRational', 'hyperVigilant']);

-- ============================================================
-- INSERT: disc_subtypes (12 subtipos)
-- ============================================================
INSERT INTO disc_subtypes (code, combinacao, caracteristica_principal, perfil_primario, perfil_secundario) VALUES
('DC', 'Dominante + Analítico',  'Desafiador: direto, cético e exigente',              'D', 'C'),
('D',  'Dominante puro',         'Realizador: focado, competitivo e decisivo',           'D', NULL),
('Di', 'Dominante + Influente',  'Dinâmico: ativo, ousado e persuasivo',                'D', 'I'),
('iD', 'Influente + Dominante',  'Inspirador: energético, assertivo e visionário',      'I', 'D'),
('i',  'Influente puro',         'Comunicador: expressivo, otimista e sociável',         'I', NULL),
('iS', 'Influente + Estável',    'Acolhedor: amigável, paciente e colaborativo',         'I', 'S'),
('Si', 'Estável + Influente',    'Apoiador: calmo, atencioso e receptivo',              'S', 'I'),
('S',  'Estável puro',           'Leal: confiável, estável e consistente',              'S', NULL),
('SC', 'Estável + Analítico',    'Técnico: meticuloso, estável e cuidadoso',            'S', 'C'),
('CS', 'Analítico + Estável',    'Deliberado: cauteloso, preciso e reflexivo',          'C', 'S'),
('C',  'Analítico puro',         'Criterioso: detalhista, lógico e independente',       'C', NULL),
('CD', 'Analítico + Dominante',  'Resoluto: analítico, determinado e objetivo',         'C', 'D');

-- ============================================================
-- INSERT: assessment_questions — DISC (28 perguntas, 7 por perfil)
-- Seções 2.2 a 2.5 do documento de referência
-- ============================================================

-- Perfil D - Dominante (perguntas 1-7)
INSERT INTO assessment_questions (assessment_type, categoria, texto, ordem_exibicao) VALUES
('disc', 'D', 'Eu prefiro tomar decisões rápidas mesmo com informações incompletas.', 1),
('disc', 'D', 'Gosto de assumir a liderança em situações desafiadoras.', 2),
('disc', 'D', 'Foco mais em resultados do que em como as pessoas se sentem.', 3),
('disc', 'D', 'Me sinto motivado por competição e desafios.', 4),
('disc', 'D', 'Prefiro ter autonomia e controle sobre meu trabalho.', 5),
('disc', 'D', 'Sou direto ao comunicar minhas opiniões, mesmo que cause desconforto.', 6),
('disc', 'D', 'Fico impaciente quando as coisas progridem devagar.', 7),

-- Perfil I - Influente (perguntas 8-14)
('disc', 'I', 'Gosto de conhecer pessoas novas e fazer networking.', 8),
('disc', 'I', 'Sou entusiasta e otimista na maioria das situações.', 9),
('disc', 'I', 'Prefiro trabalhar em equipe do que sozinho.', 10),
('disc', 'I', 'Gosto de influenciar e persuadir os outros.', 11),
('disc', 'I', 'Sou expressivo e comunicativo por natureza.', 12),
('disc', 'I', 'Valorizo reconhecimento e apreciação pelo meu trabalho.', 13),
('disc', 'I', 'Tendo a evitar confrontos e buscar harmonia social.', 14),

-- Perfil S - Estável (perguntas 15-21)
('disc', 'S', 'Prefiro ambientes estáveis e previsíveis.', 15),
('disc', 'S', 'Sou paciente e calmo na maioria das situações.', 16),
('disc', 'S', 'Valorizo lealdade e relacionamentos duradouros.', 17),
('disc', 'S', 'Tenho dificuldade com mudanças repentinas.', 18),
('disc', 'S', 'Prefiro cooperar e apoiar do que liderar sozinho.', 19),
('disc', 'S', 'Sou um bom ouvinte e gosto de ajudar os outros.', 20),
('disc', 'S', 'Evito situações de confronto e prefiro harmonia.', 21),

-- Perfil C - Analítico (perguntas 22-28)
('disc', 'C', 'Presto muita atenção aos detalhes e à precisão.', 22),
('disc', 'C', 'Prefiro analisar todas as opções antes de decidir.', 23),
('disc', 'C', 'Valorizo qualidade acima de velocidade.', 24),
('disc', 'C', 'Sou sistemático e organizado em minhas tarefas.', 25),
('disc', 'C', 'Preciso de dados e fatos para tomar decisões.', 26),
('disc', 'C', 'Prefiro trabalhar de forma independente.', 27),
('disc', 'C', 'Me sinto desconfortável quando o trabalho não atinge padrões elevados.', 28);

-- ============================================================
-- INSERT: assessment_questions — Sabotadores (50 perguntas, 5 por sabotador)
-- Seção 1.6 do documento de referência
-- ============================================================

-- Juiz (perguntas 1-5)
INSERT INTO assessment_questions (assessment_type, categoria, texto, ordem_exibicao) VALUES
('saboteurs', 'judge', 'Costumo me criticar severamente por erros do passado.', 1),
('saboteurs', 'judge', 'Frequentemente aponto o que está errado nas pessoas ao meu redor.', 2),
('saboteurs', 'judge', 'Tenho dificuldade em aceitar que uma situação não é ideal.', 3),
('saboteurs', 'judge', 'Me comparo com os outros e sinto que não sou bom o suficiente.', 4),
('saboteurs', 'judge', 'Acredito que sem pressão interna, ficaria preguiçoso.', 5),

-- Insistente (perguntas 6-10)
('saboteurs', 'stickler', 'Fico frustrado quando as coisas não são feitas do jeito certo.', 6),
('saboteurs', 'stickler', 'Tenho dificuldade em aceitar trabalho que não seja perfeito.', 7),
('saboteurs', 'stickler', 'Prefiro fazer as coisas eu mesmo do que delegar.', 8),
('saboteurs', 'stickler', 'Organizar e criar ordem me dá uma sensação de controle.', 9),
('saboteurs', 'stickler', 'Me irrito quando os outros não seguem procedimentos corretos.', 10),

-- Prestativo (perguntas 11-15)
('saboteurs', 'pleaser', 'Frequentemente coloco as necessidades dos outros acima das minhas.', 11),
('saboteurs', 'pleaser', 'Sinto dificuldade em dizer não para pedidos de ajuda.', 12),
('saboteurs', 'pleaser', 'Me sinto incomodado quando não sou reconhecido por ajudar.', 13),
('saboteurs', 'pleaser', 'Tendo a agradar os outros mesmo quando discordo.', 14),
('saboteurs', 'pleaser', 'Me sinto responsável pelo bem-estar emocional das pessoas.', 15),

-- Hiper-Realizador (perguntas 16-20)
('saboteurs', 'hyperAchiever', 'Meu valor pessoal está diretamente ligado às minhas conquistas.', 16),
('saboteurs', 'hyperAchiever', 'Logo após uma conquista, já estou pensando na próxima.', 17),
('saboteurs', 'hyperAchiever', 'Tenho dificuldade em relaxar sem sentir culpa.', 18),
('saboteurs', 'hyperAchiever', 'Busco constantemente validação por meu desempenho.', 19),
('saboteurs', 'hyperAchiever', 'Sinto que se parar de produzir, perderei meu valor.', 20),

-- Vítima (perguntas 21-25)
('saboteurs', 'victim', 'Sinto que a vida é particularmente difícil ou injusta comigo.', 21),
('saboteurs', 'victim', 'Quando criticado, tendo a me retirar e me isolar.', 22),
('saboteurs', 'victim', 'Sinto que as pessoas não entendem o que passo.', 23),
('saboteurs', 'victim', 'Uso minhas emoções e dificuldades para obter atenção dos outros.', 24),
('saboteurs', 'victim', 'Me sinto sobrecarregado e impotente diante dos problemas.', 25),

-- Hiper-Racional (perguntas 26-30)
('saboteurs', 'hyperRational', 'Priorizo lógica e dados acima de sentimentos em todas as decisões.', 26),
('saboteurs', 'hyperRational', 'Tenho dificuldade em expressar ou lidar com emoções.', 27),
('saboteurs', 'hyperRational', 'Considero demonstrações emocionais como sinal de fraqueza.', 28),
('saboteurs', 'hyperRational', 'Prefiro analisar problemas racionalmente antes de considerar sentimentos.', 29),
('saboteurs', 'hyperRational', 'Outros me veem como frio ou distante emocionalmente.', 30),

-- Hiper-Vigilante (perguntas 31-35)
('saboteurs', 'hyperVigilant', 'Estou constantemente preocupado com o que pode dar errado.', 31),
('saboteurs', 'hyperVigilant', 'Tenho dificuldade em confiar nas intenções das pessoas.', 32),
('saboteurs', 'hyperVigilant', 'Preciso de regras e procedimentos claros para me sentir seguro.', 33),
('saboteurs', 'hyperVigilant', 'Fico ansioso quando não tenho controle sobre os riscos.', 34),
('saboteurs', 'hyperVigilant', 'Costumo pensar nos piores cenários possíveis.', 35),

-- Inquieto (perguntas 36-40)
('saboteurs', 'restless', 'Tenho dificuldade em manter foco em uma atividade por muito tempo.', 36),
('saboteurs', 'restless', 'Estou sempre buscando a próxima coisa nova e excitante.', 37),
('saboteurs', 'restless', 'Me sinto inquieto e entediado com rotinas.', 38),
('saboteurs', 'restless', 'Tendo a iniciar muitos projetos sem terminar.', 39),
('saboteurs', 'restless', 'Busco estimulação constante para evitar desconforto interno.', 40),

-- Controlador (perguntas 41-45)
('saboteurs', 'controller', 'Sinto necessidade de estar no comando das situações.', 41),
('saboteurs', 'controller', 'Fico ansioso e impaciente quando não tenho controle.', 42),
('saboteurs', 'controller', 'Tendo a impor minha vontade sobre os outros.', 43),
('saboteurs', 'controller', 'Acredito que sem minha supervisão, as coisas não são feitas direito.', 44),
('saboteurs', 'controller', 'Me sinto desconfortável quando alguém me diz o que fazer.', 45),

-- Esquivo (perguntas 46-50)
('saboteurs', 'avoider', 'Evito conversas difíceis ou confrontos diretos.', 46),
('saboteurs', 'avoider', 'Prefiro focar no lado positivo e ignorar problemas.', 47),
('saboteurs', 'avoider', 'Procrastino tarefas que me causam desconforto.', 48),
('saboteurs', 'avoider', 'Digo sim para coisas que não quero fazer para evitar conflito.', 49),
('saboteurs', 'avoider', 'Acredito que se ignorar o problema, ele se resolve sozinho.', 50);

-- ============================================================
-- FUNÇÃO auxiliar: calcular próxima avaliação (30 dias)
-- ============================================================
CREATE OR REPLACE FUNCTION set_proxima_avaliacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.proxima_avaliacao := NEW.completed_at + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proxima_avaliacao
  BEFORE INSERT ON assessment_results
  FOR EACH ROW
  EXECUTE FUNCTION set_proxima_avaliacao();

-- ============================================================
-- VIEW: ultimos_resultados_por_usuario
-- Facilita busca do resultado mais recente
-- ============================================================
CREATE OR REPLACE VIEW ultimos_resultados_por_usuario AS
SELECT DISTINCT ON (user_id)
  ar.*,
  ur.resumo_perfil,
  ur.recomendacoes,
  ur.focos_mentoria,
  ur.pontos_fortes AS pontos_fortes_relatorio,
  ur.relatorio_completo
FROM assessment_results ar
LEFT JOIN user_reports ur ON ur.assessment_result_id = ar.id
ORDER BY user_id, ar.completed_at DESC;

-- AMB FUSI — ProfileAI v1.0 | Abril 2026
