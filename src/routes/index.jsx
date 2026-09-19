import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary.jsx';
import BackendIndisponivel from '@/components/ui/BackendIndisponivel.jsx';

// ─── Lazy-loaded Layouts ──────────────────────────────────────────────────────
const AdminLayout = lazy(() => import('@/layouts/AdminLayout.jsx'));
const StudentLayout = lazy(() => import('@/layouts/StudentLayout.jsx'));
const AuthLayout = lazy(() => import('@/layouts/AuthLayout.jsx'));

// ─── Lazy-loaded Auth Pages ───────────────────────────────────────────────────
const Login = lazy(() => import('@/pages/auth/Login.jsx'));
const Register = lazy(() => import('@/pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword.jsx'));
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback.jsx'));

// ─── Lazy-loaded Shared Pages ─────────────────────────────────────────────────
const NotFound = lazy(() => import('@/pages/shared/NotFound.jsx'));

// ─── Lazy-loaded Public Pages (sem login) ────────────────────────────────────
const AvaliacaoPublica = lazy(() => import('@/pages/public/AvaliacaoPublica.jsx'));
const ResultadoPublico = lazy(() => import('@/pages/public/ResultadoPublico.jsx'));
const TesteDirigidoPublico = lazy(() => import('@/pages/public/TesteDirigidoPublico.jsx')); // DELTA 26
const TesteDirigidoAluno = lazy(() => import('@/pages/student/TesteDirigido.jsx')); // DELTA 26
const LegalPage = lazy(() => import('@/pages/public/LegalPage.jsx'));
const Landing = lazy(() => import('@/pages/public/Landing.jsx'));
// DELTA 22: /join/:token — escolha "tenho e-mail" (conta) ou "não tenho" (avulso da empresa)
const JoinConvite = lazy(() => import('@/pages/public/JoinConvite.jsx'));

// ─── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
// FIX A2: removidos imports duplicados (AdminGroups, AdminStudents, etc.) — usam versão Safe* abaixo
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard.jsx'));
// Abas Sessões e Pessoas ocultadas — função migrada para Alunos/Grupos.
// Arquivos preservados (Sessoes.jsx, Pessoas.jsx); rotas removidas abaixo.
// Para reativar: re-importe e restaure os <Route> correspondentes.
const RelatorioOficial = lazy(() => import('@/pages/admin/RelatorioOficial.jsx'));

// ─── Central de Gestão (DELTA 14) — admin/superadmin ─────────────────────────
const CentralLayout = lazy(() => import('@/pages/admin/central/CentralLayout.jsx'));
const CentralVisaoGeral = lazy(() => import('@/pages/admin/central/VisaoGeral.jsx'));
const CentralPessoas = lazy(() => import('@/pages/admin/central/PessoasHistorico.jsx'));
const CentralGrupos = lazy(() => import('@/pages/admin/central/InteligenciaGrupos.jsx'));
const CentralDiagnostico = lazy(() => import('@/pages/admin/central/Diagnostico.jsx'));
// Sub-aba "Mestre (IA)" removida (jul/2026): o chat virou flutuante
// (components/mestre/MestreChat.jsx, montado no AdminLayout). Arquivo
// AssistenteIA.jsx preservado para referência; rota redireciona abaixo.

// ─── Lazy-loaded Student Pages ────────────────────────────────────────────────
// FIX A2: removidos StudentDashboard, Assessment, MyProfile — usam versão Safe* abaixo
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard.jsx'));

const SafeAdminGroups = lazy(() => import('@/pages/admin/Groups.jsx'));
const SafeAdminGroupDetail = lazy(() => import('@/pages/admin/GroupDetail.jsx'));
const SafeAdminStudents = lazy(() => import('@/pages/admin/Students.jsx'));
const SafeAdminModules = lazy(() => import('@/pages/admin/Modules.jsx'));
const SafeAdminModuleBuilder = lazy(() => import('@/pages/admin/ModuleBuilder.jsx'));
const SafeAdminReports = lazy(() => import('@/pages/admin/Reports.jsx'));
const SafeAdminSettings = lazy(() => import('@/pages/admin/Settings.jsx'));
const SafeAssessment = lazy(() => import('@/pages/student/Assessment.jsx'));
const SafeMyProfile = lazy(() => import('@/pages/student/MyProfile.jsx'));
const SafeAssessmentWizard = lazy(() => import('@/components/assessment/AssessmentWizard.jsx'));

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
  const { user, role, loading, initialized, initError } = useAuthStore();
  const location = useLocation();

  // C1: o backend não respondeu durante a inicialização. Sem isso, o app ficava
  // preso no PageLoader para sempre (initialized nunca virava true).
  if (initError) {
    return <BackendIndisponivel mensagem={initError} />;
  }

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
// DELTA 22: a decisão conta × avulso vive em JoinConvite (convite sem a porta
// "sem e-mail" continua indo direto ao /register?token=).
function JoinHandler() {
  return <JoinConvite />;
}

// ─── Already-Auth Route — redireciona usuários logados fora das telas de auth ────
// P1-2: impede que usuário autenticado acesse /login, /register, /forgot-password
function AlreadyAuthRoute({ children }) {
  const { user, role, loading, initialized, initError } = useAuthStore();
  // C1: com o backend fora, mostrar o formulário de login seria enganoso —
  // o submit falharia de qualquer jeito.
  if (initError) return <BackendIndisponivel mensagem={initError} />;
  if (!initialized || loading) return <PageLoader />;
  if (user) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }
  return children;
}

// ─── Root: landing pública ou painel ──────────────────────────────────────────
// A landing é estática: renderiza de imediato, sem esperar o auth e mesmo com o
// backend fora (o visitante não precisa do Supabase para ler a página). Só
// redireciona quando a sessão já está confirmada.
function RootRedirect() {
  const { user, role, loading, initialized, initError } = useAuthStore();

  if (initialized && !loading && user) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }
  // Quem tem sessão salva (PWA instalado, aba reaberta) veria a landing piscar
  // antes do redirect — nesse caso espera o auth; sem sessão, vai direto.
  if (!initialized && !initError && temSessaoSalva()) return <PageLoader />;
  return <Landing />;
}

function temSessaoSalva() {
  try {
    return Boolean(localStorage.getItem('profileai.supabase.session'));
  } catch {
    return false;
  }
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

  const location = useLocation();

  return (
    <RouteErrorBoundary resetKey={location.pathname}>
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
        {/* Teste Dirigido pelo link (DELTA 26) — sem login, token = credencial */}
        <Route path="/teste/:token" element={<TesteDirigidoPublico />} />
        <Route path="/privacidade" element={<LegalPage />} />
        <Route path="/termos" element={<LegalPage />} />
        <Route path="/suporte" element={<LegalPage />} />

        {/* Recuperação de senha — o link do e-mail traz #type=recovery; a página
            estabelece a sessão de recuperação e permite definir nova senha.
            Fora do AlreadyAuthRoute de propósito (a sessão de recuperação não pode
            redirecionar para o dashboard). */}
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Volta do login com Google (DELTA 21). Fora do AlreadyAuthRoute: a página
            decide se a conta tem convite antes de mandar ao painel. */}
        <Route path="/auth/callback" element={<AuthCallback />} />

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
          {/* Central de Gestão (DELTA 14) — 4 sub-abas */}
          <Route path="central" element={<CentralLayout />}>
            <Route index element={<Navigate to="/admin/central/visao-geral" replace />} />
            <Route path="visao-geral" element={<CentralVisaoGeral />} />
            <Route path="pessoas" element={<CentralPessoas />} />
            <Route path="grupos" element={<CentralGrupos />} />
            <Route path="diagnostico" element={<CentralDiagnostico />} />
            {/* Link antigo da aba do Mestre → Painel (o chat agora é flutuante) */}
            <Route path="assistente" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
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
          <Route path="teste/:id" element={<TesteDirigidoAluno />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </RouteErrorBoundary>
  );
}
