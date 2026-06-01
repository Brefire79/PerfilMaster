import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore.js';
import Card, { CardTitle, CardDescription } from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Button from '@/components/ui/Button.jsx';
import clsx from 'clsx';
import { getGroupsByAdmin, getUsersByGroup, getAssessmentsByGroup, getProfilesByGroup } from '@/firebase/firestore.js';

const ACTIVITY_PROFILE_COLORS = {
  D: '#EF4444', I: '#F59E0B', S: '#22C55E', C: '#6366F1',
};

function formatRelativeTime(date, t) {
  if (!date || isNaN(date)) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t('time.justNow', 'agora mesmo');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes, defaultValue: `há ${minutes} min` });
  if (hours < 24) return t('time.hoursAgo', { count: hours, defaultValue: `há ${hours}h` });
  if (days < 7) return t('time.daysAgo', { count: days, defaultValue: `há ${days}d` });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function ActivityRow({ event, t }) {
  const linkTo = event.groupId ? `/admin/groups/${event.groupId}` : '/admin/groups';
  let iconBg, iconColor, iconSvg, message;

  if (event.type === 'completed') {
    iconBg = 'bg-[#22C55E]/10'; iconColor = '#22C55E';
    iconSvg = <polyline points="20 6 9 17 4 12" />;
    message = (<><strong className="text-[#F7F8FC]">{event.name}</strong> {t('admin.activityCompleted', 'concluiu a avaliação')}</>);
  } else if (event.type === 'profile') {
    const c = ACTIVITY_PROFILE_COLORS[event.profile] || '#6366F1';
    iconBg = ''; iconColor = c;
    iconSvg = <circle cx="12" cy="12" r="9" />;
    message = (<>{t('admin.activityProfile', 'Perfil identificado')} <strong style={{ color: c }}>{event.profile}</strong>: <strong className="text-[#F7F8FC]">{event.name}</strong></>);
  } else if (event.type === 'joined') {
    iconBg = 'bg-[#6366F1]/10'; iconColor = '#6366F1';
    iconSvg = (<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></>);
    message = (<><strong className="text-[#F7F8FC]">{event.name}</strong> {t('admin.activityJoined', 'entrou em')} <strong className="text-[#F7F8FC]">{event.groupName}</strong></>);
  } else {
    iconBg = 'bg-[#F59E0B]/10'; iconColor = '#F59E0B';
    iconSvg = (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>);
    message = (<>{t('admin.activityGroupCreated', 'Grupo criado')}: <strong className="text-[#F7F8FC]">{event.name}</strong></>);
  }

  return (
    <Link to={linkTo} className="flex items-center gap-3 p-4 hover:bg-[#1A1D2E]/50 transition-colors">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}
           style={!iconBg ? { backgroundColor: `${iconColor}1A` } : undefined}>
        <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} className="w-4 h-4">
          {iconSvg}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#A0A3B1] truncate">{message}</p>
        <p className="text-xs text-[#A0A3B1] mt-0.5">{formatRelativeTime(event.timestamp, t)}</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="#4A4D6A" strokeWidth={2} className="w-4 h-4 flex-shrink-0" aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, trend, trendLabel, color = '#6366F1', loading = false }) {
  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#A0A3B1] uppercase tracking-wider mb-1">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-20 skeleton rounded-lg" />
          ) : (
            <p className="text-3xl font-heading font-bold text-[#F7F8FC] text-balance">{value}</p>
          )}
          {trendLabel && !loading && (
            <p className="text-xs text-[#A0A3B1] mt-1.5 flex items-center gap-1">
              {trend > 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} className="w-3 h-3">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              ) : trend < 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} className="w-3 h-3">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              ) : null}
              <span style={{ color: trend > 0 ? '#22C55E' : trend < 0 ? '#EF4444' : '#A0A3B1' }}>
                {trendLabel}
              </span>
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      {/* Decorative gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </Card>
  );
}

// ─── Quick Action Card ─────────────────────────────────────────────────────────
function QuickActionCard({ to, icon, label, description, color }) {
  return (
    <Link to={to} className="block">
      <Card
        variant="default"
        hoverable
        clickable
        className="h-full transition-all duration-200 hover:border-[#6366F1]/30"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#F7F8FC]">{label}</p>
            <p className="text-xs text-[#A0A3B1] mt-0.5">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalStudents: 0, totalGroups: 0, completedAssessments: 0, completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    const loadStats = async () => {
      setLoading(true);
      try {
        const groups = await getGroupsByAdmin(user.uid);
        if (cancelled) return;
        let totalStudents = 0;
        let completedAssessments = 0;
        const allEvents = [];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        await Promise.all(
          groups.map(async (g) => {
            const [members, assessments, profiles] = await Promise.all([
              getUsersByGroup(g.id),
              getAssessmentsByGroup(g.id),
              getProfilesByGroup(g.id),
            ]);
            totalStudents += members.length;
            const completedUids = new Set(
              assessments
                .filter((a) => ['completed', 'analyzed', 'submitted'].includes(a.status))
                .map((a) => a.uid)
            );
            completedAssessments += completedUids.size;

            const memberMap = Object.fromEntries(
              members.map((m) => [m.uid || m.id, m.displayName || m.name || m.email || 'Aluno'])
            );

            for (const a of assessments) {
              if (['submitted', 'analyzed', 'completed'].includes(a.status) && a.submittedAt) {
                const ts = a.submittedAt?.toDate?.() ?? (a.submittedAt?.raw ? new Date(a.submittedAt.raw) : null);
                if (ts && !isNaN(ts)) allEvents.push({
                  type: 'completed',
                  name: memberMap[a.uid] || 'Aluno',
                  groupName: g.name, groupId: g.id, uid: a.uid,
                  timestamp: ts,
                });
              }
            }
            for (const p of profiles) {
              if (p.dominantProfile && p.updatedAt) {
                const ts = p.updatedAt?.toDate?.() ?? (p.updatedAt?.raw ? new Date(p.updatedAt.raw) : null);
                if (ts && !isNaN(ts)) allEvents.push({
                  type: 'profile', name: memberMap[p.uid] || 'Aluno',
                  profile: p.dominantProfile, groupName: g.name, groupId: g.id, uid: p.uid,
                  timestamp: ts,
                });
              }
            }
            for (const m of members) {
              const ts = m.createdAt?.toDate?.() ?? (m.createdAt?.raw ? new Date(m.createdAt.raw) : null);
              const created = ts && !isNaN(ts) ? ts.getTime() : 0;
              if (created > thirtyDaysAgo) {
                allEvents.push({
                  type: 'joined', name: m.displayName || m.name || m.email || 'Aluno',
                  groupName: g.name, groupId: g.id, uid: m.uid || m.id,
                  timestamp: ts,
                });
              }
            }
          })
        );

        for (const g of groups) {
          const ts = g.createdAt?.toDate?.() ?? (g.createdAt?.raw ? new Date(g.createdAt.raw) : null);
          const created = ts && !isNaN(ts) ? ts.getTime() : 0;
          if (created > thirtyDaysAgo) {
            allEvents.push({
              type: 'group', name: g.name, groupId: g.id,
              timestamp: ts,
            });
          }
        }

        const PRIORITY = { completed: 3, profile: 2, joined: 1, group: 0 };
        const dedupMap = new Map();
        for (const ev of allEvents) {
          if (!ev.uid) {
            dedupMap.set(`group-${ev.groupId}-${ev.timestamp.toDateString()}`, ev);
            continue;
          }
          const key = `${ev.uid}-${ev.timestamp.toDateString()}`;
          const existing = dedupMap.get(key);
          if (!existing || PRIORITY[ev.type] > PRIORITY[existing.type]) {
            dedupMap.set(key, ev);
          }
        }
        const sortedEvents = Array.from(dedupMap.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 8);

        if (!cancelled) {
          setStatsData({
            totalStudents,
            totalGroups: groups.length,
            completedAssessments,
            completionRate: totalStudents > 0
              ? Math.round((completedAssessments / totalStudents) * 100)
              : 0,
          });
          setRecentActivity(sortedEvents);
        }
      } catch (err) {
        console.error('[AdminDashboard] Failed to load stats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStats();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const stats = [
    {
      key: 'totalStudents',
      label: t('admin.totalStudents'),
      value: String(statsData.totalStudents),
      color: '#6366F1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      key: 'totalGroups',
      label: t('admin.totalGroups'),
      value: String(statsData.totalGroups),
      color: '#22C55E',
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
      key: 'totalAssessments',
      label: t('admin.totalAssessments'),
      value: String(statsData.completedAssessments),
      color: '#F59E0B',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      key: 'completionRate',
      label: t('admin.completionRate'),
      value: `${statsData.completionRate}%`,
      color: '#6366F1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      to: '/admin/groups',
      label: t('admin.createGroup'),
      description: t('admin.groups.create'),
      color: '#6366F1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="16" y1="11" x2="22" y2="11" />
        </svg>
      ),
    },
    {
      to: '/admin/students?invite=true',
      label: t('admin.inviteStudents'),
      description: t('admin.students.invite'),
      color: '#22C55E',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      to: '/admin/reports',
      label: t('admin.viewReports'),
      description: t('admin.reports.generate'),
      color: '#F59E0B',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      to: '/admin/modules',
      label: t('admin.manageModules'),
      description: t('admin.modules.create'),
      color: '#6366F1',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
  ];

  const displayName = user?.displayName?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC] text-balance">
            {t('admin.welcomeBack')}, {displayName} 👋
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-1">{t('admin.overview')}</p>
        </div>
        <Badge variant="accent" size="md" dot>
          Admin
        </Badge>
      </div>

      {/* Stats grid */}
      <section aria-label={t('admin.overview')}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              loading={loading}
            />
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label={t('admin.quickActions')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">
            {t('admin.quickActions')}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionCard key={action.to} {...action} />
          ))}
        </div>
      </section>

      {/* Recent activity placeholder */}
      <section aria-label={t('admin.recentActivity')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">
            {t('admin.recentActivity')}
          </h2>
        </div>
        <Card variant="default" bodyClassName="p-0">
          {loading ? (
            <div className="divide-y divide-[#2D3047]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-[#2D3047]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 rounded bg-[#2D3047]" />
                    <div className="h-2.5 w-20 rounded bg-[#2D3047]" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#242736] flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#A0A3B1" strokeWidth={1.5} className="w-6 h-6">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-[#A0A3B1] text-sm">{t('admin.noRecentActivity', 'Nenhuma atividade recente')}</p>
              <p className="text-[#A0A3B1] text-xs mt-1">
                {t('admin.noRecentActivityHint', 'Crie grupos e convide alunos para começar.')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2D3047]">
              {recentActivity.map((ev, i) => (
                <ActivityRow key={`${ev.type}-${ev.uid || ev.groupId}-${i}`} event={ev} t={t} />
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* DISC Profile legend */}
      <section aria-label={t('profiles.title')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">
            {t('profiles.subtitle')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['D', 'I', 'S', 'C'].map((type) => (
            <Card key={type} variant="default" className="text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center text-lg font-heading font-black"
                style={{
                  backgroundColor: `var(--color-${type})15`,
                  border: `1px solid var(--color-${type})30`,
                  color: `var(--color-${type})`,
                }}
              >
                {type}
              </div>
              <p className="text-xs font-medium text-[#F7F8FC]">
                {t(`profiles.${type}.name`)}
              </p>
              <p className="text-2xs text-[#A0A3B1] mt-1 leading-tight">
                {t(`profiles.${type}.tagline`)}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
