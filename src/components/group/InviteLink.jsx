import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import Button from '@/components/ui/Button.jsx';
import Card from '@/components/ui/Card.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import { createInvite } from '@/firebase/firestore.js';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

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
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState(7);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inviteUrl = inviteToken
    ? `${APP_URL}/join/${inviteToken}`
    : null;

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
      const newToken = await createInvite(groupId, null, expiry);
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
              <div className="p-4 bg-[#1A1D2E] rounded-xl border border-dashed border-[#2D3047] text-center">
                <p className="text-sm text-[#A0A3B1]">
                  {t('admin.groups.generateInvite', 'Gerar link de convite')}
                </p>
              </div>
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
