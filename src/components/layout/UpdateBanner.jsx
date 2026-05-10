/**
 * UpdateBanner — aviso de nova versão do PWA.
 * Exibido quando usePwaUpdate detecta versão remota diferente da local.
 */

import React, { useState } from 'react';
import usePwaUpdate from '@/hooks/usePwaUpdate.js';

export default function UpdateBanner() {
  const { updateAvailable, currentVersion, remoteVersion, notes, applyUpdate } =
    usePwaUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] px-3 pt-3 pointer-events-none"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="pointer-events-auto max-w-lg mx-auto bg-[#1A1D2E] border border-[#6366F1]/40 rounded-2xl shadow-[0_8px_32px_rgba(99,102,241,0.25)] p-3 flex items-start gap-3 animate-fade-in">
        {/* Ícone */}
        <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366F1"
            strokeWidth={1.8}
            className="w-5 h-5"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#F7F8FC]">
            Nova versão disponível
          </p>
          <p className="text-xs text-[#A0A3B1] mt-0.5">
            {remoteVersion
              ? `${currentVersion} → ${remoteVersion}`
              : 'Atualize para a versão mais recente'}
          </p>
          {notes && (
            <p className="text-2xs text-[#A0A3B1] mt-1 line-clamp-2">{notes}</p>
          )}

          {/* Ações */}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={applyUpdate}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#6366F1] text-white hover:bg-[#5558E3] transition-colors"
            >
              Atualizar agora
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors"
            >
              Depois
            </button>
          </div>
        </div>

        {/* Fechar */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fechar aviso"
          className="text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors flex-shrink-0"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
