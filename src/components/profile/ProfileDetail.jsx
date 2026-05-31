import React, { useState } from 'react';
import clsx from 'clsx';
import ProfileBadge from '@/components/profile/ProfileBadge.jsx';
import TherapyAlert from '@/components/profile/TherapyAlert.jsx';
import RadarChart from '@/components/ui/RadarChart.jsx';
import Card from '@/components/ui/Card.jsx';

// ─── Profile color map ────────────────────────────────────────────────────────
const PROFILE_HEX = {
  D: '#EF4444',
  I: '#F59E0B',
  S: '#22C55E',
  C: '#6366F1',
};

const PROFILE_NAMES = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Analítico',
};

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ label, value, profileKey }) {
  const hex = PROFILE_HEX[profileKey] || '#6366F1';
  return (
    <div
      className="flex flex-col items-center px-3 py-1.5 rounded-xl border"
      style={{
        backgroundColor: `${hex}15`,
        borderColor: `${hex}30`,
      }}
    >
      <span className="text-xs font-bold" style={{ color: hex }}>{label}</span>
      <span className="text-base font-heading font-bold text-[#F7F8FC] tabular-nums">{value}</span>
    </div>
  );
}

// ─── Section with icon ────────────────────────────────────────────────────────
function SectionTitle({ children, icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && (
        <span className="text-base" aria-hidden="true">{icon}</span>
      )}
      <h3 className="text-sm font-heading font-semibold text-[#F7F8FC]">{children}</h3>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#2D3047] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#2D3047]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base" aria-hidden="true">{icon}</span>}
          <span className="text-sm font-semibold text-[#F7F8FC]">{title}</span>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={clsx('w-4 h-4 text-[#A0A3B1] transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[#2D3047]">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── List item with colored bullet ───────────────────────────────────────────
function BulletItem({ children, color = '#6366F1' }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[#A0A3B1] leading-relaxed">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {children}
    </li>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────
function InfoCard({ title, icon, children, accentColor }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: accentColor ? `${accentColor}08` : '#242736',
        borderColor: accentColor ? `${accentColor}25` : '#2D3047',
      }}
    >
      <p className="text-xs font-semibold text-[#A0A3B1] mb-1.5 flex items-center gap-1.5">
        {icon && <span aria-hidden="true">{icon}</span>}
        {title}
      </p>
      <p className="text-sm text-[#F7F8FC] leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * ProfileDetail — full behavioral profile card
 *
 * @param {object} profile — full profile object from Firestore
 * @param {boolean} isAdmin — shows admin-only fields (TherapyAlert)
 * @param {boolean} compact — condensed view
 */
export default function ProfileDetail({ profile, isAdmin = false, compact = false }) {
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[#A0A3B1] text-sm">Perfil não disponível.</p>
      </div>
    );
  }

  const {
    dominantProfile,
    dominantProfileName,
    secondaryProfile,
    secondaryProfileName,
    scores: rawScores,
    summary,
    strengths: rawStrengths,
    challenges: rawChallenges,
    roleRecommendation,
    workStyleRecommendation,
    teamBehavior,
    communicationTips,
    saboteurPatterns: rawSaboteurPatterns,
    derailmentRisks: rawDerailmentRisks,
    therapyIndicator,
    userName,
    displayName,
  } = profile;

  // DB can return null for JSONB arrays — normalize all array fields here
  const scores = rawScores ?? {};
  const strengths = Array.isArray(rawStrengths) ? rawStrengths : [];
  const challenges = Array.isArray(rawChallenges) ? rawChallenges : [];
  const saboteurPatterns = Array.isArray(rawSaboteurPatterns) ? rawSaboteurPatterns : [];
  const derailmentRisks = Array.isArray(rawDerailmentRisks) ? rawDerailmentRisks : [];

  const resolvedName = userName || displayName || profile.name || '';
  const hasScores = Object.values(scores).some((v) => v > 0);

  // ── Compact view ─────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ProfileBadge profile={dominantProfile} size="lg" showLabel={true} />
          <div className="flex-1 min-w-0">
            {resolvedName && (
              <p className="text-base font-semibold text-[#F7F8FC] truncate">{resolvedName}</p>
            )}
            <p className="text-sm text-[#A0A3B1]">
              Perfil {dominantProfileName || PROFILE_NAMES[dominantProfile] || dominantProfile}
              {secondaryProfile && ` · ${secondaryProfileName || PROFILE_NAMES[secondaryProfile] || secondaryProfile}`}
            </p>
            {hasScores && (
              <div className="flex gap-2 mt-2">
                {['D', 'I', 'S', 'C'].map((k) => (
                  <ScorePill key={k} label={k} value={scores[k] ?? 0} profileKey={k} />
                ))}
              </div>
            )}
          </div>
        </div>
        {summary && (
          <p className="text-sm text-[#A0A3B1] leading-relaxed line-clamp-3">{summary}</p>
        )}
        {isAdmin && therapyIndicator?.flagged && (
          <TherapyAlert therapyIndicator={therapyIndicator} userName={resolvedName} />
        )}
      </div>
    );
  }

  // ── Full view ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <ProfileBadge
          profile={dominantProfile}
          size="xl"
          scores={scores}
          showLabel={true}
          showBars={hasScores}
        />
        <div className="flex-1 min-w-0 space-y-2">
          {resolvedName && (
            <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">{resolvedName}</h2>
          )}
          <p className="text-sm text-[#A0A3B1]">
            Perfil primário:{' '}
            <span
              className="font-semibold"
              style={{ color: PROFILE_HEX[dominantProfile] }}
            >
              {dominantProfile} — {dominantProfileName || PROFILE_NAMES[dominantProfile] || dominantProfile}
            </span>
            {secondaryProfile && (
              <>
                {' '}· Secundário:{' '}
                <span
                  className="font-semibold"
                  style={{ color: PROFILE_HEX[secondaryProfile] }}
                >
                  {secondaryProfile} — {secondaryProfileName || PROFILE_NAMES[secondaryProfile] || secondaryProfile}
                </span>
              </>
            )}
          </p>
          {/* Score pills row — only when scores are available */}
          {hasScores ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {['D', 'I', 'S', 'C'].map((k) => (
                <ScorePill key={k} label={k} value={scores[k] ?? 0} profileKey={k} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#4A4D6A] mt-1 italic">
              Scores detalhados não disponíveis — perfil identificado via triagem inicial.
            </p>
          )}
          {/* Admin-only therapy alert */}
          {isAdmin && therapyIndicator?.flagged && (
            <div className="mt-2">
              <TherapyAlert therapyIndicator={therapyIndicator} userName={resolvedName} />
            </div>
          )}
        </div>
      </div>

      {/* ── Radar Chart — only when scores are available ─────────────────────── */}
      {hasScores && (
        <Card variant="default">
          <SectionTitle icon="📊">Mapa de Perfil</SectionTitle>
          <div className="flex justify-center">
            <RadarChart scores={scores} size={260} showLabels={true} animated={true} />
          </div>
        </Card>
      )}

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      {summary && (
        <Card variant="default">
          <SectionTitle icon="💡">Visão Geral</SectionTitle>
          <div className="space-y-3">
            {summary.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i} className="text-sm text-[#A0A3B1] leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      {/* ── Strengths & Challenges ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <Card variant="default">
            <SectionTitle icon="✅">Pontos Fortes</SectionTitle>
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <BulletItem key={i} color="#22C55E">{s}</BulletItem>
              ))}
            </ul>
          </Card>
        )}
        {challenges.length > 0 && (
          <Card variant="default">
            <SectionTitle icon="⚠️">Desafios</SectionTitle>
            <ul className="space-y-1.5">
              {challenges.map((c, i) => (
                <BulletItem key={i} color="#F59E0B">{c}</BulletItem>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* ── Recommendations grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roleRecommendation && (
          <InfoCard title="Papéis Recomendados" icon="🎯" accentColor="#6366F1">
            {roleRecommendation}
          </InfoCard>
        )}
        {workStyleRecommendation && (
          <InfoCard title="Estilo de Trabalho" icon="⚙️" accentColor="#6366F1">
            {workStyleRecommendation}
          </InfoCard>
        )}
        {teamBehavior && (
          <InfoCard title="Comportamento em Equipe" icon="🤝" accentColor="#22C55E">
            {teamBehavior}
          </InfoCard>
        )}
        {communicationTips && (
          <InfoCard title="Dicas de Comunicação" icon="💬" accentColor="#F59E0B">
            {communicationTips}
          </InfoCard>
        )}
      </div>

      {/* ── Collapsible: saboteurs ───────────────────────────────────────────── */}
      {saboteurPatterns.length > 0 && (
        <CollapsibleSection title="Padrões Sabotadores" icon="🔍">
          <ul className="space-y-1.5 pt-2">
            {saboteurPatterns.map((p, i) => (
              <BulletItem key={i} color="#EF4444">{p}</BulletItem>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* ── Collapsible: derailment risks ────────────────────────────────────── */}
      {derailmentRisks.length > 0 && (
        <CollapsibleSection title="Riscos de Derailment" icon="🚨">
          <ul className="space-y-1.5 pt-2">
            {derailmentRisks.map((r, i) => (
              <BulletItem key={i} color="#F59E0B">{r}</BulletItem>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* ── Extra fields present in buildProfile (richer) ───────────────────── */}
      {(profile.leadershipStyle || profile.conflictStyle) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.leadershipStyle && (
            <InfoCard title="Estilo de Liderança" icon="👑" accentColor="#8B5CF6">
              {profile.leadershipStyle}
            </InfoCard>
          )}
          {profile.conflictStyle && (
            <InfoCard title="Gestão de Conflitos" icon="⚡" accentColor="#EF4444">
              {profile.conflictStyle}
            </InfoCard>
          )}
        </div>
      )}

      {profile.evolutionNotes && (
        <Card variant="accent">
          <SectionTitle icon="📈">Notas de Evolução</SectionTitle>
          <p className="text-sm text-[#A0A3B1] leading-relaxed">{profile.evolutionNotes}</p>
        </Card>
      )}

      {(profile.motivators?.length > 0 || profile.stressors?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.motivators?.length > 0 && (
            <Card variant="default">
              <SectionTitle icon="🔋">Motivadores</SectionTitle>
              <ul className="space-y-1.5">
                {profile.motivators.map((m, i) => (
                  <BulletItem key={i} color="#22C55E">{m}</BulletItem>
                ))}
              </ul>
            </Card>
          )}
          {profile.stressors?.length > 0 && (
            <Card variant="default">
              <SectionTitle icon="🌡️">Estressores</SectionTitle>
              <ul className="space-y-1.5">
                {profile.stressors.map((s, i) => (
                  <BulletItem key={i} color="#EF4444">{s}</BulletItem>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ── ADMIN STRATEGY PANEL — exclusivo do instrutor ───────────────────── */}
      {isAdmin && profile.adminStrategy && (
        <AdminStrategyPanel strategy={profile.adminStrategy} />
      )}

    </div>
  );
}

// ─── Admin Strategy Panel ─────────────────────────────────────────────────────
function AdminStrategyPanel({ strategy }) {
  const {
    executiveBrief, approachStyle, coachingQuestions = [], feedbackApproach,
    motivationLevers = [], redFlags = [], nextAssessmentFocus, actionPlan = [],
    compatibilityMap = {}, delegationGuide, stretchAreas = [],
  } = strategy || {};

  const PROFILE_LABELS = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6366F1]/15 to-[#8B5CF6]/10 border border-[#6366F1]/30">
        <span className="text-lg" aria-hidden="true">🎯</span>
        <div>
          <h3 className="text-sm font-heading font-bold text-[#F7F8FC]">
            Painel Estratégico do Instrutor
          </h3>
          <p className="text-xs text-[#A0A3B1] mt-0.5">
            Conteúdo confidencial — uso exclusivo do instrutor para conduzir 1:1 e planejar evolução
          </p>
        </div>
      </div>

      {executiveBrief && (
        <Card variant="accent">
          <SectionTitle icon="📋">Briefing Executivo</SectionTitle>
          <div className="space-y-2.5">
            {executiveBrief.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} className="text-sm text-[#F7F8FC] leading-relaxed">{p}</p>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {approachStyle && (
          <InfoCard title="Como Abordar (1:1)" icon="🤝" accentColor="#6366F1">{approachStyle}</InfoCard>
        )}
        {feedbackApproach && (
          <InfoCard title="Como Dar Feedback" icon="💬" accentColor="#6366F1">{feedbackApproach}</InfoCard>
        )}
      </div>

      {coachingQuestions.length > 0 && (
        <Card variant="default">
          <SectionTitle icon="❓">Perguntas para a Próxima Conversa</SectionTitle>
          <ol className="space-y-2.5">
            {coachingQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#F7F8FC] leading-relaxed">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6366F1]/20 text-[#6366F1] text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actionPlan.length > 0 && (
          <Card variant="default">
            <SectionTitle icon="🚀">Plano de Ação</SectionTitle>
            <ul className="space-y-1.5">
              {actionPlan.map((a, i) => (<BulletItem key={i} color="#22C55E">{a}</BulletItem>))}
            </ul>
          </Card>
        )}
        {motivationLevers.length > 0 && (
          <Card variant="default">
            <SectionTitle icon="⚡">Alavancas Motivacionais</SectionTitle>
            <ul className="space-y-1.5">
              {motivationLevers.map((m, i) => (<BulletItem key={i} color="#F59E0B">{m}</BulletItem>))}
            </ul>
          </Card>
        )}
      </div>

      {redFlags.length > 0 && (
        <Card variant="default" className="border-[#EF4444]/30 bg-[#EF4444]/5">
          <SectionTitle icon="🚨">Sinais de Alerta para Monitorar</SectionTitle>
          <ul className="space-y-1.5">
            {redFlags.map((f, i) => (<BulletItem key={i} color="#EF4444">{f}</BulletItem>))}
          </ul>
        </Card>
      )}

      {Object.keys(compatibilityMap).length > 0 && (
        <Card variant="default">
          <SectionTitle icon="🔗">Compatibilidade com Outros Perfis</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['D', 'I', 'S', 'C'].map((p) => (
              compatibilityMap[p] ? (
                <div key={p}
                     className="rounded-lg p-3 border"
                     style={{
                       backgroundColor: `${PROFILE_HEX[p]}08`,
                       borderColor: `${PROFILE_HEX[p]}30`,
                     }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: PROFILE_HEX[p] }}>
                    {p} — {PROFILE_LABELS[p]}
                  </p>
                  <p className="text-xs text-[#A0A3B1] leading-relaxed">{compatibilityMap[p]}</p>
                </div>
              ) : null
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stretchAreas.length > 0 && (
          <Card variant="default">
            <SectionTitle icon="📈">Áreas de Estiramento</SectionTitle>
            <ul className="space-y-1.5">
              {stretchAreas.map((s, i) => (<BulletItem key={i} color="#8B5CF6">{s}</BulletItem>))}
            </ul>
          </Card>
        )}
        {delegationGuide && (
          <InfoCard title="Guia de Delegação" icon="🎯" accentColor="#6366F1">{delegationGuide}</InfoCard>
        )}
      </div>

      {nextAssessmentFocus && (
        <Card variant="accent">
          <SectionTitle icon="🔭">Foco para a Próxima Avaliação</SectionTitle>
          <p className="text-sm text-[#F7F8FC] leading-relaxed">{nextAssessmentFocus}</p>
        </Card>
      )}
    </div>
  );
}
