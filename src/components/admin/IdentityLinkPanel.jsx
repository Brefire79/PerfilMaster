/**
 * IdentityLinkPanel — Fase 2.3
 * Mostra sugestões automáticas de vínculo de identidade por CPF: avaliações de
 * sessão e contas de aluno que compartilham o mesmo CPF. O admin confirma o
 * vínculo, gravando em app_identity_links (auditável — LGPD).
 *
 * CPF é sempre exibido MASCARADO (privacidade). Some quando não há sugestões.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { getSugestoesVinculo, createIdentityLink } from '@/firebase/firestore.js';
import { maskCpf } from '@/lib/cpf.js';

export default function IdentityLinkPanel({ adminUid, onLinked }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(null); // cpf em confirmação
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!adminUid) return;
    setLoading(true);
    try {
      const lista = await getSugestoesVinculo(adminUid);
      setSugestoes(lista);
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar sugestões.');
    } finally {
      setLoading(false);
    }
  }, [adminUid]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleConfirmar = async (grupo) => {
    setConfirmando(grupo.cpf);
    setErro('');
    try {
      // Vincula a conta (se houver) com cada avaliação do mesmo CPF
      const conta = grupo.contas[0] || null;
      const tasks = grupo.avaliados.map((av) =>
        createIdentityLink({
          cpf: grupo.cpf,
          avaliadoId: av.id,
          userUid: conta?.id || null,
          adminUid,
          metadata: { nome: av.nome },
        })
      );
      // Se há conta mas nenhum avaliado, registra só a conta
      if (grupo.avaliados.length === 0 && conta) {
        tasks.push(createIdentityLink({ cpf: grupo.cpf, userUid: conta.id, adminUid, metadata: { nome: conta.nome } }));
      }
      await Promise.all(tasks);
      setSugestoes((prev) => prev.filter((g) => g.cpf !== grupo.cpf));
      onLinked?.();
    } catch (e) {
      setErro(e?.message || 'Não foi possível confirmar o vínculo.');
    } finally {
      setConfirmando(null);
    }
  };

  // Some quando não há nada a sugerir (não polui a tela)
  if (loading || (sugestoes.length === 0 && !erro)) return null;

  return (
    <div className="rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/5 p-4 mb-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-heading font-semibold text-[#F7F8FC]">
            Vínculos sugeridos por CPF
          </h3>
          <p className="text-xs text-[#A0A3B1]">
            Mesma pessoa identificada em avaliações e/ou conta. Confirme para unificar o histórico.
          </p>
        </div>
      </div>

      {erro && <p className="text-xs text-[#EF4444] mb-2">{erro}</p>}

      <div className="flex flex-col gap-2">
        {sugestoes.map((grupo) => {
          const totalAval = grupo.avaliados.length;
          const totalContas = grupo.contas.length;
          const nomeRef = grupo.contas[0]?.nome || grupo.avaliados[0]?.nome || 'Pessoa';
          return (
            <div
              key={grupo.cpf}
              className="flex items-center gap-3 bg-[#1A1D2E] border border-[#2D3047] rounded-xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center text-xs font-bold shrink-0">
                {nomeRef.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F7F8FC] truncate">{nomeRef}</p>
                <p className="text-xs text-[#A0A3B1]">
                  <span className="font-mono">{maskCpf(grupo.cpf)}</span>
                  {' · '}
                  {totalAval > 0 && `${totalAval} avaliaç${totalAval > 1 ? 'ões' : 'ão'}`}
                  {totalAval > 0 && totalContas > 0 && ' + '}
                  {totalContas > 0 && `${totalContas} conta`}
                </p>
              </div>
              <button
                onClick={() => handleConfirmar(grupo)}
                disabled={confirmando === grupo.cpf}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#5558E3] text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {confirmando === grupo.cpf ? 'Vinculando...' : 'Confirmar vínculo'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
