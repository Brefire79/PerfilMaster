import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import ProgressRing from '@/components/ui/ProgressRing.jsx';
import ProfileBadge from '@/components/profile/ProfileBadge.jsx';
import GroupPieChart from '@/components/profile/GroupPieChart.jsx';
import GroupReportCard from '@/components/profile/GroupReportCard.jsx';
import TherapyAlert from '@/components/profile/TherapyAlert.jsx';

import { useGroupReport } from '@/hooks/useGroupReport.js';
import { getGroupColor } from '@/utils/groupColors.js';
import { exportReportAsPDF } from '@/utils/pdfExport.js';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante',  hex: '#EF4444', lightHex: '#FED7D7', bgClass: 'bg-[#EF4444]/10', borderClass: 'border-[#EF4444]/30', textClass: 'text-[#EF4444]' },
  I: { name: 'Influente',  hex: '#F59E0B', lightHex: '#FEFCBF', bgClass: 'bg-[#F59E0B]/10', borderClass: 'border-[#F59E0B]/30', textClass: 'text-[#F59E0B]' },
  S: { name: 'Estável',    hex: '#22C55E', lightHex: '#C6F6D5', bgClass: 'bg-[#22C55E]/10', borderClass: 'border-[#22C55E]/30', textClass: 'text-[#22C55E]' },
  C: { name: 'Analítico',  hex: '#6366F1', lightHex: '#BEE3F8', bgClass: 'bg-[#6366F1]/10', borderClass: 'border-[#6366F1]/30', textClass: 'text-[#6366F1]' },
};
const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'D',   label: 'Dominante' },
  { key: 'I',   label: 'Influente' },
  { key: 'S',   label: 'Estável' },
  { key: 'C',   label: 'Analítico' },
];

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-[#242736] animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, children }) {
  return (
    <Card variant="default">
      <div className="flex flex-col items-center gap-2 py-1 text-center">
        <div className="flex items-center justify-center">{children}</div>
        <p className="text-xs text-[#A0A3B1] leading-snug">{label}</p>
      </div>
    </Card>
  );
}

// ─── Score bar (inline for member card) ──────────────────────────────────────
function MiniScoreBar({ profileKey, value }) {
  const conf = PROFILE_CONFIG[profileKey];
  const pct  = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold w-3 flex-shrink-0" style={{ color: conf.hex }}>
        {profileKey}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[#2D3047] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: conf.hex }}
        />
      </div>
      <span className="text-[10px] text-[#A0A3B1] w-6 text-right flex-shrink-0">
        {pct}
      </span>
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ user, profile, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const conf = profile?.dominantProfile ? PROFILE_CONFIG[profile.dominantProfile] : null;
  const displayName = user.displayName || user.name || user.email || 'Participante';

  if (!profile?.dominantProfile) {
    return (
      <Card variant="default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2D3047] flex items-center justify-center flex-shrink-0">
            <span className="text-[#A0A3B1] text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#F7F8FC] truncate">{displayName}</p>
            <p className="text-xs text-[#A0A3B1] truncate">{user.email}</p>
          </div>
          <span className="text-xs text-[#A0A3B1] bg-[#2D3047] px-2 py-1 rounded-lg flex-shrink-0">
            Pendente
          </span>
        </div>
      </Card>
    );
  }

  const scores    = profile.scores || {};
  const aiSummary = profile.aiSummary || {};

  return (
    <Card variant="default" className="transition-all duration-200">
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ backgroundColor: conf.lightHex, borderColor: conf.hex }}
          >
            <span style={{ color: conf.hex, fontSize: 16, fontWeight: 700 }}>
              {profile.dominantProfile}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#F7F8FC] truncate">{displayName}</p>
            <p className="text-xs text-[#A0A3B1] truncate">{user.email}</p>
          </div>
          {isAdmin && profile.therapyIndicator?.flagged && (
            <TherapyAlert therapyIndicator={profile.therapyIndicator} userName={displayName} />
          )}
          <span
            className={clsx(
              'text-xs font-bold px-2 py-0.5 rounded-md border flex-shrink-0',
              conf.bgClass, conf.borderClass, conf.textClass
            )}
          >
            {profile.dominantProfile}
          </span>
        </div>

        {/* Score bars */}
        <div className="space-y-1.5">
          {PROFILE_ORDER.map((k) => (
            <MiniScoreBar key={k} profileKey={k} value={scores[k] ?? 0} />
          ))}
        </div>

        {/* Expander toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between text-xs text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors py-1"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={clsx('w-4 h-4 transition-transform duration-200', expanded && 'rotate-180')}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Expandable detail */}
        {expanded && (
          <div className="space-y-3 pt-1 border-t border-[#2D3047]">
            {aiSummary.strengths?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#22C55E] mb-1.5">
                  Pontos Fortes
                </p>
                <ul className="space-y-1">
                  {aiSummary.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[#A0A3B1]">
                      <span className="text-[#22C55E] mt-0.5 flex-shrink-0">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiSummary.challenges?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#EF4444] mb-1.5">
                  Desafios
                </p>
                <ul className="space-y-1">
                  {aiSummary.challenges.slice(0, 2).map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[#A0A3B1]">
                      <span className="text-[#EF4444] mt-0.5 flex-shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(aiSummary.roleRecommendation || aiSummary.careerRecommendation) && (
              <div className="bg-[#2D3047]/60 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#6366F1] mb-1">
                  Papel recomendado
                </p>
                <p className="text-xs text-[#A0A3B1] leading-relaxed">
                  {aiSummary.roleRecommendation || aiSummary.careerRecommendation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── AI Insights Section ──────────────────────────────────────────────────────
function AIInsightsSection({ report }) {
  if (!report?.aiInsight) return null;

  const paragraphs = report.aiInsight
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const collaborationTips = report.collaborationTips || [];
  const conflictRisks     = report.conflictRisks     || [];
  const recommendedRoles  = report.recommendedRoles  || {};
  const teamDynamics      = report.teamDynamics       || '';

  const roleLabels = {
    Leadership: 'Liderança',
    Execution:  'Execução',
    Creativity: 'Criatividade',
    Quality:    'Qualidade',
  };

  return (
    <section aria-labelledby="ai-insights-heading">
      <h2
        id="ai-insights-heading"
        className="text-base font-heading font-semibold text-[#F7F8FC] mb-4 flex items-center gap-2"
      >
        <span aria-hidden="true">✨</span>
        Insights de IA
      </h2>

      <div
        className="rounded-2xl bg-[#242736] border border-[#6366F1]/30 overflow-hidden"
        style={{ borderLeft: '4px solid #6366F1' }}
      >
        <div className="p-5 space-y-5">
          {/* Main insight text */}
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-[#A0A3B1] leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Team dynamics */}
          {teamDynamics && (
            <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6366F1] mb-2">
                Dinâmica da equipe
              </p>
              <p className="text-sm text-[#A0A3B1] leading-relaxed">{teamDynamics}</p>
            </div>
          )}

          {/* Collaboration tips */}
          {collaborationTips.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#22C55E] mb-3">
                Dicas de colaboração
              </p>
              <ul className="space-y-2">
                {collaborationTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#A0A3B1]">
                    <span className="text-[#22C55E] flex-shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflict risks */}
          {conflictRisks.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3">
                Riscos de conflito
              </p>
              <div className="space-y-2">
                {conflictRisks.map((risk, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-sm text-amber-300 leading-relaxed">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended roles grid */}
          {Object.keys(recommendedRoles).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#A0A3B1] mb-3">
                Papéis recomendados por área
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(recommendedRoles).map(([role, names]) => (
                  <div
                    key={role}
                    className="bg-[#2D3047]/60 rounded-xl p-3 border border-[#2D3047]"
                  >
                    <p className="text-xs font-bold text-[#6366F1] mb-1.5">
                      {roleLabels[role] || role}
                    </p>
                    <p className="text-xs text-[#A0A3B1] leading-relaxed">
                      {Array.isArray(names) ? names.join(', ') : names}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Profile Distribution Cards ───────────────────────────────────────────────
function ProfileDistributionCards({ profilesArray, distribution, members, activeFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
      {PROFILE_ORDER.map((key) => {
        const conf      = PROFILE_CONFIG[key];
        const count     = profilesArray.filter((p) => p.dominantProfile === key).length;
        const memberIds = profilesArray
          .filter((p) => p.dominantProfile === key)
          .map((p) => {
            const m = members.find((u) => (u.id || u.uid) === (p.uid || p.id));
            return m?.displayName || m?.name || m?.email || 'Participante';
          })
          .slice(0, 2);

        const isActive = activeFilter === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(isActive ? 'all' : key)}
            className={clsx(
              'text-left rounded-2xl border p-4 transition-all duration-150',
              isActive
                ? `${conf.bgClass} ${conf.borderClass}`
                : 'bg-[#242736] border-[#2D3047] hover:border-[#6366F1]/30'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-lg font-bold"
                style={{ color: conf.hex }}
              >
                {key}
              </span>
              <span className="text-xs text-[#A0A3B1]">— {conf.name}</span>
            </div>
            <p className="text-2xl font-bold text-[#F7F8FC] mb-1">
              {count}
              <span className="text-sm font-normal text-[#A0A3B1] ml-1">
                {count === 1 ? 'membro' : 'membros'}
              </span>
            </p>
            {distribution[key] > 0 && (
              <p className="text-xs" style={{ color: conf.hex }}>
                {distribution[key]}% do grupo
              </p>
            )}
            {memberIds.length > 0 && (
              <p className="text-[10px] text-[#A0A3B1] mt-1.5 truncate">
                {memberIds.join(', ')}
                {count > 2 ? ` +${count - 2}` : ''}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty state CTA ──────────────────────────────────────────────────────────
function EmptyProfilesCTA({ groupId }) {
  const navigate = useNavigate();
  return (
    <Card variant="accent">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
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
            Nenhuma avaliação concluída
          </h3>
          <p className="text-sm text-[#A0A3B1] mt-1 max-w-md">
            Os membros precisam completar a avaliação DISC para gerar relatórios.
            Envie o link de convite para o grupo.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate(`/admin/groups/${groupId}`)}
        >
          Gerenciar grupo
        </Button>
      </div>
    </Card>
  );
}

// ─── PDF Export Container ─────────────────────────────────────────────────────
function PDFExportContainer({ group, report, profilesArray, members, distribution }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const completedProfiles = profilesArray.filter((p) => p.dominantProfile);

  return (
    <div
      id="pdf-report-content"
      className="pdf-mode"
      style={{
        position:   'absolute',
        left:       '-9999px',
        top:        0,
        width:      '794px',
        background: '#FFFFFF',
        padding:    '32px',
        fontFamily: "'DM Sans', sans-serif",
        color:      '#1A202C',
      }}
      aria-hidden="true"
    >
      {/* PDF Title */}
      <div style={{ marginBottom: 32, borderBottom: '2px solid #E2E8F0', paddingBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F172A' }}>
          Relatório de Grupo — ProfileAI
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: '#64748B' }}>
          {group?.name || 'Grupo'}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
          Gerado em {today}
          {report?.generatedAt
            ? ` • Análise IA: ${new Date(report.generatedAt).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
      </div>

      {/* Distribution summary */}
      {completedProfiles.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
            Distribuição de Perfis
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {PROFILE_ORDER.map((key) => {
              const conf  = PROFILE_CONFIG[key];
              const count = completedProfiles.filter((p) => p.dominantProfile === key).length;
              const pct   = distribution[key] || 0;
              return (
                <div
                  key={key}
                  style={{
                    background:   `${conf.lightHex}`,
                    border:       `1px solid ${conf.hex}`,
                    borderRadius: 8,
                    padding:      '10px 12px',
                    textAlign:    'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: conf.hex }}>
                    {key}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#1A202C' }}>
                    {count} {count === 1 ? 'membro' : 'membros'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
                    {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Insights text (simplified for PDF) */}
      {report?.aiInsight && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
            Insights de IA
          </h2>
          <div style={{ background: '#F8FAFC', borderLeft: '4px solid #6366F1', borderRadius: 6, padding: '12px 16px' }}>
            {report.aiInsight.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ margin: '0 0 8px', fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Member cards */}
      {completedProfiles.length > 0 && (
        <div>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
            Perfis Individuais
          </h2>
          {completedProfiles.map((profile) => {
            const uid  = profile.uid || profile.id;
            const user = members.find((u) => (u.id || u.uid) === uid) || { email: uid };
            return (
              <GroupReportCard
                key={uid}
                user={user}
                profile={profile}
                isAdmin={false}
                showTherapy={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main GroupReport page ─────────────────────────────────────────────────────
export default function GroupReport() {
  const { id: groupId } = useParams();
  const { t }           = useTranslation();
  const navigate        = useNavigate();

  const {
    loading,
    generating,
    error,
    group,
    members,
    profiles,
    profilesArray,
    completedProfiles,
    report,
    distribution,
    dominantProfile,
    completionRate,
    lastAssessmentDate,
    canGenerate,
    loadReport,
    generateInsights,
  } = useGroupReport(groupId);

  const [activeFilter, setActiveFilter] = useState('all');
  const [exporting,   setExporting]     = useState(false);
  const [shareToast,  setShareToast]    = useState(false);

  useEffect(() => {
    if (groupId) loadReport();
  }, [groupId, loadReport]);

  // ─── Filtered member list ──────────────────────────────────────────────────
  const filteredMembers = members.filter((user) => {
    if (activeFilter === 'all') return true;
    const uid     = user.id || user.uid;
    const profile = profiles[uid];
    return profile?.dominantProfile === activeFilter;
  });

  // ─── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const filename = `relatorio-${group?.name?.replace(/\s+/g, '-').toLowerCase() || 'grupo'}.pdf`;
      await exportReportAsPDF('pdf-report-content', filename);
    } finally {
      setExporting(false);
    }
  }, [group]);

  // ─── Share link ────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  }, []);

  const groupColor = getGroupColor(groupId || '');

  const generatedDateStr = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const lastAssessmentStr = lastAssessmentDate
    ? lastAssessmentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading && !group) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error && !group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.8} className="w-7 h-7" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-base font-heading font-semibold text-[#F7F8FC]">Erro ao carregar</h2>
          <p className="text-sm text-[#A0A3B1] mt-1">{error}</p>
        </div>
        <Button variant="secondary" size="md" onClick={() => loadReport()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/admin/reports')}
        className="flex items-center gap-2 text-sm text-[#A0A3B1] hover:text-[#F7F8FC] transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar para relatórios
      </button>

      {/* ── Report Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: groupColor.primary }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-heading font-bold text-[#F7F8FC] truncate">
              {group?.name || t('groupReport.title', 'Relatório do Grupo')}
            </h1>
            <p className="text-sm text-[#A0A3B1] mt-0.5">
              {generatedDateStr
                ? `Análise IA gerada em ${generatedDateStr}`
                : 'Relatório não gerado'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate insights */}
          <div className="relative group/gentooltip">
            <Button
              variant="primary"
              size="sm"
              loading={generating}
              disabled={!canGenerate || generating}
              onClick={generateInsights}
              leftIcon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              }
            >
              {generating ? 'Gerando...' : 'Gerar Insight IA'}
            </Button>
            {!canGenerate && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1A1D2E] border border-[#2D3047] rounded-xl text-xs text-[#A0A3B1] whitespace-nowrap opacity-0 group-hover/gentooltip:opacity-100 pointer-events-none transition-opacity shadow-lg z-10">
                Mínimo de 2 avaliações concluídas
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            onClick={handleExportPDF}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          >
            Exportar PDF
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              leftIcon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              }
            >
              Compartilhar
            </Button>
            {shareToast && (
              <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-[#22C55E] rounded-xl text-xs text-white whitespace-nowrap shadow-lg z-10 animate-fade-in">
                Link copiado!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} className="w-5 h-5 flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* ── Overview Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total de membros">
          <span className="text-2xl font-bold text-[#F7F8FC]">
            {members.length.toLocaleString('pt-BR')}
          </span>
        </StatCard>

        <StatCard label="Avaliações concluídas">
          <ProgressRing
            value={completionRate}
            size={56}
            strokeWidth={5}
            color="#6366F1"
            sublabel="concluído"
          />
        </StatCard>

        <StatCard label="Perfil dominante do grupo">
          {dominantProfile ? (
            <ProfileBadge profile={dominantProfile} size="sm" showLabel={false} />
          ) : (
            <span className="text-sm text-[#A0A3B1]">—</span>
          )}
        </StatCard>

        <StatCard label="Última avaliação">
          <span className="text-sm font-medium text-[#F7F8FC] text-center leading-snug">
            {lastAssessmentStr || '—'}
          </span>
        </StatCard>
      </div>

      {/* ── No profiles CTA ───────────────────────────────────────────────── */}
      {completedProfiles.length === 0 && <EmptyProfilesCTA groupId={groupId} />}

      {/* ── Distribution Section ──────────────────────────────────────────── */}
      {completedProfiles.length > 0 && (
        <section aria-labelledby="distribution-heading">
          <h2
            id="distribution-heading"
            className="text-base font-heading font-semibold text-[#F7F8FC] mb-4"
          >
            Distribuição de Perfis
          </h2>
          <Card variant="default">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-shrink-0 flex justify-center" style={{ minWidth: 240 }}>
                <GroupPieChart
                  distribution={distribution}
                  profiles={completedProfiles}
                  onFilterByProfile={(key) =>
                    setActiveFilter((prev) => (prev === key ? 'all' : key))
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <ProfileDistributionCards
                  profilesArray={completedProfiles}
                  distribution={distribution}
                  members={members}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      {report?.aiInsight && <AIInsightsSection report={report} />}

      {/* ── Individual Profiles ───────────────────────────────────────────── */}
      {members.length > 0 && (
        <section aria-labelledby="individual-profiles-heading">
          <h2
            id="individual-profiles-heading"
            className="text-base font-heading font-semibold text-[#F7F8FC] mb-4"
          >
            Perfis Individuais
          </h2>

          {/* Filter bar */}
          <div
            role="tablist"
            aria-label="Filtrar por perfil"
            className="flex items-center gap-2 flex-wrap mb-5"
          >
            {FILTERS.map(({ key, label }) => {
              const isActive = activeFilter === key;
              const conf     = key !== 'all' ? PROFILE_CONFIG[key] : null;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 border',
                    isActive
                      ? 'bg-[#6366F1] border-[#6366F1] text-white'
                      : 'bg-[#242736] border-[#2D3047] text-[#A0A3B1] hover:text-[#F7F8FC] hover:border-[#6366F1]/40'
                  )}
                >
                  {conf && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: conf.hex }}
                      aria-hidden="true"
                    />
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Member grid */}
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-[#A0A3B1] py-6 text-center">
              Nenhum membro encontrado com este filtro.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMembers.map((user) => {
                const uid     = user.id || user.uid;
                const profile = profiles[uid] || null;
                return (
                  <MemberCard
                    key={uid}
                    user={user}
                    profile={profile}
                    isAdmin
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Hidden PDF container ──────────────────────────────────────────── */}
      <PDFExportContainer
        group={group}
        report={report}
        profilesArray={profilesArray}
        members={members}
        distribution={distribution}
      />
    </div>
  );
}
