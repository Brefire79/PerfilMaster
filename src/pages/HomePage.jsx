/**
 * ProfileAI — AMB FUSI
 * HomePage — tela inicial após login
 * Mostra histórico de resultados e CTA para novo assessment
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DISC_CORES = { D: '#e74c3c', I: '#f39c12', S: '#2ecc71', C: '#3498db' };
const DISC_NOMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

const SABOTADOR_NOMES = {
  judge: 'Juiz', stickler: 'Insistente', pleaser: 'Prestativo',
  hyperAchiever: 'Hiper-Realizador', victim: 'Vítima',
  hyperRational: 'Hiper-Racional', hyperVigilant: 'Hiper-Vigilante',
  restless: 'Inquieto', controller: 'Controlador', avoider: 'Esquivo',
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100dvh', background: '#0f172a', padding: '0 0 5rem' },
  header: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLogo: { fontSize: '1.25rem', fontWeight: '800', color: '#6366f1' },
  headerSub:  { fontSize: '0.65rem', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatarBtn: {
    width: '36px', height: '36px',
    background: '#334155',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', color: '#94a3b8',
    cursor: 'pointer', border: 'none',
  },
  body: { padding: '1.5rem 1.25rem', maxWidth: '680px', margin: '0 auto' },
  greeting: {
    fontSize: '1.4rem', fontWeight: '800', color: '#f1f5f9',
    marginBottom: '0.25rem',
  },
  greetingSub: { color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' },
  ctaCard: {
    background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  ctaTitle: { fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' },
  ctaText:  { color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' },
  ctaBtn: {
    background: '#fff', color: '#4338ca',
    border: 'none', borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem', fontWeight: '800',
    cursor: 'pointer',
  },
  ctaDeco: {
    position: 'absolute', right: '-20px', top: '-20px',
    fontSize: '6rem', opacity: 0.1, pointerEvents: 'none',
  },
  sectionTitle: {
    fontSize: '0.85rem', fontWeight: '700',
    color: '#64748b', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '1rem',
  },
  resultCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s',
  },
  resultTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
  resultDate: { fontSize: '0.8rem', color: '#64748b' },
  badge: (cor) => ({
    background: `${cor}22`,
    color: cor,
    border: `1px solid ${cor}44`,
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '700',
  }),
  resultStats: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  statLabel: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: '1rem', fontWeight: '700', color: '#f1f5f9' },
  pqBadge: (score) => ({
    display: 'inline-block',
    background: score >= 70 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
    color:      score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171',
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.8rem',
    fontWeight: '700',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: '#475569',
  },
  emptyIcon:  { fontSize: '3rem', marginBottom: '0.75rem' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' },
  emptyText:  { fontSize: '0.875rem', lineHeight: 1.6 },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.4rem 0.75rem',
    color: '#64748b',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  spinner: {
    width: '32px', height: '32px',
    border: '2px solid #1e293b',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '3rem auto',
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function HomePage({ user }) {
  const navigate = useNavigate();
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading]       = useState(true);

  const nomeUsuario = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Usuário';

  useEffect(() => {
    carregarResultados();
  }, []);

  async function carregarResultados() {
    const { data } = await supabase
      .from('assessment_results')
      .select('id, completed_at, perfil_primario, perfil_secundario, subtipo_disc, pq_score, top_sabotadores')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    setResultados(data ?? []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function getHorario() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  const temResultados = resultados.length > 0;
  const ultimoResultado = resultados[0];

  // Verifica bloqueio de 30 dias
  const podeFazerAssessment = !ultimoResultado || (() => {
    const proxima = new Date(ultimoResultado.completed_at);
    proxima.setDate(proxima.getDate() + 30);
    return new Date() >= proxima;
  })();

  const isMentor = user?.user_metadata?.role === 'mentor';

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <div style={S.headerLogo}>ProfileAI</div>
          <div style={S.headerSub}>AMB FUSI</div>
        </div>
        <div style={S.headerActions}>
          {isMentor && (
            <button
              style={{ ...S.logoutBtn, borderColor: '#6366f1', color: '#818cf8', fontWeight: 700 }}
              onClick={() => navigate('/mentor/dashboard')}
            >
              🧑‍🏫 Painel Mentor
            </button>
          )}
          <button style={S.logoutBtn} onClick={handleLogout}>Sair</button>
          <div style={S.avatarBtn}>
            {nomeUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Corpo */}
      <div style={S.body}>
        {/* Saudação */}
        <div style={S.greeting}>{getHorario()}, {nomeUsuario} 👋</div>
        <div style={S.greetingSub}>
          {temResultados
            ? 'Acompanhe seu desenvolvimento comportamental'
            : 'Pronto para descobrir seu perfil comportamental?'}
        </div>

        {/* CTA Card */}
        <div style={S.ctaCard}>
          <div style={S.ctaDeco}>🧠</div>
          {podeFazerAssessment ? (
            <>
              <div style={S.ctaTitle}>
                {temResultados ? 'Fazer nova avaliação' : 'Iniciar assessment'}
              </div>
              <div style={S.ctaText}>
                {temResultados
                  ? 'Já se passaram 30 dias. Veja como você evoluiu!'
                  : '78 perguntas sobre seu perfil DISC e sabotadores internos. Leva cerca de 15 minutos.'}
              </div>
              <button style={S.ctaBtn} onClick={() => navigate('/assessment')}>
                {temResultados ? 'Reavaliar agora →' : 'Começar agora →'}
              </button>
            </>
          ) : (
            <>
              <div style={S.ctaTitle}>Continue sua jornada</div>
              <div style={S.ctaText}>
                Você já tem uma avaliação recente. Revise seu relatório e pratique as recomendações.
              </div>
              <button
                style={S.ctaBtn}
                onClick={() => navigate(`/resultados/${ultimoResultado.id}`)}
              >
                Ver meu resultado →
              </button>
            </>
          )}
        </div>

        {/* Histórico */}
        <div style={S.sectionTitle}>
          {temResultados ? `Seus resultados (${resultados.length})` : 'Histórico'}
        </div>

        {loading && <div style={S.spinner} />}

        {!loading && !temResultados && (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📊</div>
            <div style={S.emptyTitle}>Nenhum resultado ainda</div>
            <div style={S.emptyText}>
              Complete seu primeiro assessment para visualizar seu perfil DISC, sabotadores internos e relatório personalizado.
            </div>
          </div>
        )}

        {!loading && resultados.map((r) => (
          <div
            key={r.id}
            style={S.resultCard}
            onClick={() => navigate(`/resultados/${r.id}`)}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={S.resultTop}>
              <span style={S.resultDate}>{formatarData(r.completed_at)}</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {r.subtipo_disc && (
                  <span style={S.badge(DISC_CORES[r.perfil_primario] ?? '#6366f1')}>
                    {r.subtipo_disc}
                  </span>
                )}
                {r.pq_score != null && (
                  <span style={S.pqBadge(r.pq_score)}>PQ {r.pq_score}</span>
                )}
              </div>
            </div>

            <div style={S.resultStats}>
              <div style={S.stat}>
                <span style={S.statLabel}>Perfil primário</span>
                <span style={{ ...S.statValue, color: DISC_CORES[r.perfil_primario] ?? '#f1f5f9' }}>
                  {DISC_NOMES[r.perfil_primario] ?? r.perfil_primario}
                </span>
              </div>
              {r.perfil_secundario && (
                <div style={S.stat}>
                  <span style={S.statLabel}>Secundário</span>
                  <span style={{ ...S.statValue, color: DISC_CORES[r.perfil_secundario] ?? '#94a3b8' }}>
                    {DISC_NOMES[r.perfil_secundario] ?? r.perfil_secundario}
                  </span>
                </div>
              )}
              {Array.isArray(r.top_sabotadores) && r.top_sabotadores.length > 0 && (
                <div style={S.stat}>
                  <span style={S.statLabel}>Top sabotador</span>
                  <span style={S.statValue}>
                    {SABOTADOR_NOMES[r.top_sabotadores[0]] ?? r.top_sabotadores[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
