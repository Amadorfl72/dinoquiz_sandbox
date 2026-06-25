import { useState, useEffect, useCallback, useRef } from 'react';
import { getBestScore, evaluateBestScore, BEST_SCORE_KEY } from '../utils/storage';

/**
 * Hook principal del juego DinoQuiz.
 * Gestiona el estado de la partida, la puntuación y la sincronización
 * de la mejor puntuación con localStorage.
 *
 * Correcciones TRIOFSND-40:
 * - La comparación de mejor puntuación ya no está invertida.
 * - Se valida que las puntuaciones sean numéricas antes de comparar.
 * - Se sincroniza el estado entre pestañas mediante el evento 'storage'.
 * - Se maneja el caso de localStorage no disponible de forma elegante.
 */
export function useGame() {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScoreState] = useState(() => getBestScore());
  const [isNewBestScore, setIsNewBestScore] = useState(false);
  const [gameState, setGameState] = useState('start'); // 'start' | 'playing' | 'gameover'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);

  // Ref para evitar sincronización redundante
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Sincroniza bestScore entre pestañas usando el evento 'storage'.
   * Cuando otra pestaña actualiza localStorage, esta pestaña
   * actualiza su estado para mantener consistencia.
   */
 useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === BEST_SCORE_KEY && isMountedRef.current) {
        const newValue = parseInt(event.newValue, 10);
        if (!Number.isNaN(newValue)) {
          setBestScoreState(Math.max(0, newValue));
        }
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Maneja el fin de partida: compara la puntuación actual con
   * la mejor guardada y actualiza localStorage SOLO si es mayor.
   *
   * @param {number} finalScore - puntuación final de la partida
   * @returns {{ isNewBestScore: boolean, bestScore: number }}
   */
  const handleGameOver = useCallback((finalScore) => {
    // Asegurar que finalScore sea numérico antes de procesar
    const numericScore = parseInt(finalScore, 10);

    if (Number.isNaN(numericScore)) {
      // Si la puntuación no es válida, no actualizar nada
      const currentBest = getBestScore();
      setIsNewBestScore(false);
      setBestScoreState(currentBest);
      setGameState('gameover');
      return { isNewBestScore: false, bestScore: currentBest };
    }

    // evaluateBestScore compara numericScore > bestScore (no invertido)
    // y actualiza localStorage solo si es mayor
    const result = evaluateBestScore(numericScore);

    if (isMountedRef.current) {
      setIsNewBestScore(result.isNewBestScore);
      setBestScoreState(result.bestScore);
      setGameState('gameover');
    }

    return result;
  }, []);

  /**
   * Inicia una nueva partida: resetea puntuación, estado de nueva
   * mejor puntuación y selecciona preguntas aleatorias.
   */
  const startGame = useCallback((questionPool) => {
    setScore(0);
    setIsNewBestScore(false);
    setCurrentQuestionIndex(0);

    // Seleccionar 10 preguntas aleatorias sin repetición
    const shuffled = [...questionPool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    setQuestions(selected);
    setGameState('playing');
  }, []);

  /**
   * Registra una respuesta correcta incrementando la puntuación.
   */
  const registerCorrectAnswer = useCallback(() => {
    setScore((prev) => {
      const newScore = parseInt(prev, 10) + 1;
      return Number.isNaN(newScore) ? 0 : newScore;
    });
  }, []);

  /**
   * Avanza a la siguiente pregunta o finaliza la partida.
   */
  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prevIndex) => {
      const next = prevIndex + 1;
      if (next >= questions.length) {
        // Fin de partida: usar la puntuación actual del estado
        // Se llama a handleGameOver desde un efecto para evitar
        // usar score stale en el callback
        return prevIndex;
      }
      return next;
    });
  }, [questions.length]);

  /**
   * Finaliza la partida usando la puntuación actual.
   * Se llama explícitamente cuando se responde la última pregunta.
   */
  const finishGame = useCallback(() => {
    // Usar el valor numérico más reciente de score
    setScore((currentScoreValue) => {
      handleGameOver(currentScoreValue);
      return currentScoreValue;
    });
  }, [handleGameOver]);

  /**
   * Vuelve a la pantalla de inicio.
   */
  const backToStart = useCallback(() => {
    setGameState('start');
    setScore(0);
    setIsNewBestScore(false);
    setCurrentQuestionIndex(0);
    setQuestions([]);
  }, []);

  return {
    score,
    bestScore,
    isNewBestScore,
    gameState,
    currentQuestionIndex,
    questions,
    startGame,
    registerCorrectAnswer,
    nextQuestion,
    finishGame,
    handleGameOver,
    backToStart,
  };
}
