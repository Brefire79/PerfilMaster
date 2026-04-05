/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * RegisterPage.jsx — Cadastro do aluno via link de convite
 * Rota pública: /convite/:token
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestByToken, registerStudent } from '../../lib/mentorApi.js';

const primary   = '#6366f1';
const darkBg    = '#0f172a';

export default function RegisterPage() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const [test,     setTest]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);
  const [form,     setForm]    = useState({ name: '', email: '' });
  const [saving,   setSaving]  = useState(false);
  const [fieldErr, setFieldErr]= useState({});

  useEffect(() => {
    (async () => {
      try {
        const t = await getTestByToken(token);
        if (!t) { setError('Link inválido ou expirado.'); return; }
        if (t.status !== 'active') { setError('Este teste não está mais disponível.'); return; }
        if (t.deadline && new Date(t.deadline) < new Date()) { setError('O prazo para este teste se encerrou.'); return; }
        setTest(t);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.email.trim()) errs.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido';
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const student = await registerStudent(test.id, { name: form.name.trim(), email: form.email.trim().toLowerCase() });
      navigate(`/teste/${student.id}`, { replace: true });
    } catch (e) {
      if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
        setFieldErr({ email: 'Você já se cadastrou neste teste.' });
      } else {
        setError('Erro ao cadastrar: ' + e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const card = {
    background: '#ffffff', borderRadius: 16, padding: 36,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxWidth: 440, width: '100%',
  };
  const inputStyle = (hasErr) => ({
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${hasErr ? '#ef4444' : '#e2e8f0'}`,
    borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#1e293b',
    outline: 'none', fontFamily: 'inherit', marginTop: 4, transition: 'border-color .2s',
  });

  // Estado de carregamento
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: darkBg }}>
      <div style={{ color: '#94a3b8', fontSize: 16 }}>Carregando…</div>
    </div>
  );

  // Erro ao carregar o link
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: darkBg }}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Link Inválido</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: darkBg, padding: 20,
      backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%)',
    }}>
      <div style={card}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${primary} 0%, #8b5cf6 100%)`,
            fontSize: 24, marginBottom: 12,
          }}>📋</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {test?.title}
          </h1>
          {test?.description && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>{test.description}</p>
          )}
          {test?.deadline && (
            <div style={{
              display: 'inline-block', background: '#fef3c7', borderRadius: 20,
              padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#92400e', marginTop: 8,
            }}>
              ⏰ Prazo: {new Date(test.deadline).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', marginBottom: 24 }} />

        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, textAlign: 'center' }}>
          Informe seus dados para começar a avaliação
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Nome completo</label>
            <input
              type="text"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErr(f => ({ ...f, name: undefined })); }}
              style={inputStyle(!!fieldErr.name)}
              autoFocus
            />
            {fieldErr.name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{fieldErr.name}</p>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErr(f => ({ ...f, email: undefined })); }}
              style={inputStyle(!!fieldErr.email)}
            />
            {fieldErr.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{fieldErr.email}</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#c7d2fe' : `linear-gradient(135deg, ${primary} 0%, #8b5cf6 100%)`,
              color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              transition: 'opacity .2s',
            }}
          >
            {saving ? 'Cadastrando…' : 'Começar Avaliação →'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>
          Ao continuar, você concorda que seus dados serão usados para fins de desenvolvimento profissional.
        </p>
      </div>
    </div>
  );
}
