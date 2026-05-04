/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * DashboardPage.jsx — Página principal do Mentor
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MentorLayout, { PageHeader, PageBody, Card, Btn, StatusBadge, EmptyState, LoadingPage } from '../../components/mentor/MentorLayout.jsx';
import { getDashboardStats, listTests } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

function StatCard({ value, label, icon, color = '#6366f1' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
      padding: '20px 24px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>{icon}</div>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: color + '15', color,
        }}>↑</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const [stats,   setStats]   = useState(null);
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          getDashboardStats(user.id),
          listTests(user.id),
        ]);
        setStats(s);
        setTests(t.slice(0, 5)); // Últimos 5
      } catch (e) {
        toast.error('Erro ao carregar dashboard: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  if (loading) return (
    <MentorLayout user={user}>
      <LoadingPage />
    </MentorLayout>
  );

  return (
    <MentorLayout user={user}>
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo(a), ${user.email}`}
        actions={<Btn onClick={() => navigate('/mentor/testes/novo')}>+ Novo Teste</Btn>}
      />
      <PageBody>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard value={stats?.totalTests ?? 0}     label="Testes criados"    icon="📋" color="#6366f1" />
          <StatCard value={stats?.activeTests ?? 0}    label="Testes ativos"     icon="🟢" color="#10b981" />
          <StatCard value={stats?.totalStudents ?? 0}  label="Alunos cadastrados" icon="👥" color="#f59e0b" />
          <StatCard value={stats?.completedTests ?? 0} label="Avaliações concluídas" icon="✅" color="#3b82f6" />
        </div>

        {/* Testes recentes */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Testes Recentes</h2>
            <Btn variant="secondary" onClick={() => navigate('/mentor/testes')}>Ver todos</Btn>
          </div>

          {tests.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Nenhum teste ainda"
              description="Crie seu primeiro teste para avaliar seus alunos."
              action={<Btn onClick={() => navigate('/mentor/testes/novo')}>+ Criar Teste</Btn>}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['Título', 'Modo', 'Status', 'Alunos', 'Prazo', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{t.title}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{t.mode === 'group' ? '👥 Grupo' : '👤 Individual'}</span>
                    </td>
                    <td style={{ padding: '12px' }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#374151' }}>
                      {t.test_students?.[0]?.count ?? 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: t.deadline && new Date(t.deadline) < new Date() ? '#ef4444' : '#64748b' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Btn variant="ghost" onClick={() => navigate(`/mentor/testes/${t.id}`)} style={{ fontSize: 12 }}>Ver →</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </PageBody>
    </MentorLayout>
  );
}
