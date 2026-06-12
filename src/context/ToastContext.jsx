/**
 * Perfil Master — Vianexx AI | Sistema de Mentoria
 * ToastContext.jsx — Sistema global de notificações (toast)
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{
      success: (msg, dur) => addToast(msg, 'success', dur),
      error:   (msg, dur) => addToast(msg, 'error', dur ?? 5000),
      info:    (msg, dur) => addToast(msg, 'info',  dur),
      warn:    (msg, dur) => addToast(msg, 'warn',  dur),
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

// ── Componente container ──────────────────────────────────────────────────────
const COLORS = {
  success: { bg: '#065f46', border: '#10b981', icon: '✓' },
  error:   { bg: '#7f1d1d', border: '#ef4444', icon: '✕' },
  info:    { bg: '#1e293b', border: '#6366f1', icon: 'ℹ' },
  warn:    { bg: '#78350f', border: '#f59e0b', icon: '⚠' },
};

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, maxWidth: 360,
    }}>
      {toasts.map(t => {
        const cfg = COLORS[t.type] ?? COLORS.info;
        return (
          <div key={t.id} style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            color: '#f1f5f9', fontSize: 14, fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.2s ease',
          }}>
            <span style={{ color: cfg.border, fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: 'center' }}>
              {cfg.icon}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
