'use strict';

/**
 * Random question selection engine for a new game (TRIOFSND-71).
 *
 * Picks QUESTIONS_PER_GAME questions out of the full bank using a
 * Fisher-Yates shuffle, so every question in the bank has an equal chance of
 * being picked and, per AC-3, none of the 10 selected questions repeats
 * within the same game.
 */

const QUESTIONS_PER_GAME = 10;

/** Fisher-Yates shuffle; does not mutate the input array. `randomFn` is injectable for tests. */
function shuffle(items, randomFn = Math.random) {
  const shuffled = items.slice();

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Selects `count` unique questions at random from `questions`, with no
 * repetition within the resulting selection. Throws if the bank does not
 * contain enough questions to satisfy `count`.
 */
function selectGameQuestions(questions, options = {}) {
  const count = options.count !== undefined ? options.count : QUESTIONS_PER_GAME;
  const randomFn = options.randomFn || Math.random;

  if (!Array.isArray(questions)) {
    throw new Error('selectGameQuestions requires an array of questions');
  }

  if (questions.length < count) {
    throw new Error(
      `selectGameQuestions requires at least ${count} questions, found ${questions.length}`
    );
  }

  return shuffle(questions, randomFn).slice(0, count);
}

module.exports = {
  QUESTIONS_PER_GAME,
  shuffle,
  selectGameQuestions,
};
