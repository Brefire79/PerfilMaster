import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar.jsx';
import TopBar from '@/components/layout/TopBar.jsx';
import BottomNav from '@/components/layout/BottomNav.jsx';
import useActivityNotifications from '@/hooks/useActivityNotifications.js';
import MestreChatFlutuante from '@/components/mestre/MestreChat.jsx';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Avisos proativos (som + notificação) com o app aberto — só-admin.
  useActivityNotifications();

  return (
    <div className="h-screen bg-[#0F1117] flex overflow-hidden min-h-0">
      {/* Skip-to-main: acessibilidade teclado/SR */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#6366F1] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Pular para conteúdo principal
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar role="admin" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="relative z-50 flex flex-col w-72 animate-slide-down">
            <Sidebar
              role="admin"
              mobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <TopBar
          role="admin"
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
        >
          <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNav role="admin" />
      </div>

      {/* Mestre — chat flutuante (abre pelo gatilho no Painel; a conversa
          persiste em navegação/reload e só é limpa no logout) */}
      <MestreChatFlutuante />
    </div>
  );
}
