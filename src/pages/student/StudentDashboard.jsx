import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import useProfileStore from '@/store/profileStore.js';
import { getProfile } from '@/firebase/firestore.js';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Badge, { ProfileBadge } from '@/components/ui/Badge.jsx';
import Button from '@/components/ui/Button.jsx';

const PROFILE_COLORS = {
  D: { bg: 'bg-[#E53E3E]/10', border: 'border-[#E53E3E]/25', text: 'text-[#E53E3E]', hex: '#E53E3E' },
  I: { bg: 'bg-[#D69E2E]/10', border: 'border-[#D69E2E]/25', text: 'text-[#D69E2E]', hex: '#D69E2E' },
  S: { bg: 'bg-[#38A169]/10', border: 'border-[#38A169]/25', text: 'text-[#38A169]', hex: '#38A169' },
  C: { bg: 'bg-[#3182CE]/10', border: 'border-[#3182CE]/25', text: 'text-[#3182CE]', hex: '#3182CE' },
};

function ProfileCard({ profile }) {
  const { t } = useTranslation();
  if (!profile) return null;
  const type = profile.primaryType;
  const colors = PROFILE_COLORS[type] || PROFILE_COLORS.D;

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: colors.hex }}
      />
      <div className="pt-2 flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-heading font-black flex-shrink-0 ${colors.bg} border ${colors.border} ${colors.text}`}
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

      {/* Score bars */}
      {profile.scores && (
        <div className="mt-4 space-y-2.5">
          {Object.entries(profile.scores).map(([key, value]) => {
            const c = PROFILE_COLORS[key] || PROFILE_COLORS.D;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold w-4 ${c.text}`}>{key}</span>
                <div className="flex-1 h-2 bg-[#2D3047] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${value}%`, backgroundColor: c.hex }}
                  />
                </div>
                <span className="text-xs font-mono text-[#A0A3B1] w-8 text-right">{value}%</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
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
    <Card variant="accent" hoverable className="border-[#6366F1]/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/25 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} className="w-6 h-6">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-heading font-semibold text-[#F7F8FC]">
            {t('assessment.title')}
          </h3>
          <p className="text-sm text-[#A0A3B1] mt-0.5">
            {t('assessment.description')}
          </p>
          <p className="text-xs text-[#A0A3B1] mt-2 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t('assessment.timeEstimate')}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Link to="/student/assessment-wizard">
          <Button variant="primary" size="sm" fullWidth>
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('student.greeting', 'Olá, {{name}} 👋', { name: displayName })}
        </h1>
        <p className="text-[#A0A3B1] text-sm mt-1">
          {currentProfile
            ? t('profiles.yourProfile')
            : t('assessment.description')}
        </p>
      </div>

      {/* Profile or Assessment CTA */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-48 skeleton rounded-2xl" />
        </div>
      ) : currentProfile ? (
        <ProfileCard profile={currentProfile} />
      ) : (
        <PendingAssessmentCard />
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card variant="default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#F7F8FC]">{t('profiles.subtitle')}</p>
              <p className="text-xs text-[#A0A3B1] mt-0.5">{t('profiles.description')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* DISC profiles overview */}
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
                className={`rounded-xl p-3 border ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-heading font-black ${colors.text}`}>{type}</span>
                  <span className="text-xs font-medium text-[#F7F8FC]">
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
