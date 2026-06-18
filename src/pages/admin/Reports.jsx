import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import ProgressRing from '@/components/ui/ProgressRing.jsx';
import PessoaRelatorioRow from '@/components/admin/PessoaRelatorioRow.jsx';

import useGroupStore from '@/store/groupStore.js';
import useAuthStore from '@/store/authStore.js';
import { useGroup } from '@/hooks/useGroup.js';
import { getGroupReportsByAdmin, getAssessmentsByGroup, getUsersByGroup, getPessoas } from '@/firebase/firestore.js';
import { getGroupColor } from '@/utils/groupColors.js';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante', hex: '#EF4444' },
  I: { name: 'Influente', hex: '#F59E0B' },
  S: { name: 'Estável',   hex: '#22C55E' },
  C: { name: 'Analítico', hex: '#6366F1' },
};
const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return (
    <div
      className={clsx('rounded-xl bg-[#242736] animate-pulse', className)}
      aria-hidden="true"
    />
  );
}

// ─── Mini donut SVG ───────────────────────────────────────────────────────────
function MiniDonut({ distribution = {} }) {
  const SIZE   = 48;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const RADIUS = 18;
  const CIRC   = 2 * Math.PI * RADIUS;
  const STROKE = 6;

  const data = PROFILE_ORDER
    .map((key) => ({ key, pct: distribution[key] || 0 }))
    .filter((d) => d.pct > 0);

  if (data.length === 0) {
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={CX} cy={CY} r={RADIUS} stroke="#2D3047" strokeWidth={STROKE} fill="none" />
      </svg>
    );
  }

  let offset = 0;
  const segments = data.map(({ key, pct }) => {
    const dash   = (pct / 100) * CIRC;
    const gap    = CIRC - dash;
    const rotate = -90 + (offset / 100) * 360;
    offset += pct;
    return { key, dash, gap, rotate };
  });

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Distribuição de perfis"
    >
      <circle cx={CX} cy={CY} r={RADIUS} stroke="#2D3047" strokeWidth={STROKE} fill="none" />
      {segments.map(({ key, dash, gap, rotate }) => (
        <circle
          key={key}
          cx={CX}
          cy={CY}
          r={RADIUS}
          stroke={PROFILE_CONFIG[key].hex}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={0}
          style={{ transform: `rotate(${rotate}deg)`, transformOrigin: `${CX}px ${CY}px` }}
        />
      ))}
    </svg>
  );
}

// ─── Group Report Card ────────────────────────────────────────────────────────
function GroupCard({ group, report, liveData, onGenerateAI, generating }) {
  const navigate    = useNavigate();
  const groupColor  = getGroupColor(group.id);
  const memberCount = group.memberIds?.length ?? 0;

  // Usa dados reais de assessments (liveData) se disponível, senão cai pro relatório salvo
  const completedCount = liveData?.completedCount ?? report?.completedCount ?? 0;
  const totalMembers   = liveData?.memberCount ?? report?.memberCount ?? memberCount;
  const completionRate = totalMembers > 0
    ? Math.round((completedCount / totalMembers) * 100)
    : 0;

  const reportDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  const dominantProfile = report?.dominantProfile || null;
  const distribution    = report?.distribution    || {};

  const canGenerate = (report?.completedCount ?? 0) >= 2 ||
    memberCount >= 2;

  return (
    <Card variant="default" hoverable>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0"
            style={{ backgroundColor: groupColor.primary }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-heading font-semibold text-[#F7F8FC] truncate">
              {group.name}
            </h3>
            <p className="text-xs text-[#A0A3B1] mt-0.5">
              {memberCount.toLocaleString('pt-BR')}{' '}
              {memberCount === 1 ? 'membro' : 'membros'}
            </p>
          </div>
          {/* Mini donut */}
          <MiniDonut distribution={distribution} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          {/* Completion ring */}
          <div className="flex items-center gap-2">
            <ProgressRing
              value={completionRate}
              size={40}
              strokeWidth={4}
              color="#6366F1"
            />
            <div>
              <p className="text-[10px] text-[#A0A3B1]">Concluídas</p>
              <p className="text-xs font-medium text-[#F7F8FC]">
                {completionRate}%
              </p>
            </div>
          </div>

          {/* Dominant profile */}
          {dominantProfile && (
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-bold"
                style={{ color: PROFILE_CONFIG[dominantProfile]?.hex }}
              >
                {dominantProfile}
              </span>
              <span className="text-xs text-[#A0A3B1]">
                {PROFILE_CONFIG[dominantProfile]?.name}
              </span>
            </div>
          )}

          {/* Last report date */}
          {reportDate && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-[#A0A3B1]">Último relatório</p>
              <p className="text-xs font-medium text-[#F7F8FC]">{reportDate}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#2D3047]">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => navigate(`/admin/groups/${group.id}`)}
          >
            Ver Relatório
          </Button>

          <div className="relative group/gentooltip flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={generating}
              disabled={generating}
              onClick={() => onGenerateAI(group.id)}
              leftIcon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              }
            >
              IA
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Stats overview row ───────────────────────────────────────────────────────
function OverviewStats({ groups, reports, liveStats = {} }) {
  const totalGroups      = groups.length;
  const totalMembers     = groups.reduce((s, g) => s + (g.memberIds?.length ?? 0), 0);
  // Usa dados reais de conclusão se disponíveis, senão usa os de relatórios salvos
  const totalCompleted   = Object.keys(liveStats).length > 0
    ? Object.values(liveStats).reduce((s, d) => s + (d.completedCount ?? 0), 0)
    : reports.reduce((s, r) => s + (r.completedCount ?? 0), 0);
  const totalReports     = reports.length;

  const statItems = [
    {
      label: 'Grupos ativos',
      value: totalGroups.toLocaleString('pt-BR'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Total de membros',
      value: totalMembers.toLocaleString('pt-BR'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      label: 'Avaliações concluídas',
      value: totalCompleted.toLocaleString('pt-BR'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    {
      label: 'Relatórios gerados',
      value: totalReports.toLocaleString('pt-BR'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {statItems.map(({ label, value, icon }) => (
        <Card key={label} variant="default">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center flex-shrink-0 text-[#6366F1]">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-[#F7F8FC] leading-none">{value}</p>
              <p className="text-xs text-[#A0A3B1] mt-0.5 leading-snug">{label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  return (
    <Card variant="accent">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366F1"
            strokeWidth={1.5}
            className="w-8 h-8"
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-heading font-semibold text-[#F7F8FC]">
            Nenhum grupo criado
          </h3>
          <p className="text-sm text-[#A0A3B1] mt-1 max-w-sm">
            Crie um grupo e convide membros para começar a gerar relatórios comportamentais.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/admin/groups')}
        >
          Criar primeiro grupo
        </Button>
      </div>
    </Card>
  );
}

// ─── Loading skeletons ────────────────────────────────────────────────────────
function LoadingSkeletons() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-10 w-full max-w-xs" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52" />)}
      </div>
    </div>
  );
}

// ─── Main Reports page ────────────────────────────────────────────────────────
export default function Reports() {
  const { t }              = useTranslation();
  const navigate           = useNavigate();
  const { groups, loading: groupsLoading } = useGroup();
  const { user }           = useAuthStore();

  const [reports,          setReports]         = useState([]);
  const [reportsLoading,   setReportsLoading]  = useState(false);
  const [generatingId,     setGeneratingId]    = useState(null);
  const [searchQuery,      setSearchQuery]     = useState('');
  // Dados reais de conclusão por grupo: { [groupId]: { completedCount, memberCount } }
  const [liveStats,        setLiveStats]       = useState({});
  // Relatórios individuais (pessoas com avaliação concluída) — Central de Pessoas
  const [pessoas,          setPessoas]         = useState([]);
  const [pessoasQuery,     setPessoasQuery]    = useState('');

  // Load reports + live assessment stats
  useEffect(() => {
    if (!user?.uid) return;
    setReportsLoading(true);

    getGroupReportsByAdmin(user.uid)
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));

    // Pessoas com avaliação concluída → relatórios individuais
    getPessoas(user.uid)
      .then(({ pessoas: lista }) => setPessoas(lista.filter((p) => p.diagnostico)))
      .catch(() => setPessoas([]));
  }, [user?.uid]);

  // Quando os grupos carregam, busca stats reais de conclusão
  useEffect(() => {
    if (!groups.length) return;
    const STATUS_DONE = new Set(['submitted', 'completed', 'analyzed']);

    Promise.all(
      groups.map(async (g) => {
        try {
          const [members, assessments] = await Promise.all([
            getUsersByGroup(g.id),
            getAssessmentsByGroup(g.id),
          ]);
          // Melhor status por usuário
          const bestByUid = {};
          for (const a of assessments) {
            if (!a.uid) continue;
            const cur = bestByUid[a.uid];
            const rank = { analyzed: 3, completed: 3, submitted: 2, in_progress: 1, pending: 0 };
            if (!cur || (rank[a.status] ?? -1) > (rank[cur] ?? -1)) {
              bestByUid[a.uid] = a.status;
            }
          }
          const memberCount = members.length;
          // Conta membros cujo melhor status é "done" — também cobre status do app_users
          const completedCount = members.filter((m) => {
            const uid = m.uid || m.id;
            const fromAssessment = bestByUid[uid];
            const fromUser = m.assessmentStatus;
            const isDone = (s) => STATUS_DONE.has(s);
            return isDone(fromAssessment) || isDone(fromUser);
          }).length;
          return { groupId: g.id, completedCount, memberCount };
        } catch {
          return { groupId: g.id, completedCount: 0, memberCount: 0 };
        }
      })
    ).then((results) => {
      const map = {};
      for (const r of results) map[r.groupId] = r;
      setLiveStats(map);
    });
  }, [groups]);

  // Build a map: groupId → report
  const reportsMap = useMemo(() => {
    const map = {};
    for (const r of reports) {
      map[r.groupId] = r;
    }
    return map;
  }, [reports]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  // Navigate to group report and trigger AI generation
  const handleGenerateAI = useCallback(
    (groupId) => {
      navigate(`/admin/groups/${groupId}`);
    },
    [navigate]
  );

  const isLoading = groupsLoading || reportsLoading;

  if (isLoading && groups.length === 0) {
    return <LoadingSkeletons />;
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
            {t('admin.reports.title', 'Relatórios')}
          </h1>
          <p className="text-[#A0A3B1] text-sm mt-0.5">
            {t(
              'reports.subtitle',
              'Análises comportamentais e exportações por grupo'
            )}
          </p>
        </div>
      </div>

      {/* ── Overview Stats ────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <OverviewStats groups={groups} reports={reports} liveStats={liveStats} />
      )}

      {/* ── Search bar ───────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <div className="relative max-w-sm">
          <span
            className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#A0A3B1]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('reports.searchPlaceholder', 'Buscar grupo...')}
            className={clsx(
              'w-full h-10 pl-9 pr-4 text-sm rounded-xl',
              'bg-[#242736] border border-[#2D3047] text-[#F7F8FC] placeholder-[#A0A3B1]',
              'focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent',
              'transition-all duration-150'
            )}
            aria-label={t('reports.searchPlaceholder', 'Buscar grupo')}
          />
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {groups.length === 0 && !isLoading && <EmptyState />}

      {/* ── No results for search ────────────────────────────────────── */}
      {groups.length > 0 && filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#A0A3B1] text-sm">
            Nenhum grupo encontrado para{' '}
            <span className="text-[#F7F8FC]">"{searchQuery}"</span>.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[#6366F1] text-sm mt-2 hover:underline"
          >
            Limpar busca
          </button>
        </div>
      )}

      {/* ── Group Cards Grid ─────────────────────────────────────────── */}
      {filteredGroups.length > 0 && (
        <section aria-label={t('admin.groups.title', 'Grupos')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                report={reportsMap[group.id] || null}
                liveData={liveStats[group.id] || null}
                onGenerateAI={handleGenerateAI}
                generating={generatingId === group.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Relatórios individuais (Central de Pessoas) ───────────────── */}
      {pessoas.length > 0 && (
        <section aria-label="Relatórios individuais">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">
                Relatórios individuais
                <span className="text-[#A0A3B1] font-normal text-sm ml-2">({pessoas.length})</span>
              </h2>
              <p className="text-xs text-[#A0A3B1] mt-0.5">
                O número ao lado de cada pessoa indica quantas vezes ela foi avaliada. Pessoas com 2+ avaliações expandem o histórico com data e anotação.
              </p>
            </div>
            <div className="relative max-w-xs w-full sm:w-auto">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#A0A3B1]" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="search"
                value={pessoasQuery}
                onChange={(e) => setPessoasQuery(e.target.value)}
                placeholder="Buscar pessoa..."
                className="w-full h-9 pl-9 pr-4 text-sm rounded-xl bg-[#242736] border border-[#2D3047] text-[#F7F8FC] placeholder-[#A0A3B1] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
                aria-label="Buscar pessoa"
              />
            </div>
          </div>
          <Card variant="default" bodyClassName="p-0">
            <div className="divide-y divide-[#2D3047]">
              {pessoas
                .filter((p) => !pessoasQuery.trim() || (p.nome || '').toLowerCase().includes(pessoasQuery.toLowerCase().trim()))
                .map((p) => (
                  <PessoaRelatorioRow
                    key={p.id}
                    pessoa={p}
                    adminUid={user?.uid}
                    onNavigate={navigate}
                  />
                ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
