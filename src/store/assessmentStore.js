import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useAssessmentStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ─── State ───────────────────────────────────────────────────────────
        currentAssessment: null,
        answers: {},
        progress: 0,
        totalQuestions: 0,
        status: 'idle', // 'idle' | 'in_progress' | 'submitted' | 'analyzed'
        loading: false,
        error: null,
        lastSavedAt: null,

        // ─── Actions ─────────────────────────────────────────────────────────

        /**
         * Initialize a new assessment session
         * @param {object} assessment - Assessment document from Firestore
         */
        startAssessment: (assessment) =>
          set(
            {
              currentAssessment: assessment,
              answers: assessment.answers || {},
              totalQuestions: assessment.totalQuestions || 0,
              progress: calculateProgress(
                assessment.answers || {},
                assessment.totalQuestions || 0
              ),
              status: 'in_progress',
              loading: false,
              error: null,
            },
            false,
            'assessment/startAssessment'
          ),

        /**
         * Record an answer for a specific question
         * @param {string} questionId
         * @param {{ most: string, least: string }} answer
         */
        setAnswer: (questionId, answer) =>
          set(
            (state) => {
              const newAnswers = { ...state.answers, [questionId]: answer };
              return {
                answers: newAnswers,
                progress: calculateProgress(newAnswers, state.totalQuestions),
                lastSavedAt: new Date().toISOString(),
              };
            },
            false,
            'assessment/setAnswer'
          ),

        /**
         * Update progress percentage manually
         * @param {number} value - 0 to 100
         */
        setProgress: (value) =>
          set({ progress: Math.min(100, Math.max(0, value)) }, false, 'assessment/setProgress'),

        /**
         * Mark assessment as submitted
         */
        markSubmitted: () =>
          set({ status: 'submitted' }, false, 'assessment/markSubmitted'),

        /**
         * Mark assessment as analyzed (results available)
         */
        markAnalyzed: () =>
          set({ status: 'analyzed' }, false, 'assessment/markAnalyzed'),

        /**
         * Reset assessment state (e.g., on logout or completion)
         */
        resetAssessment: () =>
          set(
            {
              currentAssessment: null,
              answers: {},
              progress: 0,
              totalQuestions: 0,
              status: 'idle',
              loading: false,
              error: null,
              lastSavedAt: null,
            },
            false,
            'assessment/resetAssessment'
          ),

        setLoading: (loading) =>
          set({ loading }, false, 'assessment/setLoading'),

        setError: (error) =>
          set({ error, loading: false }, false, 'assessment/setError'),

        // ─── Selectors ───────────────────────────────────────────────────────
        getAnswer: (questionId) => get().answers[questionId] || null,
        isComplete: () => get().progress >= 100,
        answeredCount: () => Object.keys(get().answers).length,
      }),
      {
        name: 'profileai-assessment',
        partialize: (state) => ({
          currentAssessment: state.currentAssessment,
          answers: state.answers,
          progress: state.progress,
          totalQuestions: state.totalQuestions,
          status: state.status,
          lastSavedAt: state.lastSavedAt,
        }),
      }
    ),
    { name: 'AssessmentStore' }
  )
);

function calculateProgress(answers, totalQuestions) {
  if (!totalQuestions || totalQuestions === 0) return 0;
  return Math.round((Object.keys(answers).length / totalQuestions) * 100);
}

export default useAssessmentStore;
