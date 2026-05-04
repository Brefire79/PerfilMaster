/**
 * ProfileAI — AMB FUSI
 * AssessmentPage — wrapper de página para o AssessmentWizard
 * Verifica se o usuário já tem um resultado recente (30 dias) antes de permitir novo assessment
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import AssessmentWizard from '../../AssessmentWizard.jsx';

// AssessmentWizard espera: supabaseClient, onCompleted({ assessmentResultId }), proximaAvaliacao

// Estilos da página de loading/erro
const styles = {
  center: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #1e293b',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '420px',
    width: '100%',
  },
  title: { fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' },
  text:  { color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 },
  badge: {
    display: 'inline-block',
    background: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '8px',
    padding: '0.3rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    margin: '0.75rem 0',
  },
  btn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};

export default function AssessmentPage({ user }) {
  const navigate = useNavigate();
  const [status, setStatus]   = useState('loading'); // 'loading' | 'bloqueado' | 'livre' | 'concluido'
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [resultadoId, setResultadoId]     = useState(null);

  useEffect(() => {
    verificarElegibilidade();
  }, []);

  async function verificarElegibilidade() {
    try {
      // Busca o resultado mais recente do usuário
      const { data, error } = await supabase
        .from('assessment_results')
        .select('id, completed_at, proxima_avaliacao')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Nunca fez assessment — liberar
        setStatus('livre');
        return;
      }

      const agora = new Date();
      const proxima = new Date(data.proxima_avaliacao);

      if (agora < proxima) {
        // Ainda dentro do período de bloqueio
        const diff = proxima - agora;
        const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
        setDiasRestantes(dias);
        setResultadoId(data.id);
        setStatus('bloqueado');
      } else {
        setStatus('livre');
      }
    } catch (err) {
      console.error('[AssessmentPage] Erro ao verificar elegibilidade:', err);
      // Em caso de erro, liberar para não travar o usuário
      setStatus('livre');
    }
  }

  // Assessment concluído — navegar para resultados
  function handleConcluido(assessmentResultId) {
    navigate(`/resultados/${assessmentResultId}`);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Verificando elegibilidade...</span>
      </div>
    );
  }

  // ── Bloqueado ────────────────────────────────────────────────────────────
  if (status === 'bloqueado') {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
          <div style={styles.title}>Reavaliação bloqueada</div>
          <p style={styles.text}>
            Para garantir resultados precisos, o intervalo mínimo entre avaliações é de 30 dias.
          </p>
          <div style={styles.badge}>
            {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
          </div>
          <p style={styles.text}>
            Use esse tempo para praticar as recomendações do seu relatório e observar mudanças no seu comportamento.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexDirection: 'column' }}>
            {resultadoId && (
              <button
                style={styles.btn}
                onClick={() => navigate(`/resultados/${resultadoId}`)}
              >
                Ver meu resultado atual
              </button>
            )}
            <button
              style={{ ...styles.btn, background: '#334155' }}
              onClick={() => navigate('/')}
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Livre — exibir wizard ────────────────────────────────────────────────
  return (
    <AssessmentWizard
      supabaseClient={supabase}
      onCompleted={({ assessmentResultId }) => handleConcluido(assessmentResultId)}
    />
  );
}
