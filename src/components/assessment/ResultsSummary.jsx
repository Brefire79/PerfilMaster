import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@/components/ui/Button.jsx';

// ─── Profile Colors ───────────────────────────────────────────────────────────

const PROFILE_COLORS = {
  D: { bg: 'bg-[#E53E3E]/10', border: 'border-[#E53E3E]/30', text: 'text-[#E53E3E]', hex: '#E53E3E', glow: 'shadow-[0_0_32px_rgba(229,62,62,0.3)]' },
  I: { bg: 'bg-[#D69E2E]/10', border: 'border-[#D69E2E]/30', text: 'text-[#D69E2E]', hex: '#D69E2E', glow: 'shadow-[0_0_32px_rgba(214,158,46,0.3)]' },
  S: { bg: 'bg-[#38A169]/10', border: 'border-[#38A169]/30', text: 'text-[#38A169]', hex: '#38A169', glow: 'shadow-[0_0_32px_rgba(56,161,105,0.3)]' },
  C: { bg: 'bg-[#3182CE]/10', border: 'border-[#3182CE]/30', text: 'text-[#3182CE]', hex: '#3182CE', glow: 'shadow-[0_0_32px_rgba(49,130,206,0.3)]' },
};

// ─── Rotating insight messages ────────────────────────────────────────────────

const ANALYZING_MESSAGES_KEYS = [
  'results.analyzing.msg1',
  'results.analyzing.msg2',
  'results.analyzing.msg3',
  'results.analyzing.msg4',
  'results.analyzing.msg5',
];

const ANALYZING_MESSAGES_FALLBACK = [
  'Identificando padrões comportamentais...',
  'Analisando traços de liderança...',
  'Mapeando estilo de comunicação...',
  'Verificando tendências sob pressão...',
  'Gerando recomendações personalizadas...',
];

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return (
    <div
      className={clsx(
        'rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin',
        sizes[size]
      )}
      aria-hidden="true"
    />
  );
}

// ─── Sparkle / Brain Icon ─────────────────────────────────────────────────────

function SparkleIcon({ className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer sparkle */}
      <path
        d="M24 4 L26.4 18.4 L40 16 L28.8 24 L40 32 L26.4 29.6 L24 44 L21.6 29.6 L8 32 L19.2 24 L8 16 L21.6 18.4 Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Center circle */}
      <circle cx="24" cy="24" r="3.5" fill="white" opacity="0.6" />
    </svg>
  );
}

// ─── Calculating State ────────────────────────────────────────────────────────

function CalculatingState() {
  const { t } = useTranslation();
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Animate bar from 0 → 100 over 3 seconds
    let start = null;
    const duration = 3000;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setBarWidth(progress);
      if (progress < 100) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-fade-in">
      <Spinner size="lg" />

      <div className="text-center space-y-2">
        <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">
          {t('results.calculating.title', 'Calculando seu perfil...')}
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          {t('results.calculating.subtitle', 'Processando suas respostas')}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-[#2D3047] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#6366F1] transition-none"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="text-xs text-[#A0A3B1] text-center mt-2">
          {Math.round(barWidth)}%
        </p>
      </div>
    </div>
  );
}

// ─── Analyzing State ──────────────────────────────────────────────────────────

function AnalyzingState() {
  const { t } = useTranslation();
  const [messageIdx, setMessageIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMessageIdx((prev) => (prev + 1) % ANALYZING_MESSAGES_FALLBACK.length);
        setVisible(true);
      }, 300);
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const message =
    t(ANALYZING_MESSAGES_KEYS[messageIdx], ANALYZING_MESSAGES_FALLBACK[messageIdx]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-fade-in">
      {/* Animated brain/sparkle icon */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#6366F1]/10 animate-pulse" />
        <div className="w-16 h-16 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center">
          <SparkleIcon className="w-8 h-8 text-[#6366F1] animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">
          {t('results.analyzing.title', 'A IA está analisando suas respostas...')}
        </h2>

        {/* Rotating messages */}
        <p
          className={clsx(
            'text-sm text-[#6366F1] font-medium min-h-[1.5rem] transition-opacity duration-300',
            visible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {message}
        </p>
      </div>

      {/* Dots animation */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-[#6366F1]"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      <p className="text-xs text-[#A0A3B1] text-center px-4">
        {t('assessment.analyzingMessage', 'Nossa IA está processando seu perfil. Isso pode levar alguns instantes.')}
      </p>
    </div>
  );
}

// ─── Complete State ───────────────────────────────────────────────────────────

function CompleteState({ profile, onViewProfile }) {
  const { t } = useTranslation();

  const type = profile?.primaryType ?? profile?.dominantProfile ?? 'D';
  const colors = PROFILE_COLORS[type] ?? PROFILE_COLORS.D;
  const scores = profile?.scores ?? {};

  return (
    <div className="flex flex-col items-center gap-6 py-6 animate-fade-in">
      {/* Profile badge */}
      <div
        className={clsx(
          'w-24 h-24 rounded-2xl flex items-center justify-center text-5xl font-heading font-black border-2',
          colors.bg,
          colors.border,
          colors.text,
          colors.glow
        )}
      >
        {type}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-[#6366F1] uppercase tracking-widest">
          {t('assessment.completed', 'Avaliação Concluída!')}
        </p>
        <h2 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t(`profiles.${type}.name`, type)}
        </h2>
        <p className="text-sm text-[#A0A3B1] max-w-xs mx-auto">
          {t(`profiles.${type}.tagline`, '')}
        </p>
      </div>

      {/* Score bars */}
      {Object.keys(scores).length > 0 && (
        <div className="w-full max-w-xs space-y-2.5">
          {Object.entries(scores).map(([key, value]) => {
            const c = PROFILE_COLORS[key] ?? PROFILE_COLORS.D;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={clsx('text-xs font-mono font-bold w-4', c.text)}>{key}</span>
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

      <Button variant="primary" size="lg" fullWidth onClick={onViewProfile}>
        {t('results.complete.cta', 'Ver perfil completo')}
      </Button>
    </div>
  );
}

// ─── Main ResultsSummary Component ───────────────────────────────────────────

/**
 * ResultsSummary
 *
 * Shown after all questions are answered while the AI processes the profile.
 *
 * @param {'calculating'|'analyzing'|'complete'} status
 * @param {object}   profile        - Profile object (populated when status='complete')
 * @param {function} onViewProfile  - Called when user clicks "Ver perfil completo"
 */
export default function ResultsSummary({ status = 'calculating', profile = null, onViewProfile }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#242736] border border-[#2D3047] rounded-2xl p-6 shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
        {status === 'calculating' && <CalculatingState />}
        {status === 'analyzing' && <AnalyzingState />}
        {status === 'complete' && (
          <CompleteState profile={profile} onViewProfile={onViewProfile} />
        )}
      </div>
    </div>
  );
}
