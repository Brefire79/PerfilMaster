import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar.jsx';
import BottomNav from '@/components/layout/BottomNav.jsx';

export default function StudentLayout() {
  return (
    <div className="h-screen bg-[#0F1117] flex flex-col overflow-hidden">
      {/* Top bar */}
      <TopBar role="student" />

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto"
        id="main-content"
      >
        <div className="p-4 md:p-6 pb-24 max-w-3xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav role="student" />
    </div>
  );
}
