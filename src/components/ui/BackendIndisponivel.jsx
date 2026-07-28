import React, { useState } from 'react';

/**
 * BackendIndisponivel — tela para quando o servidor não responde.
 *
 * Existe por causa do C1 (auditoria 27/07/2026): sem timeout nos fetches, uma
 * queda do backend (ex.: projeto Supabase pausado por inatividade no Free tier)
 * deixava o app em "Carregando..." indefinidamente. Agora a espera tem prazo e
 * termina aqui — com explicação e um caminho de saída.
 *
 * @param {string}   mensagem  texto vindo de mensagemDeRede()
 * @param {function} onTentar  opcional; se ausente, recarrega a página
 */
export default function BackendIndisponivel({ mensagem, onTentar }) {
  const [tentando, setTentando] = useState(false);

  const tentarNovamente = async () => {
    setTentando(true);
    if (onTentar) {
      try {
        await onTentar();
      } finally {
        setTentando(false);
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117] px-5">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center text-3xl"
          aria-hidden="true"
        >
          📡
        </div>

        <div>
          <h1 className="text-lg font-bold text-[#F7F8FC] mb-2">
            Servidor fora do ar
          </h1>
          <p className="text-sm text-[#A0A3B1] leading-relaxed">
            {mensagem || 'Não conseguimos falar com o servidor agora. Tente novamente em instantes.'}
          </p>
        </div>

        <button
          type="button"
          onClick={tentarNovamente}
          disabled={tentando}
          className="w-full py-3.5 rounded-2xl bg-[#6366F1] hover:bg-[#5558E3] text-white font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {tentando ? 'Tentando...' : 'Tentar novamente'}
        </button>

        <p className="text-xs text-[#4A4D6A]">
          Se o problema continuar, avise o suporte do Perfil Master.
        </p>
      </div>
    </div>
  );
}
