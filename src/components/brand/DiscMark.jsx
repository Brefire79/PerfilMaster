import React from 'react';

/**
 * DiscMark — assinatura visual do Perfil Master: uma bússola de 4 eixos nas
 * cores DISC (D vermelho, I âmbar, S verde, C índigo). Mesma linguagem do radar
 * da tela de resultado e do sigilo do Mestre, para unificar a marca nos pontos
 * de entrada (login, cabeçalhos públicos, estados centrais).
 *
 * @param {number} size  - lado em px (default 56).
 * @param {boolean} spin - gira lentamente (uso em loaders).
 * @param {boolean} glow - sombra luminosa índigo (default true).
 */
export default function DiscMark({ size = 56, spin = false, glow = true, className = '' }) {
  return (
    <span
      className={`disc-mark-brand inline-flex ${spin ? 'disc-mark-brand--spin' : ''} ${className}`}
      style={{ width: size, height: size, filter: glow ? 'drop-shadow(0 0 10px rgba(99,102,241,0.4))' : 'none' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#2D3047" strokeWidth="1.5" />
        <g className="disc-mark-brand__star" style={{ transformOrigin: '50px 50px' }}>
          <polygon points="50,10 57,50 43,50" fill="#EF4444" />
          <polygon points="90,50 50,43 50,57" fill="#F59E0B" />
          <polygon points="50,90 43,50 57,50" fill="#22C55E" />
          <polygon points="10,50 50,57 50,43" fill="#6366F1" />
        </g>
        <circle cx="50" cy="50" r="9" fill="#0F1117" stroke="#2D3047" strokeWidth="1.5" />
      </svg>
      <style>{`
        .disc-mark-brand--spin .disc-mark-brand__star { animation: discMarkBrandSpin 3.4s linear infinite; }
        @keyframes discMarkBrandSpin { to { transform: rotate(360deg); } }
      `}</style>
    </span>
  );
}
