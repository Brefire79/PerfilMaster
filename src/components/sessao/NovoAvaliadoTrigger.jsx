import React, { useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import { ensureSessaoAvulsa } from '@/firebase/firestore.js';
import AvaliadoForm from '@/components/sessao/AvaliadoForm.jsx';

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/**
 * NovoAvaliadoTrigger — botão que dispara o cadastro de avaliados avulsos
 * (com geração de link WhatsApp), garantindo uma sessão implícita nos bastidores.
 *
 * Substitui o ponto de entrada que ficava na aba Sessões (agora ocultada).
 * Reutilizado em Alunos (groupId null) e em Grupos › Membros (groupId do grupo).
 *
 * Props:
 *   - groupId?: string | null   → vincula a sessão implícita a um grupo
 *   - titulo?: string           → título da sessão implícita (ex.: nome do grupo)
 *   - label?: string            → texto do botão
 *   - onClosed?: () => void     → callback ao fechar o modal (ex.: recarregar lista)
 *   - className?: string        → classes extras para o botão
 */
export default function NovoAvaliadoTrigger({
  groupId = null,
  titulo,
  label = 'Avaliação avulsa',
  onClosed,
  className = '',
}) {
  const { user } = useAuthStore();
  const [sessaoId, setSessaoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function abrir() {
    if (!user?.uid || loading) return;
    setLoading(true);
    setErro('');
    try {
      const id = await ensureSessaoAvulsa(user.uid, { groupId, titulo });
      setSessaoId(id);
    } catch (e) {
      setErro(e?.message || 'Não foi possível iniciar a avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function fechar() {
    setSessaoId(null);
    onClosed?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        disabled={loading || !user?.uid}
        title="Cadastrar avaliado(s) e enviar convite por WhatsApp"
        className={
          'inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold ' +
          'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 ' +
          'hover:bg-[#25D366]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
          className
        }
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : WHATSAPP_ICON}
        <span>{label}</span>
      </button>

      {erro && (
        <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 rounded-lg px-3 py-2 mt-1 w-full">
          {erro}
        </p>
      )}

      {sessaoId && <AvaliadoForm sessaoId={sessaoId} onFechar={fechar} />}
    </>
  );
}
