/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * TestEditorPage.jsx — Criar / Editar Teste com Perguntas
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MentorLayout, { PageHeader, PageBody, Card, Btn, Spinner } from '../../components/mentor/MentorLayout.jsx';
import QuestionEditor from '../../components/mentor/QuestionEditor.jsx';
import { createTest, updateTest, getTest, getQuestions, saveQuestions } from '../../lib/mentorApi.js';
import { useToast } from '../../context/ToastContext.jsx';

const DEFAULT_FORM = {
  title: '',
  description: '',
  mode: 'individual',
  status: 'draft',
  deadline: '',
  completion_message: 'Obrigado por concluir a avaliação! Você receberá o resultado por e-mail em breve.',
};

export default function TestEditorPage({ user }) {
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const navigate = useNavigate();
  const toast    = useToast();

  const [form,      setForm]      = useState(DEFAULT_FORM);
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(isEdit);
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'questions'

  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      try {
        const [t, q] = await Promise.all([getTest(id), getQuestions(id)]);
        setForm({
          title:              t.title ?? '',
          description:        t.description ?? '',
          mode:               t.mode ?? 'individual',
          status:             t.status ?? 'draft',
          deadline:           t.deadline ? t.deadline.substring(0, 16) : '',
          completion_message: t.completion_message ?? DEFAULT_FORM.completion_message,
        });
        setQuestions(q.map(q2 => ({ ...q2, options: q2.options ?? [] })));
      } catch (e) {
        toast.error('Erro ao carregar teste: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSave() {
    if (!form.title.trim()) { toast.warn('O título é obrigatório.'); return; }
    if (questions.some(q => !q.content.trim())) { toast.warn('Todas as perguntas precisam ter texto.'); setActiveTab('questions'); return; }
    setSaving(true);
    try {
      const payload = {
        title:              form.title,
        description:        form.description || null,
        mode:               form.mode,
        status:             form.status,
        deadline:           form.deadline ? new Date(form.deadline).toISOString() : null,
        completion_message: form.completion_message,
      };

      let testId = id;
      if (isEdit) {
        await updateTest(id, payload);
      } else {
        const t = await createTest(user.id, payload);
        testId = t.id;
      }
      await saveQuestions(testId, questions.map(({ id: qid, ...q }, i) => ({ ...q, order_index: i })));
      toast.success(isEdit ? 'Teste atualizado!' : 'Teste criado!');
      navigate(`/mentor/testes/${testId}`);
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, color: '#1e293b',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

  if (loading) return (
    <MentorLayout user={user}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={40} /></div>
    </MentorLayout>
  );

  return (
    <MentorLayout user={user}>
      <PageHeader
        title={isEdit ? 'Editar Teste' : 'Novo Teste'}
        subtitle={isEdit ? `Editando: ${form.title}` : 'Configure o teste e adicione as perguntas'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => navigate(isEdit ? `/mentor/testes/${id}` : '/mentor/testes')}>Cancelar</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? <><Spinner size={14} /> Salvando…</> : '💾 Salvar Teste'}
            </Btn>
          </div>
        }
      />

      {/* Abas */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', gap: 0 }}>
        {[
          { key: 'info',      label: '⚙️ Informações', count: null },
          { key: 'questions', label: '❓ Perguntas',   count: questions.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 20px', fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
            color: activeTab === tab.key ? '#6366f1' : '#64748b',
            borderBottom: `2px solid ${activeTab === tab.key ? '#6366f1' : 'transparent'}`,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
          }}>
            {tab.label}
            {tab.count !== null && (
              <span style={{ background: '#6366f115', color: '#6366f1', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <PageBody>
        {activeTab === 'info' && (
          <Card style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'grid', gap: 18 }}>
              {/* Título */}
              <div>
                <label style={labelStyle}>Título do Teste *</label>
                <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Ex.: Avaliação de Liderança Q2 2026"
                  style={inputStyle} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>

              {/* Descrição */}
              <div>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                  placeholder="Descreva o objetivo desta avaliação..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>

              {/* Modo */}
              <div>
                <label style={labelStyle}>Modo de Avaliação</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'individual', label: '👤 Individual', desc: 'Cada aluno responde sozinho' },
                    { value: 'group',      label: '👥 Em Grupo',   desc: 'Alunos agrupados pelo mentor' },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setField('mode', opt.value)} style={{
                      flex: 1, border: `2px solid ${form.mode === opt.value ? '#6366f1' : '#e2e8f0'}`,
                      borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                      background: form.mode === opt.value ? '#6366f110' : '#fff',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: form.mode === opt.value ? '#6366f1' : '#1e293b' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="draft">Rascunho — não visível</option>
                  <option value="active">Ativo — aceitando inscrições</option>
                  <option value="closed">Encerrado</option>
                </select>
              </div>

              {/* Prazo */}
              <div>
                <label style={labelStyle}>Prazo de Conclusão (opcional)</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setField('deadline', e.target.value)}
                  style={inputStyle} />
              </div>

              {/* Mensagem de conclusão */}
              <div>
                <label style={labelStyle}>Mensagem ao Concluir</label>
                <textarea value={form.completion_message} onChange={e => setField('completion_message', e.target.value)}
                  rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'questions' && (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
              💡 Tipos disponíveis: <strong>Dissertativa</strong> (resposta livre), <strong>Múltipla Escolha</strong> e <strong>Escala Likert 1–5</strong>. Arraste para reordenar.
            </div>
            <QuestionEditor questions={questions} onChange={setQuestions} />
          </div>
        )}
      </PageBody>
    </MentorLayout>
  );
}
