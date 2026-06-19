import React, { useState } from 'react';
import { convertAvaliado } from '@/firebase/functions.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';

/**
 * ConverterContaButton — DELTA 19: converte um AVALIADO DE SESSÃO (token, sem
 * conta) em CONTA DE ALUNO (login + perfil migrado). Ao final, oferece o link
 * de definição de senha (Caminho B) para enviar por WhatsApp.
 *
 * @param {object} student   - avaliado (precisa de token e email).
 * @param {Array}  groups    - grupos do facilitador ({ id, name }).
 * @param {Function} onConverted - callback após sucesso (recarregar lista).
 */
export default function ConverterContaButton({ student, groups = [], onConverted }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('form'); // form | loading | done | error
  const [groupId, setGroupId] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState({ link: '', email: '' });
  const [copiado, setCopiado] = useState(false);

  const semEmail = !student?.email;

  function abrir() {
    setOpen(true);
    setStep('form');
    setGroupId('');
    setErro('');
    setResultado({ link: '', email: '' });
    setCopiado(false);
  }

  function fechar() {
    setOpen(false);
    if (step === 'done') onConverted?.();
  }

  async function confirmar() {
    setStep('loading');
    setErro('');
    try {
      const res = await convertAvaliado({
        token: student.token || student.id,
        groupId: groupId || null,
        baseUrl: getPublicBaseUrl(),
      });
      setResultado({ link: res?.actionLink || '', email: res?.email || student.email || '' });
      setStep('done');
    } catch (e) {
      setErro(e?.message || 'Não foi possível converter o avaliado.');
      setStep('error');
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resultado.link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  }

  function whatsappMsg() {
    const nome = student?.displayName || student?.name || '';
    return encodeURIComponent(
      `Olá${nome ? `, ${nome}` : ''}! Sua conta no Perfil Master foi criada. Para definir sua senha e acessar, use o link abaixo (válido por tempo limitado):\n\n${resultado.link}\n\nQualquer dúvida, me chama.`
    );
  }

  return (
    <>
      <button
        onClick={abrir}
        disabled={semEmail}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#A0A3B1] hover:text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Tornar conta de aluno"
        title={semEmail ? 'Avaliado sem e-mail — não é possível criar conta' : 'Converter em conta de aluno (com login)'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        <span className="hidden sm:inline">Tornar conta</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dlg-converter">
          <div className="w-full max-w-md bg-[#1A1D2E] border border-[#2D3047] rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2D3047]">
              <h2 id="dlg-converter" className="text-base font-heading font-semibold text-[#F7F8FC]">Tornar conta de aluno</h2>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                {student?.displayName || student?.name || student?.email}
              </p>
            </div>

            <div className="px-5 py-4">
              {step === 'form' && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-[#A0A3B1]">
                    Cria uma conta de aluno com login para <span className="text-[#F7F8FC]">{student?.email}</span>,
                    migrando o perfil já respondido. A pessoa define a senha por um link enviado no WhatsApp.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="conv-grupo" className="text-sm font-medium text-[#A0A3B1]">Grupo (opcional)</label>
                    <select
                      id="conv-grupo"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full bg-[#0F1117] border border-[#2D3047] rounded-xl px-3 py-2.5 text-sm text-[#F7F8FC] focus:outline-none focus:border-[#6366F1]"
                    >
                      <option value="">Sem grupo (avulso)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === 'loading' && (
                <p className="text-sm text-[#A0A3B1] py-6 text-center">Criando conta e migrando perfil…</p>
              )}

              {step === 'error' && (
                <p className="text-sm text-[#EF4444] px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">{erro}</p>
              )}

              {step === 'done' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-[#22C55E]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                    Conta criada para {resultado.email}
                  </div>
                  {resultado.link ? (
                    <>
                      <p className="text-sm text-[#A0A3B1]">Envie o link abaixo para a pessoa definir a senha:</p>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#242736] border border-[#2D3047]">
                        <span className="flex-1 text-xs text-[#A0A3B1] truncate">{resultado.link}</span>
                        <button onClick={copiar} className="text-xs font-medium text-[#6366F1] hover:text-[#A5B4FC] shrink-0">
                          {copiado ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-[#A0A3B1]">
                      Conta criada, mas o link de senha não pôde ser gerado agora. Use o botão "Senha" na conta para gerar.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2D3047]">
              {step === 'form' && (
                <>
                  <button onClick={fechar} className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors">Cancelar</button>
                  <button onClick={confirmar} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#6366F1] hover:bg-[#5558E3] text-white transition-colors">Criar conta</button>
                </>
              )}
              {step === 'error' && (
                <>
                  <button onClick={fechar} className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors">Fechar</button>
                  <button onClick={() => setStep('form')} className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#6366F1] hover:bg-[#5558E3] text-white transition-colors">Tentar de novo</button>
                </>
              )}
              {(step === 'done' || step === 'loading') && (
                <>
                  {resultado.link && step === 'done' && (
                    <a
                      href={`https://wa.me/?text=${whatsappMsg()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white transition-colors"
                    >
                      Enviar no WhatsApp
                    </a>
                  )}
                  <button onClick={fechar} disabled={step === 'loading'} className="px-4 py-2 text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] rounded-lg transition-colors disabled:opacity-50">
                    {step === 'done' ? 'Concluir' : 'Aguarde…'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
