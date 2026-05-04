import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { createAssessment, submitAssessment } from '@/firebase/firestore.js';
import Button from '@/components/ui/Button.jsx';
import useAuthStore from '@/store/authStore.js';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_DISC = 28;
const TOTAL_SABOTEURS = 50;
const TOTAL_QUESTIONS = TOTAL_DISC + TOTAL_SABOTEURS;

const LIKERT_OPTIONS = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
];

/**
 * State machine:
 *   'intro' → 'disc' → 'transition' → 'saboteurs' → 'submitting' → 'completed'
 */

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchQuestionsByType(assessmentType) {
  if (!Array.isArray(SAMPLE_QUESTIONS) || SAMPLE_QUESTIONS.length === 0) return [];
  if (assessmentType === 'disc') return SAMPLE_QUESTIONS.slice(0, TOTAL_DISC);
  if (assessmentType === 'saboteurs') return SAMPLE_QUESTIONS.slice(TOTAL_DISC, TOTAL_QUESTIONS);
  return SAMPLE_QUESTIONS;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ answered, total, etapaLabel }) {
  const pct = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[#A0A3B1]">
        <span className="font-medium">{etapaLabel}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-[#2D3047] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#6366F1] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IntroScreen({ onStart, blocked, blockedUntil, t }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.6} className="w-10 h-10">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-2xl font-heading font-bold text-[#F7F8FC]">
          {t('wizard.intro.title', 'Avaliação Comportamental')}
        </h1>
        <p className="text-sm text-[#A0A3B1] leading-relaxed">
          {t(
            'wizard.intro.description',
            'A avaliação possui 2 etapas: DISC (28 perguntas, ~5 min) e Sabotadores (50 perguntas, ~10 min). Responda com sinceridade — não existem respostas certas ou erradas.',
          )}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="flex items-center gap-4 text-xs text-[#A0A3B1]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#6366F1]" />
            {t('wizard.intro.step1', 'Etapa 1 — DISC')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#A78BFA]" />
            {t('wizard.intro.step2', 'Etapa 2 — Sabotadores')}
          </span>
        </div>

        {blocked ? (
          <div className="text-center space-y-1">
            <p className="text-sm text-[#E53E3E] font-medium">
              {t('wizard.intro.blocked', 'Avaliação bloqueada temporariamente')}
            </p>
            {blockedUntil && (
              <p className="text-xs text-[#A0A3B1]">
                {t('wizard.intro.blockedUntil', 'Disponível em:')}{' '}
                {new Date(blockedUntil).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={onStart}>
            {t('wizard.intro.start', 'Iniciar Avaliação')}
          </Button>
        )}
      </div>
    </div>
  );
}

function TransitionScreen({ onContinue, t }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#38A169]/10 border border-[#38A169]/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#38A169" strokeWidth={2} className="w-8 h-8">
          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <p className="text-sm font-medium text-[#38A169] uppercase tracking-widest">
          {t('wizard.transition.badge', 'Etapa 1 concluída!')}
        </p>
        <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">
          {t('wizard.transition.title', 'Excelente trabalho!')}
        </h2>
        <p className="text-sm text-[#A0A3B1] leading-relaxed">
          {t(
            'wizard.transition.description',
            'Agora vamos para a Etapa 2 — Sabotadores. São 50 perguntas sobre padrões de auto-sabotagem. Responda de forma honesta para um perfil mais preciso.',
          )}
        </p>
      </div>

      <Button variant="primary" size="lg" fullWidth className="max-w-xs" onClick={onContinue}>
        {t('wizard.transition.continue', 'Continuar para Etapa 2')}
      </Button>
    </div>
  );
}

function SubmittingScreen({ t }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 animate-fade-in">
      <div className="w-12 h-12 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">
          {t('wizard.submitting.title', 'Enviando suas respostas...')}
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          {t('wizard.submitting.subtitle', 'Isso levará apenas alguns segundos.')}
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry, t }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 bg-[#E53E3E]/10 border border-[#E53E3E]/30 rounded-xl px-4 py-3">
      <span className="text-[#E53E3E] text-sm flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium text-[#E53E3E] underline hover:no-underline"
        >
          {t('app.retry', 'Tentar novamente')}
        </button>
      )}
    </div>
  );
}

function LikertQuestion({ question, selectedValue, onSelect, disabled }) {
  // Resolve text — supports both field names (texto / text) and i18n objects
  const text = (() => {
    const raw = question.texto ?? question.text ?? '';
    if (!raw || typeof raw !== 'object') return String(raw);
    // i18n object: try ptBR → pt-BR → en → es → first value
    return raw.ptBR ?? raw['pt-BR'] ?? raw.en ?? raw.es ?? Object.values(raw)[0] ?? '';
  })();

  return (
    <div className="space-y-5 animate-fade-in">
      <p className="text-lg font-medium text-[#F7F8FC] leading-relaxed">{text}</p>

      {/* Desktop horizontal */}
      <div className="hidden sm:flex items-stretch gap-2">
        {LIKERT_OPTIONS.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/15 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5',
                disabled && 'opacity-60 cursor-not-allowed',
              )}
            >
              <span
                className={clsx(
                  'text-xl font-bold font-mono transition-colors',
                  isSelected ? 'text-[#6366F1]' : 'text-[#A0A3B1]',
                )}
              >
                {opt.value}
              </span>
              <span
                className={clsx(
                  'text-2xs text-center leading-tight transition-colors',
                  isSelected ? 'text-[#F7F8FC]' : 'text-[#A0A3B1]',
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile vertical */}
      <div className="flex flex-col gap-2 sm:hidden">
        {LIKERT_OPTIONS.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.value)}
              className={clsx(
                'flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366F1] focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-[#6366F1]/15 border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'bg-[#1A1D2E] border-[#2D3047] hover:border-[#6366F1]/40',
                disabled && 'opacity-60 cursor-not-allowed',
              )}
            >
              <span
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono flex-shrink-0 border transition-colors',
                  isSelected
                    ? 'bg-[#6366F1] text-white border-[#6366F1]'
                    : 'bg-[#242736] text-[#A0A3B1] border-[#2D3047]',
                )}
              >
                {opt.value}
              </span>
              <span
                className={clsx(
                  'text-sm transition-colors',
                  isSelected ? 'text-[#F7F8FC] font-medium' : 'text-[#A0A3B1]',
                )}
              >
                {opt.label}
              </span>
              {isSelected && (
                <span className="ml-auto text-[#6366F1]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WizardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-3 bg-[#2D3047] rounded-full" />
      <div className="h-56 bg-[#242736] rounded-2xl" />
      <div className="flex gap-3">
        <div className="h-10 bg-[#2D3047] rounded-xl flex-1" />
        <div className="h-10 bg-[#2D3047] rounded-xl flex-1" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * AssessmentWizard — 2-module sequential assessment flow (DISC + Saboteurs)
 *
 * @param {function} onCompleted - Called with { assessmentId } on successful submission
 * @param {string|null} proximaAvaliacao - ISO date string; blocks wizard if date > now
 */
export default function AssessmentWizard({ onCompleted, proximaAvaliacao = null }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // ─── State machine ────────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState('intro');
  // 'intro' | 'disc' | 'transition' | 'saboteurs' | 'submitting' | 'completed'

  // ─── Questions ────────────────────────────────────────────────────────────
  const [perguntasDisc, setPerguntasDisc] = useState([]);
  const [perguntasSaboteurs, setPerguntasSaboteurs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(null);

  // ─── Answers & navigation ─────────────────────────────────────────────────
  const [respostas, setRespostas] = useState({}); // { [questionId]: 1-5 }
  const [indice, setIndice] = useState(0);
  const [animDir, setAnimDir] = useState('enter'); // 'enter' | 'exit-left' | 'exit-right'

  // ─── Submission ───────────────────────────────────────────────────────────
  const [erroSubmissao, setErroSubmissao] = useState(null);
  const submittingRef = useRef(false);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const perguntas = etapa === 'disc' ? perguntasDisc : perguntasSaboteurs;
  const perguntaAtual = perguntas[indice] ?? null;
  const totalRespondidas = Object.keys(respostas).length;

  const etapaLabel =
    etapa === 'disc' || etapa === 'intro'
      ? t('wizard.progress.step1', 'Etapa 1 de 2 — DISC')
      : t('wizard.progress.step2', 'Etapa 2 de 2 — Sabotadores');

  // ─── Blocked check ────────────────────────────────────────────────────────
  const assessmentBloqueado =
    proximaAvaliacao != null && new Date(proximaAvaliacao) > new Date();

  // ─── Load questions ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCarregando(true);
      setErroCarregamento(null);
      try {
        const [disc, sab] = await Promise.all([
          fetchQuestionsByType('disc'),
          fetchQuestionsByType('saboteurs'),
        ]);

        if (cancelled) return;

        if (disc.length === 0 && sab.length === 0) {
          setErroCarregamento(
            t('wizard.error.noQuestions', 'Nenhuma pergunta encontrada para carregar a avaliação.'),
          );
        }

        setPerguntasDisc(disc);
        setPerguntasSaboteurs(sab);
      } catch (err) {
        if (!cancelled) {
          setErroCarregamento(
            err?.message ?? t('wizard.error.loadFailed', 'Falha ao carregar perguntas.'),
          );
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [t]);

  // ─── Answer selection ─────────────────────────────────────────────────────
  const selecionarResposta = useCallback(
    (valor) => {
      if (!perguntaAtual) return;
      setRespostas((prev) => ({ ...prev, [perguntaAtual.id]: valor }));
    },
    [perguntaAtual],
  );

  // ─── Slide animation helper ───────────────────────────────────────────────
  const animateTransition = useCallback((direction, callback) => {
    setAnimDir(direction === 'forward' ? 'exit-left' : 'exit-right');
    // Wait for exit animation then enter new question
    setTimeout(() => {
      callback();
      setAnimDir('enter');
    }, 150);
  }, []);

  // ─── Advance ──────────────────────────────────────────────────────────────
  const avancar = useCallback(() => {
    if (!perguntaAtual) return;
    // Must have answered current question
    if (respostas[perguntaAtual.id] == null) return;

    const proximoIndice = indice + 1;

    if (etapa === 'disc') {
      if (proximoIndice < perguntasDisc.length) {
        // Next DISC question
        animateTransition('forward', () => setIndice(proximoIndice));
      } else {
        // DISC finished → transition screen
        setEtapa('transition');
      }
      return;
    }

    if (etapa === 'saboteurs') {
      if (proximoIndice < perguntasSaboteurs.length) {
        // Next saboteur question
        animateTransition('forward', () => setIndice(proximoIndice));
      } else {
        // All done → submit
        enviar();
      }
    }
  }, [etapa, indice, perguntaAtual, respostas, perguntasDisc.length, perguntasSaboteurs.length, animateTransition]);

  // ─── Go back ──────────────────────────────────────────────────────────────
  const voltar = useCallback(() => {
    if (etapa === 'disc') {
      if (indice > 0) {
        animateTransition('backward', () => setIndice(indice - 1));
      }
      return;
    }

    if (etapa === 'saboteurs') {
      if (indice > 0) {
        animateTransition('backward', () => setIndice(indice - 1));
      } else {
        // First saboteur question → go back to last DISC question
        setEtapa('disc');
        setIndice(perguntasDisc.length - 1);
      }
    }
  }, [etapa, indice, perguntasDisc.length, animateTransition]);

  // ─── Submit to Supabase ───────────────────────────────────────────────────
  const enviar = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setEtapa('submitting');
    setErroSubmissao(null);

    try {
      if (!user) throw new Error('Usuário não autenticado');
      const assessmentDocId = await createAssessment({
        uid: user.uid,
        moduleId: 'full',
        totalQuestions: TOTAL_QUESTIONS,
      });
      await submitAssessment(assessmentDocId, { ...respostas });

      setEtapa('completed');
      onCompleted?.({ assessmentId: assessmentDocId });
    } catch (err) {
      setErroSubmissao(
        err?.message ?? t('wizard.error.submitFailed', 'Falha ao enviar. Tente novamente.'),
      );
      // Roll back to last saboteur question so user can retry
      setEtapa('saboteurs');
      setIndice(perguntasSaboteurs.length - 1);
    } finally {
      submittingRef.current = false;
    }
  }, [user, respostas, perguntasSaboteurs.length, onCompleted, t]);

  // ─── Transition screen → start saboteurs ──────────────────────────────────
  const iniciarSaboteurs = useCallback(() => {
    setEtapa('saboteurs');
    setIndice(0);
  }, []);

  // ─── Start assessment from intro ──────────────────────────────────────────
  const iniciarAvaliacao = useCallback(() => {
    if (perguntasDisc.length === 0) return;
    setEtapa('disc');
    setIndice(0);
  }, [perguntasDisc.length]);

  // ─── Retry load ───────────────────────────────────────────────────────────
  const retryLoad = useCallback(() => {
    setErroCarregamento(null);
    setCarregando(true);
    Promise.all([fetchQuestionsByType('disc'), fetchQuestionsByType('saboteurs')])
      .then(([disc, sab]) => {
        setPerguntasDisc(disc);
        setPerguntasSaboteurs(sab);
        if (disc.length === 0 && sab.length === 0) {
          setErroCarregamento(
            t('wizard.error.noQuestions', 'Nenhuma pergunta encontrada.'),
          );
        }
      })
      .catch((err) => setErroCarregamento(err?.message ?? 'Erro'))
      .finally(() => setCarregando(false));
  }, [t]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Loading
  if (carregando) {
    return (
      <div className="max-w-lg mx-auto py-4 space-y-6">
        <WizardSkeleton />
      </div>
    );
  }

  // Load error
  if (erroCarregamento && etapa === 'intro') {
    return (
      <div className="max-w-lg mx-auto py-4 space-y-4">
        <ErrorBanner message={erroCarregamento} onRetry={retryLoad} t={t} />
      </div>
    );
  }

  // Intro
  if (etapa === 'intro') {
    return (
      <div className="max-w-lg mx-auto py-4">
        <IntroScreen
          onStart={iniciarAvaliacao}
          blocked={assessmentBloqueado}
          blockedUntil={proximaAvaliacao}
          t={t}
        />
      </div>
    );
  }

  // Transition between DISC → Saboteurs
  if (etapa === 'transition') {
    return (
      <div className="max-w-lg mx-auto py-4">
        <TransitionScreen onContinue={iniciarSaboteurs} t={t} />
      </div>
    );
  }

  // Submitting
  if (etapa === 'submitting') {
    return (
      <div className="max-w-lg mx-auto py-4">
        <SubmittingScreen t={t} />
      </div>
    );
  }

  // Completed — the parent should navigate away via onCompleted,
  // but show a fallback just in case
  if (etapa === 'completed') {
    return (
      <div className="max-w-lg mx-auto py-4 flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[#38A169]/10 border border-[#38A169]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#38A169" strokeWidth={2} className="w-8 h-8">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-heading font-bold text-[#F7F8FC]">
          {t('wizard.completed.title', 'Avaliação enviada com sucesso!')}
        </h2>
        <p className="text-sm text-[#A0A3B1]">
          {t('wizard.completed.subtitle', 'Seus resultados serão processados em breve.')}
        </p>
      </div>
    );
  }

  // ─── Question wizard (disc or saboteurs) ────────────────────────────────

  const respostaAtual = perguntaAtual ? respostas[perguntaAtual.id] ?? null : null;
  const podeSeguir = respostaAtual != null;
  const podeVoltar = etapa === 'disc' ? indice > 0 : true; // saboteurs: always (index 0 goes back to DISC)

  // For the "Enviar" button on last saboteur question
  const ehUltimaQuestao = etapa === 'saboteurs' && indice === perguntasSaboteurs.length - 1;

  return (
    <div className="max-w-lg mx-auto py-4 space-y-5 animate-fade-in">
      {/* Progress bar */}
      <ProgressBar answered={totalRespondidas} total={TOTAL_QUESTIONS} etapaLabel={etapaLabel} />

      {/* Question counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#A0A3B1]">
          <span className="font-medium text-[#F7F8FC]">
            {t('assessment.question', 'Questão')} {indice + 1}
          </span>{' '}
          <span>
            {t('assessment.of', 'de')} {perguntas.length}
          </span>
        </p>
      </div>

      {/* Submission error */}
      {erroSubmissao && (
        <ErrorBanner message={erroSubmissao} onRetry={enviar} t={t} />
      )}

      {/* Question card with animation */}
      {perguntaAtual ? (
        <div
          className={clsx(
            'transition-all duration-150',
            animDir === 'enter' && 'opacity-100 translate-x-0',
            animDir === 'exit-left' && 'opacity-0 -translate-x-8',
            animDir === 'exit-right' && 'opacity-0 translate-x-8',
          )}
        >
          <div className="bg-[#242736] border border-[#2D3047] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <LikertQuestion
              question={perguntaAtual}
              selectedValue={respostaAtual}
              onSelect={selecionarResposta}
              disabled={false}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[#A0A3B1] text-sm">
            {t('wizard.error.noQuestion', 'Pergunta não encontrada.')}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {podeVoltar && (
          <Button variant="secondary" size="md" onClick={voltar} className="flex-1">
            {t('app.back', 'Voltar')}
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          disabled={!podeSeguir}
          onClick={avancar}
          className="flex-1"
        >
          {ehUltimaQuestao
            ? t('wizard.submit', 'Enviar Avaliação')
            : t('app.next', 'Avançar')}
        </Button>
      </div>

      {/* Auto-save hint */}
      <p className="text-xs text-[#A0A3B1] text-center">
        {t('assessment.saveProgress', 'Progresso salvo automaticamente')}
      </p>
    </div>
  );
}
