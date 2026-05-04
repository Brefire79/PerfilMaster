import React, { useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import useSessaoStore from '@/store/sessaoStore.js';

// ─── Constante visual de grupos ───────────────────────────────────────────────
const INPUT_BASE =
  'w-full bg-[#1A1C2A] border border-[#2D3047] rounded-xl px-4 py-3 text-[#F7F8FC] ' +
  'placeholder:text-[#4A4D6A] focus:outline-none focus:border-[#6366F1] transition-colors';

const ESTADO_INICIAL = { titulo: '', descricao: '' };

/**
 * SessionCreator
 * Modal para criar uma nova sessão de avaliação.
 *
 * Props:
 *   onFechar: () => void
 *   onCriado?: (sessaoId: string) => void
 */
export default function SessionCreator({ onFechar, onCriado }) {
  const { user } = useAuthStore();
  const { criarNovaSessao, loading, erro, limparErro } = useSessaoStore();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [erroLocal, setErroLocal] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (erroLocal) setErroLocal('');
    if (erro) limparErro();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.titulo.trim()) {
      setErroLocal('O título da sessão é obrigatório.');
      return;
    }

    try {
      const id = await criarNovaSessao(user.uid, {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
      });
      onCriado?.(id);
      onFechar();
    } catch {
      // erro exibido via store
    }
  }

  const mensagemErro = erroLocal || erro;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div className="w-full max-w-md bg-[#13151F] border border-[#2D3047] rounded-2xl p-6 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-heading font-bold text-[#F7F8FC]">
              Nova Sessão de Avaliação
            </h2>
            <p className="text-xs text-[#A0A3B1] mt-0.5">
              Os avaliados receberão o link via WhatsApp
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors p-1"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#A0A3B1]">
              Título da sessão <span className="text-[#EF4444]">*</span>
            </label>
            <input
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              placeholder="Ex: Avaliação Líderes Q2 2025"
              className={INPUT_BASE}
              maxLength={80}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#A0A3B1]">
              Descrição <span className="text-[#4A4D6A] text-xs">(opcional)</span>
            </label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Ex: Turma de líderes do programa de desenvolvimento 2025"
              className={`${INPUT_BASE} resize-none`}
              rows={3}
              maxLength={200}
            />
          </div>

          {mensagemErro && (
            <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 rounded-lg px-3 py-2">
              {mensagemErro}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-3 rounded-xl border border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#4A4D6A] transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.titulo.trim()}
              className="flex-1 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Sessão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
