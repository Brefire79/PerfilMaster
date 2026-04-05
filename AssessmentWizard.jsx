/**
 * ProfileAI — AMB FUSI | "Damos vida à inovação"
 * AssessmentWizard.jsx — Componente de avaliação comportamental
 * Fluxo: DISC (28 perguntas) → Sabotadores (50 perguntas) → Envio
 * Versão: 1.0 | Abril 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONSTANTES
// ============================================================

const LIKERT_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente',
};

const ETAPAS = {
  disc:      { label: 'Perfil DISC',   total: 28, tempo: '~5 min',  cor: '#3498db' },
  saboteurs: { label: 'Sabotadores',   total: 50, tempo: '~10 min', cor: '#e74c3c' },
  completed: { label: 'Concluído',     total: 0,  tempo: '',        cor: '#2ecc71' },
};

const DISC_COLORS = { D: '#e74c3c', I: '#f39c12', S: '#2ecc71', C: '#3498db' };
const DISC_NAMES  = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

/**
 * AssessmentWizard
 * @param {Object}   props
 * @param {Object}   props.supabaseClient  - Instância do cliente Supabase
 * @param {Function} props.onCompleted     - Callback com { assessmentResultId }
 * @param {string}   [props.proximaAvaliacao] - ISO date: bloqueia reavaliação antes desta data
 */
export default function AssessmentWizard({ supabaseClient, onCompleted, proximaAvaliacao }) {
  // Perguntas carregadas do banco
  const [perguntasDisc,      setPerguntasDisc]      = useState([]);
  const [perguntasSaboteurs, setPerguntasSaboteurs] = useState([]);

  // Controle do wizard
  const [etapa,    setEtapa]    = useState('disc');   // 'disc' | 'saboteurs' | 'completed'
  const [indice,   setIndice]   = useState(0);        // índice da pergunta atual na etapa
  const [respostas, setRespostas] = useState({});      // { question_id: 1-5 }

  // Estados de UI
  const [carregando,   setCarregando]   = useState(true);
  const [enviando,     setEnviando]     = useState(false);
  const [erro,         setErro]         = useState(null);
  const [animacao,     setAnimacao]     = useState('entrada'); // 'entrada' | 'saida'
  const [introVista,      setIntroVista]      = useState(false); // controla exibição da tela de boas-vindas
  const [transicaoVista,  setTransicaoVista]  = useState(false); // controla exibição da tela de transição etapa 2

  // ---- Carrega perguntas do Supabase ----
  useEffect(() => {
    async function carregarPerguntas() {
      setCarregando(true);
      try {
        const { data: disc, error: errDisc } = await supabaseClient
          .from('assessment_questions')
          .select('*')
          .eq('assessment_type', 'disc')
          .eq('ativo', true)
          .order('ordem_exibicao');

        const { data: sab, error: errSab } = await supabaseClient
          .from('assessment_questions')
          .select('*')
          .eq('assessment_type', 'saboteurs')
          .eq('ativo', true)
          .order('ordem_exibicao');

        if (errDisc || errSab) throw errDisc || errSab;

        setPerguntasDisc(disc || []);
        setPerguntasSaboteurs(sab || []);
      } catch (e) {
        setErro('Não foi possível carregar as perguntas. Tente novamente.');
        console.error('[AssessmentWizard] Erro ao carregar perguntas:', e);
      } finally {
        setCarregando(false);
      }
    }
    carregarPerguntas();
  }, [supabaseClient]);

  // ---- Pergunta atual ----
  const perguntas = etapa === 'disc' ? perguntasDisc : perguntasSaboteurs;
  const perguntaAtual = perguntas[indice] ?? null;
  const respostaAtual = perguntaAtual ? respostas[perguntaAtual.id] : null;

  // ---- Progresso geral ----
  const totalRespondidas = Object.keys(respostas).length;
  const totalPerguntas   = perguntasDisc.length + perguntasSaboteurs.length;
  const progressoGeral   = totalPerguntas > 0 ? (totalRespondidas / totalPerguntas) * 100 : 0;

  // ---- Progresso da etapa atual ----
  const progressoEtapa = perguntas.length > 0 ? ((indice + 1) / perguntas.length) * 100 : 0;

  // ---- Selecionar resposta ----
  const selecionarResposta = useCallback((valor) => {
    if (!perguntaAtual) return;
    setRespostas(prev => ({ ...prev, [perguntaAtual.id]: valor }));
  }, [perguntaAtual]);

  // ---- Navegar para próxima ----
  const avancar = useCallback(async () => {
    if (!respostaAtual) return; // obriga resposta

    setAnimacao('saida');
    await new Promise(r => setTimeout(r, 150));

    const proximoIndice = indice + 1;

    if (proximoIndice < perguntas.length) {
      setIndice(proximoIndice);
      setAnimacao('entrada');
    } else if (etapa === 'disc') {
      // Concluiu DISC → inicia Sabotadores
      setEtapa('saboteurs');
      setIndice(0);
      setAnimacao('entrada');
    } else {
      // Concluiu Sabotadores → restaura animação antes de enviar (evita tela branca)
      setAnimacao('entrada');
      await enviarRespostas();
    }
  }, [respostaAtual, indice, perguntas.length, etapa]);

  // ---- Navegar para anterior ----
  const voltar = useCallback(async () => {
    setAnimacao('saida');
    await new Promise(r => setTimeout(r, 150));

    if (indice > 0) {
      setIndice(indice - 1);
    } else if (etapa === 'saboteurs') {
      setEtapa('disc');
      setIndice(perguntasDisc.length - 1);
    }

    setAnimacao('entrada');
  }, [indice, etapa, perguntasDisc.length]);

  // ---- Enviar respostas para a Edge Function ----
  const enviarRespostas = async () => {
    setEnviando(true);
    setErro(null);

    try {
      const { data: resultado, error: fnError } = await supabaseClient.functions.invoke(
        'calculate-assessment',
        { body: { respostas, assessment_type: 'full' } }
      );

      if (fnError) throw new Error(fnError.message || 'Erro ao calcular assessment.');
      if (!resultado?.success) throw new Error(resultado?.error || 'Erro ao calcular assessment.');
      setEtapa('completed');

      if (onCompleted) {
        onCompleted({
          assessmentResultId: resultado.assessment_result_id,
          resultado,
        });
      }
    } catch (e) {
      setErro(e.message || 'Erro ao enviar respostas. Tente novamente.');
      console.error('[AssessmentWizard] Erro ao enviar:', e);
    } finally {
      setEnviando(false);
    }
  };

  // ---- Verificar bloqueio de reavaliação ----
  const assessmentBloqueado = proximaAvaliacao && new Date() < new Date(proximaAvaliacao);
  const diasRestantes = proximaAvaliacao
    ? Math.ceil((new Date(proximaAvaliacao) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // ============================================================
  // RENDER: Bloqueio de reavaliação
  // ============================================================
  if (assessmentBloqueado) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>⏳</div>
          <h2 style={styles.titulo}>Assessment bloqueado</h2>
          <p style={styles.subtitulo}>
            Para garantir resultados significativos, o assessment fica disponível novamente em:
          </p>
          <div style={styles.badgeDestaque}>
            {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
          </div>
          <p style={{ ...styles.subtitulo, fontSize: 13, marginTop: 8 }}>
            Liberação em: {new Date(proximaAvaliacao).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Rodape />
      </div>
    );
  }

  // ============================================================
  // RENDER: Carregando
  // ============================================================
  if (carregando) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ ...styles.subtitulo, marginTop: 16 }}>Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Enviando respostas (tela de processamento)
  // ============================================================
  if (enviando) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.card}>
          <div style={styles.spinner} />
          <h2 style={{ ...styles.titulo, marginTop: 16 }}>Processando sua avaliação…</h2>
          <p style={styles.subtitulo}>
            Estamos calculando seu perfil DISC e PQ Score. Aguarde um momento.
          </p>
          <BarraProgresso valor={70} cor="#6366f1" />
        </div>
        <Rodape />
      </div>
    );
  }

  // ============================================================
  // RENDER: Erro
  // ============================================================
  if (erro && !perguntaAtual) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
          <h2 style={styles.titulo}>Ops, algo deu errado</h2>
          <p style={{ ...styles.subtitulo, color: '#e74c3c' }}>{erro}</p>
          <button
            style={styles.btnPrimario}
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Concluído
  // ============================================================
  if (etapa === 'completed') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>🎉</div>
          <h2 style={styles.titulo}>Assessment concluído!</h2>
          <p style={styles.subtitulo}>
            Suas respostas foram processadas. Seu perfil comportamental está sendo gerado.
          </p>
          <BarraProgresso valor={100} cor="#2ecc71" />
          <p style={{ ...styles.subtitulo, fontSize: 13, marginTop: 12, color: '#6b7280' }}>
            Redirecionando para seus resultados...
          </p>
        </div>
        <Rodape />
      </div>
    );
  }

  // ============================================================
  // RENDER: Tela de boas-vindas (antes da primeira resposta)
  // ============================================================
  if (indice === 0 && etapa === 'disc' && totalRespondidas === 0 && !introVista) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.card}>
          <h2 style={styles.titulo}>Avaliação Comportamental</h2>
          <p style={styles.subtitulo}>
            Esta avaliação é composta por duas etapas:
          </p>

          <div style={styles.etapaInfo}>
            <div style={styles.etapaIcone('#3498db')}>DISC</div>
            <div>
              <strong style={{ color: '#1f2937' }}>Etapa 1 — Perfil DISC</strong>
              <p style={styles.etapaDesc}>28 perguntas • ~5 minutos</p>
              <p style={styles.etapaDesc}>Identifica seu estilo comportamental predominante: Dominante, Influente, Estável ou Analítico.</p>
            </div>
          </div>

          <div style={{ ...styles.etapaInfo, marginTop: 12 }}>
            <div style={styles.etapaIcone('#e74c3c')}>PQ</div>
            <div>
              <strong style={{ color: '#1f2937' }}>Etapa 2 — Sabotadores</strong>
              <p style={styles.etapaDesc}>50 perguntas • ~10 minutos</p>
              <p style={styles.etapaDesc}>Identifica os padrões mentais que sabotam seu desempenho e calcula seu PQ Score.</p>
            </div>
          </div>

          <div style={styles.dica}>
            💡 Responda com sinceridade. Não há respostas certas ou erradas — o que conta é como você realmente se comporta.
          </div>

          <button
            style={styles.btnPrimario}
            onClick={() => setIntroVista(true)}
          >
            Iniciar avaliação →
          </button>
        </div>
        <Rodape />
      </div>
    );
  }

  // ============================================================
  // RENDER: Transição entre etapas
  // ============================================================
  if (etapa === 'saboteurs' && indice === 0 && !respostas[perguntasSaboteurs[0]?.id] && !transicaoVista) {
    const etapaAnt = ETAPAS.disc;
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.card}>
          <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>✅</div>
          <h2 style={styles.titulo}>Etapa 1 concluída!</h2>
          <p style={styles.subtitulo}>
            Você completou o <strong>Perfil DISC</strong> com {perguntasDisc.length} perguntas.
          </p>
          <p style={{ ...styles.subtitulo, marginTop: 12 }}>
            Agora vamos para a <strong>Etapa 2 — Sabotadores</strong>.<br />
            São 50 perguntas sobre padrões mentais, com duração de ~10 minutos.
          </p>
          <div style={styles.dica}>
            💡 Continue respondendo com a mesma sinceridade. Seus sabotadores serão correlacionados com seu perfil DISC para gerar um relatório personalizado.
          </div>
          <button
            style={styles.btnPrimario}
            onClick={() => setTransicaoVista(true)}
          >
            Iniciar Etapa 2 →
          </button>
        </div>
        <Rodape />
      </div>
    );
  }

  // ============================================================
  // RENDER: Wizard (pergunta atual)
  // ============================================================
  const etapaConfig = ETAPAS[etapa];
  const ehUltimaPergunta = (
    indice === perguntas.length - 1 &&
    (etapa === 'saboteurs' || perguntas.length === perguntasDisc.length)
  );
  const podeVoltar = indice > 0 || etapa === 'saboteurs';

  return (
    <div style={styles.container}>
      <Header />

      {/* Barra de progresso geral */}
      <div style={styles.progressoContainer}>
        <div style={styles.progressoTexto}>
          <span>Progresso geral</span>
          <span>{totalRespondidas}/{totalPerguntas}</span>
        </div>
        <BarraProgresso valor={progressoGeral} cor="#6366f1" />
      </div>

      {/* Indicador de etapas */}
      <div style={styles.etapasIndicador}>
        <EtapaIndicador
          numero={1}
          label="DISC"
          ativa={etapa === 'disc'}
          concluida={etapa === 'saboteurs' || etapa === 'completed'}
          cor="#3498db"
        />
        <div style={styles.etapaConector} />
        <EtapaIndicador
          numero={2}
          label="Sabotadores"
          ativa={etapa === 'saboteurs'}
          concluida={etapa === 'completed'}
          cor="#e74c3c"
        />
      </div>

      {/* Card da pergunta */}
      <div
        style={{
          ...styles.card,
          opacity: animacao === 'saida' ? 0 : 1,
          transform: animacao === 'saida' ? 'translateX(-16px)' : 'translateX(0)',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
      >
        {/* Cabeçalho da etapa */}
        <div style={styles.etapaHeader}>
          <div
            style={{
              ...styles.etapaBadge,
              backgroundColor: etapaConfig.cor + '20',
              color: etapaConfig.cor,
              borderColor: etapaConfig.cor + '40',
            }}
          >
            {etapaConfig.label}
          </div>
          <span style={styles.etapaContador}>
            {indice + 1} / {perguntas.length}
          </span>
        </div>

        {/* Barra de progresso da etapa */}
        <BarraProgresso valor={progressoEtapa} cor={etapaConfig.cor} altura={4} />

        {/* Badge da categoria */}
        {perguntaAtual && (
          <div style={styles.categoriaBadge}>
            {etapa === 'disc'
              ? <span style={{ color: DISC_COLORS[perguntaAtual.categoria] || '#6366f1' }}>
                  {DISC_NAMES[perguntaAtual.categoria] || perguntaAtual.categoria}
                </span>
              : <span style={{ color: '#6366f1' }}>
                  Sabotador: {SABOTEUR_NAMES[perguntaAtual.categoria] || perguntaAtual.categoria}
                </span>
            }
          </div>
        )}

        {/* Texto da pergunta */}
        <p style={styles.perguntaTexto}>
          {perguntaAtual?.texto}
        </p>

        {/* Escala Likert visual */}
        <div style={styles.likertContainer}>
          {[1, 2, 3, 4, 5].map((valor) => (
            <BotaoLikert
              key={valor}
              valor={valor}
              selecionado={respostaAtual === valor}
              label={LIKERT_LABELS[valor]}
              cor={etapaConfig.cor}
              onClick={() => selecionarResposta(valor)}
            />
          ))}
        </div>

        {/* Labels dos extremos */}
        <div style={styles.likertLabels}>
          <span>Discordo totalmente</span>
          <span>Concordo totalmente</span>
        </div>

        {/* Erro inline */}
        {erro && (
          <p style={{ color: '#e74c3c', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            {erro}
          </p>
        )}

        {/* Navegação */}
        <div style={styles.navegacao}>
          <button
            style={podeVoltar ? styles.btnSecundario : styles.btnDesabilitado}
            disabled={!podeVoltar}
            onClick={voltar}
          >
            ← Anterior
          </button>

          <button
            style={respostaAtual ? styles.btnPrimario : styles.btnDesabilitado}
            disabled={!respostaAtual || enviando}
            onClick={avancar}
          >
            {enviando
              ? 'Processando...'
              : etapa === 'saboteurs' && indice === perguntasSaboteurs.length - 1
                ? 'Concluir avaliação ✓'
                : 'Próxima →'
            }
          </button>
        </div>
      </div>

      <Rodape />
    </div>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================

/** Barra de progresso horizontal */
function BarraProgresso({ valor, cor = '#6366f1', altura = 8 }) {
  return (
    <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', height: altura, marginTop: 8 }}>
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, valor))}%`,
          backgroundColor: cor,
          borderRadius: 999,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

/** Botão Likert individual com número + label */
function BotaoLikert({ valor, selecionado, label, cor, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <button
        onClick={onClick}
        title={label}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: selecionado ? `3px solid ${cor}` : '2px solid #d1d5db',
          backgroundColor: selecionado ? cor : '#fff',
          color: selecionado ? '#fff' : '#374151',
          fontSize: 16,
          fontWeight: selecionado ? 700 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          transform: selecionado ? 'scale(1.15)' : 'scale(1)',
          boxShadow: selecionado ? `0 4px 12px ${cor}40` : 'none',
        }}
      >
        {valor}
      </button>
    </div>
  );
}

/** Indicador de etapa no cabeçalho */
function EtapaIndicador({ numero, label, ativa, concluida, cor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: '50%',
        backgroundColor: concluida ? '#2ecc71' : ativa ? cor : '#e5e7eb',
        color: concluida || ativa ? '#fff' : '#9ca3af',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14,
        transition: 'all 0.3s ease',
      }}>
        {concluida ? '✓' : numero}
      </div>
      <span style={{ fontSize: 11, color: ativa ? cor : '#9ca3af', fontWeight: ativa ? 600 : 400 }}>
        {label}
      </span>
    </div>
  );
}

/** Header com branding AMB FUSI */
function Header() {
  return (
    <div style={styles.header}>
      <div style={styles.logo}>ProfileAI</div>
      <div style={styles.logoSub}>AMB FUSI — Damos vida à inovação</div>
    </div>
  );
}

/** Rodapé */
function Rodape() {
  return (
    <p style={styles.rodape}>
      ProfileAI v1.0 · AMB FUSI · Frameworks: Positive Intelligence + DISC
    </p>
  );
}

// Nomes PT-BR dos sabotadores para exibição inline
const SABOTEUR_NAMES = {
  judge:         'Juiz',
  stickler:      'Insistente',
  pleaser:       'Prestativo',
  hyperAchiever: 'Hiper-Realizador',
  victim:        'Vítima',
  hyperRational: 'Hiper-Racional',
  hyperVigilant: 'Hiper-Vigilante',
  restless:      'Inquieto',
  controller:    'Controlador',
  avoider:       'Esquivo',
};

// ============================================================
// ESTILOS
// ============================================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px 48px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.5px',
  },
  logoSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: '32px 28px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    textAlign: 'center',
    margin: '0 0 8px',
  },
  subtitulo: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  progressoContainer: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 12,
  },
  progressoTexto: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  etapasIndicador: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 600,
    justifyContent: 'center',
  },
  etapaConector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    maxWidth: 120,
  },
  etapaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etapaBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid',
  },
  etapaContador: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 500,
  },
  categoriaBadge: {
    fontSize: 12,
    fontWeight: 600,
    marginTop: 12,
    marginBottom: 4,
  },
  perguntaTexto: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937',
    lineHeight: 1.5,
    margin: '16px 0 28px',
    textAlign: 'center',
  },
  likertContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    padding: '0 8px',
  },
  likertLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
    padding: '0 4px',
  },
  navegacao: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 28,
  },
  btnPrimario: {
    flex: 1,
    padding: '14px 20px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  btnSecundario: {
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1.5px solid #d1d5db',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnDesabilitado: {
    padding: '14px 20px',
    backgroundColor: '#f3f4f6',
    color: '#d1d5db',
    border: '1.5px solid #e5e7eb',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'not-allowed',
  },
  badgeDestaque: {
    fontSize: 48,
    fontWeight: 800,
    textAlign: 'center',
    color: '#6366f1',
    margin: '16px 0 8px',
  },
  etapaInfo: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  etapaIcone: (cor) => ({
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 10,
    backgroundColor: cor + '20',
    color: cor,
    fontWeight: 700,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  etapaDesc: {
    fontSize: 13,
    color: '#6b7280',
    margin: '2px 0',
    lineHeight: 1.5,
  },
  dica: {
    backgroundColor: '#eff6ff',
    borderLeft: '3px solid #6366f1',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    margin: '16px 0',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
  rodape: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
};
