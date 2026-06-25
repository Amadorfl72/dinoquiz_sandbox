/**
 * questionSelector.js
 * Handles selection and shuffling of questions for a new game session.
 * Ensures 10 random questions from the pool of 30, with shuffled answer options.
 */

import { TOTAL_QUESTIONS_PER_GAME } from './gameState.js';

/**
 * Fisher-Yates shuffle (in-place for a copy).
 * @param {Array} array
 * @returns {Array} A new shuffled array.
   */
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Shuffles the answer options of a question while tracking the correct answer index.
 * @param {Object} question - Question with `options` array and `correctAnswer` index.
 * @returns {Object} A new question object with shuffled options and updated correctAnswer.
 */
function shuffleOptions(question) {
  // Build pairs of [option, isCorrect] then shuffle
  const indexedOptions = question.options.map((option, index) => ({
    text: option,
    isCorrect: index === question.correctAnswer,
  }));
  const shuffled = shuffle(indexedOptions);
  const newCorrectIndex = shuffled.findIndex((o) => o.isCorrect);
  return {
    ...question,
    options: shuffled.map((o) => o.text),
    correctAnswer: newCorrectIndex,
  };
}

/**
 * Selects 10 random questions from the pool and shuffles their answer options.
 * This is the core question selection logic invoked on game start and replay.
 *
 * Performance: operates on local data only, completes in <1ms for 30 questions,
 * well within the <2s response time requirement.
 *
 * @param {Array} questionPool - Full pool of ~30 question objects.
 * @returns {Array} 10 questions with shuffled options, ready for gameplay.
   */
function selectQuestions(questionPool) {
  if (!questionPool || questionPool.length === 0) {
    throw new Error('[DinoQuiz] Question pool is empty or not loaded.');
  }

  const availableCount = questionPool.length;
  const count = Math.min(TOTAL_QUESTIONS_PER_GAME, availableCount);

  // Shuffle the full pool and take the first `count` — guarantees no repeats (AC-3)
  const shuffledPool = shuffle(questionPool);
  const selected = shuffledPool.slice(0, count);

  // Shuffle answer options for each selected question (AC-4)
  return selected.map(shuffleOptions);
}

export { selectQuestions, shuffle, shuffleOptions };
