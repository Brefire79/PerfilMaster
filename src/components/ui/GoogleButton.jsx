import React, { useState } from 'react';
import clsx from 'clsx';
// Botão "Continuar com Google" (DELTA 21). Só aparece com VITE_ENABLE_GOOGLE_AUTH=true
// (Netlify env / .env.local) — o provedor precisa estar ligado no Supabase
// (Auth → Providers → Google) e /auth/callback nas Redirect URLs, senão o
// redirect cai numa página de erro do Supabase. Desligado por padrão de propósito.
export const GOOGLE_AUTH_ATIVO = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

export default function GoogleButton({ inviteToken = null, label = 'Continuar com Google', className, onError }) {
  const [indo, setIndo] = useState(false);
  if (!GOOGLE_AUTH_ATIVO) return null;

  const handleClick = () => {
    try {
      setIndo(true);
      signInWithGoogle({ inviteToken });
    } catch (err) {
      setIndo(false);
      onError?.(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={indo}
      className={clsx(
        'w-full inline-flex items-center justify-center gap-3 rounded-xl border border-[#2D3047] bg-[#0F1117] px-4 py-2.5',
        'text-sm font-medium text-[#F7F8FC] transition-colors hover:border-[#6366F1]/50 hover:bg-[#6366F1]/5',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
        'disabled:opacity-60 disabled:cursor-wait',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.87z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
      {indo ? 'Abrindo o Google…' : label}
    </button>
  );
}
