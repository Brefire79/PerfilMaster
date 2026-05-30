import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar.jsx';
import BottomNav from '@/components/layout/BottomNav.jsx';

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      {/* Top bar */}
      <TopBar role="student" />

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto"
        id="main-content"
      >
        <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-10 max-w-4xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNav role="student" />
      </div>
    </div>
  );
}
