import React, { createContext, useContext, useRef } from 'react';

// ─── Mapa central de siglas ────────────────────────────────────────────────────
// Regra: toda sigla do produto passa por aqui. Nunca repita o significado no código.
export const SIGLAS = {
  DISC: {
    sigla: 'DISC',
    significado: 'Dominante · Influente · Estável · Analítico',
    descricao: 'Modelo comportamental de quatro perfis',
  },
  D: {
    sigla: 'D',
    significado: 'Dominante',
    descricao: 'Perfil orientado a resultados e decisões',
  },
  I: {
    sigla: 'I',
    significado: 'Influente',
    descricao: 'Perfil entusiasta e comunicativo',
  },
  S: {
    sigla: 'S',
    significado: 'Estável',
    descricao: 'Perfil confiável e orientado ao time',
  },
  C: {
    sigla: 'C',
    significado: 'Analítico',
    descricao: 'Perfil preciso e sistemático',
  },
  PQ: {
    sigla: 'PQ',
    significado: 'Quociente de Inteligência Positiva',
    descricao: 'Medida de domínio da mente positiva sobre a mente sabotadora',
  },
};

// ─── Contexto de rastreamento de primeira aparição ────────────────────────────
// Cada vez que uma página é montada (Provider), o Set é zerado.
// A primeira ocorrência de cada sigla na tela exibe o significado completo.
const SiglaVisibilidadeContext = createContext(null);

export function SiglaProvider({ children }) {
  const mostradas = useRef(new Set());
  return (
    <SiglaVisibilidadeContext.Provider value={mostradas}>
      {children}
    </SiglaVisibilidadeContext.Provider>
  );
}

// ─── Componente SiglaComSignificado ───────────────────────────────────────────
/**
 * Exibe uma sigla com tooltip ao passar o mouse.
 * Na primeira aparição na tela (dentro de um SiglaProvider), mostra o
 * significado completo inline: "DISC (Dominante · Influente · Estável · Analítico)".
 *
 * Uso:
 *   <SiglaComSignificado id="DISC" />
 *   <SiglaComSignificado id="D" />
 *
 * Se usado fora de um SiglaProvider, sempre mostra apenas a sigla com tooltip.
 */
export function SiglaComSignificado({ id, className = '' }) {
  const siglaInfo = SIGLAS[id];
  const mostradas = useContext(SiglaVisibilidadeContext);

  if (!siglaInfo) {
    return <span className={className}>{id}</span>;
  }

  const ehPrimeiraVez = mostradas ? !mostradas.current.has(id) : false;

  if (ehPrimeiraVez && mostradas) {
    mostradas.current.add(id);
  }

  if (ehPrimeiraVez) {
    return (
      <span className={`inline-flex items-baseline gap-1 ${className}`}>
        <abbr
          title={siglaInfo.descricao}
          className="font-semibold no-underline cursor-help"
          style={{ textDecoration: 'none' }}
        >
          {siglaInfo.sigla}
        </abbr>
        <span className="text-[#A0A3B1]">({siglaInfo.significado})</span>
      </span>
    );
  }

  return (
    <span className={`relative group inline-block ${className}`}>
      <abbr
        title={siglaInfo.significado}
        className="font-semibold no-underline cursor-help border-b border-dotted border-[#6366F1]/60"
        style={{ textDecoration: 'none' }}
      >
        {siglaInfo.sigla}
      </abbr>
      {/* Tooltip */}
      <span
        className="
          pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50
          bg-[#1E2030] border border-[#2D3047] text-[#F7F8FC] text-xs rounded-lg px-3 py-2
          whitespace-nowrap shadow-xl
          opacity-0 group-hover:opacity-100 transition-opacity duration-150
        "
      >
        <span className="font-semibold">{siglaInfo.sigla}</span>
        {' — '}
        {siglaInfo.significado}
        {/* Seta */}
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
          style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #2D3047',
          }}
        />
      </span>
    </span>
  );
}
