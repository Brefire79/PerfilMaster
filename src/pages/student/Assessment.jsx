import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import useAuthStore from '@/store/authStore.js';
import useProfileStore from '@/store/profileStore.js';
import { useAdaptiveEngine } from '@/components/assessment/AdaptiveEngine.jsx';
import QuestionCard from '@/components/assessment/QuestionCard.jsx';
import ResultsSummary from '@/components/assessment/ResultsSummary.jsx';
import Button from '@/components/ui/Button.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';
import { getModule, createAssessment, saveAssessmentAnswer, submitAssessment } from '@/firebase/firestore.js';
import { analyzeResponse, buildProfile } from '@/firebase/functions.js';

// ─── Profile colors ───────────────────────────────────────────────────────────

const DIFFICULTY_LABELS = {
  1: { ptBR: 'Básico', en: 'Basic', es: 'Básico' },
  2: { ptBR: 'Intermediário', en: 'Intermediate', es: 'Intermedio' },
  3: { ptBR: 'Avançado', en: 'Advanced', es: 'Avanzado' },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function AssessmentProgressBar({ progress, currentDifficulty }) {
  const { t } = useTranslation();
  const { answered, total, percent } = progress;

  const zones = [
    { difficulty: 1, label: { ptBR: 'Básico', en: 'Basic', es: 'Básico' } },
    { difficulty: 2, label: { ptBR: 'Intermediário', en: 'Intermediate', es: 'Intermedio' } },
    { difficulty: 3, label: { ptBR: 'Avançado', en: 'Advanced', es: 'Avanzado' } },
  ];

  return (
    <div className="space-y-2">
      {/* Main bar */}
      <div className="relative h-2 bg-[#2D3047] rounded-full overflow-hidden">
        {/* Zone separators */}
        <div className="absolute inset-0 flex">
          {zones.map((zone, idx) => (
            <div
              key={zone.difficulty}
              className={clsx(
                'flex-1 border-r last:border-r-0 transition-colors duration-300',
                idx < zones.length - 1 ? 'border-[#0F1117]/60' : 'border-transparent'
              )}
            />
          ))}
        </div>

        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[#6366F1] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Zone indicators */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {zones.map((zone) => {
            const isActive = zone.difficulty === currentDifficulty;
            return (
              <span
                key={zone.difficulty}
                className={clsx(
                  'text-2xs px-1.5 py-0.5 rounded-md font-medium transition-all',
                  isActive
                    ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30'
                    : 'text-[#A0A3B1]'
                )}
              >
                {zone.label.ptBR}
              </span>
            );
          })}
        </div>
        <span className="text-xs text-[#A0A3B1] font-mono">
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function AssessmentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-3 bg-[#2D3047] rounded-full" />
      <div className="h-56 bg-[#242736] rounded-2xl" />
      <div className="h-8 bg-[#2D3047] rounded-xl w-1/3 mx-auto" />
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function AssessmentError({ message, onBack }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.8} className="w-8 h-8">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-heading font-bold text-[#F7F8FC]">
          {t('errors.assessmentNotFound', 'Avaliação não encontrada')}
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          {message ?? t('errors.generic', 'Algo deu errado. Tente novamente.')}
        </p>
      </div>
      <Button variant="secondary" onClick={onBack}>
        {t('app.back', 'Voltar')}
      </Button>
    </div>
  );
}

// ─── Main Assessment Page ─────────────────────────────────────────────────────

/**
 * Assessment page — full adaptive DISC assessment flow.
 * Route: /student/assessment/:id
 */
export default function Assessment() {
  const { id: moduleId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setProfile } = useProfileStore();

  // ─── Module & Questions state ───────────────────────────────────────────────
  const [moduleData, setModuleData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingModule, setLoadingModule] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ─── Assessment session state ───────────────────────────────────────────────
  const [assessmentId, setAssessmentId] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // ─── Results/summary state ──────────────────────────────────────────────────
  const [resultsStatus, setResultsStatus] = useState(null); // null | 'calculating' | 'analyzing' | 'complete'
  const [finalProfile, setFinalProfile] = useState(null);

  // ─── Abandon modal ──────────────────────────────────────────────────────────
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // ─── Adaptive engine ────────────────────────────────────────────────────────
  const engine = useAdaptiveEngine(questions, moduleId ?? 'default');

  // ─── Load module & questions ────────────────────────────────────────────────
  useEffect(() => {
    if (!moduleId || !user?.uid) return;

    const load = async () => {
      setLoadingModule(true);
      setLoadError(null);
      try {
        // Attempt to fetch from Firestore
        let mod = null;
        let qs = SAMPLE_QUESTIONS;

        if (moduleId !== 'new') {
          try {
            mod = await getModule(moduleId);
            if (mod?.questions && Array.isArray(mod.questions) && mod.questions.length > 0) {
              qs = mod.questions;
            }
          } catch {
            // Firestore not available — use sample questions
          }
        }

        setModuleData(mod);
        setQuestions(qs);

        // Create or find existing assessment document
        try {
          const newId = await createAssessment({
            uid: user.uid,
            moduleId: moduleId === 'new' ? 'sample' : moduleId,
            groupId: mod?.groupId ?? null,
          });
          setAssessmentId(newId);
        } catch {
          // Offline/demo mode — use local ID
          setAssessmentId(`local_${Date.now()}`);
        }
      } catch (err) {
        setLoadError(err.message ?? 'Failed to load assessment');
      } finally {
        setLoadingModule(false);
      }
    };

    load();
  }, [moduleId, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handle answer submission ───────────────────────────────────────────────
  const handleAnswer = useCallback(
    async (questionId, value) => {
      if (isAnswering) return;
      setIsAnswering(true);

      // Submit to adaptive engine
      engine.submitAnswer(questionId, value);

      // Persist to Firestore (best-effort)
      if (assessmentId && !assessmentId.startsWith('local_')) {
        try {
          const q = questions.find((q) => q.id === questionId);
          await saveAssessmentAnswer(assessmentId, questionId, {
            value,
            dimension: q?.dimension,
            weight: q?.weight ?? 1,
          });
        } catch {
          // Non-blocking
        }
      }

      setIsAnswering(false);
    },
    [isAnswering, engine, assessmentId, questions]
  );

  // ─── Watch for completion ───────────────────────────────────────────────────
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!engine.isComplete || resultsStatus !== null || submittingRef.current) return;
    submittingRef.current = true;

    const runSubmit = async () => {
      setResultsStatus('calculating');

      // Give calculating animation 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setResultsStatus('analyzing');

      const results = engine.getResults();

      // Attempt AI analysis
      try {
        const analysisResult = await analyzeResponse({
          assessmentId: assessmentId ?? 'demo',
          answers: results.answers,
          uid: user?.uid,
        });

        const profileResult = await buildProfile({
          uid: user?.uid,
          assessmentId: assessmentId ?? 'demo',
          scores: analysisResult?.scores ?? results.scores,
        });

        const builtProfile = profileResult?.profile ?? {
          primaryType: results.dominantProfile,
          scores: results.scores,
        };

        setProfile(builtProfile);
        setFinalProfile(builtProfile);
      } catch {
        // Offline mode — build profile from local scores
        const fallbackProfile = {
          primaryType: results.dominantProfile,
          scores: results.scores,
        };
        setProfile(fallbackProfile);
        setFinalProfile(fallbackProfile);
      }

      setResultsStatus('complete');
    };

    runSubmit();
  }, [engine.isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigate to profile ────────────────────────────────────────────────────
  const handleViewProfile = useCallback(() => {
    navigate('/student/profile');
  }, [navigate]);

  // ─── Abandon ────────────────────────────────────────────────────────────────
  const handleAbandon = useCallback(() => {
    navigate('/student/dashboard');
  }, [navigate]);

  // ─── Render states ───────────────────────────────────────────────────────────

  if (loadingModule) {
    return (
      <div className="max-w-lg mx-auto py-4 space-y-6">
        <AssessmentSkeleton />
      </div>
    );
  }

  if (loadError) {
    return <AssessmentError message={loadError} onBack={() => navigate('/student/dashboard')} />;
  }

  // Results flow
  if (resultsStatus) {
    return (
      <div className="max-w-lg mx-auto py-4">
        <ResultsSummary
          status={resultsStatus}
          profile={finalProfile}
          onViewProfile={handleViewProfile}
        />
      </div>
    );
  }

  const { currentQuestion, progress, currentDifficulty, answeredCount } = engine;

  return (
    <div className="max-w-lg mx-auto py-4 space-y-5 animate-fade-in">
      {/* Top bar: progress + exit button */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <AssessmentProgressBar progress={progress} currentDifficulty={currentDifficulty} />
        </div>
        <button
          type="button"
          onClick={() => setShowAbandonModal(true)}
          className="flex-shrink-0 h-9 px-3 text-sm font-medium rounded-xl bg-transparent text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#242736] border border-transparent hover:border-[#2D3047] transition-all"
        >
          {t('auth.logout', 'Sair')}
        </button>
      </div>

      {/* Module title */}
      {moduleData?.name && (
        <h1 className="text-sm font-medium text-[#A0A3B1] truncate">
          {typeof moduleData.name === 'object' ? moduleData.name.ptBR ?? moduleData.name.en : moduleData.name}
        </h1>
      )}

      {/* Question counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#A0A3B1]">
          <span className="font-medium text-[#F7F8FC]">
            {t('assessment.question', 'Questão')} {answeredCount + 1}
          </span>
          {' '}
          <span>{t('assessment.of', 'de')} ~{progress.total}</span>
        </p>

        {/* Difficulty badge */}
        <span className="text-xs font-medium text-[#A0A3B1] px-2 py-0.5 rounded-full bg-[#242736] border border-[#2D3047]">
          {DIFFICULTY_LABELS[currentDifficulty]?.ptBR ?? 'Básico'}
        </span>
      </div>

      {/* Question card */}
      {currentQuestion ? (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
          isAnswering={isAnswering}
          showDimension={false}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-[#A0A3B1] text-sm">
            {t('assessment.analyzing', 'Analisando suas respostas...')}
          </p>
        </div>
      )}

      {/* Progress hint */}
      <p className="text-xs text-[#A0A3B1] text-center">
        {t('assessment.saveProgress', 'Progresso salvo automaticamente')}
      </p>

      {/* Abandon modal */}
      <ConfirmModal
        isOpen={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        onConfirm={handleAbandon}
        title={t('assessment.abandon.title', 'Sair da avaliação?')}
        description={t('assessment.abandon.description', 'Seu progresso será salvo. Você pode continuar de onde parou.')}
        confirmLabel={t('assessment.abandon.confirm', 'Sair')}
        cancelLabel={t('app.cancel', 'Cancelar')}
        variant="danger"
      />
    </div>
  );
}
