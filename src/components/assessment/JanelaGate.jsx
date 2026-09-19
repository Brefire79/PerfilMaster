import React, { useEffect, useState } from 'react';
import { estadoJanela, formatarContagem, formatarDataHora, TOLERANCIA_MS } from '@/lib/janela.js';

// DELTA 23 — Portão da janela de horário, compartilhado pelo wizard (conta) e
// pela avaliação pública (avulso).
//
//   useJanela(inicio, fim, { emAndamento }) → { estado, liberado, abreEm, fechaEm }
//     liberado = pode INICIAR agora; com emAndamento=true (já tem respostas),
//     a tolerância de 2 h após o fim vale para TERMINAR.
//   <JanelaGate .../> → cartão "abre em…" com contagem regressiva, ou "encerrada".

export function useJanela(inicio, fim, { emAndamento = false } = {}) {
  const [agora, setAgora] = useState(() => new Date());
  const j = estadoJanela(inicio, fim, agora);

  // Relógio de 1 s só enquanto há contagem (antes de abrir ou perto de fechar)
  useEffect(() => {
    if (j.estado === 'sem_janela') return undefined;
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, [j.estado]);

  let liberado = j.estado === 'sem_janela' || j.estado === 'aberta';
  if (!liberado && j.estado === 'depois' && emAndamento && -j.fechaEm <= TOLERANCIA_MS) liberado = true;
  return { ...j, liberado };
}

export default function JanelaGate({ janela, nomeTurma = null }) {
  if (!janela || janela.liberado) return null;

  if (janela.estado === 'antes') {
    return (
      <div className="w-full max-w-sm bg-[#1A1D2E] border border-[#6366F1]/40 rounded-2xl p-5 text-center space-y-2 animate-fade-in">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6366F1]">Ainda não abriu</p>
        <p className="text-3xl font-heading font-bold text-[#F7F8FC] tabular-nums">{formatarContagem(janela.abreEm)}</p>
        <p className="text-sm text-[#A0A3B1]">
          {nomeTurma ? `A avaliação de ${nomeTurma} abre` : 'A avaliação abre'} em{' '}
          <span className="text-[#F7F8FC]">{formatarDataHora(janela.inicio)}</span>.
          {janela.fim && <> Fecha em <span className="text-[#F7F8FC]">{formatarDataHora(janela.fim)}</span>.</>}
        </p>
        <p className="text-xs text-[#6B7280]">Pode deixar esta tela aberta — o botão aparece sozinho na hora.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-5 text-center space-y-2 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#A0A3B1]">Avaliação encerrada</p>
      <p className="text-sm text-[#A0A3B1]">
        O prazo desta turma terminou em <span className="text-[#F7F8FC]">{formatarDataHora(janela.fim)}</span>.
        Fale com o facilitador para reabrir.
      </p>
    </div>
  );
}
