import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import { useAuth } from '@/hooks/useAuth.js';

// ─── Lazy-loaded Layouts ──────────────────────────────────────────────────────
const AdminLayout = lazy(() => import('@/layouts/AdminLayout.jsx'));
const StudentLayout = lazy(() => import('@/layouts/StudentLayout.jsx'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout.jsx'));

// ─── Lazy-loaded Auth Pages ───────────────────────────────────────────────────
const Login = lazy(() => import('@/pages/auth/Login.jsx'));
const Register = lazy(() => import('@/pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword.jsx'));

// ─── Lazy-loaded Shared Pages ─────────────────────────────────────────────────
const NotFound = lazy(() => import('@/pages/shared/NotFound.jsx'));

// ─── Lazy-loaded Public Pages (sem login) ────────────────────────────────────
const AvaliacaoPublica = lazy(() => import('@/pages/public/AvaliacaoPublica.jsx'));
const ResultadoPublico = lazy(() => import('@/pages/public/ResultadoPublico.jsx'));

// ─── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
// FIX A2: removidos imports duplicados (AdminGroups, AdminStudents, etc.) — usam versão Safe* abaixo
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard.jsx'));
// Abas Sessões e Pessoas ocultadas — função migrada para Alunos/Grupos.
// Arquivos preservados (Sessoes.jsx, Pessoas.jsx); rotas removidas abaixo.
// Para reativar: re-importe e restaure os <Route> correspondentes.
const RelatorioOficial = lazy(() => import('@/pages/admin/RelatorioOficial.jsx'));

// ─── Lazy-loaded Student Pages ────────────────────────────────────────────────
// FIX A2: removidos StudentDashboard, Assessment, MyProfile — usam versão Safe* abaixo
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard.jsx'));

// ─── Placeholder component for unimplemented pages ───────────────────────────
function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[#242736] flex items-center justify-center">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">{title}</h2>
      <p className="text-[#A0A3B1] text-sm">Em desenvolvimento — Sprint 2</p>
    </div>
  );
}

// Lazy placeholder factory
const makePlaceholder = (title) => () => <Placeholder title={title} />;

// Override lazy imports that don't have files yet with placeholders
const SafeAdminGroups = lazy(() =>
  import('@/pages/admin/Groups.jsx').catch(() => ({ default: makePlaceholder('Grupos') }))
);
const SafeAdminGroupDetail = lazy(() =>
  import('@/pages/admin/GroupDetail.jsx').catch(() => ({ default: makePlaceholder('Detalhes do Grupo') }))
);
const SafeAdminStudents = lazy(() =>
  import('@/pages/admin/Students.jsx').catch(() => ({ default: makePlaceholder('Alunos') }))
);
const SafeAdminModules = lazy(() =>
  import('@/pages/admin/Modules.jsx').catch(() => ({ default: makePlaceholder('Módulos') }))
);
const SafeAdminModuleBuilder = lazy(() =>
  import('@/pages/admin/ModuleBuilder.jsx').catch(() => ({ default: makePlaceholder('Editor de Módulo') }))
);
const SafeAdminReports = lazy(() =>
  import('@/pages/admin/Reports.jsx').catch(() => ({ default: makePlaceholder('Relatórios') }))
);
const SafeAdminSettings = lazy(() =>
  import('@/pages/admin/Settings.jsx').catch(() => ({ default: makePlaceholder('Configurações') }))
);
const SafeAssessment = lazy(() =>
  import('@/pages/student/Assessment.jsx').catch(() => ({ default: makePlaceholder('Avaliação') }))
);
const SafeMyProfile = lazy(() =>
  import('@/pages/student/MyProfile.jsx').catch(() => ({ default: makePlaceholder('Meu Perfil') }))
);
const SafeAssessmentWizard = lazy(() =>
  import('@/components/assessment/AssessmentWizard.jsx').catch(() => ({ default: makePlaceholder('Avaliação Completa') }))
);

// ─── Loading Fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
        <p className="text-[#A0A3B1] text-sm">Carregando...</p>
      </div>
    </div>
  );
}

// ─── Protected Route Component ────────────────────────────────────────────────
function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading, initialized } = useAuthStore();
  const location = useLocation();

  // Still initializing auth state
  if (!initialized || loading) {
    return <PageLoader />;
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role — redirect to their correct area
  // Admins can also access student routes (they may participate in assessments)
  if (requiredRole && role !== requiredRole) {
    if (requiredRole === 'student' && role === 'admin') {
      return children;
    }
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ─── Invite Token Handler ─────────────────────────────────────────────────────
function JoinHandler() {
  const navigate = useNavigate();
  // P1-1: usa useParams() — extração robusta vs. location.pathname.split frágil
  const { token } = useParams();

  useEffect(() => {
    if (token) {
      navigate(`/register?token=${token}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  return <PageLoader />;
}

// ─── Already-Auth Route — redireciona usuários logados fora das telas de auth ────
// P1-2: impede que usuário autenticado acesse /login, /register, /forgot-password
function AlreadyAuthRoute({ children }) {
  const { user, role, loading, initialized } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (user) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }
  return children;
}

// ─── Root Redirect ─────────────────────────────────────────────────────────────
function RootRedirect() {
  const { user, role, loading, initialized } = useAuthStore();

  if (!initialized || loading) return <PageLoader />;

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

// ─── FIX A5: Wrapper passes onCompleted so student navigates to profile after wizard ───
function AssessmentWizardPage() {
  const navigate = useNavigate();
  return <SafeAssessmentWizard onCompleted={() => navigate('/student/profile', { replace: true })} />;
}

// ─── App Routes ───────────────────────────────────────────────────────────────
export default function AppRoutes() {
  // Initialize auth listener at the router level
  useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Invite handler */}
        <Route path="/join/:token" element={<JoinHandler />} />

        {/* Avaliação pública via WhatsApp — sem login */}
        <Route path="/avaliacao/:token" element={<AvaliacaoPublica />} />

        {/* Resultado público para o avaliado ver seu perfil — sem login */}
        <Route path="/resultado/:token" element={<ResultadoPublico />} />

        {/* Auth routes — redireciona usuários já logados para seu dashboard (P1-2) */}
        <Route element={<AlreadyAuthRoute><AuthLayout /></AlreadyAuthRoute>}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Admin routes (protected, role=admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="groups" element={<SafeAdminGroups />} />
          <Route path="groups/:id" element={<SafeAdminGroupDetail />} />
          <Route path="students" element={<SafeAdminStudents />} />
          <Route path="modules" element={<SafeAdminModules />} />
          <Route path="modules/:id" element={<SafeAdminModuleBuilder />} />
          {/* Rotas /admin/pessoas e /admin/sessoes removidas (abas ocultadas) */}
          <Route path="relatorio/aluno/:uid" element={<RelatorioOficial />} />
          <Route path="relatorio/:token" element={<RelatorioOficial />} />
          <Route path="reports" element={<SafeAdminReports />} />
          <Route path="settings" element={<SafeAdminSettings />} />
        </Route>

        {/* Student routes (protected, role=student) */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="assessment/:id" element={<SafeAssessment />} />
          <Route path="assessment-wizard" element={<AssessmentWizardPage />} />
          <Route path="profile" element={<SafeMyProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
