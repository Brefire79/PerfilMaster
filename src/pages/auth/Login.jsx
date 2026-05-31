import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmail } from '@/firebase/auth.js';
import { getUser } from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';
import Button from '@/components/ui/Button.jsx';
import clsx from 'clsx';

export default function Login() {
  useEffect(() => {
    document.title = 'Entrar — ProfileAI';
    return () => { document.title = 'ProfileAI'; };
  }, []);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname;

  const getRedirectPath = (role) => {
    if (from && !from.startsWith('/login') && !from.startsWith('/register')) {
      return from;
    }
    return role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
  };

  const handleFirebaseError = (code) => {
    const map = {
      'auth/user-not-found': t('errors.userNotFound'),
      'auth/wrong-password': t('errors.wrongPassword'),
      'auth/invalid-email': t('errors.invalidEmail'),
      'auth/too-many-requests': t('errors.tooManyRequests'),
      'auth/invalid-credential': t('errors.wrongPassword'),
      'auth/operation-not-supported-in-this-environment': t('errors.generic'),
      'auth/popup-blocked': t('errors.popupBlocked'),
      'auth/cancelled-popup-request': t('errors.operationCancelled'),
    };
    return map[code] || t('errors.generic');
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setError('');
    setLoading(true);

    try {
      const firebaseUser = await signInWithEmail(email, password);
      const userDoc = await getUser(firebaseUser.uid);
      const role = userDoc?.role || 'student';
      setUser(firebaseUser, role);
      navigate(getRedirectPath(role), { replace: true });
    } catch (err) {
      setError(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Logo + heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6366F1] shadow-[0_0_32px_rgba(99,102,241,0.4)] mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('auth.loginTitle')}
        </h1>
        <p className="text-[#A0A3B1] text-sm mt-2">{t('auth.loginSubtitle')}</p>
      </div>

      {/* Card */}
      <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Email/password form */}
        <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 animate-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-[#EF4444]">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="label-base">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              className="input-base"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="label-base mb-0">
                {t('auth.password')}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#6366F1] hover:text-[#818CF8] transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                className="input-base pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            className="mt-2"
          >
            {t('auth.login')}
          </Button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-[#A0A3B1] mt-5">
          {t('auth.inviteOnly')}{' '}
          <span className="text-[#6366F1] text-xs">{t('auth.registerLink')}</span>
        </p>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-[#A0A3B1] mt-6">
        ProfileAI &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
