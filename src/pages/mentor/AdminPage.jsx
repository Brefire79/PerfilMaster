/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * AdminPage.jsx — Configurações globais e exportação de dados
 */
import { useState, useEffect } from 'react';
import MentorLayout, { PageHeader, PageBody, Card, Btn, LoadingPage } from '../../components/mentor/MentorLayout.jsx';
import { supabase } from '../../lib/supabase.js';
import { getAllStudents, getAllResultsForMentor, exportCSV, listTests } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminPage({ user }) {
  const toast   = useToast();
  const [profile,  setProfile]  = useState({ name: '', email: user?.email ?? '' });
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({ students: 0, tests: 0, results: 0 });

  useEffect(() => {
    async function load() {
      try {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (p) setProfile({ name: p.name ?? '', email: p.email ?? user.email ?? '' });

        const [students, tests, results] = await Promise.all([
          getAllStudents(user.id),
          listTests(user.id),
          getAllResultsForMentor(user.id),
        ]);
        setStats({ students: students.length, tests: tests.length, results: results.length });
      } catch (e) {
        toast.error('Erro ao carregar configurações: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({ id: user.id, name: profile.name, email: profile.email });
      toast.success('Perfil atualizado!');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportAll(type) {
    try {
      if (type === 'students') {
        const data = await getAllStudents(user.id);
        exportCSV(data.map(s => ({ nome: s.name, email: s.email, teste: s.tests?.title ?? '', status: s.status, cadastro: s.registered_at })), 'todos_alunos');
      } else if (type === 'results') {
        const data = await getAllResultsForMentor(user.id);
        exportCSV(data.map(r => ({
          aluno:   r.test_students?.name ?? '',
          email:   r.test_students?.email ?? '',
          teste:   r.tests?.title ?? '',
          concluido: r.completed_at,
          email_enviado: r.email_sent,
        })), 'todos_resultados');
      }
      toast.success('Exportação concluída!');
    } catch (e) {
      toast.error('Erro ao exportar: ' + e.message);
    }
  }

  async function handleChangePassword() {
    const newEmail = prompt('Digite o e-mail para enviar o link de redefinição:') || user.email;
    try {
      await supabase.auth.resetPasswordForEmail(newEmail, { redirectTo: `${window.location.origin}/login` });
      toast.success('E-mail de redefinição de senha enviado!');
    } catch (e) {
      toast.error('Erro: ' + e.message);
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, color: '#1e293b',
    outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

  if (loading) return <MentorLayout user={user}><LoadingPage /></MentorLayout>;

  return (
    <MentorLayout user={user}>
      <PageHeader title="Administração" subtitle="Configurações globais e exportação de dados" />
      <PageBody>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

          {/* Perfil do Mentor */}
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              👤 Perfil do Mentor
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input value={profile.email} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>O e-mail não pode ser alterado aqui.</p>
              </div>
              <Btn onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Salvando…' : '💾 Salvar Perfil'}
              </Btn>
            </div>
          </Card>

          {/* Segurança */}
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              🔒 Segurança
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Redefina sua senha enviando um e-mail de recuperação via Supabase Auth.
            </p>
            <Btn variant="secondary" onClick={handleChangePassword}>📧 Enviar e-mail de redefinição</Btn>
          </Card>

          {/* Estatísticas */}
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              📊 Dados do Sistema
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total de alunos', value: stats.students, icon: '👥' },
                { label: 'Testes criados',  value: stats.tests,    icon: '📋' },
                { label: 'Avaliações concluídas', value: stats.results, icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Exportações */}
          <Card>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              📥 Exportar Dados
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Todos os Alunos</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{stats.students} registros</div>
                </div>
                <Btn variant="secondary" onClick={() => handleExportAll('students')} style={{ fontSize: 12 }}>↓ CSV</Btn>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Todos os Resultados</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{stats.results} registros</div>
                </div>
                <Btn variant="secondary" onClick={() => handleExportAll('results')} style={{ fontSize: 12 }}>↓ CSV</Btn>
              </div>
            </div>
          </Card>

          {/* Sobre o sistema */}
          <Card style={{ gridColumn: 'span 2' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              ℹ️ Sobre o Sistema
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Plataforma',  value: 'ProfileAI v2.0' },
                { label: 'Empresa',     value: 'AMB FUSI' },
                { label: 'Stack',       value: 'React + Supabase' },
                { label: 'Avaliações',  value: 'DISC + Sabotadores + Mentoria' },
              ].map(i => (
                <div key={i.label} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{i.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{i.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </MentorLayout>
  );
}
