import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import { updateUser, getUser } from '@/firebase/firestore.js';
import { signOut, verifyPassword } from '@/firebase/auth.js';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import Modal from '@/components/ui/Modal.jsx';
import ApiKeySection from '@/components/ApiKeySection.jsx';

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en',   label: 'English' },
  { value: 'es',   label: 'Español' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function SettingsSection({ title, description, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">{title}</h2>
        {description && (
          <p className="text-sm text-[#A0A3B1] mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-[#F7F8FC] cursor-pointer select-none">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[#A0A3B1] mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1D2E]',
          checked ? 'bg-[#6366F1]' : 'bg-[#2D3047]'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// ─── Save feedback ─────────────────────────────────────────────────────────────
function SaveFeedback({ status }) {
  const { t } = useTranslation();
  if (status === 'idle') return null;
  return (
    <span className={clsx(
      'text-sm flex items-center gap-1.5',
      status === 'saving' ? 'text-[#A0A3B1]' : 'text-[#22C55E]'
    )}>
      {status === 'saving' ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('app.saving', 'Salvando...')}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t('app.saved', 'Salvo!')}
        </>
      )}
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, clearUser } = useAuthStore();

  // ── Profile section ──────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
  });
  const [profileStatus, setProfileStatus] = useState('idle');

  // ── Company section ──────────────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    logoUrl: '',
  });
  const [companyStatus, setCompanyStatus] = useState('idle');

  // carrega dados existentes do usuário (displayName, companyName, logoUrl)
  useEffect(() => {
    if (!user?.uid) return;
    getUser(user.uid)
      .then((doc) => {
        if (doc) {
          const firestoreName = doc.displayName || doc.name || '';
          setProfileForm((f) => ({
            displayName: f.displayName || firestoreName,
          }));
          setCompanyForm({
            companyName: doc.companyName || doc.metadata?.companyName || '',
            logoUrl: doc.logoUrl || doc.metadata?.logoUrl || '',
          });
          if (doc.notifications && typeof doc.notifications === 'object') {
            setNotifications((n) => ({ ...n, ...doc.notifications }));
          }
        }
      })
      .catch(() => {});
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preferences ─────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState(i18n.language || 'pt-BR');
  const [prefStatus, setPrefStatus] = useState('idle');

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    newMember: true,
    assessmentComplete: true,
    weeklyDigest: false,
    systemUpdates: true,
  });
  const [notifStatus, setNotifStatus] = useState('idle');
  const [notifError, setNotifError] = useState('');

  const saveNotifications = async () => {
    setNotifStatus('saving');
    setNotifError('');
    try {
      await updateUser(user.uid, { notifications });
      setNotifStatus('saved');
      setTimeout(() => setNotifStatus('idle'), 2500);
    } catch (err) {
      console.error('[Settings] salvar notificações:', err);
      setNotifStatus('idle');
      setNotifError('Não foi possível salvar. A coluna de notificações pode não existir ainda no banco.');
    }
  };

  // ── Danger zone ──────────────────────────────────────────────────────────────
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const closeDeleteModal = () => {
    if (deleting) return;
    setConfirmDeleteAccount(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const saveProfile = async () => {
    if (!profileForm.displayName.trim()) return;
    setProfileStatus('saving');
    try {
      await updateUser(user.uid, { displayName: profileForm.displayName.trim() });
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setProfileStatus('idle');
    }
  };

  const saveCompany = async () => {
    setCompanyStatus('saving');
    try {
      await updateUser(user.uid, {
        companyName: companyForm.companyName.trim(),
        logoUrl: companyForm.logoUrl.trim(),
      });
      setCompanyStatus('saved');
      setTimeout(() => setCompanyStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setCompanyStatus('idle');
    }
  };

  const savePreferences = async () => {
    setPrefStatus('saving');
    try {
      await i18n.changeLanguage(language);
      await updateUser(user.uid, { preferredLanguage: language });
      setPrefStatus('saved');
      setTimeout(() => setPrefStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setPrefStatus('idle');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Informe sua senha para confirmar.');
      return;
    }
    setDeleting(true);
    try {
      // Confirmação de segurança: valida a senha antes de prosseguir.
      await verifyPassword(deletePassword);
      // FIX A3: exclusão COMPLETA de dados requer Edge Function com service_role.
      // Por ora encerra a sessão e limpa o estado local — dados ficam no banco.
      // TODO: chamar Edge Function deleteAccount({ uid: user.uid }) antes do signOut.
      await signOut();
      clearUser();
      // sucesso → o app desmonta esta tela; não precisa resetar estado
    } catch (err) {
      setDeleteError(
        err?.code === 'auth/invalid-credential'
          ? 'Senha incorreta. Tente novamente.'
          : (err?.message || 'Não foi possível concluir. Tente novamente.')
      );
      setDeleting(false);
    }
  };

  const initials = getInitials(profileForm.displayName || user?.displayName || user?.email || '');

  return (
    <div className="space-y-10 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('navigation.settings', 'Configurações')}
        </h1>
        <p className="text-[#A0A3B1] text-sm mt-0.5">
          {t('settings.subtitle', 'Gerencie sua conta e preferências')}
        </p>
      </div>

      {/* ── Profile section ── */}
      <SettingsSection
        title={t('settings.profile', 'Perfil')}
        description={t('settings.profileDesc', 'Suas informações pessoais')}
      >
        <Card variant="default">
          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/25 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-heading font-bold text-[#6366F1]">
                  {initials}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#F7F8FC]">
                  {profileForm.displayName || user?.email}
                </p>
                <p className="text-xs text-[#A0A3B1] mt-0.5">
                  {t('settings.avatarHint', 'Avatar gerado pelas iniciais do nome')}
                </p>
              </div>
            </div>

            <Input
              label={t('auth.name', 'Nome completo')}
              value={profileForm.displayName}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, displayName: e.target.value }))
              }
              placeholder={t('auth.namePlaceholder', 'Seu nome completo')}
            />

            <Input
              label={t('auth.email', 'E-mail')}
              value={user?.email || ''}
              disabled
              hint={t('settings.emailReadOnly', 'O e-mail não pode ser alterado')}
            />

            <div className="flex items-center justify-end gap-3 pt-1">
              <SaveFeedback status={profileStatus} />
              <Button
                variant="primary"
                size="sm"
                onClick={saveProfile}
                loading={profileStatus === 'saving'}
              >
                {t('app.save', 'Salvar')}
              </Button>
            </div>
          </div>
        </Card>
      </SettingsSection>

      {/* ── Company section ── */}
      <SettingsSection
        title={t('settings.company', 'Empresa')}
        description={t('settings.companyDesc', 'Informações da organização')}
      >
        <Card variant="default">
          <div className="space-y-4">
            <Input
              label={t('settings.companyName', 'Nome da empresa')}
              value={companyForm.companyName}
              onChange={(e) =>
                setCompanyForm((f) => ({ ...f, companyName: e.target.value }))
              }
              placeholder="Ex: Acme Corp"
            />
            <Input
              label={t('settings.logoUrl', 'URL do logo')}
              value={companyForm.logoUrl}
              onChange={(e) =>
                setCompanyForm((f) => ({ ...f, logoUrl: e.target.value }))
              }
              placeholder="https://empresa.com/logo.png"
              hint={t('settings.logoHint', 'URL pública de uma imagem (PNG, SVG)')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              }
            />

            <div className="flex items-center justify-end gap-3">
              <SaveFeedback status={companyStatus} />
              <Button
                variant="primary"
                size="sm"
                onClick={saveCompany}
                loading={companyStatus === 'saving'}
              >
                {t('app.save', 'Salvar')}
              </Button>
            </div>
          </div>
        </Card>
      </SettingsSection>

      {/* ── Language & preferences ── */}
      <SettingsSection
        title={t('settings.preferences', 'Preferências')}
        description={t('settings.preferencesDesc', 'Idioma padrão e exibição')}
      >
        <Card variant="default">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#F7F8FC]">
                {t('settings.language', 'Idioma padrão')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#6366F1] outline-none transition-colors"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <SaveFeedback status={prefStatus} />
              <Button
                variant="primary"
                size="sm"
                onClick={savePreferences}
                loading={prefStatus === 'saving'}
              >
                {t('app.save', 'Salvar')}
              </Button>
            </div>
          </div>
        </Card>
      </SettingsSection>

      {/* ── Notification preferences ── */}
      <SettingsSection
        title={t('settings.notifications', 'Notificações')}
        description={t('settings.notificationsDesc', 'Escolha quando ser notificado')}
      >
        <Card variant="default">
          <div className="divide-y divide-[#2D3047]">
            <Toggle
              checked={notifications.newMember}
              onChange={(v) => setNotifications((n) => ({ ...n, newMember: v }))}
              label={t('settings.notif.newMember', 'Novo membro no grupo')}
              description={t('settings.notif.newMemberDesc', 'Receba um aviso quando um aluno entrar no grupo.')}
            />
            <Toggle
              checked={notifications.assessmentComplete}
              onChange={(v) => setNotifications((n) => ({ ...n, assessmentComplete: v }))}
              label={t('settings.notif.assessmentComplete', 'Avaliação concluída')}
              description={t('settings.notif.assessmentCompleteDesc', 'Notificação quando um aluno completar a avaliação.')}
            />
            <Toggle
              checked={notifications.weeklyDigest}
              onChange={(v) => setNotifications((n) => ({ ...n, weeklyDigest: v }))}
              label={t('settings.notif.weeklyDigest', 'Resumo semanal')}
              description={t('settings.notif.weeklyDigestDesc', 'Relatório resumido toda segunda-feira.')}
            />
            <Toggle
              checked={notifications.systemUpdates}
              onChange={(v) => setNotifications((n) => ({ ...n, systemUpdates: v }))}
              label={t('settings.notif.systemUpdates', 'Atualizações do sistema')}
              description={t('settings.notif.systemUpdatesDesc', 'Novidades sobre a plataforma Perfil Master.')}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-[#2D3047] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#A0A3B1]">
              Suas preferências são salvas. O envio por e-mail será ativado em breve.
            </p>
            <div className="flex items-center gap-3 flex-shrink-0">
              <SaveFeedback status={notifStatus} />
              <Button
                variant="primary"
                size="sm"
                onClick={saveNotifications}
                loading={notifStatus === 'saving'}
              >
                {t('app.save', 'Salvar')}
              </Button>
            </div>
          </div>
          {notifError && <p className="text-xs text-[#EF4444] mt-2">{notifError}</p>}
        </Card>
      </SettingsSection>

      {/* ── API Key de IA ── */}
      <SettingsSection
        title={t('settings.aiTitle', 'Inteligência Artificial')}
        description={t('settings.aiDesc', 'Configure uma API key para análises aprimoradas por IA. Sem key, as análises são geradas localmente.')}
      >
        <Card variant="default">
          <ApiKeySection />
        </Card>
      </SettingsSection>

      {/* ── Danger zone ── */}
      <SettingsSection title={t('settings.dangerZone', 'Zona de Perigo')}>
        <Card variant="default" className="border-[#EF4444]/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#EF4444]">
                {t('settings.deleteAccount', 'Excluir conta')}
              </p>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                {t(
                  'settings.deleteAccountWarning',
                  'Encerrará sua sessão. A exclusão completa dos dados será implementada em breve.'
                )}
              </p>
            </div>
            {/* FIX A3: botão habilitado mas aviso deixa claro que só desloga por ora */}
            <Button
              variant="danger"
              size="sm"
              className="flex-shrink-0"
              onClick={() => { setDeletePassword(''); setDeleteError(''); setConfirmDeleteAccount(true); }}
            >
              {t('settings.deleteAccount', 'Excluir conta')}
            </Button>
          </div>
        </Card>
      </SettingsSection>

      {/* Delete account — confirmação com re-aviso de risco + senha */}
      <Modal
        isOpen={confirmDeleteAccount}
        onClose={closeDeleteModal}
        title="Excluir conta?"
        size="sm"
        footer={
          <>
            <button
              onClick={closeDeleteModal}
              disabled={deleting}
              className="h-9 px-4 text-sm font-medium rounded-xl bg-[#242736] hover:bg-[#2D3047] text-[#F7F8FC] border border-[#2D3047] transition-colors disabled:opacity-50"
            >
              {t('app.cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
              className="h-9 px-4 text-sm font-medium rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Confirmando...' : 'Sim, excluir minha conta'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Re-aviso do risco */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="text-sm text-[#F7F8FC]">
              <p className="font-semibold text-[#EF4444]">Esta ação é sensível.</p>
              <p className="text-[#A0A3B1] mt-0.5">
                Você será desconectado imediatamente. A exclusão completa dos seus dados
                (grupos, alunos e avaliações) é permanente e não pode ser desfeita.
              </p>
            </div>
          </div>

          {/* Confirmação por senha */}
          <div>
            <label htmlFor="delete-pw" className="text-sm font-medium text-[#F7F8FC] block mb-1.5">
              Para continuar, confirme sua senha
            </label>
            <input
              id="delete-pw"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && deletePassword && !deleting) handleDeleteAccount(); }}
              placeholder="Sua senha"
              className="w-full h-11 px-4 rounded-lg bg-[#1A1D2E] border border-[#2D3047] text-sm text-[#F7F8FC] focus:border-[#EF4444] outline-none transition-colors"
            />
            {deleteError && <p className="text-xs text-[#EF4444] mt-1.5">{deleteError}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
