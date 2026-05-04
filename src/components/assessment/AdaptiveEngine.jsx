import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { ESTIMATED_TOTAL, MIN_QUESTIONS, MIN_PER_DIMENSION } from '@/constants/sampleQuestions.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 3;
const SCORE_THRESHOLD_UP = 0.75;
const SCORE_THRESHOLD_DOWN = 0.40;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Computes the max possible value for a question type */
function getMaxValue(question) {
  if (question.type === 'likert5') return 5;
  if (!question.options || question.options.length === 0) return 4;
  return Math.max(...question.options.map((o) => o.value));
}

/** Weighted average score across all answered questions, normalized 0–1 */
function computeCurrentScore(answers, questions) {
  if (answers.length === 0) return 0.5;
  const totalWeight = answers.reduce((acc, a) => acc + (a.weight ?? 1), 0);
  if (totalWeight === 0) return 0.5;
  const weightedSum = answers.reduce((acc, a) => {
    const q = questions.find((q) => q.id === a.questionId);
    if (!q) return acc;
    const maxVal = getMaxValue(q);
    const normalized = maxVal > 0 ? a.value / maxVal : 0;
    return acc + normalized * (a.weight ?? 1);
  }, 0);
  return weightedSum / totalWeight;
}

/** Counts answers per dimension */
function computeDimensionCounts(answers) {
  return answers.reduce(
    (acc, a) => {
      if (a.dimension && acc[a.dimension] !== undefined) {
        acc[a.dimension]++;
      }
      return acc;
    },
    { D: 0, I: 0, S: 0, C: 0 }
  );
}

/** Computes normalized scores per dimension (0–100) */
function computeDimensionScores(answers, questions) {
  const dims = { D: [], I: [], S: [], C: [] };
  answers.forEach((a) => {
    if (!a.dimension || !dims[a.dimension]) return;
    const q = questions.find((q) => q.id === a.questionId);
    if (!q) return;
    const maxVal = getMaxValue(q);
    const normalized = maxVal > 0 ? (a.value / maxVal) * 100 : 0;
    dims[a.dimension].push({ normalized, weight: a.weight ?? 1 });
  });

  const result = {};
  Object.entries(dims).forEach(([dim, entries]) => {
    if (entries.length === 0) {
      result[dim] = 0;
      return;
    }
    const totalWeight = entries.reduce((acc, e) => acc + e.weight, 0);
    const weightedSum = entries.reduce((acc, e) => acc + e.normalized * e.weight, 0);
    result[dim] = Math.round(weightedSum / totalWeight);
  });
  return result;
}

/** Select next question given current difficulty and answered IDs */
function selectNextQuestion(questions, answeredIds, difficulty) {
  const pool = questions.filter((q) => !answeredIds.includes(q.id));
  if (pool.length === 0) return null;

  // Try exact difficulty first
  const atDifficulty = pool.filter((q) => q.difficulty === difficulty);
  if (atDifficulty.length > 0) {
    const idx = Math.floor(Math.random() * atDifficulty.length);
    return atDifficulty[idx];
  }

  // Try adjacent difficulties
  for (let delta = 1; delta <= 2; delta++) {
    const candidates = pool.filter(
      (q) =>
        q.difficulty === difficulty + delta ||
        q.difficulty === difficulty - delta
    );
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx];
    }
  }

  // Fallback: any remaining question
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Determine if the assessment should stop */
function checkCompletion(answers, totalQuestions, dimensionCounts) {
  const allAnswered = totalQuestions > 0 && answers.length >= totalQuestions;
  const metMinimum = answers.length >= MIN_QUESTIONS;
  const allDimensionsCovered = Object.values(dimensionCounts).every(
    (count) => count >= MIN_PER_DIMENSION
  );
  return allAnswered || (metMinimum && allDimensionsCovered);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  answers: [],           // [{ questionId, value, dimension, weight }]
  currentDifficulty: 1,
  currentQuestion: null,
  isComplete: false,
};

function engineReducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      const { questions } = action.payload;
      const firstQuestion = selectNextQuestion(questions, [], 1);
      return {
        ...state,
        answers: [],
        currentDifficulty: 1,
        currentQuestion: firstQuestion,
        isComplete: false,
      };
    }

    case 'RESTORE': {
      const { savedState, questions } = action.payload;
      const answeredIds = savedState.answers.map((a) => a.questionId);
      const score = computeCurrentScore(savedState.answers, questions);
      let difficulty = savedState.currentDifficulty ?? 1;

      // Adjust difficulty from restored score
      if (score >= SCORE_THRESHOLD_UP) difficulty = Math.min(difficulty, MAX_DIFFICULTY);
      if (score < SCORE_THRESHOLD_DOWN) difficulty = Math.max(difficulty, MIN_DIFFICULTY);

      const dimensionCounts = computeDimensionCounts(savedState.answers);
      const complete = checkCompletion(
        savedState.answers,
        questions.length,
        dimensionCounts
      );
      const nextQ = complete
        ? null
        : selectNextQuestion(questions, answeredIds, difficulty);

      return {
        answers: savedState.answers,
        currentDifficulty: difficulty,
        currentQuestion: nextQ,
        isComplete: complete,
      };
    }

    case 'SUBMIT_ANSWER': {
      const { questionId, value, questions } = action.payload;
      const question = questions.find((q) => q.id === questionId);
      if (!question) return state;

      const newAnswer = {
        questionId,
        value,
        dimension: question.dimension,
        weight: question.weight ?? 1,
      };
      const newAnswers = [...state.answers, newAnswer];
      const answeredIds = newAnswers.map((a) => a.questionId);

      // Adjust difficulty
      const score = computeCurrentScore(newAnswers, questions);
      let newDifficulty = state.currentDifficulty;
      if (score >= SCORE_THRESHOLD_UP) {
        newDifficulty = Math.min(state.currentDifficulty + 1, MAX_DIFFICULTY);
      } else if (score < SCORE_THRESHOLD_DOWN) {
        newDifficulty = Math.max(state.currentDifficulty - 1, MIN_DIFFICULTY);
      }

      // Check completion
      const dimensionCounts = computeDimensionCounts(newAnswers);
      const complete = checkCompletion(newAnswers, questions.length, dimensionCounts);
      const nextQ = complete
        ? null
        : selectNextQuestion(questions, answeredIds, newDifficulty);

      return {
        answers: newAnswers,
        currentDifficulty: newDifficulty,
        currentQuestion: nextQ,
        isComplete: complete,
      };
    }

    case 'RESET': {
      const { questions } = action.payload;
      const firstQuestion = selectNextQuestion(questions, [], 1);
      return {
        answers: [],
        currentDifficulty: 1,
        currentQuestion: firstQuestion,
        isComplete: false,
      };
    }

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAdaptiveEngine
 *
 * Adaptive DISC assessment engine that selects questions based on performance.
 *
 * @param {Array}  questions  - Array of question objects with { id, difficulty, dimension, type, text, options, weight }
 * @param {string} moduleId   - Module identifier for sessionStorage keying
 */
export function useAdaptiveEngine(questions = [], moduleId = 'default') {
  const storageKey = `assessment_${moduleId}`;

  const [state, dispatch] = useReducer(engineReducer, initialState);

  // ─── Initialize or restore from sessionStorage ──────────────────────────────
  useEffect(() => {
    if (!questions || questions.length === 0) return;

    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      try {
        const savedState = JSON.parse(raw);
        if (savedState?.answers?.length > 0) {
          dispatch({ type: 'RESTORE', payload: { savedState, questions } });
          return;
        }
      } catch {
        // Corrupted storage — start fresh
      }
    }
    dispatch({ type: 'INIT', payload: { questions } });
  }, [questions, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist state to sessionStorage on every change ───────────────────────
  useEffect(() => {
    if (state.answers.length === 0 && !state.currentQuestion) return;
    const toSave = {
      answers: state.answers,
      currentDifficulty: state.currentDifficulty,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(toSave));
  }, [state.answers, state.currentDifficulty, storageKey]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const dimensionScores = useMemo(
    () => computeDimensionScores(state.answers, questions),
    [state.answers, questions]
  );

  const dimensionCounts = useMemo(
    () => computeDimensionCounts(state.answers),
    [state.answers]
  );

  const answeredCount = state.answers.length;

  const progress = useMemo(() => {
    const total = Math.max(questions.length, ESTIMATED_TOTAL);
    const percent = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;
    return {
      answered: answeredCount,
      total: ESTIMATED_TOTAL,
      percent,
    };
  }, [answeredCount, questions.length]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const submitAnswer = useCallback(
    (questionId, value) => {
      dispatch({ type: 'SUBMIT_ANSWER', payload: { questionId, value, questions } });
    },
    [questions]
  );

  const reset = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    dispatch({ type: 'RESET', payload: { questions } });
  }, [questions, storageKey]);

  const getResults = useCallback(() => {
    const scores = computeDimensionScores(state.answers, questions);
    const dominantProfile =
      Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'D';
    return {
      scores,
      answers: state.answers,
      dominantProfile,
      dimensionCounts,
    };
  }, [state.answers, questions, dimensionCounts]);

  return {
    currentQuestion: state.currentQuestion,
    progress,
    currentDifficulty: state.currentDifficulty,
    dimensionScores,
    isComplete: state.isComplete,
    answeredCount,
    submitAnswer,
    reset,
    getResults,
  };
}

export default useAdaptiveEngine;
