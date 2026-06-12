import React, { useState } from 'react';
import clsx from 'clsx';
import { createInvite } from '@/firebase/firestore.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import PhoneInput from '@/components/ui/PhoneInput.jsx';

export default function InviteStudentModal({ isOpen, onClose, groups, adminUid }) {
  const STEPS = { FORM: 'form', LINK: 'link' };
  const [step, setStep] = useState(STEPS.FORM);
  const [form, setForm] = useState({ name: '', phone: '', email: '', groupId: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep(STEPS.FORM);
    setForm({ name: '', phone: '', email: '', groupId: '' });
    setErrors({});
    setInviteUrl('');
    setCopied(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Campo obrigatório.';
    if (!form.email.trim() && !form.phone.trim()) errs.email = 'Informe e-mail ou telefone.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido.';
    return errs;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      // groupId null → aluno avulso (sem grupo). registerStudentWithGroup já trata null.
      const targetGroupId = form.groupId || null;
      const token = await createInvite(targetGroupId, adminUid);
      const groupParam = targetGroupId ? `&group=${targetGroupId}` : '';
      setInviteUrl(`${getPublicBaseUrl()}/register?token=${token}${groupParam}`);
      setStep(STEPS.LINK);
    } catch (err) {
      console.error('Erro ao gerar convite:', err);
      setErrors({ email: 'Erro ao gerar link. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const phoneClean = form.phone.replace(/\D/g, '');
  const whatsappMsg = encodeURIComponent(
    `Olá${form.name ? ', ' + form.name : ''}! 👋\n\nVocê foi convidado(a) para realizar uma avaliação comportamental no *Perfil Master*.\n\nClique no link abaixo para se cadastrar e aguarde a liberação do administrador:\n${inviteUrl}`
  );
  const whatsappUrl = `https://wa.me/${phoneClean}?text=${whatsappMsg}`;
  const emailSubject = encodeURIComponent('Convite — Avaliação Perfil Master');
  const emailBody = encodeURIComponent(
    `Olá${form.name ? ', ' + form.name : ''}!\n\nVocê foi convidado(a) para realizar uma avaliação comportamental no Perfil Master.\n\nClique no link abaixo para se cadastrar:\n${inviteUrl}\n\nApós o cadastro, aguarde a liberação do administrador para iniciar a avaliação.\n\nAté logo!`
  );
  const mailtoUrl = `mailto:${form.email}?subject=${emailSubject}&body=${emailBody}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Convidar Aluno"
      size="md"
      footer={
        step === STEPS.FORM ? (
          <>
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleGenerate} loading={loading}>
              Gerar link de convite
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleClose}>Fechar</Button>
        )
      }
    >
      {step === STEPS.FORM && (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#F7F8FC]">Nome <span className="text-[#6366F1]">*</span></label>
            <input
              type="text"
              placeholder="Nome completo do aluno"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: '' })); }}
              className={clsx('input-base', errors.name && 'border-[#EF4444]!')}
            />
            {errors.name && <p className="text-xs text-[#EF4444]">{errors.name}</p>}
          </div>

          <PhoneInput
            label="Telefone / WhatsApp"
            value={form.phone}
            onChange={(v) => { setForm((f) => ({ ...f, phone: v })); setErrors((er) => ({ ...er, email: '' })); }}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#F7F8FC]">E-mail</label>
            <input
              type="email"
              placeholder="aluno@email.com"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((er) => ({ ...er, email: '' })); }}
              className={clsx('input-base', errors.email && 'border-[#EF4444]!')}
            />
            {errors.email && <p className="text-xs text-[#EF4444]">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#F7F8FC]">
              Grupo <span className="text-xs text-[#A0A3B1] ml-1">(opcional)</span>
            </label>
            <select
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
              className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors"
            >
              <option value="">— Sem grupo (aluno avulso) —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {!form.groupId && (
              <p className="text-xs text-[#A0A3B1] flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 flex-shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                O aluno ficará sem grupo. Você pode atribuí-lo a um grupo depois, na tela de Alunos.
              </p>
            )}
          </div>

          <p className="text-xs text-[#A0A3B1] pt-1">
            * Informe e-mail ou telefone para poder enviar o convite após gerar o link.
          </p>
        </form>
      )}

      {step === STEPS.LINK && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/25">
            <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-4 h-4" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#22C55E]">Link de convite gerado!</p>
              <p className="text-xs text-[#A0A3B1]">Válido por 7 dias · uso único</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wide">Link de cadastro</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0F1117] border border-[#2D3047] text-xs text-[#A0A3B1] font-mono outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={clsx(
                  'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                  copied
                    ? 'bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#2D3047] border-[#2D3047] text-[#F7F8FC] hover:bg-[#6366F1] hover:border-[#6366F1]'
                )}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wide">Enviar convite via</label>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                  form.phone
                    ? 'bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 cursor-pointer'
                    : 'bg-[#2D3047]/40 border-[#2D3047] text-[#A0A3B1]/50 cursor-not-allowed pointer-events-none'
                )}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
                {!form.phone && <span className="text-xs opacity-60">(sem tel.)</span>}
              </a>

              <a
                href={mailtoUrl}
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                  form.email
                    ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8] hover:bg-[#6366F1]/20 cursor-pointer'
                    : 'bg-[#2D3047]/40 border-[#2D3047] text-[#A0A3B1]/50 cursor-not-allowed pointer-events-none'
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                E-mail
                {!form.email && <span className="text-xs opacity-60">(sem e-mail)</span>}
              </a>
            </div>
          </div>

          <p className="text-xs text-[#A0A3B1] text-center pt-1">
            O aluno se cadastra e aguarda a liberação da avaliação pelo administrador.
          </p>
        </div>
      )}
    </Modal>
  );
}
