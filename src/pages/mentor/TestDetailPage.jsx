/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * TestDetailPage.jsx — Detalhes do teste com sidebar em tempo real e gestão de grupos
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MentorLayout, { PageHeader, PageBody, Card, Btn, StatusBadge, Badge, EmptyState, LoadingPage } from '../../components/mentor/MentorLayout.jsx';
import StudentSidebar from '../../components/mentor/StudentSidebar.jsx';
import { getTest, getQuestions, getTestResults, getGroups, createGroup, deleteGroup, updateTest, exportCSV, deleteTest } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

const BASE_URL = window.location.origin;

export default function TestDetailPage({ user }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();

  const [test,      setTest]      = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results,   setResults]   = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('resumo'); // 'resumo' | 'resultados' | 'grupos'
  const [newGroup,  setNewGroup]  = useState('');
  const [copied,    setCopied]    = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [t, q, r, g] = await Promise.all([
        getTest(id),
        getQuestions(id),
        getTestResults(id),
        getGroups(id),
      ]);
      setTest(t); setQuestions(q); setResults(r); setGroups(g);
    } catch (e) {
      toast.error('Erro ao carregar teste: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function copyLink() {
    const link = `${BASE_URL}/convite/${test.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  }

  async function handleChangeStatus(status) {
    try {
      await updateTest(id, { status });
      setTest(prev => ({ ...prev, status }));
      toast.success('Status atualizado!');
    } catch (e) { toast.error(e.message); }
  }

  async function handleAddGroup() {
    const name = newGroup.trim() || `Grupo ${groups.length + 1}`;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
    const color = colors[groups.length % colors.length];
    try {
      await createGroup(id, name, color);
      setNewGroup('');
      await loadAll();
      toast.success('Grupo criado!');
    } catch (e) { toast.error(e.message); }
  }

  async function handleDeleteGroup(groupId) {
    if (!confirm('Excluir este grupo?')) return;
    try {
      await deleteGroup(groupId);
      await loadAll();
      toast.success('Grupo removido.');
    } catch (e) { toast.error(e.message); }
  }

  async function handleDeleteTest() {
    if (!confirm(`Excluir o teste "${test.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteTest(id);
      toast.success('Teste excluído.');
      navigate('/mentor/testes');
    } catch (e) { toast.error(e.message); }
  }

  function handleExportResults() {
    if (!results.length) { toast.warn('Nenhum resultado para exportar.'); return; }
    const rows = results.map(r => ({
      aluno:       r.test_students?.name ?? '',
      email:       r.test_students?.email ?? '',
      concluido:   new Date(r.completed_at).toLocaleString('pt-BR'),
      email_enviado: r.email_sent ? 'Sim' : 'Não',
    }));
    exportCSV(rows, `resultados_${test?.title?.replace(/\s+/g, '_')}`);
    toast.success('CSV exportado!');
  }

  if (loading) return <MentorLayout user={user}><LoadingPage /></MentorLayout>;
  if (!test)   return <MentorLayout user={user}><div style={{ padding: 32, color: '#64748b' }}>Teste não encontrado.</div></MentorLayout>;

  const inviteLink = `${BASE_URL}/convite/${test.invite_token}`;
  const completionPct = results.length > 0 ? Math.round((results.length / Math.max(results.length, 1)) * 100) : 0;

  const TABS = [
    { key: 'resumo',     label: 'Resumo' },
    { key: 'resultados', label: `Resultados (${results.length})` },
    ...(test.mode === 'group' ? [{ key: 'grupos', label: `Grupos (${groups.length})` }] : []),
  ];

  return (
    <MentorLayout user={user}>
      <PageHeader
        title={test.title}
        subtitle={test.description ?? 'Detalhes do teste'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => navigate(`/mentor/testes/${id}/editar`)}>✏️ Editar</Btn>
            {test.status === 'draft'  && <Btn variant="success" onClick={() => handleChangeStatus('active')}>▶ Ativar</Btn>}
            {test.status === 'active' && <Btn variant="secondary" onClick={() => handleChangeStatus('closed')}>⏹ Encerrar</Btn>}
            <Btn variant="danger" onClick={handleDeleteTest}>🗑</Btn>
          </div>
        }
      />

      {/* Main layout: conteúdo + sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Conteúdo principal */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <PageBody>
            {/* Status bar */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <StatusBadge status={test.status} />
              <Badge color={test.mode === 'group' ? '#f59e0b' : '#6366f1'}>{test.mode === 'group' ? '👥 Grupo' : '👤 Individual'}</Badge>
              {test.deadline && (
                <Badge color={new Date(test.deadline) < new Date() ? '#ef4444' : '#64748b'}>
                  Prazo: {new Date(test.deadline).toLocaleDateString('pt-BR')}
                </Badge>
              )}
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
                {questions.length} pergunta{questions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Link de convite */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>🔗 Link de Convite para Alunos</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{
                  flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#374151',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{inviteLink}</code>
                <Btn onClick={copyLink}>{copied ? '✓ Copiado!' : '📋 Copiar Link'}</Btn>
              </div>
              {test.status !== 'active' && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>
                  ⚠️ O teste precisa estar <strong>Ativo</strong> para aceitar cadastros.
                </div>
              )}
            </Card>

            {/* Abas */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f1f5f9', marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#6366f1' : '#64748b',
                  borderBottom: `2px solid ${tab === t.key ? '#6366f1' : 'transparent'}`,
                  marginBottom: -2, transition: 'color 0.15s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── ABA: Resumo ── */}
            {tab === 'resumo' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <Card>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Perguntas ({questions.length})</h3>
                  {questions.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma pergunta cadastrada. <a href={`/mentor/testes/${id}/editar`} style={{ color: '#6366f1' }}>Clique aqui para adicionar.</a></p>
                  ) : (
                    <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {questions.map((q, i) => (
                        <li key={q.id} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600 }}>{q.content}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>
                            [{q.type === 'multiple_choice' ? 'Múltipla Escolha' : q.type === 'likert' ? 'Likert' : 'Dissertativa'}]
                            {!q.required && ' — opcional'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
            )}

            {/* ── ABA: Resultados ── */}
            {tab === 'resultados' && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Resultados ({results.length})</h3>
                  <Btn variant="secondary" onClick={handleExportResults}>↓ Exportar CSV</Btn>
                </div>
                {results.length === 0 ? (
                  <EmptyState icon="📊" title="Nenhum resultado ainda" description="Os resultados aparecerão aqui quando os alunos concluírem o teste." />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        {['Aluno', 'E-mail', 'Concluído em', 'E-mail enviado'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.test_students?.name}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{r.test_students?.email}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{new Date(r.completed_at).toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Badge color={r.email_sent ? '#10b981' : '#94a3b8'}>{r.email_sent ? '✓ Enviado' : 'Pendente'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )}

            {/* ── ABA: Grupos ── */}
            {tab === 'grupos' && test.mode === 'group' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                    placeholder="Nome do grupo (Ex.: Time A)"
                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}
                  />
                  <Btn onClick={handleAddGroup}>+ Criar Grupo</Btn>
                </div>
                {groups.length === 0 ? (
                  <EmptyState icon="👥" title="Nenhum grupo ainda" description="Crie grupos e arraste os alunos na sidebar ao lado." />
                ) : (
                  groups.map(g => (
                    <Card key={g.id} style={{ borderLeft: `4px solid ${g.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{g.name}</span>
                        <Btn variant="danger" onClick={() => handleDeleteGroup(g.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Excluir</Btn>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {g.group_members?.length ?? 0} membro{g.group_members?.length !== 1 ? 's' : ''}
                      </div>
                    </Card>
                  ))
                )}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1d4ed8' }}>
                  💡 Para adicionar alunos aos grupos: arraste os cards de alunos na sidebar direita para o grupo desejado.
                </div>
              </div>
            )}
          </PageBody>
        </div>

        {/* ── Sidebar de Alunos ── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: '1px solid #e2e8f0',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <StudentSidebar
            testId={id}
            mode={test.mode}
            groups={groups}
            onGroupsChange={loadAll}
          />
        </div>
      </div>
    </MentorLayout>
  );
}
