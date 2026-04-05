/**
 * ProfileAI — AMB FUSI
 * App.jsx — roteamento principal e gerenciamento de sessão Supabase
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, isConfigured } from './lib/supabase.js';
import { ToastProvider } from './context/ToastContext.jsx';

// Páginas existentes
import LoginPage      from './pages/LoginPage.jsx';
import HomePage       from './pages/HomePage.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';
import ResultsPage    from './pages/ResultsPage.jsx';

// Área do Mentor
import DashboardPage  from './pages/mentor/DashboardPage.jsx';
import TestsPage      from './pages/mentor/TestsPage.jsx';
import TestEditorPage from './pages/mentor/TestEditorPage.jsx';
import TestDetailPage from './pages/mentor/TestDetailPage.jsx';
import StudentsPage   from './pages/mentor/StudentsPage.jsx';
import AdminPage      from './pages/mentor/AdminPage.jsx';

// Área do Aluno (público — sem autenticação)
import RegisterPage   from './pages/student/RegisterPage.jsx';
import TestRunnerPage from './pages/student/TestRunnerPage.jsx';
import CompletionPage from './pages/student/CompletionPage.jsx';

// ─── Tela de setup (sem .env.local) ──────────────────────────────────────────
function SetupScreen() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', padding: '2rem',
    }}>
      <div style={{
        maxWidth: '480px', width: '100%',
        background: '#1e293b', border: '1px solid #f59e0b44',
        borderRadius: '20px', padding: '2.5rem 2rem',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚙️</div>
        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f1f5f9', marginBottom: '0.5rem' }}>
          Configuração necessária
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          O arquivo <code style={{ background: '#0f172a', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#f59e0b' }}>.env.local</code> não foi encontrado.
          Crie-o na raiz do projeto com as suas chaves do Supabase:
        </p>
        <pre style={{
          background: '#0f172a', border: '1px solid #334155',
          borderRadius: '10px', padding: '1rem',
          fontSize: '0.8rem', color: '#6ee7b7', lineHeight: 1.8,
          overflowX: 'auto', marginBottom: '1.5rem',
        }}>
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
        </pre>
        <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
          Encontre esses valores em{' '}
          <strong style={{ color: '#94a3b8' }}>app.supabase.com</strong>{' '}
          → seu projeto → <strong style={{ color: '#94a3b8' }}>Settings → API</strong>.
          Após criar o arquivo, reinicie o servidor com <code style={{ background: '#0f172a', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#f59e0b' }}>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

// ─── Loading global ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      gap: '1rem',
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid #1e293b',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: '#475569', fontSize: '0.875rem' }}>Carregando ProfileAI…</span>
    </div>
  );
}

// ─── Rota protegida — redireciona para login se não autenticado ──────────────
function RotaProtegida({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ─── Rota mentor — verifica papel via user_metadata.role ─────────────────────
function RotaMentor({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  const role = user.user_metadata?.role;
  if (role && role !== 'mentor') return <Navigate to="/" replace />;
  return children;
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(undefined); // undefined = ainda carregando
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => {
    // Injeta animação spin no <head> uma única vez
    if (!document.getElementById('spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframes';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    // Sem configuração: remove o splash e encerra
    if (!isConfigured) {
      setIniciando(false);
      if (typeof window.__hideSplash === 'function') window.__hideSplash();
      return;
    }

    // Recupera sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIniciando(false);
      // Remove splash screen do index.html
      if (typeof window.__hideSplash === 'function') window.__hideSplash();
    });

    // Escuta mudanças de sessão (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sem variáveis de ambiente — mostra guia de configuração
  if (!isConfigured) return <SetupScreen />;

  // Ainda verificando sessão inicial
  if (iniciando) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Login — redireciona para home se já autenticado */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
          />

          {/* Home */}
          <Route
            path="/"
            element={
              <RotaProtegida user={user}>
                <HomePage user={user} />
              </RotaProtegida>
            }
          />

          {/* Assessment */}
          <Route
            path="/assessment"
            element={
              <RotaProtegida user={user}>
                <AssessmentPage user={user} />
              </RotaProtegida>
            }
          />

          {/* Resultados com ID */}
          <Route
            path="/resultados/:id"
            element={
              <RotaProtegida user={user}>
                <ResultsPage user={user} />
              </RotaProtegida>
            }
          />

          {/* ── Área do Mentor ─────────────────────────────────────── */}
          <Route path="/mentor" element={<Navigate to="/mentor/dashboard" replace />} />

          <Route path="/mentor/dashboard"
            element={<RotaMentor user={user}><DashboardPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/testes"
            element={<RotaMentor user={user}><TestsPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/testes/novo"
            element={<RotaMentor user={user}><TestEditorPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/testes/:id"
            element={<RotaMentor user={user}><TestDetailPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/testes/:id/editar"
            element={<RotaMentor user={user}><TestEditorPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/alunos"
            element={<RotaMentor user={user}><StudentsPage user={user} /></RotaMentor>}
          />
          <Route path="/mentor/admin"
            element={<RotaMentor user={user}><AdminPage user={user} /></RotaMentor>}
          />

          {/* ── Área do Aluno (rotas públicas) ─────────────────────── */}
          <Route path="/convite/:token"       element={<RegisterPage />} />
          <Route path="/teste/:studentId"     element={<TestRunnerPage />} />
          <Route path="/conclusao/:studentId" element={<CompletionPage />} />

          {/* Fallback — qualquer rota desconhecida vai para home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
