import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useProfileStore from '@/store/profileStore.js';
import { getProfile } from '@/firebase/firestore.js';
import { getAssessmentsByUser } from '@/firebase/firestore.js';
import Button from '@/components/ui/Button.jsx';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Badge, { ProfileBadge } from '@/components/ui/Badge.jsx';
import RadarChart from '@/components/ui/RadarChart.jsx';
import EvolutionChart from '@/components/profile/EvolutionChart.jsx';

// ─── Profile colors ───────────────────────────────────────────────────────────

const PROFILE_COLORS = {
  D: { bg: 'bg-[#E53E3E]/10', border: 'border-[#E53E3E]/30', text: 'text-[#E53E3E]', hex: '#E53E3E', ring: 'ring-[#E53E3E]/40' },
  I: { bg: 'bg-[#D69E2E]/10', border: 'border-[#D69E2E]/30', text: 'text-[#D69E2E]', hex: '#D69E2E', ring: 'ring-[#D69E2E]/40' },
  S: { bg: 'bg-[#38A169]/10', border: 'border-[#38A169]/30', text: 'text-[#38A169]', hex: '#38A169', ring: 'ring-[#38A169]/40' },
  C: { bg: 'bg-[#3182CE]/10', border: 'border-[#3182CE]/30', text: 'text-[#3182CE]', hex: '#3182CE', ring: 'ring-[#3182CE]/40' },
};

// ─── No Profile CTA ───────────────────────────────────────────────────────────

function NoProfileState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/25 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.5} className="w-10 h-10">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('profile.noProfile.title', 'Você ainda não tem um perfil')}
        </h1>
        <p className="text-sm text-[#A0A3B1] max-w-xs mx-auto leading-relaxed">
          {t('profile.noProfile.description', 'Inicie sua avaliação comportamental DISC para descobrir seus pontos fortes e áreas de desenvolvimento.')}
        </p>
      </div>

      <Link to="/student/assessment/new">
        <Button variant="primary" size="lg">
          {t('assessment.start', 'Iniciar Avaliação')}
        </Button>
      </Link>
    </div>
  );
}

// ─── Profile Header ───────────────────────────────────────────────────────────

function ProfileHeader({ profile, userName }) {
  const { t } = useTranslation();
  const type = profile?.dominantProfile ?? profile?.primaryType ?? 'D';
  const colors = PROFILE_COLORS[type] ?? PROFILE_COLORS.D;

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {/* Large profile badge */}
      <div
        className={clsx(
          'w-24 h-24 rounded-3xl flex items-center justify-center text-5xl font-heading font-black border-2 ring-4',
          colors.bg,
          colors.border,
          colors.text,
          colors.ring
        )}
      >
        {type}
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {userName}
        </h1>
        <p className={clsx('text-sm font-medium', colors.text)}>
          {t('profiles.yourProfile', 'Seu Perfil')} — {t(`profiles.${type}.name`, type)}
        </p>
        <p className="text-xs text-[#A0A3B1]">
          {t(`profiles.${type}.tagline`, '')}
        </p>
      </div>

      {/* Score pills */}
      {profile?.scores && (
        <div className="flex gap-2 flex-wrap justify-center">
          {Object.entries(profile.scores).map(([key, value]) => {
            const c = PROFILE_COLORS[key] ?? PROFILE_COLORS.D;
            return (
              <span
                key={key}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border',
                  c.bg,
                  c.border,
                  c.text
                )}
              >
                {key} {value}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex border-b border-[#2D3047]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            'flex-1 py-3 text-sm font-medium transition-all duration-150 border-b-2 -mb-px',
            activeTab === tab.id
              ? 'text-[#6366F1] border-[#6366F1]'
              : 'text-[#A0A3B1] border-transparent hover:text-[#F7F8FC]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Score Bars ───────────────────────────────────────────────────────────────

function ScoreBars({ scores }) {
  if (!scores || Object.keys(scores).length === 0) return null;
  return (
    <div className="space-y-3">
      {Object.entries(scores).map(([key, value]) => {
        const c = PROFILE_COLORS[key] ?? PROFILE_COLORS.D;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className={clsx('text-xs font-mono font-bold w-4', c.text)}>{key}</span>
            <div className="flex-1 h-2.5 bg-[#2D3047] rounded-full overflow-hidden">
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
  );
}

// ─── Strengths & Challenges ───────────────────────────────────────────────────

function StrengthsAndChallenges({ type }) {
  const { t } = useTranslation();

  const strengthsKey = `profiles.${type}.strengths`;
  const challengesKey = `profiles.${type}.challenges`;
  const strengths = t(strengthsKey, { returnObjects: true }) ?? [];
  const challenges = t(challengesKey, { returnObjects: true }) ?? [];

  const displayStrengths = Array.isArray(strengths) ? strengths.slice(0, 4) : [];
  const displayChallenges = Array.isArray(challenges) ? challenges.slice(0, 4) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Strengths */}
      <div className="bg-[#1A1D2E] rounded-xl p-4 border border-[#38A169]/20">
        <h3 className="text-sm font-heading font-semibold text-[#38A169] mb-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t('profiles.strengths', 'Pontos Fortes')}
        </h3>
        <ul className="space-y-2">
          {displayStrengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#A0A3B1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38A169] flex-shrink-0 mt-1.5" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Challenges */}
      <div className="bg-[#1A1D2E] rounded-xl p-4 border border-[#D69E2E]/20">
        <h3 className="text-sm font-heading font-semibold text-[#D69E2E] mb-3 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {t('profiles.challenges', 'Desafios')}
        </h3>
        <ul className="space-y-2">
          {displayChallenges.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#A0A3B1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D69E2E] flex-shrink-0 mt-1.5" />
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Role Recommendations Card ────────────────────────────────────────────────

function RoleRecommendationsCard({ type }) {
  const { t } = useTranslation();
  const rolesKey = `profiles.${type}.idealRoles`;
  const roles = t(rolesKey, { returnObjects: true }) ?? [];
  const displayRoles = Array.isArray(roles) ? roles.slice(0, 6) : [];

  return (
    <Card variant="default">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} className="w-4 h-4">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
          </svg>
        </div>
        <CardTitle>{t('profiles.idealRoles', 'Funções Ideais')}</CardTitle>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayRoles.map((role, i) => (
          <span
            key={i}
            className="text-xs px-2.5 py-1 rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 font-medium"
          >
            {role}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ─── Work Style Card ──────────────────────────────────────────────────────────

function WorkStyleCard({ type }) {
  const { t } = useTranslation();
  const colors = PROFILE_COLORS[type] ?? PROFILE_COLORS.D;

  const workStyleTraits = {
    D: [
      { icon: '⚡', label: t('profile.workStyle.D.pace', 'Ritmo acelerado') },
      { icon: '🎯', label: t('profile.workStyle.D.focus', 'Foco em resultados') },
      { icon: '🏆', label: t('profile.workStyle.D.drive', 'Alta competitividade') },
    ],
    I: [
      { icon: '🤝', label: t('profile.workStyle.I.collab', 'Colaboração intensa') },
      { icon: '💡', label: t('profile.workStyle.I.idea', 'Geração de ideias') },
      { icon: '🎤', label: t('profile.workStyle.I.comm', 'Comunicação expressiva') },
    ],
    S: [
      { icon: '🌱', label: t('profile.workStyle.S.stable', 'Estabilidade e consistência') },
      { icon: '👂', label: t('profile.workStyle.S.listen', 'Escuta ativa') },
      { icon: '🛡️', label: t('profile.workStyle.S.support', 'Suporte ao time') },
    ],
    C: [
      { icon: '🔍', label: t('profile.workStyle.C.detail', 'Atenção aos detalhes') },
      { icon: '📊', label: t('profile.workStyle.C.data', 'Tomada de decisão baseada em dados') },
      { icon: '✅', label: t('profile.workStyle.C.quality', 'Alta qualidade') },
    ],
  };

  const traits = workStyleTraits[type] ?? workStyleTraits.D;

  return (
    <Card variant="default">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border',
            colors.bg,
            colors.border
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={clsx('w-4 h-4', colors.text)}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <CardTitle>{t('profile.workStyle.title', 'Estilo de Trabalho')}</CardTitle>
      </div>
      <div className="space-y-2.5">
        {traits.map((trait, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-base" role="img" aria-hidden="true">{trait.icon}</span>
            <span className="text-sm text-[#A0A3B1]">{trait.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Communication Tips Card ──────────────────────────────────────────────────

function CommunicationCard({ type }) {
  const { t } = useTranslation();

  const tips = {
    D: [
      t('profile.comm.D.tip1', 'Seja direto e objetivo — evite rodeios'),
      t('profile.comm.D.tip2', 'Apresente opções e deixe-os decidir'),
      t('profile.comm.D.tip3', 'Foque em resultados e impacto'),
    ],
    I: [
      t('profile.comm.I.tip1', 'Use histórias e exemplos visuais'),
      t('profile.comm.I.tip2', 'Valorize suas ideias e entusiasmo'),
      t('profile.comm.I.tip3', 'Mantenha o ambiente descontraído'),
    ],
    S: [
      t('profile.comm.S.tip1', 'Seja paciente e dê tempo para processar'),
      t('profile.comm.S.tip2', 'Demonstre que você se importa com eles'),
      t('profile.comm.S.tip3', 'Evite mudanças abruptas e surpresas'),
    ],
    C: [
      t('profile.comm.C.tip1', 'Use dados e evidências para convencer'),
      t('profile.comm.C.tip2', 'Seja preciso e evite generalizações'),
      t('profile.comm.C.tip3', 'Dê tempo para análise antes de decidir'),
    ],
  };

  const profileTips = tips[type] ?? tips.D;

  return (
    <Card variant="default">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.8} className="w-4 h-4">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <CardTitle>{t('profile.comm.title', 'Dicas de Comunicação')}</CardTitle>
      </div>
      <ul className="space-y-2.5">
        {profileTips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#A0A3B1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0 mt-1.5" />
            {tip}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ profile }) {
  const { t } = useTranslation();
  const type = profile?.dominantProfile ?? profile?.primaryType ?? 'D';

  const summary = profile?.aiSummary ?? t(
    `profiles.${type}.description`,
    'Perfil comportamental identificado com base na sua avaliação DISC.'
  );

  return (
    <div className="space-y-4 py-4">
      {/* AI Summary */}
      <Card variant="default">
        <CardTitle className="mb-3">
          {t('report.summary', 'Resumo')}
        </CardTitle>
        <p className="text-sm text-[#A0A3B1] leading-relaxed">
          {summary}
        </p>
      </Card>

      {/* Score bars */}
      {profile?.scores && (
        <Card variant="default">
          <CardTitle className="mb-4">{t('profiles.profileChart', 'Distribuição do Perfil')}</CardTitle>
          <ScoreBars scores={profile.scores} />
        </Card>
      )}

      {/* Strengths & Challenges */}
      <StrengthsAndChallenges type={type} />

      {/* Radar chart placeholder */}
      {profile?.scores && (
        <Card variant="default">
          <CardTitle className="mb-3">{t('profiles.profileChart', 'Gráfico de Perfil')}</CardTitle>
          <div className="flex justify-center">
            <RadarChart scores={profile.scores} size={260} showLabels animated />
          </div>
        </Card>
      )}

      {/* Role recommendations */}
      <RoleRecommendationsCard type={type} />

      {/* Work style */}
      <WorkStyleCard type={type} />

      {/* Communication tips */}
      <CommunicationCard type={type} />
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ userId }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const assessments = await getAssessmentsByUser(userId);
        const completed = assessments.filter(
          (a) => a.status === 'analyzed' || a.status === 'submitted' || a.status === 'completed'
        );
        setHistory(completed);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="py-6 space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-[#242736] rounded-xl" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#242736] border border-[#2D3047] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-7 h-7">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#F7F8FC]">
            {t('profile.history.empty', 'Nenhuma avaliação concluída ainda')}
          </p>
          <p className="text-xs text-[#A0A3B1]">
            {t('profile.history.emptyHint', 'Complete sua primeira avaliação para ver seu histórico')}
          </p>
        </div>
        <Link to="/student/assessment/new">
          <Button variant="outline" size="sm">
            {t('assessment.start', 'Iniciar Avaliação')}
          </Button>
        </Link>
      </div>
    );
  }

  const chartHistory = history
    .filter((a) => a.profile?.dominantProfile)
    .map((a) => ({
      moduleTitle: a.moduleName || t('assessment.title', 'Avaliação DISC'),
      completedAt: a.submittedAt,
      scores: a.profile?.scores ?? {},
      dominantProfile: a.profile?.dominantProfile,
    }));

  return (
    <div className="py-4 space-y-3">
      {/* Evolution chart */}
      {chartHistory.length > 0 && (
        <Card variant="default">
          <CardTitle className="mb-3">
            {t('report.evolution', 'Evolução')}
          </CardTitle>
          <EvolutionChart history={chartHistory} />
        </Card>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <h3 className="text-sm font-heading font-semibold text-[#A0A3B1] uppercase tracking-wider">
          {t('assessment.history', 'Histórico de Avaliações')}
        </h3>
        {history.map((assessment) => {
          const type = assessment?.profile?.dominantProfile ?? assessment?.profile?.primaryType ?? 'D';
          const colors = PROFILE_COLORS[type] ?? PROFILE_COLORS.D;
          const rawDate = assessment?.submittedAt?.toDate?.()
            ?? (assessment?.submittedAt ? new Date(assessment.submittedAt) : null);
          const dateStr = rawDate && !isNaN(rawDate)
            ? rawDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

          return (
            <div
              key={assessment.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#242736] border border-[#2D3047]"
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-heading font-black flex-shrink-0 border',
                  colors.bg,
                  colors.border,
                  colors.text
                )}
              >
                {type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F7F8FC] truncate">
                  {assessment?.moduleName ?? t('assessment.title', 'Avaliação DISC')}
                </p>
                <p className="text-xs text-[#A0A3B1]">
                  {t('assessment.completedOn', 'Concluída em')} {dateStr}
                </p>
              </div>
              <ProfileBadge type={type} size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main MyProfile Page ──────────────────────────────────────────────────────

/**
 * MyProfile — student profile view
 * Route: /student/profile
 */
export default function MyProfile() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentProfile, setProfile, loading: profileLoading } = useProfileStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [initialLoading, setInitialLoading] = useState(!currentProfile);

  // Load profile from Firestore if not in store
  useEffect(() => {
    if (currentProfile || !user?.uid) {
      setInitialLoading(false);
      return;
    }

    const load = async () => {
      try {
        const profile = await getProfile(user.uid);
        if (profile) setProfile(profile);
      } catch {
        // Silently fail — user will see no-profile state
      } finally {
        setInitialLoading(false);
      }
    };

    load();
  }, [user?.uid, currentProfile, setProfile]);

  const displayName = user?.displayName ?? t('auth.name', 'Estudante');

  const tabs = [
    { id: 'profile', label: t('navigation.profile', 'Perfil') },
    { id: 'history', label: t('assessment.history', 'Histórico') },
  ];

  if (initialLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-24 h-24 rounded-3xl bg-[#242736]" />
          <div className="h-4 w-32 bg-[#242736] rounded-full" />
          <div className="h-3 w-48 bg-[#2D3047] rounded-full" />
        </div>
        <div className="h-10 bg-[#242736] rounded-xl" />
        <div className="h-48 bg-[#242736] rounded-2xl" />
      </div>
    );
  }

  if (!currentProfile) {
    return <NoProfileState />;
  }

  return (
    <div className="max-w-lg mx-auto space-y-1 animate-fade-in">
      {/* Header */}
      <ProfileHeader profile={currentProfile} userName={displayName} />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileTab profile={currentProfile} />}
      {activeTab === 'history' && <HistoryTab userId={user?.uid} />}
    </div>
  );
}
