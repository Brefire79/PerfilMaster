import React from 'react';

/**
 * EmModulo — placeholder padronizado para módulos da Central ainda em construção.
 * Lista o que a fase entregará, mantendo a navegação e o branding consistentes.
 */
export default function EmModulo({ titulo, fase, itens = [] }) {
  return (
    <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🧭</span>
      </div>
      <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">{titulo}</h2>
      <p className="text-[#6366F1] text-sm font-medium mt-1">{fase} · em construção</p>

      {itens.length > 0 && (
        <ul className="mt-6 max-w-xl mx-auto text-left space-y-2">
          {itens.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#A0A3B1]">
              <span className="text-[#6366F1] mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
