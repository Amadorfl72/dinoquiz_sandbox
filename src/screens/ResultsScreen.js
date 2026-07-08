'use strict';

/**
 * Results ("Resultados") screen: final score, stars, an always-positive
 * motivational message, the primary "Volver a jugar" action and the
 * secondary "Salir" action. All copy comes from the i18n resource (see
 * src/i18n) — no hardcoded strings here, per AC-15.
 *
 * "Volver a jugar" resets the game state (score, question index, answers)
 * via `resetGameState()` and navigates to the first question via
 * `navigateTo(SCREENS.QUESTION)` before calling the optional `onPlayAgain`
 * callback (used by the caller to actually swap the rendered screen).
 * "Salir" navigates to the home screen before calling the optional
 * `onExit` callback.
 *
 * Stars follow the AC-8 tramos: 0-3 -> 1 star, 4-6 -> 2 stars, 7-10 -> 3
 * stars. The star count and message tier are keyed off the raw score, not
 * `totalQuestions`, since a DinoQuiz game is always 10 questions (see PRD).
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');
const { resetGameState } = require('../game/gameState');
const { SCREENS, navigateTo } = require('../navigation/navigator');

const DEFAULT_TOTAL_QUESTIONS = 10;
const LOW_SCORE_MAX = 3;
const MID_SCORE_MAX = 6;

function getStarCount(score) {
  if (score <= LOW_SCORE_MAX) return 1;
  if (score <= MID_SCORE_MAX) return 2;
  return 3;
}

function getMessageTier(score) {
  if (score <= LOW_SCORE_MAX) return 'low';
  if (score <= MID_SCORE_MAX) return 'mid';
  return 'high';
}

function interpolate(template, values) {
  return Object.keys(values).reduce(
    (text, key) => text.replace(`{${key}}`, values[key]),
    template
  );
}

function renderResultsScreen(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { results: strings } = getStrings(locale);

  const totalQuestions = Number.isInteger(options.totalQuestions)
    ? options.totalQuestions
    : DEFAULT_TOTAL_QUESTIONS;
  const rawScore = Number.isInteger(options.score) ? options.score : 0;
  const score = Math.max(0, Math.min(totalQuestions, rawScore));

  const onPlayAgain = typeof options.onPlayAgain === 'function' ? options.onPlayAgain : () => {};
  const onExit = typeof options.onExit === 'function' ? options.onExit : () => {};

  const starCount = getStarCount(score);
  const messageTier = getMessageTier(score);

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'results-screen';

  const title = document.createElement('h1');
  title.className = 'results-screen__title';
  title.textContent = strings.title;

  const scoreText = document.createElement('p');
  scoreText.className = 'results-screen__score';
  scoreText.textContent = interpolate(strings.scoreLabel, { score, total: totalQuestions });

  const stars = document.createElement('p');
  stars.className = 'results-screen__stars';
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', interpolate(strings.starsLabel, { stars: starCount }));
  stars.textContent = '⭐'.repeat(starCount);

  const message = document.createElement('p');
  message.className = 'results-screen__message';
  message.textContent = strings.messages[messageTier];

  const playAgainButton = document.createElement('button');
  playAgainButton.type = 'button';
  playAgainButton.className = 'results-screen__play-again-button';
  playAgainButton.textContent = strings.playAgainButton;
  playAgainButton.addEventListener('click', () => {
    resetGameState();
    navigateTo(SCREENS.QUESTION);
    onPlayAgain();
  });

  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.className = 'results-screen__exit-button';
  exitButton.textContent = strings.exitButton;
  exitButton.addEventListener('click', () => {
    navigateTo(SCREENS.HOME);
    onExit();
  });

  root.appendChild(title);
  root.appendChild(scoreText);
  root.appendChild(stars);
  root.appendChild(message);
  root.appendChild(playAgainButton);
  root.appendChild(exitButton);
  container.appendChild(root);

  return { root, scoreText, stars, message, playAgainButton, exitButton };
}

module.exports = { renderResultsScreen, getStarCount, getMessageTier };
