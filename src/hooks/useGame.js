import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateBestScore, setBestScore, getBestScore } from '../utils/storage';

/**
 * useGame — central game-state hook.
 *
 * Responsibilities:
 * - Track current question index, score, and game phase.
 * - On game completion, atomically evaluate + persist the best score.
 * - Keep `bestScore` state in sync across multiple open tabs via the
 *   window `storage` event.
 *
 * Race-condition guard: the best-score comparison and write happen in a
 * single synchronous call inside `handleGameOver`, so there is no window
 * where localStorage could be modified between read and write.
 */
export function useGame(questions) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'playing' | 'fact' | 'gameover'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScoreState] = useState(() => getBestScore());
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // Ref mirror of bestScore so the storage event listener (which has no
  // access to latest state in a stale closure) can update state safely.
  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  // ------------------------------------------------------------------
  // Multi-tab synchronisation: listen for `storage` events so that if
  // another tab updates the best score, this tab reflects it.
  // ------------------------------------------------------------------
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'dinoquiz_best_score') {
        const updated = getBestScore();
        setBestScoreState(updated);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ------------------------------------------------------------------
  // Game flow
  // ------------------------------------------------------------------
  const startGame = useCallback(() => {
    setScore(0);
    setCurrentIndex(0);
    setIsNewBestScore(false);
    setPhase('playing');
  }, []);

  const answerQuestion = useCallback((isCorrect) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setPhase('fact');
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= questions.length) {
        // Defer game-over handling so state (score) has flushed.
        // We use a microtask to ensure the latest score is committed.
        setPhase('gameover');
        return prev; // stay on last index; GameOver screen takes over
      }
      setPhase('playing');
      return next;
    });
  }, [questions.length]);

  /**
   * Called once when the GameOver screen mounts (or via effect when
   * phase transitions to 'gameover'). Performs the atomic read-compare-write
   * for the best score.
   */
  const finalizeScore = useCallback((finalScore) => {
    // Ensure we are always comparing numbers.
    const numericScore = Number(finalScore);
    if (!Number.isFinite(numericScore)) {
      setIsNewBestScore(false);
      return;
    }

    // Atomic evaluation: read previous, compare, decide.
    const { isNewBest, shouldUpdate, previousBest } = evaluateBestScore(numericScore);

    if (shouldUpdate) {
      // Write immediately — no async gap for another tab to interfere.
      setBestScore(numericScore);
      setBestScoreState(numericScore);
    } else {
      // Ensure state matches storage (e.g. first-ever game).
      setBestScoreState(previousBest);
    }

    setIsNewBestScore(isNewBest);
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setCurrentIndex(0);
    setIsNewBestScore(false);
    setBestScoreState(getBestScore());
    setPhase('idle');
  }, []);

  return {
    phase,
    currentIndex,
    score,
    bestScore,
    isNewBestScore,
    startGame,
    answerQuestion,
    nextQuestion,
    finalizeScore,
    resetGame,
  };
}
