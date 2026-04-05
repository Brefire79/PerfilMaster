/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * TestsPage.jsx — Listagem de todos os testes do mentor
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MentorLayout, { PageHeader, PageBody, Card, Btn, StatusBadge, Badge, EmptyState, LoadingPage } from '../../components/mentor/MentorLayout.jsx';
import { listTests, deleteTest, updateTest } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function TestsPage({ user }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'active' | 'draft' | 'closed'

  async function load() {
    try {
      setTests(await listTests(user.id));
    } catch (e) {
      toast.error('Erro ao carregar testes: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user.id]);

  async function handleDelete(id, title) {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteTest(id);
      setTests(prev => prev.filter(t => t.id !== id));
      toast.success('Teste excluído.');
    } catch (e) { toast.error(e.message); }
  }

  async function handleChangeStatus(id, status) {
    try {
      await updateTest(id, { status });
      setTests(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      toast.success('Status atualizado!');
    } catch (e) { toast.error(e.message); }
  }

  const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter);
  const counts   = { all: tests.length, active: tests.filter(t => t.status === 'active').length, draft: tests.filter(t => t.status === 'draft').length, closed: tests.filter(t => t.status === 'closed').length };

  if (loading) return <MentorLayout user={user}><LoadingPage /></MentorLayout>;

  return (
    <MentorLayout user={user}>
      <PageHeader
        title="Meus Testes"
        subtitle="Gerencie todos os testes e avaliações"
        actions={<Btn onClick={() => navigate('/mentor/testes/novo')}>+ Novo Teste</Btn>}
      />
      <PageBody>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all',    label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'draft',  label: 'Rascunhos' },
            { key: 'closed', label: 'Encerrados' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              background: filter === f.key ? '#6366f1' : '#fff',
              color: filter === f.key ? '#fff' : '#64748b',
              border: `1px solid ${filter === f.key ? '#6366f1' : '#e2e8f0'}`,
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.label}
              <span style={{
                background: filter === f.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: filter === f.key ? '#fff' : '#94a3b8',
                borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '0 6px',
              }}>{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="📋"
              title={filter === 'all' ? 'Nenhum teste criado' : `Nenhum teste com status "${filter}"`}
              description={filter === 'all' ? 'Crie seu primeiro teste para baixar avaliações dos seus alunos.' : undefined}
              action={filter === 'all' ? <Btn onClick={() => navigate('/mentor/testes/novo')}>+ Criar Teste</Btn> : undefined}
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map(t => <TestRow key={t.id} test={t} onView={() => navigate(`/mentor/testes/${t.id}`)} onEdit={() => navigate(`/mentor/testes/${t.id}/editar`)} onDelete={() => handleDelete(t.id, t.title)} onChangeStatus={s => handleChangeStatus(t.id, s)} />)}
          </div>
        )}
      </PageBody>
    </MentorLayout>
  );
}

function TestRow({ test, onView, onEdit, onDelete, onChangeStatus }) {
  const studentsCount = test.test_students?.[0]?.count ?? 0;
  const questionsCount = test.questions?.[0]?.count ?? 0;
  const isExpired = test.deadline && new Date(test.deadline) < new Date();

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
      flexWrap: 'wrap', transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>{test.title}</h3>
          <StatusBadge status={test.status} />
        </div>
        {test.description && (
          <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{test.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{test.mode === 'group' ? '👥 Grupo' : '👤 Individual'}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{questionsCount} pergunta{questionsCount !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{studentsCount} aluno{studentsCount !== 1 ? 's' : ''}</span>
          {test.deadline && (
            <span style={{ fontSize: 12, color: isExpired ? '#ef4444' : '#94a3b8' }}>
              {isExpired ? '⚠️ Vencido' : '⏰'} {new Date(test.deadline).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {test.status === 'draft'  && <Btn variant="success"   onClick={() => onChangeStatus('active')}  style={{ fontSize: 12, padding: '6px 12px' }}>▶ Ativar</Btn>}
        {test.status === 'active' && <Btn variant="secondary" onClick={() => onChangeStatus('closed')} style={{ fontSize: 12, padding: '6px 12px' }}>⏹ Encerrar</Btn>}
        <Btn variant="ghost"    onClick={onView}   style={{ fontSize: 12, padding: '6px 12px' }}>Ver detalhes</Btn>
        <Btn variant="secondary" onClick={onEdit}  style={{ fontSize: 12, padding: '6px 12px' }}>✏️</Btn>
        <Btn variant="danger"    onClick={onDelete} style={{ fontSize: 12, padding: '6px 10px' }}>🗑</Btn>
      </div>
    </div>
  );
}
