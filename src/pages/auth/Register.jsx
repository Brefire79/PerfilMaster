import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signUpWithEmail } from '@/firebase/auth.js';
import { getInvite, registerStudentWithGroup } from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';
import Button from '@/components/ui/Button.jsx';
import clsx from 'clsx';

function PasswordStrengthBar({ password }) {
  const { t } = useTranslation();
  const getStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const label =
    strength <= 1 ? t('auth.passwordWeak') :
    strength <= 3 ? t('auth.passwordFair') :
    t('auth.passwordStrong');
  const color =
    strength <= 1 ? '#E53E3E' :
    strength <= 3 ? '#D69E2E' :
    '#38A169';
  const width = `${Math.min(100, (strength / 5) * 100)}%`;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1 bg-[#2D3047] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <p className="text-xs" style={{ color }}>{t('auth.passwordStrength')}: {label}</p>
    </div>
  );
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();

  const token = searchParams.get('token');
  const groupIdParam = searchParams.get('group');

  const [invite, setInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState('loading'); // 'loading' | 'valid' | 'invalid' | 'expired'

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // ─── Validate invite token ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setInviteStatus('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const inviteDoc = await getInvite(token);
        if (!inviteDoc) {
          setInviteStatus('invalid');
          return;
        }
        if (inviteDoc.used) {
          setInviteStatus('expired');
          return;
        }
        const now = new Date();
        const expiresAt = inviteDoc.expiresAt?.toDate?.() || new Date(inviteDoc.expiresAt);
        if (expiresAt < now) {
          setInviteStatus('expired');
          return;
        }
        setInvite(inviteDoc);
        setInviteStatus('valid');
      } catch {
        setInviteStatus('invalid');
      }
    };

    validateToken();
  }, [token]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('errors.requiredField');
    if (!email.trim()) newErrors.email = t('errors.requiredField');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('errors.invalidEmail');
    if (!password) newErrors.password = t('errors.requiredField');
    else if (password.length < 8) newErrors.password = t('errors.passwordTooShort');
    if (!confirmPassword) newErrors.confirmPassword = t('errors.requiredField');
    else if (password !== confirmPassword) newErrors.confirmPassword = t('errors.passwordsDoNotMatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setServerError('');
    setLoading(true);

    try {
      const groupId = invite?.groupId || groupIdParam;

      // 1. FIX B1: cria usuário no Supabase Auth (não Firebase)
      const firebaseUser = await signUpWithEmail(email.trim(), password, name.trim());

      // 2. Create Firestore user doc + add to group (batch)
      await registerStudentWithGroup(
        firebaseUser.uid,
        {
          displayName: name.trim(),
          email: email.trim(),
          photoURL: firebaseUser.photoURL || null,
        },
        groupId,
        token
      );

      // 3. Update auth store
      setUser(firebaseUser, 'student');

      // 4. Navigate to student dashboard
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const map = {
        'auth/email-already-in-use': t('errors.emailInUse'),
        'auth/invalid-email': t('errors.invalidEmail'),
        'auth/weak-password': t('errors.weakPassword'),
      };
      setServerError(map[err.code] || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Invalid / Expired invite views ────────────────────────────────────────
  if (inviteStatus === 'loading') {
    return (
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 text-[#A0A3B1]">
          <div className="w-4 h-4 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-sm">{t('auth.verifyingInvite')}</span>
        </div>
      </div>
    );
  }

  if (inviteStatus === 'invalid' || inviteStatus === 'expired') {
    return (
      <div className="w-full max-w-md animate-slide-up">
        <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="w-14 h-14 rounded-2xl bg-[#E53E3E]/10 border border-[#E53E3E]/25 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth={2} className="w-7 h-7">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-bold text-[#F7F8FC] mb-2">
            {inviteStatus === 'expired' ? t('auth.inviteExpired') : t('auth.inviteInvalid')}
          </h2>
          <p className="text-[#A0A3B1] text-sm mb-6">
            {inviteStatus === 'expired' ? t('auth.inviteExpired') : t('auth.inviteInvalid')}
          </p>
          <Link to="/login">
            <Button variant="secondary" fullWidth>
              {t('auth.backToLogin')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6366F1] shadow-[0_0_32px_rgba(99,102,241,0.4)] mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('auth.registerTitle')}
        </h1>
        {invite && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#38A169]/10 border border-[#38A169]/25">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38A169]" />
            <p className="text-sm text-[#38A169]">
              {t('auth.inviteValid')}
            </p>
          </div>
        )}
      </div>

      {/* Card */}
      <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#E53E3E]/10 border border-[#E53E3E]/25 animate-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-[#E53E3E]">{serverError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="label-base">{t('auth.name')}</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
              placeholder={t('auth.namePlaceholder')}
              className={clsx('input-base', errors.name && 'border-[#E53E3E]!')}
            />
            {errors.name && <p className="text-xs text-[#E53E3E] mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="label-base">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder={t('auth.emailPlaceholder')}
              className={clsx('input-base', errors.email && 'border-[#E53E3E]!')}
            />
            {errors.email && <p className="text-xs text-[#E53E3E] mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="label-base">{t('auth.password')}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                placeholder={t('auth.passwordPlaceholder')}
                className={clsx('input-base pr-10', errors.password && 'border-[#E53E3E]!')}
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
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8" />
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
            <PasswordStrengthBar password={password} />
            {errors.password && <p className="text-xs text-[#E53E3E] mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="label-base">{t('auth.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className={clsx('input-base', errors.confirmPassword && 'border-[#E53E3E]!')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-[#E53E3E] mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
            {t('auth.register')}
          </Button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-[#A0A3B1] mt-5">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
