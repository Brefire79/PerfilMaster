import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore.js';
import Button from '@/components/ui/Button.jsx';

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();

  const homeLink = user
    ? role === 'admin' ? '/admin/dashboard' : '/student/dashboard'
    : '/login';

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-slide-up">
        {/* Decorative 404 */}
        <div className="relative inline-block mb-8">
          <span className="text-[120px] font-heading font-black text-[#2D3047] leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/25 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366F1"
                strokeWidth={1.8}
                className="w-10 h-10"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC] mb-3">
          {t('errors.notFound')}
        </h1>
        <p className="text-[#A0A3B1] text-sm mb-8 leading-relaxed">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            }
          >
            {t('app.back')}
          </Button>
          <Link to={homeLink}>
            <Button variant="primary">
              {user ? t('navigation.dashboard') : t('auth.login')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
