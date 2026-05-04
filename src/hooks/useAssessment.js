import { useState, useCallback, useEffect } from 'react';
import {
  getModule,
  getAssessment,
  getAssessmentsByUser,
  createAssessment,
  saveAssessmentAnswer as saveAnswerInDB,
  submitAssessment as submitAssessmentInDB,
} from '@/firebase/firestore.js';
import { analyzeResponse, buildProfile } from '@/firebase/functions.js';
import useAssessmentStore from '@/store/assessmentStore.js';
import useAuthStore from '@/store/authStore.js';
import useProfileStore from '@/store/profileStore.js';
import { SAMPLE_QUESTIONS } from '@/constants/sampleQuestions.js';

/**
 * useAssessment — Full assessment lifecycle hook
 *
 * Manages: module loading, assessment creation/resumption, answer saving,
 * submission, and AI analysis. Falls back to sample questions when Firestore
 * is unavailable (offline / demo mode).
 */
export function useAssessment() {
  const { user } = useAuthStore();
  const setProfile = useProfileStore((s) => s.setProfile);

  const {
    currentAssessment,
    answers,
    progress,
    status,
    loading: storeLoading,
    error: storeError,
    startAssessment,
    setAnswer,
    markSubmitted,
    markAnalyzed,
    resetAssessment,
    setLoading,
    setError,
    getAnswer,
    isComplete,
    answeredCount,
  } = useAssessmentStore();

  // Local state for module data and questions (not persisted to Zustand)
  const [module, setModule] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [existingAnswers, setExistingAnswers] = useState({});
  const [loading, setLocalLoading] = useState(false);
  const [error, setLocalError] = useState(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const setLoadingBoth = useCallback(
    (val) => {
      setLocalLoading(val);
      setLoading(val);
    },
    [setLoading]
  );

  const setErrorBoth = useCallback(
    (msg) => {
      setLocalError(msg);
      setError(msg);
    },
    [setError]
  );

  // ─── getModuleQuestions ────────────────────────────────────────────────────

  /**
   * Fetch questions array from a module document.
   * Falls back to SAMPLE_QUESTIONS if module has none or Firestore is unavailable.
   *
   * @param {string} moduleId
   * @returns {Promise<Array>}
   */
  const getModuleQuestions = useCallback(async (moduleId) => {
    if (!moduleId || moduleId === 'new') return SAMPLE_QUESTIONS;
    try {
      const mod = await getModule(moduleId);
      if (mod?.questions && Array.isArray(mod.questions) && mod.questions.length > 0) {
        return mod.questions;
      }
    } catch {
      // Firestore unavailable — use sample questions
    }
    return SAMPLE_QUESTIONS;
  }, []);

  // ─── loadAssessment ────────────────────────────────────────────────────────

  /**
   * Load module metadata + check for an existing in-progress assessment.
   * Call this on the Assessment page mount.
   *
   * @param {string} moduleId
   * @param {string} [groupId]
   */
  const loadAssessment = useCallback(
    async (moduleId, groupId) => {
      if (!moduleId || !user?.uid) return;

      setLoadingBoth(true);
      setLocalError(null);

      try {
        // 1. Fetch module
        let mod = null;
        try {
          mod = await getModule(moduleId);
        } catch {
          // Offline mode — mod stays null
        }
        setModule(mod);

        // 2. Fetch questions
        const qs = await getModuleQuestions(moduleId);
        setQuestions(qs);

        // 3. Look for an existing in-progress assessment for this user+module
        try {
          const userAssessments = await getAssessmentsByUser(user.uid);
          const existing = userAssessments.find(
            (a) =>
              a.moduleId === moduleId &&
              (a.status === 'pending' || a.status === 'in_progress')
          );
          if (existing) {
            startAssessment({ ...existing, totalQuestions: qs.length });
            setExistingAnswers(existing.answers ?? {});
          }
        } catch {
          // No existing assessment found or Firestore unavailable
        }
      } catch (err) {
        setErrorBoth(err?.message ?? 'Failed to load assessment');
      } finally {
        setLoadingBoth(false);
      }
    },
    [user?.uid, getModuleQuestions, setLoadingBoth, setErrorBoth, startAssessment]
  );

  // ─── startAssessment (create new) ─────────────────────────────────────────

  /**
   * Create a new assessment document in Firestore and initialize local state.
   *
   * @param {string} moduleId
   * @param {string} [groupId]
   * @returns {Promise<string>} assessmentId
   */
  const createNewAssessment = useCallback(
    async (moduleId, groupId) => {
      if (!user?.uid) throw new Error('User not authenticated');

      setLoadingBoth(true);
      try {
        const qs = await getModuleQuestions(moduleId);
        setQuestions(qs);

        let assessmentId = `local_${Date.now()}`;
        try {
          assessmentId = await createAssessment({
            uid: user.uid,
            moduleId: moduleId ?? 'sample',
            groupId: groupId ?? null,
            totalQuestions: qs.length,
          });
        } catch {
          // Offline mode — use local ID
        }

        const assessmentObj = {
          id: assessmentId,
          uid: user.uid,
          moduleId,
          groupId: groupId ?? null,
          answers: {},
          totalQuestions: qs.length,
          status: 'in_progress',
        };

        startAssessment(assessmentObj);
        setExistingAnswers({});
        return assessmentId;
      } catch (err) {
        setErrorBoth(err?.message ?? 'Failed to create assessment');
        throw err;
      } finally {
        setLoadingBoth(false);
      }
    },
    [user?.uid, getModuleQuestions, setLoadingBoth, setErrorBoth, startAssessment]
  );

  // ─── resumeAssessment ─────────────────────────────────────────────────────

  /**
   * Load an existing assessment by ID and restore its state.
   *
   * @param {string} assessmentId
   */
  const resumeAssessment = useCallback(
    async (assessmentId) => {
      if (!assessmentId || !user?.uid) return;
      if (currentAssessment?.id === assessmentId) return; // Already loaded

      setLoadingBoth(true);
      try {
        const assessment = await getAssessment(assessmentId);
        if (!assessment) {
          setErrorBoth('Assessment not found');
          return;
        }

        const qs = await getModuleQuestions(assessment.moduleId);
        setQuestions(qs);

        startAssessment({ ...assessment, totalQuestions: qs.length });
        setExistingAnswers(assessment.answers ?? {});
      } catch (err) {
        setErrorBoth(err?.message ?? 'Failed to resume assessment');
      } finally {
        setLoadingBoth(false);
      }
    },
    [user?.uid, currentAssessment?.id, getModuleQuestions, setLoadingBoth, setErrorBoth, startAssessment]
  );

  // ─── saveAnswer ───────────────────────────────────────────────────────────

  /**
   * Save a single answer — updates local store optimistically and persists to
   * Firestore in the background.
   *
   * @param {string} questionId
   * @param {number} value
   * @param {string} [dimension]  - 'D' | 'I' | 'S' | 'C'
   */
  const saveAnswer = useCallback(
    async (questionId, value, dimension) => {
      const answer = { value, dimension: dimension ?? null, savedAt: new Date().toISOString() };

      // Optimistic local update
      setAnswer(questionId, answer);

      // Background Firestore persist
      if (currentAssessment?.id && !currentAssessment.id.startsWith('local_')) {
        try {
          await saveAnswerInDB(currentAssessment.id, questionId, answer);
        } catch (err) {
          console.error('[useAssessment] Failed to persist answer:', err);
          // Non-blocking — local state is preserved
        }
      }
    },
    [currentAssessment?.id, setAnswer]
  );

  // ─── submitAssessment ─────────────────────────────────────────────────────

  /**
   * Submit the completed assessment and trigger AI analysis.
   *
   * @param {Array}  answersArray     - [{ questionId, value, dimension, weight }]
   * @param {string} [moduleObjective] - Context for AI analysis
   * @param {string} [language]        - 'ptBR' | 'en' | 'es'
   * @returns {Promise<object>} profileResult
   */
  const submitAssessment = useCallback(
    async (answersArray, moduleObjective, language = 'ptBR') => {
      if (!user?.uid) throw new Error('User not authenticated');

      setLoadingBoth(true);
      try {
        // 1. Persist all answers and mark as submitted
        if (currentAssessment?.id && !currentAssessment.id.startsWith('local_')) {
          const answersMap = (answersArray ?? []).reduce((acc, a) => {
            acc[a.questionId] = { value: a.value, dimension: a.dimension, weight: a.weight };
            return acc;
          }, {});
          await submitAssessmentInDB(currentAssessment.id, answersMap);
        }
        markSubmitted();

        // 2. AI analysis
        const analysisResult = await analyzeResponse({
          assessmentId: currentAssessment?.id ?? 'demo',
          answers: answersArray,
          uid: user.uid,
          moduleObjective: moduleObjective ?? null,
          language,
        });

        // 3. Build full behavioral profile
        const profileResult = await buildProfile({
          uid: user.uid,
          assessmentId: currentAssessment?.id ?? 'demo',
          scores: analysisResult?.scores,
          language,
        });

        // 4. Update profile store
        setProfile(profileResult?.profile ?? null);
        markAnalyzed();

        return profileResult;
      } catch (err) {
        setErrorBoth(err?.message ?? 'Failed to submit assessment');
        throw err;
      } finally {
        setLoadingBoth(false);
      }
    },
    [
      user?.uid,
      currentAssessment,
      markSubmitted,
      markAnalyzed,
      setProfile,
      setLoadingBoth,
      setErrorBoth,
    ]
  );

  // ─── loadHistory ──────────────────────────────────────────────────────────

  /**
   * Fetch all assessments for the current user.
   *
   * @returns {Promise<Array>}
   */
  const loadHistory = useCallback(async () => {
    if (!user?.uid) return [];
    try {
      return await getAssessmentsByUser(user.uid);
    } catch (err) {
      setErrorBoth(err?.message ?? 'Failed to load history');
      return [];
    }
  }, [user?.uid, setErrorBoth]);

  // ─── Expose combined loading/error (store + local) ────────────────────────

  const combinedLoading = loading || storeLoading;
  const combinedError = error || storeError;

  return {
    // State
    loading: combinedLoading,
    error: combinedError,
    module,
    questions,
    existingAnswers,
    assessment: currentAssessment,
    answers,
    progress,
    status,

    // Actions
    loadAssessment,
    startAssessment: createNewAssessment,
    resumeAssessment,
    saveAnswer,
    submitAssessment,
    resetAssessment,
    loadHistory,
    getModuleQuestions,

    // Selectors
    getAnswer,
    isComplete,
    answeredCount,
  };
}

export default useAssessment;
