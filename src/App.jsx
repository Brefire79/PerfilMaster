import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/index.js';
import AppRoutes from './routes/index.jsx';

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
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </I18nextProvider>
  );
}
