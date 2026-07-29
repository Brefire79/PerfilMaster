import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
// B3 (27/07/2026): o i18next saiu. O app é PT-BR exclusivo e as strings vêm de
// `src/lib/i18n.js`, que lê o mesmo pt-BR.json sem provider e sem dependência.
import AppRoutes from './routes/index.jsx';
import UpdateBanner from './components/layout/UpdateBanner.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
        <p className="text-[#A0A3B1] text-sm font-body">Carregando...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <UpdateBanner />
        <Suspense fallback={<LoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  );
}
