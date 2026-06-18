import React, { useState } from 'react';
import { generateRecoveryLink } from '@/firebase/functions.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';

/**
 * ResetSenhaButton — Caminho B: botão (+ modal) que gera um link de redefinição
 * de senha para um aluno e permite enviar por WhatsApp / copiar. Autocontido.
 *
 * @param {object} student - aluno (precisa de uid/id e email).
 * @param {boolean} compact - estilo enxuto (ex.: linha de membro do grupo).
 */
export default function ResetSenhaButton({ student, compact = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  const semEmail = !student?.email;

  const abrir = async () => {
    setOpen(true);
    setLink('');
    setErro('');
    setCopiado(false);
    setLoading(true);
    try {
      const res = await generateRecoveryLink({
        targetUid: student.uid || student.id,
        baseUrl: getPublicBaseUrl(),
      });
      setLink(res?.actionLink || '');
    } catch (e) {
      setErro(e?.message || 'Não foi possível gerar o link.');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  };

  const whatsappMsg = () => {
    const nome = student?.displayName || student?.name || '';
    return encodeURIComponent(
      `Olá${nome ? `, ${nome}` : ''}! Para redefinir sua senha no Perfil Master, acesse o link abaixo (válido por tempo limitado):\n\n${link}\n\nDepois é só definir uma nova senha. Qualquer dúvida, me chama.`
    );
  };

  const iconeCadeado = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );

  return (
    <>
      {compact ? (
        <button
          onClick={abrir}
          disabled={semEmail}
          className="h-7 px-2 text-xs font-medium rounded-lg bg-[#1A1C2A] hover:bg-[#242736] text-[#A0A3B1] hover:text-[#6366F1] border border-[#2D3047] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={semEmail ? 'Aluno sem e-mail cadastrado' : 'Gerar link de redefinição de senha (WhatsApp)'}
        >
          Senha
        </button>
      ) : (
        <button
          onClick={abrir}
          disabled={semEmail}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Resetar senha"
          title={semEmail ? 'Aluno sem e-mail cadastrado' : 'Gerar link de redefinição de senha (WhatsApp)'}
        >
          {iconeCadeado}
          <span className="hidden sm:inline">Senha</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-reset-senha">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-reset-senha" className="text-base font-heading font-semibold text-[#F7F8FC]">Resetar senha</h2>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                {student?.displayName || student?.name || student?.email}
              </p>
            </div>
            <div className="px-5 py-4">
              {loading ? (
                <p className="text-sm text-[#A0A3B1] py-4 text-center">Gerando link…</p>
              ) : erro ? (
                <p className="text-sm text-[#EF4444] px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">{erro}</p>
              ) : (
                <>
                  <p className="text-sm text-[#A0A3B1] mb-3">
                    Link de redefinição gerado. Envie para o aluno — ao abrir, ele define a nova senha.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#242736] border border-[#2D3047]">
                    <span className="flex-1 text-xs text-[#A0A3B1] truncate">{link}</span>
                    <button onClick={copiar} className="text-xs font-medium text-[#6366F1] hover:text-[#A5B4FC] shrink-0">
                      {copiado ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors">
                Fechar
              </button>
              {link && (
                <a
                  href={`https://wa.me/?text=${whatsappMsg()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white transition-colors"
                >
                  Enviar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
