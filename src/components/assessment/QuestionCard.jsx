import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Button from '@/components/ui/Button.jsx';

// ─── Profile dimension metadata ───────────────────────────────────────────────

const DIMENSION_META = {
  D: { label: 'Dominante', color: 'bg-[#E53E3E]/15 text-[#E53E3E] border-[#E53E3E]/30' },
  I: { label: 'Influente', color: 'bg-[#D69E2E]/15 text-[#D69E2E] border-[#D69E2E]/30' },
  S: { label: 'Estável', color: 'bg-[#38A169]/15 text-[#38A169] border-[#38A169]/30' },
  C: { label: 'Analítico', color: 'bg-[#3182CE]/15 text-[#3182CE] border-[#3182CE]/30' },
};

const LIKERT_LABELS = {
  1: { ptBR: 'Discordo totalmente', es: 'Totalmente en desacuerdo', en: 'Strongly disagree' },
  2: { ptBR: 'Discordo', es: 'En desacuerdo', en: 'Disagree' },
  3: { ptBR: 'Neutro', es: 'Neutro', en: 'Neutral' },
  4: { ptBR: 'Concordo', es: 'De acuerdo', en: 'Agree' },
  5: { ptBR: 'Concordo totalmente', es: 'Totalmente de acuerdo', en: 'Strongly agree' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveText(textObj, language) {
  if (typeof textObj === 'string') return textObj;
  if (!textObj) return '';
  return textObj[language] ?? textObj.ptBR ?? textObj.en ?? '';
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 flex-shrink-0"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Likert5 Question ─────────────────────────────────────────────────────────

function Likert5Question({ question, onAnswer, isAnswering, language }) {
  const [selected, setSelected] = useState(null);
  const { t } = useTranslation();

  const handleSelect = (value) => {
    if (isAnswering) return;
    setSelected(value);
    // Immediately call onAnswer — no confirm needed for likert
    setTimeout(() => onAnswer(question.id, value), 120);
  };

  return (
    <div className="space-y-5">
      <p className="text-lg font-medium text-[#F7F8FC] leading-relaxed">
        {resolveText(question.text, language)}
      </p>

      {/* Desktop: horizontal scale, Mobile: vertical */}
      <div className="hidden sm:flex items-stretch gap-2">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isAnswering}
              onClick={() => handleSelect(value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/15 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5',
                isAnswering && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'text-xl font-bold font-mono transition-colors',
                  isSelected ? 'text-[#6366F1]' : 'text-[#A0A3B1]'
                )}
              >
                {value}
              </span>
              <span
                className={clsx(
                  'text-2xs text-center leading-tight transition-colors',
                  isSelected ? 'text-[#F7F8FC]' : 'text-[#A0A3B1]'
                )}
              >
                {resolveText(LIKERT_LABELS[value], language)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: vertical stack */}
      <div className="flex flex-col gap-2 sm:hidden">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isAnswering}
              onClick={() => handleSelect(value)}
              className={clsx(
                'flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/15 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40',
                isAnswering && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono flex-shrink-0 border transition-colors',
                  isSelected
                    ? 'bg-[#6366F1] text-white border-[#6366F1]'
                    : 'bg-[#242736] text-[#A0A3B1] border-[#2D3047]'
                )}
              >
                {value}
              </span>
              <span
                className={clsx(
                  'text-sm transition-colors',
                  isSelected ? 'text-[#F7F8FC] font-medium' : 'text-[#A0A3B1]'
                )}
              >
                {resolveText(LIKERT_LABELS[value], language)}
              </span>
              {isSelected && (
                <span className="ml-auto text-[#6366F1]">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Forced Choice Question ───────────────────────────────────────────────────

function ForcedChoiceQuestion({ question, onAnswer, isAnswering, language }) {
  const [selected, setSelected] = useState(null);
  const { t } = useTranslation();

  const handleConfirm = () => {
    if (selected === null || isAnswering) return;
    onAnswer(question.id, selected);
  };

  return (
    <div className="space-y-5">
      <p className="text-lg font-medium text-[#F7F8FC] leading-relaxed">
        {resolveText(question.text, language)}
      </p>

      <div className="flex flex-col gap-3">
        {(question.options ?? []).map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={isAnswering}
              onClick={() => setSelected(option.value)}
              className={clsx(
                'w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/10 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5',
                isAnswering && 'opacity-60 cursor-not-allowed'
              )}
            >
              {/* Radio indicator */}
              <span
                className={clsx(
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  isSelected
                    ? 'border-[#6366F1] bg-[#6366F1]'
                    : 'border-[#2D3047] bg-[#242736]'
                )}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
              <span
                className={clsx(
                  'text-sm leading-relaxed transition-colors',
                  isSelected ? 'text-[#F7F8FC] font-medium' : 'text-[#A0A3B1]'
                )}
              >
                {resolveText(option.label, language)}
              </span>
              {isSelected && (
                <span className="ml-auto text-[#6366F1] flex-shrink-0">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="pt-1 animate-fade-in">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isAnswering}
            onClick={handleConfirm}
          >
            {t('app.confirm')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Scenario Question ────────────────────────────────────────────────────────

function ScenarioQuestion({ question, onAnswer, isAnswering, language }) {
  const [selected, setSelected] = useState(null);
  const { t } = useTranslation();

  const scenarioText = question.scenario
    ? resolveText(question.scenario, language)
    : null;

  const handleConfirm = () => {
    if (selected === null || isAnswering) return;
    onAnswer(question.id, selected);
  };

  return (
    <div className="space-y-5">
      {/* Scenario box */}
      <div className="border-l-4 border-[#6366F1]/50 pl-4 py-1">
        <p className="text-sm text-[#A0A3B1] italic leading-relaxed">
          {resolveText(question.text, language)}
        </p>
      </div>

      {scenarioText && (
        <p className="text-base font-medium text-[#F7F8FC] leading-relaxed">
          {scenarioText}
        </p>
      )}

      {/* Action options */}
      <div className="flex flex-col gap-3">
        {(question.options ?? []).map((option, idx) => {
          const isSelected = selected === option.value;
          const letters = ['A', 'B', 'C', 'D'];
          const letter = letters[idx] ?? String(idx + 1);
          return (
            <button
              key={option.value}
              type="button"
              disabled={isAnswering}
              onClick={() => setSelected(option.value)}
              className={clsx(
                'w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/10 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5',
                isAnswering && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border transition-all',
                  isSelected
                    ? 'bg-[#6366F1] text-white border-[#6366F1]'
                    : 'bg-[#242736] text-[#A0A3B1] border-[#2D3047]'
                )}
              >
                {letter}
              </span>
              <span
                className={clsx(
                  'text-sm leading-relaxed transition-colors',
                  isSelected ? 'text-[#F7F8FC] font-medium' : 'text-[#A0A3B1]'
                )}
              >
                {resolveText(option.label, language)}
              </span>
              {isSelected && (
                <span className="ml-auto text-[#6366F1] flex-shrink-0 mt-0.5">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="pt-1 animate-fade-in">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isAnswering}
            onClick={handleConfirm}
          >
            {t('app.confirm')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Dimension Indicator ─────────────────────────────────────────────────────

function DimensionIndicator({ dimension }) {
  const meta = DIMENSION_META[dimension];
  if (!meta) return null;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        meta.color
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {dimension} — {meta.label}
    </span>
  );
}

// ─── Main QuestionCard Component ─────────────────────────────────────────────

/**
 * QuestionCard
 *
 * Renders a single assessment question with animated slide transition.
 *
 * @param {object}   question      - Question object
 * @param {function} onAnswer      - (questionId, value) => void
 * @param {boolean}  isAnswering   - Disables interaction while answer is being saved
 * @param {boolean}  showDimension - Show dimension indicator (dev/admin only)
 */
export default function QuestionCard({ question, onAnswer, isAnswering = false, showDimension = false }) {
  const { i18n } = useTranslation();
  const language = i18n.language === 'pt-BR' ? 'ptBR' : i18n.language === 'es' ? 'es' : 'en';

  // Track question key changes for animation
  const [animState, setAnimState] = useState('enter'); // 'enter' | 'visible' | 'exit'
  const prevQuestionRef = useRef(null);

  useEffect(() => {
    if (!question) return;

    if (prevQuestionRef.current && prevQuestionRef.current.id !== question.id) {
      // Animate out → in
      setAnimState('exit');
      const timer = setTimeout(() => {
        setAnimState('enter');
        prevQuestionRef.current = question;
        requestAnimationFrame(() => setAnimState('visible'));
      }, 200);
      return () => clearTimeout(timer);
    }

    prevQuestionRef.current = question;
    const timer = setTimeout(() => setAnimState('visible'), 20);
    return () => clearTimeout(timer);
  }, [question]);

  if (!question) return null;

  const isDev = import.meta.env.DEV;

  return (
    <div
      className={clsx(
        'transition-all duration-200',
        animState === 'enter' && 'opacity-0 translate-x-8',
        animState === 'visible' && 'opacity-100 translate-x-0',
        animState === 'exit' && 'opacity-0 -translate-x-8'
      )}
    >
      <div className="bg-[#242736] border border-[#2D3047] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4">
        {/* Dimension indicator — dev mode or explicit prop */}
        {(isDev || showDimension) && question.dimension && (
          <DimensionIndicator dimension={question.dimension} />
        )}

        {/* Question body */}
        {question.type === 'likert5' && (
          <Likert5Question
            question={question}
            onAnswer={onAnswer}
            isAnswering={isAnswering}
            language={language}
          />
        )}

        {question.type === 'forced_choice' && (
          <ForcedChoiceQuestion
            question={question}
            onAnswer={onAnswer}
            isAnswering={isAnswering}
            language={language}
          />
        )}

        {question.type === 'scenario' && (
          <ScenarioQuestion
            question={question}
            onAnswer={onAnswer}
            isAnswering={isAnswering}
            language={language}
          />
        )}

        {/* Fallback for unknown type */}
        {!['likert5', 'forced_choice', 'scenario'].includes(question.type) && (
          <p className="text-sm text-[#A0A3B1]">
            Tipo de questão desconhecido: {question.type}
          </p>
        )}
      </div>
    </div>
  );
}
