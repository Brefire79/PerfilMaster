import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import useProfileStore from '@/store/profileStore.js';
import { getProfile } from '@/firebase/firestore.js';
import Card from '@/components/ui/Card.jsx';
import { ProfileBadge } from '@/components/ui/Badge.jsx';
import Button from '@/components/ui/Button.jsx';

// Fonte única de cores DISC (alinhada aos tokens F1)
const PROFILE_COLORS = {
  D: { hex: '#EF4444', soft: '#EF444415', fill: 'score-fill--D' },
  I: { hex: '#F59E0B', soft: '#F59E0B15', fill: 'score-fill--I' },
  S: { hex: '#22C55E', soft: '#22C55E15', fill: 'score-fill--S' },
  C: { hex: '#6366F1', soft: '#6366F115', fill: 'score-fill--C' },
};

const VALID_DISC = new Set(['D', 'I', 'S', 'C']);

/** Retorna a letra DISC válida ou null — protege contra string 'undefined' no banco */
function resolveDiscType(profile) {
  const raw = profile?.primaryType ?? profile?.dominantProfile ?? null;
  return VALID_DISC.has(raw) ? raw : null;
}

function ProfileCard({ profile }) {
  const { t } = useTranslation();
  if (!profile) return null;
  const type = resolveDiscType(profile) ?? 'D';
  const colors = PROFILE_COLORS[type] || PROFILE_COLORS.D;

  return (
    <Card variant="elevated" className="relative overflow-hidden animate-slide-up">
      {/* Faixa superior na cor do perfil */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: colors.hex }} />

      <div className="pt-2 flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-heading font-black flex-shrink-0 text-white"
          style={{ backgroundColor: colors.hex }}
        >
          {type}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-heading font-bold text-[#F7F8FC]">
              {t(`profiles.${type}.name`)}
            </h3>
            <ProfileBadge type={type} size="sm" />
          </div>
          <p className="text-sm text-[#A0A3B1] mt-0.5 line-clamp-2">
            {t(`profiles.${type}.tagline`)}
          </p>
        </div>
      </div>

      {/* Barras de score (primitivos F1) */}
      {profile.scores && (
        <div className="mt-5 space-y-3">
          {Object.entries(profile.scores).map(([key, value]) => {
            const c = PROFILE_COLORS[key] || PROFILE_COLORS.D;
            return (
              <div key={key} className="score-row">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="grid place-items-center w-5 h-5 rounded text-[10px] font-bold text-white"
                      style={{ background: c.hex }}
                    >
                      {key}
                    </span>
                    <span className="text-xs text-[#A0A3B1]">{t(`profiles.${key}.name`)}</span>
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: c.hex }}>{value}%</span>
                </div>
                <div className="score-track">
                  <div className={`score-fill ${c.fill}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <Link to="/student/profile">
          <Button variant="secondary" size="sm" fullWidth>
            {t('app.view')} {t('navigation.myProfile')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function PendingAssessmentCard() {
  const { t } = useTranslation();
  return (
    <Card variant="default" className="relative overflow-hidden animate-slide-up">
      {/* Hero com gradiente da marca */}
      <div className="surface-brand -m-5 mb-5 p-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} className="w-6 h-6">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-heading font-bold text-white text-balance">
              {t('assessment.title')}
            </h3>
            <p className="text-sm text-white/85 mt-1">
              {t('assessment.description')}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#A0A3B1] flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {t('assessment.timeEstimate')}
      </p>

      <div className="mt-4">
        <Link to="/student/assessment-wizard">
          <Button variant="primary" size="lg" fullWidth>
            {t('assessment.start')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentProfile, setProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const loadProfile = async () => {
      try {
        const profile = await getProfile(user.uid);
        if (profile) setProfile(profile);
      } catch (err) {
        console.error('[StudentDashboard] Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user?.uid, setProfile]);

  const displayName = user?.displayName?.split(' ')[0] || 'Estudante';
  const primaryType = resolveDiscType(currentProfile);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC] text-balance">
          {t('student.greeting', 'Olá, {{name}} 👋', { name: displayName })}
        </h1>
        <p className="text-[#A0A3B1] text-sm mt-1">
          {currentProfile ? t('profiles.yourProfile') : t('assessment.description')}
        </p>
      </div>

      {/* Stat tiles (quando há perfil) */}
      {!loading && currentProfile && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <span className="stat-tile__label">{t('profiles.yourProfile', 'Seu perfil')}</span>
            <span className="stat-tile__value" style={{ color: PROFILE_COLORS[primaryType]?.hex }}>
              {primaryType ? t(`profiles.${primaryType}.name`) : '—'}
            </span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__label">{t('assessment.status', 'Status')}</span>
            <span className="stat-tile__value text-[#22C55E]">✓</span>
          </div>
        </div>
      )}

      {/* Perfil ou CTA de avaliação */}
      {loading ? (
        <div className="h-48 skeleton rounded-2xl" />
      ) : currentProfile ? (
        <ProfileCard profile={currentProfile} />
      ) : (
        <PendingAssessmentCard />
      )}

      {/* Visão geral dos 4 perfis DISC */}
      <section>
        <h2 className="text-sm font-heading font-semibold text-[#A0A3B1] uppercase tracking-wider mb-3">
          {t('profiles.title')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {['D', 'I', 'S', 'C'].map((type) => {
            const colors = PROFILE_COLORS[type];
            return (
              <div
                key={type}
                className="rounded-xl p-3.5 border"
                style={{ background: colors.soft, borderColor: colors.hex + '40' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="grid place-items-center w-7 h-7 rounded-lg text-xs font-bold text-white"
                    style={{ background: colors.hex }}
                  >
                    {type}
                  </span>
                  <span className="text-sm font-medium text-[#F7F8FC]">
                    {t(`profiles.${type}.name`)}
                  </span>
                </div>
                <p className="text-2xs text-[#A0A3B1] leading-tight">
                  {t(`profiles.${type}.tagline`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
