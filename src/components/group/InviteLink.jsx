import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import Button from '@/components/ui/Button.jsx';
import Card from '@/components/ui/Card.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import { createInvite, getActiveInviteForGroup } from '@/firebase/firestore.js';
import { getPublicBaseUrl } from '@/lib/appUrl.js';

const APP_URL = getPublicBaseUrl();

const EXPIRY_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
];

/**
 * InviteLink — shows and manages the group invite link
 *
 * @param {string} groupId
 * @param {string} inviteToken - current invite token
 * @param {(newToken: string) => void} onRegenerateToken - called with new token after regeneration
 */
export default function InviteLink({ groupId, inviteToken, onRegenerateToken }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState(7);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  // O token NÃO fica salvo em app_groups — fica em app_invites. Mantém estado
  // local e recarrega o convite ativo do banco ao abrir a aba.
  const [token, setToken] = useState(inviteToken || null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    if (token || !groupId) return;
    let cancel = false;
    getActiveInviteForGroup(groupId)
      .then((inv) => { if (!cancel && inv?.token) setToken(inv.token); })
      .catch(() => {});
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      // adminuid do convite = admin logado — sem isso o aluno cadastrado fica
      // órfão (sem vínculo) e o convite some da listagem do admin (RLS)
      const newToken = await createInvite(groupId, user?.uid || null, expiry);
      setToken(newToken);
      onRegenerateToken?.(newToken);
    } catch (err) {
      setGenError(err?.message || 'Erro ao gerar o convite. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const inviteUrl = token
    ? `${APP_URL}/join/${token}`
    : null;

  const handleWhatsApp = () => {
    if (!inviteUrl) return;
    const msg = encodeURIComponent(
      `Olá! 👋\n\n` +
      `Você foi convidado(a) para entrar no meu grupo de avaliação comportamental DISC no Perfil Master.\n\n` +
      `Cadastre-se pelo link abaixo (uso único, expira em ${expiry} dias):\n${inviteUrl}\n\n` +
      `Depois do cadastro, sua avaliação é liberada no próprio app. 😊`
    );
    // Sem número: o WhatsApp abre e o admin escolhe o contato
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newToken = await createInvite(groupId, user?.uid || null, expiry);
      setToken(newToken);
      onRegenerateToken?.(newToken);
    } catch (err) {
      console.error('Error regenerating invite token:', err);
    } finally {
      setRegenerating(false);
      setConfirmRegenerate(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* URL display */}
        <Card variant="accent">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#F7F8FC]">
                {t('admin.groups.inviteLink', 'Link de Convite')}
              </span>
              <div className="flex items-center gap-2">
                {/* Expiry selector */}
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(Number(e.target.value))}
                  className="h-8 px-2 text-xs rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-[#A0A3B1] focus:border-[#6366F1] outline-none transition-colors"
                  aria-label={t('group.expiresIn', 'Expira em')}
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {inviteUrl ? (
              <div className="flex items-center gap-2 p-3 bg-[#1A1D2E] rounded-xl border border-[#2D3047] overflow-hidden">
                <span className="text-xs text-[#A0A3B1] truncate flex-1 font-mono">
                  {inviteUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-all',
                    copied
                      ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                      : 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 hover:bg-[#6366F1]/20'
                  )}
                  aria-label={t('app.copy', 'Copiar')}
                >
                  {copied ? (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {t('app.copied', 'Copiado!')}
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {t('app.copy', 'Copiar')}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-[#1A1D2E] rounded-xl border border-dashed border-[#2D3047] flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-[#A0A3B1]">
                  Nenhum convite ativo para este grupo.
                </p>
                <Button variant="primary" size="sm" onClick={handleGenerate} loading={generating}>
                  {t('admin.groups.generateInvite', 'Gerar link de convite')}
                </Button>
                {genError && <p className="text-xs text-[#EF4444]">{genError}</p>}
              </div>
            )}

            {/* Enviar via WhatsApp — abre o WhatsApp e o admin escolhe o contato */}
            {inviteUrl && (
              <button
                onClick={handleWhatsApp}
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
                style={{ background: '#25D36620', border: '1px solid #25D36660', color: '#25D366' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar via WhatsApp
              </button>
            )}
          </div>
        </Card>

        {/* QR Code */}
        {inviteUrl && (
          <Card variant="default">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-xl flex-shrink-0">
                <QRCode
                  value={inviteUrl}
                  size={140}
                  bgColor="#FFFFFF"
                  fgColor="#0F1117"
                  level="M"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-medium text-[#F7F8FC] mb-1">
                  {t('group.scanQR', 'Escaneie o QR Code')}
                </p>
                <p className="text-xs text-[#A0A3B1] leading-relaxed">
                  {t(
                    'group.qrDescription',
                    'Compartilhe este QR Code com os alunos para que possam entrar no grupo diretamente.'
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Regenerate section */}
        <Card variant="default">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#F7F8FC]">
                {t('group.regenerateToken', 'Regenerar token')}
              </p>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                {t(
                  'group.regenerateWarning',
                  'Links anteriores deixarão de funcionar.'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerate(true)}
              leftIcon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              }
            >
              {t('group.regenerate', 'Regenerar')}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleRegenerate}
        title={t('group.regenerateToken', 'Regenerar token')}
        description={t(
          'group.regenerateConfirm',
          'Todos os links de convite anteriores serão invalidados. Esta ação não pode ser desfeita.'
        )}
        confirmLabel={t('group.regenerate', 'Regenerar')}
        cancelLabel={t('app.cancel', 'Cancelar')}
        variant="danger"
        loading={regenerating}
      />
    </>
  );
}
