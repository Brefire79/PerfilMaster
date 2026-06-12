import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import useProfileStore from '@/store/profileStore.js';
import useAssessmentStore from '@/store/assessmentStore.js';
import { signOut } from '@/firebase/auth.js';
// FIX: seletor de idioma removido — app é PT-BR exclusivo

export default function TopBar({ role = 'student', onMenuClick }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const resetGroups = useGroupStore((s) => s.reset);
  const resetProfiles = useProfileStore((s) => s.reset);
  const resetAssessment = useAssessmentStore((s) => s.resetAssessment);
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
    <header className="sticky top-0 z-20 bg-[#1A1D2E]/80 backdrop-blur-md border-b border-[#2D3047] safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Left: Menu button (mobile) + Logo (student) or page title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button (admin only) */}
          {role === 'admin' && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] transition-colors"
              aria-label={t('navigation.menu')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          {/* Logo (always shown on student, shown on mobile admin) */}
          {(role === 'student' || (role === 'admin')) && (
            <div className={clsx('flex items-center gap-2', role === 'admin' && 'lg:hidden')}>
              <div className="w-7 h-7 rounded-lg bg-[#6366F1] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-heading font-bold text-[#F7F8FC] text-base">Perfil Master</span>
            </div>
          )}
        </div>

        {/* Right: Language selector + User info + Logout */}
        <div className="flex items-center gap-2">
          {/* FIX: seletor PT/ES/EN removido — app é PT-BR exclusivo */}

          {/* User avatar + name */}
          <div className="hidden sm:flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-[#6366F1] text-xs font-bold">{avatarInitial}</span>
              )}
            </div>
            <span className="text-[#F7F8FC] text-sm font-medium max-w-[120px] truncate">
              {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
            </span>
          </div>

          {/* Logout button */}
          <button
            onClick={handleSignOut}
            title={t('navigation.logout')}
            className="p-2 rounded-lg text-[#A0A3B1] hover:text-[#EF4444] hover:bg-[#242736] transition-colors"
            aria-label={t('navigation.logout')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
