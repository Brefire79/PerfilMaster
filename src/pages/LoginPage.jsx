/**
 * ProfileAI — AMB FUSI
 * LoginPage — Tela de autenticação (login + cadastro + recuperação de senha)
 * Usa Supabase Auth nativamente (sem biblioteca de UI externa)
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '20px',
    padding: '2.5rem 2rem',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.4s ease',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: '-1px',
    lineHeight: 1,
  },
  logoSub: {
    fontSize: '0.7rem',
    color: '#64748b',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginTop: '0.3rem',
  },
  logoTagline: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '0.75rem',
    lineHeight: 1.5,
    maxWidth: '260px',
    margin: '0.75rem auto 0',
  },
  tabs: {
    display: 'flex',
    background: '#0f172a',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '1.5rem',
    gap: '4px',
  },
  tab: (active) => ({
    flex: 1,
    padding: '0.5rem',
    borderRadius: '7px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: active ? '#6366f1' : 'transparent',
    color: active ? '#fff' : '#64748b',
    border: 'none',
  }),
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    color: '#f1f5f9',
    fontSize: '0.95rem',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  btnPrimary: (loading) => ({
    background: loading ? '#4338ca' : '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.875rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    opacity: loading ? 0.8 : 1,
  }),
  btnSecondary: {
    background: 'transparent',
    color: '#6366f1',
    border: 'none',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
    textDecoration: 'underline',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: '#fca5a5',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  success: {
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: '#6ee7b7',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#475569',
    fontSize: '0.8rem',
    margin: '0.25rem 0',
  },
  dividerLine: { flex: 1, height: '1px', background: '#334155' },
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.75rem',
    color: '#475569',
  },
};

// ─── Componente ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [modo, setModo]           = useState('login');   // 'login' | 'cadastro' | 'recuperar'
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [nome, setNome]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');
  const [sucesso, setSucesso]     = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Limpar mensagens ao trocar de modo
  useEffect(() => {
    setErro('');
    setSucesso('');
    setSenha('');
  }, [modo]);

  // ── Login ──────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!email || !senha) return setErro('Preencha e-mail e senha.');
    setLoading(true);
    setErro('');

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login')) {
        setErro('E-mail ou senha incorretos. Verifique e tente novamente.');
      } else if (error.message.includes('Email not confirmed')) {
        setErro('Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
      } else {
        setErro(error.message);
      }
    }
    // Sucesso: o AuthProvider detecta a mudança de sessão e redireciona automaticamente
  }, [email, senha]);

  // ── Cadastro ───────────────────────────────────────────────────────────
  const handleCadastro = useCallback(async (e) => {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe seu nome completo.');
    if (!email)       return setErro('Informe seu e-mail.');
    if (senha.length < 6) return setErro('A senha deve ter no mínimo 6 caracteres.');
    setLoading(true);
    setErro('');

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { full_name: nome.trim() } },
    });
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
      } else {
        setErro(error.message);
      }
    } else {
      setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.');
      setModo('login');
    }
  }, [nome, email, senha]);

  // ── Recuperar senha ────────────────────────────────────────────────────
  const handleRecuperar = useCallback(async (e) => {
    e.preventDefault();
    if (!email) return setErro('Informe seu e-mail cadastrado.');
    setLoading(true);
    setErro('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);

    if (error) {
      setErro(error.message);
    } else {
      setSucesso('Link de recuperação enviado! Verifique sua caixa de entrada (e a pasta de spam).');
    }
  }, [email]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoTitle}>ProfileAI</div>
          <div style={styles.logoSub}>AMB FUSI · Damos vida à inovação</div>
          <div style={styles.logoTagline}>
            Descubra seu perfil comportamental e potencialize seu desenvolvimento
          </div>
        </div>

        {/* Tabs login / cadastro */}
        {modo !== 'recuperar' && (
          <div style={styles.tabs}>
            <button style={styles.tab(modo === 'login')}    onClick={() => setModo('login')}>
              Entrar
            </button>
            <button style={styles.tab(modo === 'cadastro')} onClick={() => setModo('cadastro')}>
              Criar conta
            </button>
          </div>
        )}

        {/* Mensagens */}
        {erro    && <div style={{ ...styles.error,   marginBottom: '1rem' }}>{erro}</div>}
        {sucesso && <div style={{ ...styles.success, marginBottom: '1rem' }}>{sucesso}</div>}

        {/* ── Formulário Login ── */}
        {modo === 'login' && (
          <form style={styles.form} onSubmit={handleLogin}>
            <div style={styles.field}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                style={styles.input}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  style={{ ...styles.input, paddingRight: '3rem' }}
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button style={styles.btnPrimary(loading)} type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span>ou</span>
              <div style={styles.dividerLine} />
            </div>
            <button type="button" style={styles.btnSecondary} onClick={() => setModo('recuperar')}>
              Esqueci minha senha
            </button>
          </form>
        )}

        {/* ── Formulário Cadastro ── */}
        {modo === 'cadastro' && (
          <form style={styles.form} onSubmit={handleCadastro}>
            <div style={styles.field}>
              <label style={styles.label}>Nome completo</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Seu nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                style={styles.input}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Senha (mínimo 6 caracteres)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  style={{ ...styles.input, paddingRight: '3rem' }}
                  placeholder="Crie uma senha segura"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button style={styles.btnPrimary(loading)} type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta gratuita'}
            </button>
          </form>
        )}

        {/* ── Formulário Recuperação ── */}
        {modo === 'recuperar' && (
          <form style={styles.form} onSubmit={handleRecuperar}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>E-mail cadastrado</label>
              <input
                type="email"
                style={styles.input}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <button style={styles.btnPrimary(loading)} type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
            <button type="button" style={styles.btnSecondary} onClick={() => setModo('login')}>
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          ProfileAI © {new Date().getFullYear()} · AMB FUSI
        </div>
      </div>
    </div>
  );
}
