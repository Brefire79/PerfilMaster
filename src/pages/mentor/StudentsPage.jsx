/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * StudentsPage.jsx — Listagem de todos os alunos + admin
 */
import { useState, useEffect } from 'react';
import MentorLayout, { PageHeader, PageBody, Card, Btn, StatusBadge, EmptyState, LoadingPage } from '../../components/mentor/MentorLayout.jsx';
import { getAllStudents, exportCSV } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function StudentsPage({ user }) {
  const toast    = useToast();
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        setStudents(await getAllStudents(user.id));
      } catch (e) {
        toast.error('Erro ao carregar alunos: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const filtered = students.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleExport() {
    if (!filtered.length) { toast.warn('Nenhum dado para exportar.'); return; }
    exportCSV(filtered.map(s => ({
      nome:        s.name,
      email:       s.email,
      teste:       s.tests?.title ?? '',
      status:      s.status,
      cadastro:    new Date(s.registered_at).toLocaleString('pt-BR'),
      conclusao:   s.completed_at ? new Date(s.completed_at).toLocaleString('pt-BR') : '',
    })), 'alunos_export');
    toast.success('CSV exportado!');
  }

  if (loading) return <MentorLayout user={user}><LoadingPage /></MentorLayout>;

  return (
    <MentorLayout user={user}>
      <PageHeader
        title="Alunos Cadastrados"
        subtitle={`${students.length} aluno${students.length !== 1 ? 's' : ''} no total`}
        actions={<Btn variant="secondary" onClick={handleExport}>↓ Exportar CSV</Btn>}
      />
      <PageBody>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            style={{
              flex: 1, minWidth: 200, border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '8px 12px', fontSize: 13, outline: 'none',
            }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
            border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', cursor: 'pointer',
          }}>
            <option value="all">Todos os status</option>
            <option value="registered">Cadastrado</option>
            <option value="in_progress">Em teste</option>
            <option value="completed">Concluído</option>
          </select>
        </div>

        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon="👥" title="Nenhum aluno encontrado" description={search ? 'Tente ajustar a busca.' : 'Compartilhe os links de convite dos seus testes.'} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['Aluno', 'E-mail', 'Teste', 'Status', 'Cadastro', 'Conclusão'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}>{s.name.substring(0, 2).toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 13, color: '#64748b' }}>{s.email}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#374151' }}>{s.tests?.title ?? '—'}</td>
                    <td style={{ padding: '11px 12px' }}><StatusBadge status={s.status} /></td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b' }}>{new Date(s.registered_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b' }}>
                      {s.completed_at ? new Date(s.completed_at).toLocaleDateString('pt-BR') : '—'}
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
