import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';

export default function AuthLayout() {
  const { user, role, initialized, loading } = useAuthStore();

  // Redirect already-authenticated users to their dashboard
  if (initialized && !loading && user) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#6366F1] opacity-5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#6366F1] opacity-5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#6366F1] opacity-[0.03] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="relative py-4 text-center">
        <p className="text-[#A0A3B1] text-xs">
          © {new Date().getFullYear()} ProfileAI. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
