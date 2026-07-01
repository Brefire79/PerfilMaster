import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useSuperadmin } from '@/hooks/useSuperadmin.js';
import DiscMark from '@/components/brand/DiscMark.jsx';

// ─── Sub-abas da Central de Gestão ──────────────────────────────────────────────
// Aba "Mestre (IA)" removida (jul/2026): o chat virou flutuante — gatilho no
// Painel (Dashboard) + painel montado no AdminLayout (components/mestre/).
const SUBTABS = [
  { to: '/admin/central/visao-geral',    label: 'Visão Geral' },
  { to: '/admin/central/pessoas',        label: 'Pessoas & Histórico' },
  { to: '/admin/central/grupos',         label: 'Inteligência de Grupos' },
];

/**
 * CentralLayout — casca da Central de Gestão (admin/superadmin).
 * Cabeçalho + navegação por sub-abas + <Outlet/> para o módulo ativo.
 */
export default function CentralLayout() {
  const { isSuperadmin } = useSuperadmin();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Cabeçalho */}
      <header className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <DiscMark size={32} glow={false} />
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            Central de Gestão
          </h1>
          {isSuperadmin && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#6366F1]/15 text-[#A5B4FC] border border-[#6366F1]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              Superadmin · visão global
            </span>
          )}
        </div>
        <p className="text-[#A0A3B1] text-sm mt-1">
          Observabilidade, histórico e inteligência de grupos. O Mestre atende pelo botão no Painel. Vianexx AI.
        </p>
      </header>

      {/* Sub-abas */}
      <nav
        className="flex gap-1 mb-6 border-b border-[#2D3047] overflow-x-auto"
        aria-label="Seções da Central de Gestão"
      >
        {SUBTABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              clsx(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[#6366F1] text-[#F7F8FC]'
                  : 'border-transparent text-[#A0A3B1] hover:text-[#F7F8FC]'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Conteúdo do módulo ativo */}
      <Outlet />
    </div>
  );
}
