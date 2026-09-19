import React, { useMemo, useState } from 'react';

// Questionário de um Teste Dirigido (12 itens likert5), compartilhado pelos
// canais conta (/student/teste/:id) e link (/teste/:token). Sem <form>:
// tudo por onClick. Não pontua — quem chama decide (cliente ou Edge).

const LIKERT = [
  { valor: 1, label: 'Discordo totalmente' },
  { valor: 2, label: 'Discordo' },
  { valor: 3, label: 'Neutro' },
  { valor: 4, label: 'Concordo' },
  { valor: 5, label: 'Concordo totalmente' },
];

export default function TesteDirigidoForm({ teste, respostas, onResponder, onEnviar, enviando = false, erro = null }) {
  const [aviso, setAviso] = useState('');
  const itens = teste?.itens || [];
  const respondidos = useMemo(() => itens.filter((i) => respostas?.[i.id] != null).length, [itens, respostas]);
  const progresso = itens.length ? Math.round((respondidos / itens.length) * 100) : 0;
  const texto = (i) => i.texto ?? i.text?.ptBR ?? '';

  const tentarEnviar = () => {
    const faltante = itens.find((i) => respostas?.[i.id] == null);
    if (faltante) {
      setAviso('Responda todas as perguntas antes de enviar.');
      document.getElementById(`td-${faltante.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAviso('');
    onEnviar?.();
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 bg-[#0F1117]/95 backdrop-blur py-2">
        <div className="flex justify-between text-xs text-[#A0A3B1] mb-1.5">
          <span>{respondidos} de {itens.length} respondidas</span>
          <span className="tabular-nums">{progresso}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#2D3047] overflow-hidden">
          <div className="h-full rounded-full bg-[#6366F1] transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {itens.map((item, idx) => {
          const atual = respostas?.[item.id];
          return (
            <li key={item.id} id={`td-${item.id}`} className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-4">
              <p className="text-sm font-medium text-[#F7F8FC] leading-snug mb-3">
                <span className="text-[#6B6F80] mr-2">{idx + 1}.</span>{texto(item)}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {LIKERT.map((op) => {
                  const sel = atual === op.valor;
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      aria-pressed={sel}
                      title={op.label}
                      onClick={() => onResponder(item.id, op.valor)}
                      className={`rounded-xl py-2 text-sm font-semibold border transition-colors ${
                        sel
                          ? 'bg-[#6366F1] border-[#6366F1] text-white'
                          : 'bg-[#0F1117] border-[#2D3047] text-[#A0A3B1] hover:border-[#6366F1]/60'
                      }`}
                    >
                      {op.valor}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[#6B6F80] mt-1 px-0.5">
                <span>Discordo totalmente</span><span>Concordo totalmente</span>
              </div>
            </li>
          );
        })}
      </ol>

      {(aviso || erro) && (
        <div role="status" className="rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3.5 py-3 text-xs text-[#F7F8FC]">
          ⚠️ {erro || aviso}
        </div>
      )}

      <button
        type="button"
        onClick={tentarEnviar}
        disabled={enviando}
        className="w-full rounded-xl bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-60 text-white font-semibold py-3 transition-colors"
      >
        {enviando ? 'Enviando…' : 'Enviar respostas'}
      </button>
    </div>
  );
}

/** Resultado por subescala (0–100), compartilhado pelas duas telas. */
export function TesteDirigidoResultado({ teste, resultado }) {
  if (!resultado) return null;
  const subs = teste?.subescalas || {};
  return (
    <div className="rounded-2xl bg-[#1A1D2E] border border-[#2D3047] p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-[#F7F8FC]">Seu resultado</p>
        {resultado.geral != null && (
          <p className="text-xs text-[#A0A3B1]">Geral <span className="text-[#F7F8FC] font-bold text-base">{resultado.geral}</span>/100</p>
        )}
      </div>
      {Object.entries(resultado.subescalas || {}).map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#A0A3B1]">{subs[k] || k}</span>
            <span className="text-[#F7F8FC] font-medium">{v ?? '—'}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#2D3047] overflow-hidden">
            <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min(100, v || 0))}%` }} />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-[#6B6F80]">
        Quanto maior, mais presente está a competência. O resultado é um ponto de partida para a conversa com seu facilitador — não um rótulo.
      </p>
    </div>
  );
}
