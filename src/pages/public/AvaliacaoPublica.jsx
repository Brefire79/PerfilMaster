import React, { useEffect, useReducer, useCallback, useRef, useState, Component } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buscarPorToken, atualizarStatus } from '@/firebase/functions.js';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';
import { SiglaProvider, SiglaComSignificado } from '@/constants/siglas.jsx';
import { formatCpf, cleanCpf, isValidCpf } from '@/lib/cpf.js';

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

// ─── Cores / nomes dos perfis (fonte única — alinhada aos tokens F1) ──────────
const PERFIL_CONFIG = {
  D: { nome: 'Dominante',  cor: '#EF4444', bg: '#EF444420', emoji: '🔴' },
  I: { nome: 'Influente',  cor: '#F59E0B', bg: '#F59E0B20', emoji: '🟡' },
  S: { nome: 'Estável',    cor: '#22C55E', bg: '#22C55E20', emoji: '🟢' },
  C: { nome: 'Analítico',  cor: '#6366F1', bg: '#6366F120', emoji: '🔵' },
};

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
    // F2: selecionar não avança sozinho — registra a resposta da questão atual
    case 'SELECIONAR':
      return {
        ...state,
        respostas: { ...state.respostas, [action.questionId]: action.valor },
      };
    // F2: avançar via CTA fixo; ao passar da última, vai para ANALISANDO
    case 'AVANCAR': {
      const proximaQuestao = state.questaoAtual + 1;
      const fim = proximaQuestao >= SAMPLE_QUESTIONS.length;
      return {
        ...state,
        questaoAtual: fim ? state.questaoAtual : proximaQuestao,
        tela: fim ? TELAS.ANALISANDO : TELAS.AVALIANDO,
      };
    }
    case 'VOLTAR':
      return {
        ...state,
        questaoAtual: Math.max(0, state.questaoAtual - 1),
      };
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

// ─── Layouts auxiliares ───────────────────────────────────────────────────────
function CentralLayout({ children }) {
  return (
    <main className="flex-1 flex items-center justify-center px-5 py-8">
      <div className="app-shell flex flex-col items-center">{children}</div>
    </main>
  );
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
    <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center text-3xl">🔗</div>
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
    <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center text-3xl">✅</div>
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

function TelaBoasVindas({ avaliado, cpf, onCpfChange, cpfConsent, onCpfConsentChange, cpfErro }) {
  // Só oferece o campo se o admin ainda não registrou CPF (temCpf vem do backend
  // como booleano — o valor do CPF nunca é exposto na resposta pública)
  const ofereceCpf = !avaliado?.temCpf;
  return (
    <div className="flex flex-col gap-6 w-full animate-slide-up">
      {/* Saudação */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl surface-brand flex items-center justify-center text-3xl mx-auto mb-4 shadow-card">
          🧭
        </div>
        <h2 className="text-2xl font-bold text-[#F7F8FC] mb-1 text-balance">
          Olá, {avaliado.nome.split(' ')[0]}!
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          Você foi convidado(a) para a avaliação{' '}
          <span className="text-[#F7F8FC] font-medium">{avaliado.sessaoTitulo}</span>
        </p>
        {avaliado.sessaoDescricao && (
          <p className="text-xs text-[#A0A3B1] mt-1">{avaliado.sessaoDescricao}</p>
        )}
      </div>

      {/* Sobre o DISC */}
      <div className="bg-[#1A1D2E] rounded-2xl p-4 border border-[#2D3047]">
        <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider mb-3">
          O que é o <SiglaComSignificado id="DISC" />?
        </p>
        <p className="text-sm text-[#A0A3B1] mb-4">
          Um modelo comportamental que identifica como você age em diferentes situações.
          Não há respostas certas ou erradas.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(PERFIL_CONFIG).map(([letra, cfg]) => (
            <div key={letra} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: cfg.cor }}
              >
                {letra}
              </div>
              <span className="text-xs text-[#A0A3B1]">{cfg.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instruções */}
      <div className="flex flex-col gap-2.5">
        {[
          { icon: '⏱️', texto: '10 a 15 minutos para concluir' },
          { icon: '📱', texto: 'Pode responder pelo celular' },
          { icon: '🔒', texto: 'Respostas confidenciais' },
          { icon: '💡', texto: 'Responda com honestidade — sem certo ou errado' },
        ].map(({ icon, texto }) => (
          <div key={texto} className="flex items-center gap-3 text-sm text-[#A0A3B1]">
            <span aria-hidden="true">{icon}</span>
            <span>{texto}</span>
          </div>
        ))}
      </div>

      {/* CPF opcional — só se o admin não registrou; habilita histórico de evolução */}
      {ofereceCpf && (
        <div className="bg-[#1A1D2E] rounded-2xl p-4 border border-[#2D3047] flex flex-col gap-2">
          <label htmlFor="cpf-publico" className="text-sm font-medium text-[#F7F8FC]">
            CPF <span className="text-xs text-[#A0A3B1]">(opcional)</span>
          </label>
          <input
            id="cpf-publico"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => onCpfChange(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            className="w-full bg-[#0F1117] border border-[#2D3047] rounded-xl px-4 py-3 text-[#F7F8FC] placeholder:text-[#4A4D6A] focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
          />
          <p className="text-xs text-[#4A4D6A]">
            Informe se quiser acompanhar a evolução do seu perfil em avaliações futuras.
          </p>
          {cleanCpf(cpf).length > 0 && (
            <label className="flex items-start gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={cpfConsent}
                onChange={(e) => onCpfConsentChange(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#2D3047] bg-[#0F1117] accent-[#6366F1] shrink-0"
              />
              <span className="text-xs text-[#A0A3B1] leading-snug">
                Autorizo o registro do meu CPF para identificação e histórico, conforme a LGPD.
              </span>
            </label>
          )}
          {cpfErro && <p className="text-xs text-[#EF4444]">{cpfErro}</p>}
        </div>
      )}
    </div>
  );
}

function TelaAvaliando({ questao, questaoAtual, total, resposta, onSelecionar }) {
  const progresso = Math.round((questaoAtual / total) * 100);
  const isLikert  = questao.type === 'likert5';
  const opcoes    = isLikert ? LIKERT_OPCOES : questao.options;
  const cfgDim    = PERFIL_CONFIG[questao.dimension];

  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in">
      {/* Barra de progresso */}
      <div>
        <div className="flex justify-between text-xs text-[#A0A3B1] mb-1.5">
          <span>Pergunta {questaoAtual + 1} de {total}</span>
          <span className="tabular-nums">{progresso}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {/* Dimensão badge */}
      {cfgDim && (
        <div
          className="self-start text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: cfgDim.bg, color: cfgDim.cor }}
        >
          <SiglaComSignificado id={questao.dimension} />
        </div>
      )}

      {/* Texto da pergunta */}
      <div>
        {questao.type === 'scenario' && questao.scenario && (
          <p className="text-xs text-[#A0A3B1] bg-[#1A1D2E] rounded-xl p-3 mb-3 border border-[#2D3047]">
            📌 {questao.scenario.ptBR}
          </p>
        )}
        <p className="text-lg font-semibold text-[#F7F8FC] leading-snug text-balance">
          {questao.text.ptBR}
        </p>
      </div>

      {/* Opções */}
      {isLikert ? (
        <div className="flex flex-col gap-2">
          {opcoes.map((op) => {
            const selected = resposta === op.valor;
            return (
              <button
                key={op.valor}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelecionar(questao.id, op.valor)}
                className={`option-card ${selected ? 'is-selected' : ''}`}
              >
                <span
                  className={`option-card__lead text-sm font-bold ${selected ? 'text-white' : 'text-[#A0A3B1]'}`}
                  style={selected ? { background: '#6366F1' } : { background: '#1A1D2E' }}
                >
                  {op.valor}
                </span>
                <span className="flex-1">{op.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {opcoes.map((op) => {
            const selected = resposta === op.value;
            return (
              <button
                key={op.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelecionar(questao.id, op.value)}
                className={`option-card ${selected ? 'is-selected' : ''}`}
              >
                <span className="flex-1">{op.label.ptBR}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TelaAnalisando() {
  return (
    <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
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

// ─── Tela de erro no submit ───────────────────────────────────────────────────
function TelaErroSubmit({ onTentarNovamente }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center text-3xl">⚠️</div>
      <div className="w-full">
        <h2 className="text-lg font-bold text-[#F7F8FC] mb-2">Não foi possível salvar</h2>
        <p className="text-sm text-[#A0A3B1] mb-4">
          Suas respostas estão salvas localmente. Tente novamente — se o problema persistir, verifique sua conexão.
        </p>
        <button
          onClick={onTentarNovamente}
          className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white font-semibold text-sm transition-colors active:scale-[0.98]"
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
  // DELTA 7: CPF opcional informado pelo avaliado (só quando admin não registrou)
  const [cpf, setCpf] = useState('');
  const [cpfConsent, setCpfConsent] = useState(false);
  const [cpfErro, setCpfErro] = useState('');

  // document.title dinâmico para a tela de avaliação
  useEffect(() => {
    document.title = 'Avaliação DISC — ProfileAI';
    return () => { document.title = 'ProfileAI'; };
  }, []);

  // Busca dados do avaliado ao montar
  useEffect(() => {
    if (!token) {
      dispatch({ type: 'ERRO_TOKEN', mensagem: 'Token não informado na URL.' });
      return;
    }

    buscarPorToken({ token })
      .then((data) => {
        dispatch({ type: 'CARREGADO_OK', avaliado: data });
        if (data?.nome) {
          const primeiro = data.nome.split(' ')[0];
          document.title = 'Avaliação de ' + primeiro + ' — ProfileAI';
        }
      })
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
        // PRD §6.5 — redirecionar para /resultado/:token após conclusão
        navigate(`/resultado/${token}`, { replace: true });
      })
      .catch((err) => {
        submittingRef.current = false;
        dispatch({ type: 'ERRO_SUBMIT', mensagem: err.message });
      });
  }, [state.tela, state.erroSubmit]);

  // CPF só é oferecido se o avaliado ainda não tiver um registrado pelo admin
  const cpfJaRegistrado = Boolean(state.avaliado?.temCpf);
  const cpfDigits = cleanCpf(cpf);

  const handleIniciar = useCallback(async () => {
    // Se preencheu CPF, valida antes de prosseguir (opcional, mas se digitou tem que ser válido)
    if (!cpfJaRegistrado && cpfDigits) {
      if (!isValidCpf(cpfDigits)) { setCpfErro('CPF inválido. Verifique os números ou deixe em branco.'); return; }
      if (!cpfConsent) { setCpfErro('Marque o consentimento para registrar o CPF.'); return; }
    }
    setCpfErro('');
    try {
      const payload = { token, novoStatus: 'em_andamento' };
      if (!cpfJaRegistrado && cpfDigits && cpfConsent) {
        payload.cpf = cpfDigits;
        payload.cpfConsent = true;
      }
      await atualizarStatus(payload);
    } catch {
      // ignora falha de em_andamento; o concluido ainda vai funcionar com as transições liberadas
    }
    dispatch({ type: 'INICIAR' });
  }, [token, cpfJaRegistrado, cpfDigits, cpfConsent]);

  const handleTentarNovamente = useCallback(() => {
    dispatch({ type: 'TENTAR_NOVAMENTE' });
  }, []);

  const handleSelecionar = useCallback((questionId, valor) => {
    dispatch({ type: 'SELECIONAR', questionId, valor });
  }, []);

  const handleAvancar = useCallback(() => dispatch({ type: 'AVANCAR' }), []);
  const handleVoltar  = useCallback(() => dispatch({ type: 'VOLTAR' }), []);

  const questaoAtual = SAMPLE_QUESTIONS[state.questaoAtual];
  const respostaAtual = questaoAtual ? state.respostas[questaoAtual.id] : undefined;
  const total = SAMPLE_QUESTIONS.length;
  const isUltima = state.questaoAtual >= total - 1;
  const podeAvancar = respostaAtual !== undefined && respostaAtual !== null;

  // CTA fixo (definido por tela)
  let cta = null;
  if (state.tela === TELAS.BOAS_VINDAS) {
    cta = (
      <button
        onClick={handleIniciar}
        className="w-full py-4 rounded-2xl surface-brand text-white font-semibold text-base transition-transform active:scale-[0.98] shadow-card"
      >
        Iniciar avaliação →
      </button>
    );
  } else if (state.tela === TELAS.AVALIANDO && questaoAtual) {
    cta = (
      <div className="flex items-center gap-3">
        {state.questaoAtual > 0 && (
          <button
            onClick={handleVoltar}
            className="px-4 py-4 rounded-2xl bg-[#1A1D2E] border border-[#2D3047] text-[#A0A3B1] font-semibold text-sm transition-colors hover:text-[#F7F8FC] active:scale-[0.98]"
          >
            ← Voltar
          </button>
        )}
        <button
          onClick={handleAvancar}
          disabled={!podeAvancar}
          className="flex-1 py-4 rounded-2xl surface-brand text-white font-semibold text-base transition-transform active:scale-[0.98] shadow-card disabled:opacity-40 disabled:active:scale-100"
        >
          {isUltima ? 'Finalizar' : 'Próxima →'}
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <SiglaProvider>
      <div className="min-h-[100dvh] bg-[#0F1117] flex flex-col">
        {/* Topo */}
        <header className="py-4 px-5 border-b border-[#1E2030] flex items-center justify-center">
          {/* h1 visualmente estilizado como marca; conteúdo semântico de nível de página */}
          <h1 className="text-base font-heading font-bold text-[#F7F8FC]">
            Profile<span className="text-[#6366F1]">AI</span>
          </h1>
        </header>

        {/* Conteúdo */}
        {state.tela === TELAS.CARREGANDO && (
          <CentralLayout><TelaCarregando /></CentralLayout>
        )}

        {state.tela === TELAS.INVALIDO && (
          <CentralLayout><TelaInvalido mensagem={state.erro} /></CentralLayout>
        )}

        {state.tela === TELAS.CONCLUIDO && state.avaliado && (
          <CentralLayout><TelaConcluido avaliado={state.avaliado} /></CentralLayout>
        )}

        {state.tela === TELAS.BOAS_VINDAS && state.avaliado && (
          <main className="flex-1 px-5 py-8">
            <div className="app-shell has-cta-bar">
              <TelaBoasVindas
                avaliado={state.avaliado}
                cpf={cpf}
                onCpfChange={(v) => { setCpf(v); setCpfErro(''); }}
                cpfConsent={cpfConsent}
                onCpfConsentChange={(v) => { setCpfConsent(v); setCpfErro(''); }}
                cpfErro={cpfErro}
              />
            </div>
          </main>
        )}

        {state.tela === TELAS.AVALIANDO && questaoAtual && (
          <main className="flex-1 px-5 py-6">
            <div className="app-shell has-cta-bar">
              <TelaAvaliando
                questao={questaoAtual}
                questaoAtual={state.questaoAtual}
                total={total}
                resposta={respostaAtual}
                onSelecionar={handleSelecionar}
              />
            </div>
          </main>
        )}

        {state.tela === TELAS.ANALISANDO && !state.erroSubmit && (
          <CentralLayout><TelaAnalisando /></CentralLayout>
        )}

        {state.tela === TELAS.ANALISANDO && state.erroSubmit && (
          <CentralLayout><TelaErroSubmit onTentarNovamente={handleTentarNovamente} /></CentralLayout>
        )}

        {/* CTA fixo no rodapé (padrão mobile premium) */}
        {cta && (
          <div className="cta-bar">
            <div className="cta-bar__inner">{cta}</div>
          </div>
        )}

        {/* Rodapé (apenas quando não há CTA fixo) */}
        {!cta && (
          <footer className="py-3 px-5 text-center text-xs text-[#A0A3B1]">
            ProfileAI · AmbFusi AI · Avaliação{' '}
            <SiglaComSignificado id="DISC" /> segura e confidencial
          </footer>
        )}
      </div>
    </SiglaProvider>
    </ErrorBoundary>
  );
}
