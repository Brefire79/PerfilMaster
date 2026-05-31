import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import { getGroupsByAdmin, createGroup, updateGroup as updateGroupFirestore, getModules, createInvite } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import PhoneInput from '@/components/ui/PhoneInput.jsx';
import GroupCard from '@/components/group/GroupCard.jsx';

// ─── Preset group colors ───────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { value: '#6366F1', label: 'Índigo' },
  { value: '#F43F5E', label: 'Rosa' },
  { value: '#F59E0B', label: 'Âmbar' },
  { value: '#10B981', label: 'Esmeralda' },
  { value: '#0EA5E9', label: 'Céu' },
  { value: '#8B5CF6', label: 'Violeta' },
];

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#242736] border border-[#2D3047] rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#2D3047]" />
        <div className="h-4 w-32 rounded bg-[#2D3047]" />
      </div>
      <div className="h-3 w-full rounded bg-[#2D3047]" />
      <div className="h-3 w-2/3 rounded bg-[#2D3047]" />
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-[#2D3047] border-2 border-[#242736]"
            />
          ))}
        </div>
        <div className="h-5 w-20 rounded bg-[#2D3047]" />
      </div>
    </div>
  );
}

// ─── Invite Student Modal ─────────────────────────────────────────────────────
function InviteStudentModal({ isOpen, onClose, groups, adminUid }) {
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
    // FIX: grupo é opcional — sem seleção usa grupo "Alunos Avulsos" automático
    return errs;
  };

  // FIX: busca ou cria o grupo "Alunos Avulsos" para alunos esporádicos
  const findOrCreateAvulsosGroup = async () => {
    const existing = groups.find(
      (g) => g.name?.toLowerCase() === 'alunos avulsos'
    );
    if (existing) return existing.id;
    const newId = await createGroup({
      name: 'Alunos Avulsos',
      description: 'Grupo automático para alunos convidados sem grupo definido.',
      moduleId: null,
      color: '#A0A3B1',
      adminUid,
    });
    return newId;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      // FIX: se nenhum grupo selecionado, usa/cria "Alunos Avulsos"
      const targetGroupId = form.groupId || await findOrCreateAvulsosGroup();
      const token = await createInvite(targetGroupId, adminUid);
      const base = window.location.origin;
      setInviteUrl(`${base}/register?token=${token}&group=${targetGroupId}`);
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
    `Olá${form.name ? ', ' + form.name : ''}! 👋\n\nVocê foi convidado(a) para realizar uma avaliação comportamental no *ProfileAI*.\n\nClique no link abaixo para se cadastrar e aguarde a liberação do administrador:\n${inviteUrl}`
  );
  // PhoneInput já inclui o DDI — usar direto sem prefixar '55'
  const whatsappUrl = `https://wa.me/${phoneClean}?text=${whatsappMsg}`;

  const emailSubject = encodeURIComponent('Convite — Avaliação ProfileAI');
  const emailBody = encodeURIComponent(
    `Olá${form.name ? ', ' + form.name : ''}!\n\nVocê foi convidado(a) para realizar uma avaliação comportamental no ProfileAI.\n\nClique no link abaixo para se cadastrar:\n${inviteUrl}\n\nApós o cadastro, aguarde a liberação do administrador para iniciar a avaliação.\n\nAté logo!`
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
          {/* Name */}
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

          {/* Phone */}
          <PhoneInput
            label="Telefone / WhatsApp"
            value={form.phone}
            onChange={(v) => { setForm((f) => ({ ...f, phone: v })); setErrors((er) => ({ ...er, email: '' })); }}
          />

          {/* Email */}
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

          {/* Group — FIX: opcional, auto-cria "Alunos Avulsos" se vazio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#F7F8FC]">
              Grupo
              <span className="text-xs text-[#A0A3B1] ml-1">(opcional)</span>
            </label>
            <select
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
              className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors"
            >
              <option value="">— Sem grupo (vai para Alunos Avulsos) —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {!form.groupId && (
              <p className="text-xs text-[#A0A3B1] flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                O grupo "Alunos Avulsos" será criado automaticamente se não existir.
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
          {/* Success badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/25">
            <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#22C55E]">Link de convite gerado!</p>
              <p className="text-xs text-[#A0A3B1]">Válido por 7 dias · uso único</p>
            </div>
          </div>

          {/* Link box */}
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

          {/* Send options */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wide">Enviar convite via</label>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
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
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
                {!form.phone && <span className="text-xs opacity-60">(sem tel.)</span>}
              </a>

              {/* Email */}
              <a
                href={mailtoUrl}
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                  form.email
                    ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8] hover:bg-[#6366F1]/20 cursor-pointer'
                    : 'bg-[#2D3047]/40 border-[#2D3047] text-[#A0A3B1]/50 cursor-not-allowed pointer-events-none'
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
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

// ─── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ isOpen, onClose, onCreated, modules }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    description: '',
    moduleId: '',
    color: COLOR_PRESETS[0].value,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();

  const reset = () => {
    setForm({ name: '', description: '', moduleId: '', color: COLOR_PRESETS[0].value });
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = t('errors.requiredField', 'Este campo é obrigatório.');
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const newId = await createGroup({
        name: form.name.trim(),
        description: form.description.trim(),
        moduleId: form.moduleId || null,
        color: form.color,
        adminUid: user?.uid,
      });
      onCreated?.({ id: newId, ...form, adminUid: user?.uid, memberIds: [] });
      handleClose();
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('admin.groups.create', 'Novo Grupo')}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading}>
            {t('app.cancel', 'Cancelar')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            type="submit"
          >
            {t('admin.groups.create', 'Criar Grupo')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('admin.groups.name', 'Nome do Grupo')}
          placeholder="Ex: Turma A - Marketing"
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }));
            if (errors.name) setErrors((er) => ({ ...er, name: '' }));
          }}
          error={errors.name}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.groups.description', 'Descrição')}{' '}
            <span className="text-xs text-[#A0A3B1]">
              ({t('app.optional', 'Opcional')})
            </span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descreva o objetivo deste grupo..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/60 focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors resize-none"
          />
        </div>

        {/* Module selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.modules.title', 'Módulo')}{' '}
            <span className="text-xs text-[#A0A3B1]">
              ({t('app.optional', 'Opcional')})
            </span>
          </label>
          <select
            value={form.moduleId}
            onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
            className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-colors"
          >
            <option value="">
              {t('group.noModule', '— Sem módulo —')}
            </option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title?.['pt-BR'] || m.title?.en || m.title || m.id}
              </option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('group.color', 'Cor do grupo')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: preset.value }))}
                className={clsx(
                  'w-8 h-8 rounded-full transition-all border-2',
                  form.color === preset.value
                    ? 'border-[#F7F8FC] scale-110 shadow-lg'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
                style={{ backgroundColor: preset.value }}
                aria-label={preset.label}
                title={preset.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Group Modal ──────────────────────────────────────────────────────────
function EditGroupModal({ isOpen, onClose, group, onUpdated, modules }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', description: '', moduleId: '', color: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        moduleId: group.moduleId || '',
        color: group.color || COLOR_PRESETS[0].value,
      });
      setErrors({});
    }
  }, [group]);

  const { updateGroup: updateGroupStore } = useGroupStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: t('errors.requiredField') });
      return;
    }
    setLoading(true);
    try {
      const updates = {
        name: form.name.trim(),
        description: form.description.trim(),
        moduleId: form.moduleId || null,
        color: form.color,
      };
      await updateGroupFirestore(group.id, updates);
      updateGroupStore(group.id, updates);
      onUpdated?.({ ...group, ...updates });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('app.edit', 'Editar') + ' — ' + group.name}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            {t('app.cancel', 'Cancelar')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            {t('app.save', 'Salvar')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('admin.groups.name', 'Nome do Grupo')}
          value={form.name}
          onChange={(e) => {
            setForm((f) => ({ ...f, name: e.target.value }));
            if (errors.name) setErrors({});
          }}
          error={errors.name}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.groups.description', 'Descrição')}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#F7F8FC] text-sm placeholder:text-[#A0A3B1]/60 focus:border-[#6366F1] outline-none resize-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('admin.modules.title', 'Módulo')}
          </label>
          <select
            value={form.moduleId}
            onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
            className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
          >
            <option value="">{t('group.noModule', '— Sem módulo —')}</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title?.['pt-BR'] || m.title?.en || m.id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#F7F8FC]">
            {t('group.color', 'Cor do grupo')}
          </label>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: preset.value }))}
                className={clsx(
                  'w-8 h-8 rounded-full transition-all border-2',
                  form.color === preset.value
                    ? 'border-[#F7F8FC] scale-110'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
                style={{ backgroundColor: preset.value }}
                aria-label={preset.label}
                title={preset.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Groups() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { groups, setGroups, addGroup, updateGroup: updateGroupStore } = useGroupStore();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false); // FIX: modal convidar aluno
  const [editGroup, setEditGroup] = useState(null);
  const [modules, setModules] = useState([]);

  // Fetch groups and modules on mount
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedGroups, fetchedModules] = await Promise.all([
          getGroupsByAdmin(user.uid),
          getModules(null).catch(() => []),
        ]);
        if (!cancelled) {
          setGroups(fetchedGroups);
          setModules(Array.isArray(fetchedModules) ? fetchedModules : []);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [user?.uid, setGroups]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, search]);

  const handleCreated = (newGroup) => {
    addGroup(newGroup);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            {t('admin.groups.title', 'Grupos')}
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            {t('admin.groups.subtitle', 'Gerencie seus grupos de alunos')}
          </p>
        </div>
        {/* FIX: botões Convidar Aluno + Novo Grupo lado a lado */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setInviteOpen(true)}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            }
          >
            Convidar Aluno
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateOpen(true)}
            leftIcon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            {t('admin.groups.create', 'Novo Grupo')}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <Input
        placeholder={`${t('app.search', 'Buscar')} grupos...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="w-4 h-4"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <Card variant="default">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mb-5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366F1"
                strokeWidth={1.5}
                className="w-8 h-8"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            </div>
            <h3 className="text-base font-heading font-semibold text-[#F7F8FC] mb-2">
              {t('admin.groups.noGroups', 'Nenhum grupo criado ainda.')}
            </h3>
            <p className="text-sm text-[#A0A3B1] max-w-xs mb-6">
              {t(
                'admin.groups.createFirst',
                'Crie seu primeiro grupo para organizar os alunos e iniciar as avaliações.'
              )}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateOpen(true)}
            >
              {t('admin.groups.create', 'Criar primeiro grupo')}
            </Button>
          </div>
        </Card>
      )}

      {/* No search results */}
      {!loading && groups.length > 0 && filtered.length === 0 && (
        <Card variant="default">
          <div className="py-12 text-center">
            <p className="text-[#A0A3B1] text-sm">
              {t('app.noData', 'Nenhum resultado encontrado')}
            </p>
          </div>
        </Card>
      )}

      {/* Groups grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={(g) => setEditGroup(g)}
              onDeleted={() => {}}
            />
          ))}
        </div>
      )}

      {/* Invite student modal */}
      {/* FIX: modal convidar aluno com envio via WhatsApp ou e-mail */}
      <InviteStudentModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groups={groups}
        adminUid={user?.uid}
      />

      {/* Create modal */}
      <CreateGroupModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        modules={modules}
      />

      {/* Edit modal */}
      <EditGroupModal
        isOpen={!!editGroup}
        onClose={() => setEditGroup(null)}
        group={editGroup}
        onUpdated={(updated) => updateGroupStore(updated.id, updated)}
        modules={modules}
      />
    </div>
  );
}
