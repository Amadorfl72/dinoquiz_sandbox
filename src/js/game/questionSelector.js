/**
 * Question selection logic.
 * Picks 10 random questions from the pool without repetition and shuffles
 * the answer options for each question.
 */

import { shuffle } from '../utils/shuffle.js';

/** Number of questions per game */
export const QUESTIONS_PER_GAME = 10;

/**
 * Selects a random subset of questions from the pool and shuffles each
 * question's answer options.
 *
 * @param {Array<object>} pool - full question pool (typically 30 items)
 * @param {number} [count] - number of questions to select (default QUESTIONS_PER_GAME)
 * @returns {Array<object>} selected questions with shuffled options
 */
export function selectQuestions(pool, count = QUESTIONS_PER_GAME) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return [];
  }

  const actualCount = Math.min(count, pool.length);
  const selected = shuffle([...pool]).slice(0, actualCount);

  // For each selected question, shuffle the options while tracking the
  // correct answer index.
  return selected.map((question) => shuffleQuestionOptions(question));
}

/**
 * Shuffles the answer options of a single question and returns a new
 * question object with the updated correctIndex.
 *
 * @param {object} question - { prompt, options: string[], correctIndex: number, ... }
 * @returns {object} new question with shuffled options
 */
export function shuffleQuestionOptions(question) {
  const options = question.options ?? [];
  const correctText = options[question.correctIndex];

  const shuffledOptions = shuffle([...options]);
  const newCorrectIndex = shuffledOptions.indexOf(correctText);

  return {
    ...question,
    options: shuffledOptions,
    correctIndex: newCorrectIndex,
  };
}
