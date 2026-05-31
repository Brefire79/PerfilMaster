import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '@/firebase/auth.js';
import Button from '@/components/ui/Button.jsx';

export default function ForgotPassword() {
  React.useEffect(() => {
    document.title = "Recuperar senha — ProfileAI";
    return () => { document.title = "ProfileAI"; };
  }, []);
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setLoading(true);

    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      const map = {
        'auth/user-not-found': t('errors.userNotFound'),
        'auth/invalid-email': t('errors.invalidEmail'),
        'auth/too-many-requests': t('errors.tooManyRequests'),
      };
      setError(map[err.code] || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6366F1] shadow-[0_0_32px_rgba(99,102,241,0.4)] mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-7 h-7">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-[#A0A3B1] text-sm mt-2">
          {t('auth.forgotPasswordSubtitle')}
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#1A1D2E] border border-[#2D3047] rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {sent ? (
          /* Success state */
          <div className="text-center py-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/25 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} className="w-7 h-7">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-heading font-semibold text-[#F7F8FC] mb-2">
              {t('app.success')}
            </h3>
            <p className="text-[#A0A3B1] text-sm mb-6">
              {t('auth.resetPasswordSent')}
            </p>
            <Link to="/login">
              <Button variant="secondary" fullWidth>
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

            <div>
              <label htmlFor="email" className="label-base">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder={t('auth.emailPlaceholder')}
                required
                className="input-base"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              {t('auth.sendResetEmail')}
            </Button>

            <Link to="/login" className="block text-center">
              <Button variant="ghost" fullWidth type="button">
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
