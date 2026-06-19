import React, { useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import useSessaoStore from '@/store/sessaoStore.js';
import PhoneInput from '@/components/ui/PhoneInput.jsx';
import { formatCpf, cleanCpf, isValidCpf } from '@/lib/cpf.js';
import { marcarConviteEnviadoPorToken } from '@/firebase/firestore.js';

const INPUT_BASE =
  'w-full bg-[#1A1C2A] border border-[#2D3047] rounded-xl px-4 py-3 text-[#F7F8FC] ' +
  'placeholder:text-[#4A4D6A] focus:outline-none focus:border-[#6366F1] transition-colors text-sm';

const ESTADO_INICIAL = { nome: '', telefone: '', email: '', cpf: '', cpfConsent: false };

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function AvaliadoForm({ sessaoId, onFechar }) {
  const { user } = useAuthStore();
  const { cadastrarAvaliado, getLinkWhatsApp, loading, erro, limparErro } = useSessaoStore();

  const [form, setForm] = useState(ESTADO_INICIAL);
  const [erroLocal, setErroLocal] = useState('');
  // Lista acumulativa de avaliados cadastrados nesta abertura do modal
  const [lista, setLista] = useState([]);

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

  function handleCpfChange(e) {
    const masked = formatCpf(e.target.value);
    // Ao limpar o CPF, zera também o consentimento
    setForm((prev) => ({ ...prev, cpf: masked, cpfConsent: cleanCpf(masked) ? prev.cpfConsent : false }));
    if (erroLocal) setErroLocal('');
    if (erro) limparErro();
  }

  async function handleAdicionar(e) {
    e.preventDefault();
    if (!form.nome.trim()) { setErroLocal('O nome do avaliado é obrigatório.'); return; }
    if (form.telefone.replace(/\D/g, '').length < 10) { setErroLocal('Informe um número de telefone válido (com DDD).'); return; }

    // CPF é opcional — mas se preenchido, precisa ser válido e ter consentimento
    const cpfDigits = cleanCpf(form.cpf);
    if (cpfDigits) {
      if (!isValidCpf(cpfDigits)) { setErroLocal('CPF inválido. Verifique os números.'); return; }
      if (!form.cpfConsent) { setErroLocal('Marque o consentimento para registrar o CPF.'); return; }
    }

    try {
      const token = await cadastrarAvaliado(user.uid, sessaoId, {
        nome: form.nome.trim(),
        telefone: form.telefone,
        email: form.email.trim() || null,
        cpf: cpfDigits || null,
        cpfConsent: cpfDigits ? true : false,
        cpfConsentAt: cpfDigits ? new Date().toISOString() : null,
      });
      setLista((prev) => [...prev, { nome: form.nome.trim(), telefone: form.telefone, token }]);
      setForm(ESTADO_INICIAL);
      setErroLocal('');
    } catch {
      // erro exibido via store
    }
  }

  // Tokens já enviados nesta abertura do modal (também gravado no banco
  // em conviteenviadoem, para o "Disparar pendentes" da tela não repetir)
  const [enviados, setEnviados] = useState(() => new Set());

  function abrirWhatsApp(pessoa) {
    const link = getLinkWhatsApp({ nome: pessoa.nome, telefone: pessoa.telefone, token: pessoa.token });
    window.open(link, '_blank', 'noopener,noreferrer');
    setEnviados((prev) => new Set(prev).add(pessoa.token));
    marcarConviteEnviadoPorToken(pessoa.token).catch(() => {});
  }

  // O navegador só permite abrir UMA janela por clique (popup blocker) —
  // por isso o "enviar todos" é sequencial: cada clique abre o próximo.
  const filaEnvio = lista.filter((p) => !enviados.has(p.token));

  function enviarProximo() {
    if (filaEnvio.length > 0) abrirWhatsApp(filaEnvio[0]);
  }

  function removerDaLista(idx) {
    setLista((prev) => prev.filter((_, i) => i !== idx));
  }

  const mensagemErro = erroLocal || erro;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avaliado-form-title"
    >
      <div className="w-full max-w-md bg-[#13151F] border border-[#2D3047] rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 id="avaliado-form-title" className="text-lg font-heading font-bold text-[#F7F8FC]">
              Cadastrar Avaliados
            </h2>
            <p className="text-xs text-[#A0A3B1] mt-0.5">
              Adicione quantos quiser, depois envie os convites via WhatsApp
            </p>
          </div>
          <button onClick={onFechar} className="text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors p-1 shrink-0" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="overflow-y-auto flex-1 px-6 pb-2 flex flex-col gap-5">

          {/* Formulário de adição */}
          <form onSubmit={handleAdicionar} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="avaliado-nome" className="text-sm font-medium text-[#A0A3B1]">
                Nome completo <span className="text-[#EF4444]">*</span>
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
                E-mail <span className="text-xs text-[#A0A3B1]">(opcional)</span>
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

            {/* CPF opcional — habilita acompanhar evolução da pessoa ao longo do tempo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="avaliado-cpf" className="text-sm font-medium text-[#A0A3B1]">
                CPF <span className="text-xs text-[#A0A3B1]">(opcional)</span>
              </label>
              <input
                id="avaliado-cpf"
                name="cpf"
                inputMode="numeric"
                value={form.cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className={INPUT_BASE}
                maxLength={14}
              />
              <p className="text-xs text-[#4A4D6A]">
                Permite acompanhar a evolução da pessoa em avaliações futuras.
              </p>
              {/* Consentimento só aparece quando há CPF digitado */}
              {cleanCpf(form.cpf).length > 0 && (
                <label className="flex items-start gap-2 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.cpfConsent}
                    onChange={(e) => setForm((prev) => ({ ...prev, cpfConsent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-[#2D3047] bg-[#1A1C2A] accent-[#6366F1] shrink-0"
                  />
                  <span className="text-xs text-[#A0A3B1] leading-snug">
                    Confirmo que tenho autorização do avaliado para registrar o CPF, conforme a LGPD.
                  </span>
                </label>
              )}
            </div>

            {/* Avaliação avulsa é sempre Completa (78 = DISC + Sabotadores),
                para manter os mesmos critérios de todos os avaliados. */}
            <p className="text-xs text-[#4A4D6A] bg-[#1A1C2A] border border-[#2D3047] rounded-lg px-3 py-2">
              📋 Avaliação completa · 78 perguntas (DISC + Sabotadores)
            </p>

            {mensagemErro && (
              <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 rounded-lg px-3 py-2">{mensagemErro}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E3] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Adicionando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Adicionar à lista
                </>
              )}
            </button>
          </form>

          {/* Lista de avaliados cadastrados */}
          {lista.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#A0A3B1] uppercase tracking-wider">
                Adicionados ({lista.length})
              </p>
              <div className="flex flex-col gap-2">
                {lista.map((pessoa, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-[#1A1C2A] border border-[#2D3047] rounded-xl px-4 py-3"
                  >
                    {/* Avatar inicial */}
                    <div className="w-8 h-8 rounded-full bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center text-xs font-bold shrink-0">
                      {pessoa.nome.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F7F8FC] truncate">{pessoa.nome}</p>
                      <p className="text-xs text-[#A0A3B1] truncate">{pessoa.telefone}</p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => abrirWhatsApp(pessoa)}
                        title={enviados.has(pessoa.token) ? 'Convite enviado — clique para reenviar' : 'Enviar convite via WhatsApp'}
                        className={
                          enviados.has(pessoa.token)
                            ? 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#22C55E]/20 text-[#22C55E] transition-colors text-xs font-medium'
                            : 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-xs font-medium'
                        }
                      >
                        {enviados.has(pessoa.token) ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 shrink-0" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : WHATSAPP_ICON}
                        <span className="hidden sm:inline">{enviados.has(pessoa.token) ? 'Enviado' : 'Enviar'}</span>
                      </button>
                      <button
                        onClick={() => removerDaLista(idx)}
                        title="Remover da lista"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-[#2D3047] shrink-0 flex flex-col gap-2">
          {lista.length > 1 && (
            <>
              <button
                onClick={enviarProximo}
                disabled={filaEnvio.length === 0}
                className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: filaEnvio.length === 0 ? '#16A34A' : '#25D366' }}
              >
                {WHATSAPP_ICON}
                {filaEnvio.length === 0
                  ? `✓ Todos enviados (${lista.length})`
                  : `Enviar próximo: ${filaEnvio[0].nome.split(' ')[0]} (${enviados.size + 1} de ${lista.length})`}
              </button>
              {filaEnvio.length > 0 && (
                <p className="text-xs text-[#A0A3B1] text-center">
                  O navegador abre um WhatsApp por clique — clique novamente para o próximo da fila.
                </p>
              )}
            </>
          )}
          <button
            onClick={onFechar}
            className="w-full py-2.5 rounded-xl border border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#4A4D6A] transition-colors text-sm font-medium"
          >
            {lista.length === 0 ? 'Cancelar' : 'Concluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
