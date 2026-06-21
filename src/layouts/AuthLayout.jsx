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
      {/* Atmosfera de marca: blooms nas 4 cores DISC + grade de pontos sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-[#EF4444] opacity-[0.06] blur-3xl" />
        <div className="absolute -top-24 left-1/4 w-80 h-80 rounded-full bg-[#F59E0B] opacity-[0.05] blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-[#22C55E] opacity-[0.05] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full bg-[#6366F1] opacity-[0.07] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="relative py-4 text-center">
        <p className="text-[#A0A3B1] text-xs">
          © {new Date().getFullYear()} Perfil Master. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
