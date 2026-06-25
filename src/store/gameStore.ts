import AsyncStorage from '@react-native-async-storage/async-storage';

const QUESTIONS_POOL_SIZE = 30;
const QUESTIONS_PER_GAME = 10;

// Mock questions pool for demonstration
const questionsPool = Array.from({ length: QUESTIONS_POOL_SIZE }, (_, i) => ({
  id: i,
  text: `Question ${i}`,
}));

/**
 * Selects 10 random questions from the pool using Fisher-Yates shuffle.
 * This implementation is O(n) and strictly bounded in time complexity,
 * avoiding unbounded retries or filtering loops.
 */
export const selectQuestions = (): Promise<any[]> => {
  return new Promise((resolve) => {
    const shuffled = [...questionsPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    resolve(shuffled.slice(0, QUESTIONS_PER_GAME));
  });
};

/**
 * Resets the game state by removing specific keys from AsyncStorage.
 * Avoids using AsyncStorage.clear() to prevent deleting unrelated app data.
 */
export const resetGameState = async (): Promise<void> => {
  const keysToRemove = [
    'current_game_state',
    'current_question_index',
    'current_score',
    'current_answers',
  ];
  try {
    await AsyncStorage.multiRemove(keysToRemove);
  } catch (error) {
    console.error('Failed to reset game state', error);
    // Fail gracefully without blocking the user
  }
};
