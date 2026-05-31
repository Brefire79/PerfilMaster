import React, { useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import useSessaoStore from '@/store/sessaoStore.js';
import PhoneInput from '@/components/ui/PhoneInput.jsx';

const INPUT_BASE =
  'w-full bg-[#1A1C2A] border border-[#2D3047] rounded-xl px-4 py-3 text-[#F7F8FC] ' +
  'placeholder:text-[#4A4D6A] focus:outline-none focus:border-[#6366F1] transition-colors';

const ESTADO_INICIAL = { nome: '', telefone: '', email: '' };

/**
 * AvaliadoForm
 * Modal para cadastrar um avaliado e gerar o link WhatsApp nativo.
 *
 * Props:
 *   sessaoId: string
 *   onFechar: () => void
 */
export default function AvaliadoForm({ sessaoId, onFechar }) {
  const { user } = useAuthStore();
  const { cadastrarAvaliado, getLinkWhatsApp, loading, erro, limparErro } = useSessaoStore();

  const [form, setForm] = useState(ESTADO_INICIAL);
  const [erroLocal, setErroLocal] = useState('');
  const [tokenGerado, setTokenGerado] = useState(null);
  const [nomeAvaliado, setNomeAvaliado] = useState('');
  const [telefoneAvaliado, setTelefoneAvaliado] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (erroLocal) setErroLocal('');
    if (erro) limparErro();
  }

  function handleTelefoneChange(fullNumber) {
    setForm((prev) => ({ ...prev, telefone: fullNumber }));
    if (erroLocal) setErroLocal('');
    if (erro) limparErro();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.nome.trim()) {
      setErroLocal('O nome do avaliado é obrigatório.');
      return;
    }
    if (form.telefone.replace(/\D/g, '').length < 10) {
      setErroLocal('Informe um número de telefone válido (com DDD).');
      return;
    }

    try {
      const token = await cadastrarAvaliado(user.uid, sessaoId, {
        nome: form.nome.trim(),
        telefone: form.telefone,
        email: form.email.trim() || null,
      });
      setTokenGerado(token);
      setNomeAvaliado(form.nome.trim());
      setTelefoneAvaliado(form.telefone);
    } catch {
      // erro exibido via store
    }
  }

  function abrirWhatsApp() {
    const link = getLinkWhatsApp({
      nome: nomeAvaliado,
      telefone: telefoneAvaliado,
      token: tokenGerado,
    });
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  function cadastrarOutro() {
    setForm(ESTADO_INICIAL);
    setTokenGerado(null);
    setNomeAvaliado('');
    setTelefoneAvaliado('');
    setErroLocal('');
    limparErro();
  }

  const mensagemErro = erroLocal || erro;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avaliado-form-title"
    >
      <div className="w-full max-w-md bg-[#13151F] border border-[#2D3047] rounded-2xl p-6 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="avaliado-form-title" className="text-lg font-heading font-bold text-[#F7F8FC]">
              {tokenGerado ? 'Avaliado Cadastrado!' : 'Cadastrar Avaliado'}
            </h2>
            <p className="text-xs text-[#A0A3B1] mt-0.5">
              {tokenGerado
                ? 'Envie o link via WhatsApp para iniciar a avaliação'
                : 'Informe os dados de quem será avaliado'}
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

        {/* Estado: link gerado */}
        {tokenGerado ? (
          <div className="flex flex-col gap-4">
            {/* Card de confirmação */}
            <div className="bg-[#1A1C2A] rounded-xl p-4 border border-[#6366F1]/30">
              <p className="text-sm text-[#A0A3B1] mb-1">Avaliado</p>
              <p className="text-[#F7F8FC] font-semibold">{nomeAvaliado}</p>
              <p className="text-xs text-[#A0A3B1] mt-0.5">{telefoneAvaliado}</p>
            </div>

            {/* Botão WhatsApp nativo */}
            <button
              onClick={abrirWhatsApp}
              className="
                w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2
                transition-all active:scale-[0.98]
              "
              style={{ background: '#25D366' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar via WhatsApp
            </button>

            <div className="flex gap-3">
              <button
                onClick={cadastrarOutro}
                className="flex-1 py-3 rounded-xl border border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#4A4D6A] transition-colors text-sm font-medium"
              >
                Cadastrar outro
              </button>
              <button
                onClick={onFechar}
                className="flex-1 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Estado: formulário */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="avaliado-nome" className="text-sm font-medium text-[#A0A3B1]">
                Nome completo <span className="text-[#EF4444]" aria-label="obrigatório">*</span>
              </label>
              <input
                id="avaliado-nome"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Nome do avaliado"
                className={INPUT_BASE}
                maxLength={80}
                autoComplete="name"
                autoFocus
              />
            </div>

            <PhoneInput
              label="WhatsApp"
              required
              value={form.telefone}
              onChange={handleTelefoneChange}
              error={erroLocal?.includes('telefone') ? erroLocal : ''}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="avaliado-email" className="text-sm font-medium text-[#A0A3B1]">
                E-mail <span className="text-[#A0A3B1] text-xs">(opcional)</span>
              </label>
              <input
                id="avaliado-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@empresa.com"
                className={INPUT_BASE}
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
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
