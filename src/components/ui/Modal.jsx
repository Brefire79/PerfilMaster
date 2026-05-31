import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

/**
 * Modal component — accessible, animated, portal-based
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} title
 * @param {string} description
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'full'} size
 * @param {boolean} closeOnBackdrop - defaults to true
 * @param {boolean} closeOnEsc - defaults to true
 * @param {React.ReactNode} footer
 * @param {string} className
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  children,
  footer,
  className,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // ─── ESC key handler ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && closeOnEsc) {
        onClose?.();
      }
      // Trap focus within modal
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    },
    [isOpen, closeOnEsc, onClose]
  );

  // ─── Focus management ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Só foca automaticamente em desktop — no mobile o teclado virtual
      // abriria imediatamente e causaria salto de layout antes da animação
      const isMobile = window.innerWidth < 640 || ('ontouchstart' in window);
      if (!isMobile) {
        setTimeout(() => {
          const firstInput = dialogRef.current?.querySelector(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
          );
          const firstButton = dialogRef.current?.querySelector(
            'button:not([aria-label="Fechar modal"]):not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          );
          (firstInput || firstButton)?.focus();
        }, 50);
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Wrapper — modal ancorado no topo para não pular quando o conteúdo cresce */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[6vh] sm:pt-[8vh] sm:p-6">
        {/* Dialog panel */}
        <div
          ref={dialogRef}
          className={clsx(
            'relative w-full bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
            'animate-slide-up',
            'max-h-[90vh] flex flex-col',
            sizes[size] || sizes.md,
            className
          )}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between p-5 border-b border-[#2D3047] flex-shrink-0">
              <div>
                {title && (
                  <h2
                    id="modal-title"
                    className="text-lg font-heading font-semibold text-[#F7F8FC]"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="text-sm text-[#A0A3B1] mt-1"
                  >
                    {description}
                  </p>
                )}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="ml-4 p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors flex-shrink-0"
                  aria-label="Fechar modal"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-5 h-5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body — scrollável quando teclado virtual encolhe o viewport */}
          <div className="p-5 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-4 border-t border-[#2D3047] flex items-center justify-end gap-3 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * ConfirmModal — quick confirmation dialog
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}) {
  const buttonVariantClass =
    variant === 'danger'
      ? 'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
      : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white border border-transparent';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 text-sm font-medium rounded-xl bg-[#242736] hover:bg-[#2D3047] text-[#F7F8FC] border border-[#2D3047] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'h-9 px-4 text-sm font-medium rounded-xl transition-colors disabled:opacity-50',
              buttonVariantClass
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      {description && <p className="text-[#A0A3B1] text-sm">{description}</p>}
    </Modal>
  );
}
