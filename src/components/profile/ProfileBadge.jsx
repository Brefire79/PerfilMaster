import React from 'react';
import clsx from 'clsx';

// ─── Profile config ───────────────────────────────────────────────────────────
const PROFILE_CONFIG = {
  D: {
    name:      'Dominante',
    emoji:     '⚡',
    color:     'var(--color-D)',
    lightBg:   'var(--color-D-light)',
    hex:       '#E53E3E',
    lightHex:  '#FED7D7',
  },
  I: {
    name:      'Influente',
    emoji:     '🌟',
    color:     'var(--color-I)',
    lightBg:   'var(--color-I-light)',
    hex:       '#D69E2E',
    lightHex:  '#FEFCBF',
  },
  S: {
    name:      'Estável',
    emoji:     '🌿',
    color:     'var(--color-S)',
    lightBg:   'var(--color-S-light)',
    hex:       '#38A169',
    lightHex:  '#C6F6D5',
  },
  C: {
    name:      'Analítico',
    emoji:     '🔷',
    color:     'var(--color-C)',
    lightBg:   'var(--color-C-light)',
    hex:       '#3182CE',
    lightHex:  '#BEE3F8',
  },
};

// ─── Size config ──────────────────────────────────────────────────────────────
const SIZE_CONFIG = {
  sm: {
    circle:    'w-8 h-8',
    fontSize:  14,
    showLabel: false,
    showEmoji: false,
    showFull:  false,
    glow:      false,
  },
  md: {
    circle:    'w-12 h-12',
    fontSize:  18,
    showLabel: true,
    showEmoji: false,
    showFull:  false,
    glow:      false,
  },
  lg: {
    circle:    'w-16 h-16',
    fontSize:  24,
    showLabel: true,
    showEmoji: true,
    showFull:  false,
    glow:      false,
  },
  xl: {
    circle:    'w-24 h-24',
    fontSize:  32,
    showLabel: true,
    showEmoji: true,
    showFull:  true,
    glow:      true,
  },
};

const PROFILE_ORDER = ['D', 'I', 'S', 'C'];

/**
 * ProfileBadge — circular badge with profile color and letter
 *
 * @param {'D'|'I'|'S'|'C'} profile
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {{ D: number, I: number, S: number, C: number }} scores
 * @param {boolean} showLabel
 * @param {boolean} showBars
 */
export default function ProfileBadge({
  profile,
  size = 'md',
  scores,
  showLabel = true,
  showBars = false,
  className,
}) {
  const config = PROFILE_CONFIG[profile];
  const sizeConf = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  if (!config) return null;

  const circleStyle = {
    backgroundColor: config.lightHex,
    border: `2px solid ${config.hex}`,
    boxShadow: sizeConf.glow ? `0 0 24px ${config.hex}55, 0 0 8px ${config.hex}33` : undefined,
  };

  const labelVisible = showLabel && sizeConf.showLabel;

  return (
    <div className={clsx('flex flex-col items-center gap-1.5', className)}>
      {/* Circle */}
      <div
        className={clsx(
          sizeConf.circle,
          'rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200',
          sizeConf.glow && 'ring-2 ring-offset-2 ring-offset-[#0F1117]'
        )}
        style={{
          ...circleStyle,
          ...(sizeConf.glow ? { '--tw-ring-color': config.hex } : {}),
        }}
        aria-label={`Perfil ${config.name}`}
      >
        <span
          style={{
            color: config.hex,
            fontSize: sizeConf.fontSize,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {profile}
        </span>
      </div>

      {/* Label below circle */}
      {labelVisible && (
        <div className="flex flex-col items-center gap-0.5">
          {sizeConf.showEmoji && (
            <span className="text-base leading-none" aria-hidden="true">
              {config.emoji}
            </span>
          )}
          <span
            className={clsx(
              'font-semibold',
              sizeConf.showFull ? 'text-sm text-[#F7F8FC]' : 'text-xs text-[#A0A3B1]'
            )}
          >
            {sizeConf.showFull ? `Perfil ${config.name}` : config.name}
          </span>
        </div>
      )}

      {/* Score bars */}
      {showBars && scores && (
        <div className="w-full flex flex-col gap-1 mt-1 min-w-[80px]">
          {PROFILE_ORDER.map((key) => {
            const pConf = PROFILE_CONFIG[key];
            const val = Math.max(0, Math.min(100, scores[key] ?? 0));
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-bold w-3 flex-shrink-0"
                  style={{ color: pConf.hex }}
                >
                  {key}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[#2D3047] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${val}%`,
                      backgroundColor: pConf.hex,
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#A0A3B1] w-6 text-right flex-shrink-0">
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
