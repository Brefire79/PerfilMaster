import React from 'react';
import ProfileBadge from './ProfileBadge.jsx';
import TherapyAlert from './TherapyAlert.jsx';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: { name: 'Dominante',  hex: '#E53E3E', lightHex: '#FED7D7' },
  I: { name: 'Influente',  hex: '#D69E2E', lightHex: '#FEFCBF' },
  S: { name: 'Estável',    hex: '#38A169', lightHex: '#C6F6D5' },
  C: { name: 'Analítico',  hex: '#3182CE', lightHex: '#BEE3F8' },
};

const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ profileKey, value }) {
  const conf = PROFILE_CONFIG[profileKey];
  const pct  = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold w-4 flex-shrink-0"
        style={{ color: conf.hex }}
      >
        {profileKey}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#E2E8F0]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: conf.hex }}
        />
      </div>
      <span className="text-xs text-[#64748B] w-8 text-right flex-shrink-0">
        {pct}%
      </span>
    </div>
  );
}

/**
 * GroupReportCard — printable member profile card for PDF export.
 *
 * Designed for A4 paper (white background, print-safe colors).
 *
 * @param {{ id: string, displayName: string, email: string }} user
 * @param {{ dominantProfile: string, scores: object, aiSummary: object, therapyIndicator: object }} profile
 * @param {boolean} isAdmin
 * @param {boolean} showTherapy
 */
export default function GroupReportCard({
  user,
  profile,
  isAdmin  = false,
  showTherapy = false,
}) {
  if (!user || !profile) return null;

  const { dominantProfile, scores = {}, aiSummary = {}, therapyIndicator } = profile;
  const conf = PROFILE_CONFIG[dominantProfile] || PROFILE_CONFIG.D;

  const displayName   = user.displayName || user.name || user.email || 'Participante';
  const profileName   = conf.name;
  const summary       = aiSummary.summary || '';
  const strengths     = (aiSummary.strengths || []).slice(0, 3);
  const challenges    = (aiSummary.challenges || []).slice(0, 2);
  const roleRec       = aiSummary.roleRecommendation || aiSummary.careerRecommendation || '';
  const today         = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Summary: use first paragraph only
  const summaryParagraph = summary.split('\n').find((s) => s.trim().length > 0) || summary;

  return (
    <div
      className="group-report-card"
      style={{
        background:         '#FFFFFF',
        border:             `2px solid ${conf.hex}`,
        borderRadius:       12,
        padding:            '24px',
        marginBottom:       '24px',
        pageBreakInside:    'avoid',
        breakInside:        'avoid',
        fontFamily:         "'DM Sans', sans-serif",
        color:              '#1A202C',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        {/* Profile badge (rendered via component but forced light background) */}
        <div
          style={{
            width:           56,
            height:          56,
            borderRadius:    '50%',
            backgroundColor: conf.lightHex,
            border:          `2px solid ${conf.hex}`,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
          aria-label={`Perfil ${profileName}`}
        >
          <span style={{ color: conf.hex, fontSize: 22, fontWeight: 700 }}>
            {dominantProfile}
          </span>
        </div>

        {/* Name + profile */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1A202C', lineHeight: 1.3 }}>
            {displayName}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748B' }}>
            {user.email || ''}
          </p>
        </div>

        {/* Profile + score pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span
            style={{
              backgroundColor: conf.lightHex,
              color:           conf.hex,
              border:          `1px solid ${conf.hex}`,
              borderRadius:    6,
              padding:         '2px 10px',
              fontSize:        12,
              fontWeight:      700,
            }}
          >
            {dominantProfile} — {profileName}
          </span>
          {dominantProfile && (
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Perfil dominante
            </span>
          )}
        </div>
      </div>

      {/* ── Score Bars ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        {PROFILE_ORDER.map((key) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <ScoreBar profileKey={key} value={scores[key] ?? 0} />
          </div>
        ))}
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      {summaryParagraph && (
        <div
          style={{
            background:   '#F8FAFC',
            borderRadius: 8,
            padding:      '12px 14px',
            marginBottom: 16,
            borderLeft:   `3px solid ${conf.hex}`,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
            {summaryParagraph}
          </p>
        </div>
      )}

      {/* ── Two columns: Strengths | Challenges ─────────────────────────────── */}
      {(strengths.length > 0 || challenges.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* Pontos Fortes */}
          {strengths.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38A169' }}>
                Pontos Fortes
              </p>
              <ul style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
                {strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 3, lineHeight: 1.5 }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Desafios */}
          {challenges.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E53E3E' }}>
                Desafios
              </p>
              <ul style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
                {challenges.map((c, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 3, lineHeight: 1.5 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Role Recommendation ─────────────────────────────────────────────── */}
      {roleRec && (
        <div
          style={{
            background:   '#EFF6FF',
            borderRadius: 8,
            padding:      '10px 14px',
            marginBottom: 12,
            border:       '1px solid #BFDBFE',
          }}
        >
          <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563EB' }}>
            Recomendação de papel
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#1E3A5F', lineHeight: 1.5 }}>
            {roleRec}
          </p>
        </div>
      )}

      {/* ── Therapy alert (admin only, only if showTherapy) ─────────────────── */}
      {isAdmin && showTherapy && therapyIndicator?.flagged && (
        <div style={{ marginBottom: 8 }}>
          <TherapyAlert therapyIndicator={therapyIndicator} userName={displayName} />
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop:   16,
          paddingTop:  10,
          borderTop:   '1px solid #E2E8F0',
          display:     'flex',
          justifyContent: 'space-between',
          alignItems:  'center',
        }}
      >
        <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
          ProfileAI
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>
          {today}
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
          Confidencial
        </span>
      </div>
    </div>
  );
}
