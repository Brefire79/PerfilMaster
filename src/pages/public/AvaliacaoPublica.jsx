import React, { useEffect, useReducer, useCallback, useRef, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buscarPorToken, atualizarStatus } from '@/firebase/functions.js';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';
import { SiglaProvider, SiglaComSignificado } from '@/constants/siglas.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'Erro inesperado' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center text-3xl">⚠️</div>
          <div>
            <h2 className="text-lg font-bold text-[#F7F8FC] mb-2">Algo deu errado</h2>
            <p className="text-sm text-[#A0A3B1]">Tente recarregar a página ou solicite um novo link ao seu facilitador.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Cores / nomes dos perfis ─────────────────────────────────────────────────
const PERFIL_CONFIG = {
  D: { nome: 'Dominante',  cor: '#EF4444', bg: '#EF444420', emoji: '🔴' },
  I: { nome: 'Influente',  cor: '#F59E0B', bg: '#F59E0B20', emoji: '🟡' },
  S: { nome: 'Estável',    cor: '#22C55E', bg: '#22C55E20', emoji: '🟢' },
  C: { nome: 'Analítico',  cor: '#6366F1', bg: '#6366F120', emoji: '🔵' },
};

const DIMENSAO_LABEL = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

// ─── Likert5: labels das opções ───────────────────────────────────────────────
const LIKERT_OPCOES = [
  { valor: 1, label: 'Discordo totalmente' },
  { valor: 2, label: 'Discordo'            },
  { valor: 3, label: 'Neutro'              },
  { valor: 4, label: 'Concordo'            },
  { valor: 5, label: 'Concordo totalmente' },
];

// ─── Estado da máquina de estados ────────────────────────────────────────────
const TELAS = {
  CARREGANDO:   'carregando',
  INVALIDO:     'invalido',
  CONCLUIDO:    'concluido',
  BOAS_VINDAS:  'boas_vindas',
  AVALIANDO:    'avaliando',
  ANALISANDO:   'analisando',
  RESULTADO:    'resultado',
};

const estadoInicial = {
  tela: TELAS.CARREGANDO,
  avaliado: null,
  erro: null,
  erroSubmit: null,
  questaoAtual: 0,
  respostas: {},
  perfil: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'CARREGADO_OK':
      return {
        ...state,
        avaliado: action.avaliado,
        tela: action.avaliado.status === 'concluido'
          ? TELAS.CONCLUIDO
          : TELAS.BOAS_VINDAS,
      };
    case 'ERRO_TOKEN':
      return { ...state, tela: TELAS.INVALIDO, erro: action.mensagem };
    case 'INICIAR':
      return { ...state, tela: TELAS.AVALIANDO, questaoAtual: 0, respostas: {} };
    case 'RESPONDER': {
      const novasRespostas = { ...state.respostas, [action.questionId]: action.valor };
      const proximaQuestao = state.questaoAtual + 1;
      const fim = proximaQuestao >= SAMPLE_QUESTIONS.length;
      return {
        ...state,
        respostas: novasRespostas,
        questaoAtual: fim ? state.questaoAtual : proximaQuestao,
        tela: fim ? TELAS.ANALISANDO : TELAS.AVALIANDO,
      };
    }
    case 'ANALISANDO':
      return { ...state, tela: TELAS.ANALISANDO };
    case 'RESULTADO_OK':
      return { ...state, tela: TELAS.RESULTADO, perfil: action.perfil, erroSubmit: null };
    case 'ERRO_SUBMIT':
      return { ...state, tela: TELAS.ANALISANDO, erroSubmit: action.mensagem };
    case 'TENTAR_NOVAMENTE':
      return { ...state, erroSubmit: null };
    default:
      return state;
  }
}

// ─── Componentes de tela ──────────────────────────────────────────────────────

function TelaCarregando() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      <p className="text-[#A0A3B1] text-sm">Verificando seu link...</p>
    </div>
  );
}

function TelaInvalido({ mensagem }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center text-3xl">
        🔗
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#F7F8FC] mb-2">Link inválido ou expirado</h2>
        <p className="text-sm text-[#A0A3B1]">
          {mensagem || 'Este link de avaliação não é válido. Solicite um novo link ao seu facilitador.'}
        </p>
      </div>
    </div>
  );
}

function TelaConcluido({ avaliado }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center text-3xl">
        ✅
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#F7F8FC] mb-2">
          Avaliação já concluída, {avaliado.nome.split(' ')[0]}!
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          Você já respondeu a avaliação <strong className="text-[#F7F8FC]">{avaliado.sessaoTitulo}</strong>.
          Seu facilitador já tem acesso aos resultados.
        </p>
      </div>
    </div>
  );
}

function TelaBoasVindas({ avaliado, onIniciar }) {
  return (
    <div className="flex flex-col gap-6 max-w-sm w-full">
      {/* Saudação */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center text-3xl mx-auto mb-4">
          🧭
        </div>
        <h2 className="text-xl font-bold text-[#F7F8FC] mb-1">
          Olá, {avaliado.nome.split(' ')[0]}!
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          Você foi convidado(a) para a avaliação{' '}
          <span className="text-[#F7F8FC] font-medium">{avaliado.sessaoTitulo}</span>
        </p>
        {avaliado.sessaoDescricao && (
          <p className="text-xs text-[#4A4D6A] mt-1">{avaliado.sessaoDescricao}</p>
        )}
      </div>

      {/* Sobre o DISC */}
      <div className="bg-[#1A1C2A] rounded-2xl p-4 border border-[#2D3047]">
        <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider mb-3">
          O que é o <SiglaComSignificado id="DISC" />?
        </p>
        <p className="text-sm text-[#A0A3B1] mb-3">
          Um modelo comportamental que identifica como você age em diferentes situações.
          Não há respostas certas ou erradas.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PERFIL_CONFIG).map(([letra, cfg]) => (
            <div key={letra} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: cfg.bg, color: cfg.cor }}
              >
                <SiglaComSignificado id={letra} />
              </div>
              <span className="text-xs text-[#A0A3B1]">{cfg.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instruções */}
      <div className="flex flex-col gap-2">
        {[
          { icon: '⏱️', texto: '10 a 15 minutos para concluir' },
          { icon: '📱', texto: 'Pode responder pelo celular' },
          { icon: '🔒', texto: 'Respostas confidenciais' },
          { icon: '💡', texto: 'Responda com honestidade — sem certo ou errado' },
        ].map(({ icon, texto }) => (
          <div key={texto} className="flex items-center gap-3 text-sm text-[#A0A3B1]">
            <span>{icon}</span>
            <span>{texto}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onIniciar}
        className="w-full py-4 rounded-2xl bg-[#6366F1] hover:bg-[#5558E3] text-white font-semibold text-base transition-colors active:scale-[0.98]"
      >
        Iniciar avaliação →
      </button>
    </div>
  );
}

function TelaAvaliando({ questao, questaoAtual, total, resposta, onResponder }) {
  const progresso = Math.round((questaoAtual / total) * 100);
  const isLikert  = questao.type === 'likert5';
  const opcoes    = isLikert ? LIKERT_OPCOES : questao.options;

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg">
      {/* Barra de progresso */}
      <div>
        <div className="flex justify-between text-xs text-[#A0A3B1] mb-1.5">
          <span>Pergunta {questaoAtual + 1} de {total}</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-1.5 bg-[#2D3047] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6366F1] rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Dimensão badge */}
      <div
        className="self-start text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: PERFIL_CONFIG[questao.dimension]?.bg,
          color: PERFIL_CONFIG[questao.dimension]?.cor,
        }}
      >
        <SiglaComSignificado id={questao.dimension} />
      </div>

      {/* Texto da pergunta */}
      <div>
        {questao.type === 'scenario' && questao.scenario && (
          <p className="text-xs text-[#A0A3B1] bg-[#1A1C2A] rounded-xl p-3 mb-3 border border-[#2D3047]">
            📌 {questao.scenario.ptBR}
          </p>
        )}
        <p className="text-base font-medium text-[#F7F8FC] leading-relaxed">
          {questao.text.ptBR}
        </p>
      </div>

      {/* Opções */}
      {isLikert ? (
        /* Escala Likert: 5 botões circulares */
        <div className="flex flex-col gap-3">
          <div className="flex justify-between gap-2">
            {opcoes.map((op) => (
              <button
                key={op.valor}
                onClick={() => onResponder(questao.id, op.valor)}
                className={`
                  flex-1 h-11 rounded-xl border text-sm font-bold transition-all
                  ${resposta === op.valor
                    ? 'border-[#6366F1] bg-[#6366F1] text-white scale-105'
                    : 'border-[#2D3047] bg-[#1A1C2A] text-[#A0A3B1] hover:border-[#6366F1] hover:text-[#F7F8FC]'}
                `}
              >
                {op.valor}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[#4A4D6A] px-1">
            <span>Discordo totalmente</span>
            <span>Concordo totalmente</span>
          </div>
        </div>
      ) : (
        /* Forced choice / Scenario: cards */
        <div className="flex flex-col gap-2">
          {opcoes.map((op) => (
            <button
              key={op.value}
              onClick={() => onResponder(questao.id, op.value)}
              className={`
                w-full text-left px-4 py-3 rounded-xl border text-sm transition-all
                ${resposta === op.value
                  ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#F7F8FC]'
                  : 'border-[#2D3047] bg-[#1A1C2A] text-[#A0A3B1] hover:border-[#4A4D6A] hover:text-[#F7F8FC]'}
              `}
            >
              {op.label.ptBR}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TelaAnalisando() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#6366F1]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#6366F1] border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#F7F8FC] mb-1">Analisando suas respostas...</h2>
        <p className="text-sm text-[#A0A3B1]">
          Calculando seu perfil <SiglaComSignificado id="DISC" />. Aguarde alguns instantes.
        </p>
      </div>
    </div>
  );
}

function TelaResultado({ avaliado, perfil }) {
  const primario  = PERFIL_CONFIG[perfil.perfilPrimario];
  const secundario = perfil.perfilSecundario ? PERFIL_CONFIG[perfil.perfilSecundario] : null;

  const barras = [
    { key: 'D', label: 'Dominante',  valor: perfil.dominante  },
    { key: 'I', label: 'Influente',  valor: perfil.influente  },
    { key: 'S', label: 'Estável',    valor: perfil.estavel    },
    { key: 'C', label: 'Analítico',  valor: perfil.analitico  },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-sm w-full">
      {/* Badge principal */}
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-3 text-4xl font-black border-2"
          style={{ background: primario.bg, borderColor: primario.cor, color: primario.cor }}
        >
          <SiglaComSignificado id={perfil.perfilPrimario} />
        </div>
        <h2 className="text-xl font-bold text-[#F7F8FC]">
          Perfil {primario.nome}
        </h2>
        {secundario && (
          <p className="text-sm text-[#A0A3B1] mt-1">
            com tendência{' '}
            <span style={{ color: secundario.cor }}>{secundario.nome}</span>
          </p>
        )}
        <p className="text-xs text-[#4A4D6A] mt-2">
          Avaliação de {avaliado.nome}
        </p>
      </div>

      {/* Barras de pontuação */}
      <div className="bg-[#1A1C2A] rounded-2xl p-4 border border-[#2D3047] flex flex-col gap-3">
        <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider">
          Distribuição <SiglaComSignificado id="DISC" />
        </p>
        {barras.map(({ key, label, valor }) => {
          const cfg = PERFIL_CONFIG[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#A0A3B1]">
                  <SiglaComSignificado id={key} /> — {label}
                </span>
                <span className="font-semibold" style={{ color: cfg.cor }}>{valor}%</span>
              </div>
              <div className="h-2 bg-[#2D3047] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${valor}%`, background: cfg.cor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensagem de encerramento */}
      <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-2xl p-4 text-center">
        <p className="text-sm text-[#A0A3B1]">
          ✅ Avaliação concluída com sucesso!{' '}
          <span className="text-[#F7F8FC]">
            Seu facilitador já pode visualizar os resultados.
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Tela de erro no submit ───────────────────────────────────────────────────
function TelaErroSubmit({ onTentarNovamente }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center text-3xl">
        ⚠️
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#F7F8FC] mb-2">Não foi possível salvar</h2>
        <p className="text-sm text-[#A0A3B1] mb-4">
          Suas respostas estão salvas localmente. Tente novamente — se o problema persistir, verifique sua conexão.
        </p>
        <button
          onClick={onTentarNovamente}
          className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white font-semibold text-sm transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AvaliacaoPublica() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, estadoInicial);
  const submittingRef = useRef(false);

  // Busca dados do avaliado ao montar
  useEffect(() => {
    if (!token) {
      dispatch({ type: 'ERRO_TOKEN', mensagem: 'Token não informado na URL.' });
      return;
    }

    buscarPorToken({ token })
      .then((data) => dispatch({ type: 'CARREGADO_OK', avaliado: data }))
      .catch((err) => dispatch({ type: 'ERRO_TOKEN', mensagem: err.message }));
  }, [token]);

  // Quando entra em ANALISANDO (e não tem erro pendente), envia as respostas
  useEffect(() => {
    if (state.tela !== TELAS.ANALISANDO) return;
    if (state.erroSubmit) return; // aguardando o usuário clicar em "Tentar novamente"
    if (Object.keys(state.respostas).length === 0) return;
    if (submittingRef.current) return; // evita chamada dupla

    submittingRef.current = true;
    atualizarStatus({ token, novoStatus: 'concluido', respostas: state.respostas })
      .then((data) => {
        submittingRef.current = false;
        dispatch({ type: 'RESULTADO_OK', perfil: data.perfil });
        // D2b: PRD §6.5 — redirecionar para /resultado/:token após conclusão
        navigate(`/resultado/${token}`, { replace: true });
      })
      .catch((err) => {
        submittingRef.current = false;
        dispatch({ type: 'ERRO_SUBMIT', mensagem: err.message });
      });
  }, [state.tela, state.erroSubmit]);

  const handleIniciar = useCallback(async () => {
    try {
      await atualizarStatus({ token, novoStatus: 'em_andamento' });
    } catch {
      // ignora falha de em_andamento; o concluido ainda vai funcionar com as transições liberadas
    }
    dispatch({ type: 'INICIAR' });
  }, [token]);

  const handleTentarNovamente = useCallback(() => {
    dispatch({ type: 'TENTAR_NOVAMENTE' });
  }, []);

  const handleResponder = useCallback((questionId, valor) => {
    dispatch({ type: 'RESPONDER', questionId, valor });
  }, []);

  const questaoAtual = SAMPLE_QUESTIONS[state.questaoAtual];
  const respostaAtual = questaoAtual ? state.respostas[questaoAtual.id] : undefined;

  return (
    <ErrorBoundary>
    <SiglaProvider>
      <div className="min-h-screen bg-[#0F1117] flex flex-col">
        {/* Topo */}
        <header className="py-4 px-6 border-b border-[#1E2030] flex items-center justify-center">
          <span className="text-base font-heading font-bold text-[#F7F8FC]">
            Profile<span className="text-[#6366F1]">AI</span>
          </span>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 flex items-center justify-center p-6">
          {state.tela === TELAS.CARREGANDO && <TelaCarregando />}

          {state.tela === TELAS.INVALIDO && (
            <TelaInvalido mensagem={state.erro} />
          )}

          {state.tela === TELAS.CONCLUIDO && state.avaliado && (
            <TelaConcluido avaliado={state.avaliado} />
          )}

          {state.tela === TELAS.BOAS_VINDAS && state.avaliado && (
            <TelaBoasVindas avaliado={state.avaliado} onIniciar={handleIniciar} />
          )}

          {state.tela === TELAS.AVALIANDO && questaoAtual && (
            <TelaAvaliando
              questao={questaoAtual}
              questaoAtual={state.questaoAtual}
              total={SAMPLE_QUESTIONS.length}
              resposta={respostaAtual}
              onResponder={handleResponder}
            />
          )}

          {state.tela === TELAS.ANALISANDO && !state.erroSubmit && <TelaAnalisando />}

          {state.tela === TELAS.ANALISANDO && state.erroSubmit && (
            <TelaErroSubmit onTentarNovamente={handleTentarNovamente} />
          )}

          {state.tela === TELAS.RESULTADO && state.avaliado && state.perfil && (
            <TelaResultado avaliado={state.avaliado} perfil={state.perfil} />
          )}
        </main>

        {/* Rodapé */}
        <footer className="py-3 px-6 text-center text-xs text-[#4A4D6A]">
          ProfileAI · AmbFusi AI · Avaliação {' '}
          <SiglaComSignificado id="DISC" /> segura e confidencial
        </footer>
      </div>
    </SiglaProvider>
    </ErrorBoundary>
  );
}
