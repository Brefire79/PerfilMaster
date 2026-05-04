import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

// ─── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard.jsx'));
const AdminGroups = lazy(() => import('@/pages/admin/Groups.jsx'));
const AdminGroupDetail = lazy(() => import('@/pages/admin/GroupDetail.jsx'));
const AdminStudents = lazy(() => import('@/pages/admin/Students.jsx'));
const AdminModules = lazy(() => import('@/pages/admin/Modules.jsx'));
const AdminModuleBuilder = lazy(() => import('@/pages/admin/ModuleBuilder.jsx'));
const AdminReports = lazy(() => import('@/pages/admin/Reports.jsx'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings.jsx'));
const AdminSessoes = lazy(() => import('@/pages/admin/Sessoes.jsx'));

// ─── Lazy-loaded Student Pages ────────────────────────────────────────────────
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard.jsx'));
const Assessment = lazy(() => import('@/pages/student/Assessment.jsx'));
const MyProfile = lazy(() => import('@/pages/student/MyProfile.jsx'));

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
  if (requiredRole && role !== requiredRole) {
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
  const location = useLocation();
  const token = location.pathname.split('/join/')[1];

  useEffect(() => {
    if (token) {
      navigate(`/register?token=${token}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  return <PageLoader />;
}

// ─── Root Redirect ─────────────────────────────────────────────────────────────
function RootRedirect() {
  const { user, role, loading, initialized } = useAuthStore();

  if (!initialized || loading) return <PageLoader />;

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
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

        {/* Auth routes (public) */}
        <Route element={<AuthLayout />}>
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
          <Route path="sessoes" element={<AdminSessoes />} />
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
          <Route path="assessment-wizard" element={<SafeAssessmentWizard />} />
          <Route path="profile" element={<SafeMyProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
