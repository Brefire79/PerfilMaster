import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '@/store/authStore.js';

// ─── AdminOnly guard ──────────────────────────────────────────────────────────
function AdminOnly({ children }) {
  const { role } = useAuthStore();
  if (role !== 'admin') return null;
  return children;
}

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  watch: {
    badge:   '🟡 Ponto de atenção',
    bg:      'bg-amber-500/10',
    border:  'border-amber-500/30',
    text:    'text-amber-400',
    dot:     'bg-amber-400',
  },
  suggest: {
    badge:   '🔶 Sugestão de suporte',
    bg:      'bg-orange-500/10',
    border:  'border-orange-500/30',
    text:    'text-orange-400',
    dot:     'bg-orange-400',
  },
};

// ─── Disclosure Modal ─────────────────────────────────────────────────────────
function TherapyModal({ isOpen, onClose, userName, note, level }) {
  if (!isOpen) return null;
  const conf = LEVEL_CONFIG[level] || LEVEL_CONFIG.watch;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="therapy-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#2D3047]">
          <div>
            <h2
              id="therapy-modal-title"
              className="text-base font-heading font-semibold text-[#F7F8FC]"
            >
              Nota interna — {userName || 'Participante'}
            </h2>
            <p className="text-xs text-[#A0A3B1] mt-1 flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-3.5 h-3.5 flex-shrink-0"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Visível apenas para o instrutor
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors"
            aria-label="Fechar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Level badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${conf.bg} ${conf.border} ${conf.text}`}
          >
            <span className={`w-2 h-2 rounded-full ${conf.dot}`} aria-hidden="true" />
            {conf.badge}
          </div>

          {/* Note */}
          {note && (
            <div className="bg-[#242736] rounded-xl p-4">
              <p className="text-sm text-[#F7F8FC] leading-relaxed">{note}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-amber-400/90 leading-relaxed">
              <strong>Importante:</strong> Esta informação é apenas uma sugestão de suporte, não um diagnóstico.
            </p>
            <p className="text-xs text-[#A0A3B1] flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-3.5 h-3.5 flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Dado sensível protegido conforme LGPD/GDPR
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── TherapyAlert component ───────────────────────────────────────────────────
/**
 * TherapyAlert — ADMIN ONLY discrete support indicator
 *
 * @param {{ flagged: boolean, level: 'none'|'watch'|'suggest', note: string }} therapyIndicator
 * @param {string} userName
 */
function TherapyAlertInner({ therapyIndicator, userName }) {
  const [modalOpen, setModalOpen] = useState(false);

  // Only render if flagged
  if (!therapyIndicator?.flagged) return null;

  const level = therapyIndicator.level;
  if (level === 'none' || !LEVEL_CONFIG[level]) return null;

  const conf = LEVEL_CONFIG[level];

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
          border transition-all duration-150 cursor-pointer
          hover:opacity-80 active:scale-95
          ${conf.bg} ${conf.border} ${conf.text}
        `}
        title="Ver nota interna de suporte"
        aria-label="Ver nota interna de suporte"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} animate-pulse`} aria-hidden="true" />
        {conf.badge}
      </button>

      <TherapyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userName={userName}
        note={therapyIndicator.note}
        level={level}
      />
    </>
  );
}

export default function TherapyAlert(props) {
  return (
    <AdminOnly>
      <TherapyAlertInner {...props} />
    </AdminOnly>
  );
}
