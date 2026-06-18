import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import useProfileStore from '@/store/profileStore.js';
import useAssessmentStore from '@/store/assessmentStore.js';
import { signOut } from '@/firebase/auth.js';

// ─── Nav Items ────────────────────────────────────────────────────────────────
const adminNavItems = [
  {
    key: 'dashboard',
    to: '/admin/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'groups',
    to: '/admin/groups',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'students',
    to: '/admin/students',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  // ── Aba "Pessoas" (Central de Pessoas) ocultada — a função foi integrada a
  //    Alunos/Grupos. Para reativar, restaure este item e a rota em routes/index.jsx.
  {
    key: 'modules',
    to: '/admin/modules',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  // ── Aba "Sessões" ocultada — criar avaliação avulsa + enviar link WhatsApp
  //    agora vive em Alunos (botão "Avaliação avulsa") e em Grupos › Membros.
  //    Para reativar, restaure este item e a rota em routes/index.jsx.
  {
    key: 'reports',
    to: '/admin/reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: 'settings',
    to: '/admin/settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ role = 'admin', mobile = false, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const resetGroups = useGroupStore((s) => s.reset);
  const resetProfiles = useProfileStore((s) => s.reset);
  const resetAssessment = useAssessmentStore((s) => s.resetAssessment);

  const navItems = adminNavItems;

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUser();
      resetGroups();
      resetProfiles();
      resetAssessment();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const avatarInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <aside
      className={clsx(
        'flex flex-col bg-[#1A1D2E] border-r border-[#2D3047] h-screen',
        mobile ? 'w-72' : 'w-64'
      )}
    >
      {/* Logo + Close button */}
      <div className="flex items-center justify-between p-5 border-b border-[#2D3047]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-heading font-bold text-[#F7F8FC] text-lg">Perfil Master</span>
        </div>
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors"
            aria-label="Fechar menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Menu principal">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.to}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20'
                      : 'text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736]'
                  )
                }
              >
                {item.icon}
                <span>{t(`navigation.${item.key}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[#2D3047]">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-[#6366F1] text-sm font-bold font-heading">
                {avatarInitial}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#F7F8FC] text-sm font-medium truncate">
              {user?.displayName || 'Administrador'}
            </p>
            <p className="text-[#A0A3B1] text-xs truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t('navigation.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
