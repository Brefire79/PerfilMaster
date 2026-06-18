import React, { useRef, useState, useEffect } from 'react';
import { assistenteCentral, logAudit } from '@/firebase/functions.js';
import { gerarPdfCentral } from '@/lib/centralPdf.js';

// Sugestões de pergunta (mapeiam para as consultas permitidas).
const SUGESTOES = [
  'Como está a distribuição DISC dos meus grupos?',
  'Qual a taxa de conclusão nos últimos 30 dias?',
  'Compare a conclusão entre os grupos.',
  'Quantas avaliações foram concluídas este período?',
];

export default function AssistenteIA() {
  const [mensagens, setMensagens] = useState([]); // {autor:'user'|'ia', texto, dados?, queryUsada?, modo?}
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, enviando]);

  const enviar = async (perguntaTexto) => {
    const pergunta = (perguntaTexto ?? texto).trim();
    if (!pergunta || enviando) return;
    setErro(null);
    setTexto('');
    setMensagens((m) => [...m, { autor: 'user', texto: pergunta }]);
    setEnviando(true);
    try {
      const res = await assistenteCentral({ pergunta });
      setMensagens((m) => [
        ...m,
        {
          autor: 'ia',
          texto: res?.narrativa || 'Sem resposta.',
          dados: res?.dados || null,
          queryUsada: res?.queryUsada || null,
          modo: res?.modo || 'conversa',
          cacheHit: res?.cacheHit || false,
          pergunta,
        },
      ]);
    } catch (e) {
      setErro(e?.message || 'Falha ao consultar o assistente.');
    } finally {
      setEnviando(false);
    }
  };

  const baixarPdf = (msg) => {
    gerarPdfCentral({
      pergunta: msg.pergunta,
      narrativa: msg.texto,
      dados: msg.dados,
      queryUsada: msg.queryUsada,
    });
    logAudit({ action: 'report_exported', target_type: 'central_ai', target_id: msg.queryUsada || 'analise' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Aviso de privacidade */}
      <div className="rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/25 px-4 py-2.5 text-xs text-[#A5B4FC] mb-4">
        Converso apenas sobre <strong>agregados anonimizados</strong> — nunca sobre pessoas
        nominais. Dados individuais (nome, e-mail, CPF) nunca são enviados à IA.
      </div>

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {mensagens.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-[#242736] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-[#F7F8FC] font-heading font-semibold">Assistente da Central</p>
            <p className="text-[#A0A3B1] text-sm mt-1 mb-5">
              Pergunte sobre inteligência de grupos ou visão geral do período.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#6366F1] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((msg, i) => (
          <div key={i} className={`flex ${msg.autor === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.autor === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC]'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.texto}</p>

              {msg.autor === 'ia' && msg.modo === 'dado' && (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => baixarPdf(msg)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#242736] text-[#A5B4FC] hover:text-white transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar PDF
                  </button>
                  {msg.cacheHit && <span className="text-[10px] text-[#6B6F80]">do cache</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {enviando && (
          <div className="flex justify-start">
            <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && (
        <p className="text-[#EF4444] text-sm mt-2">{erro}</p>
      )}

      {/* Campo de entrada (sem <form> — padrão do projeto) */}
      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
          }}
          placeholder="Pergunte sobre seus grupos ou o período…"
          rows={1}
          className="flex-1 resize-none bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-4 py-3 text-sm text-[#F7F8FC] placeholder-[#6B6F80] focus:outline-none focus:border-[#6366F1] max-h-32"
        />
        <button
          onClick={() => enviar()}
          disabled={enviando || !texto.trim()}
          className="px-4 py-3 rounded-xl bg-[#6366F1] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5457E5] transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
