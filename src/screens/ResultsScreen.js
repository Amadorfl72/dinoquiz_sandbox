'use strict';

/**
 * Results ("Resultados") screen: score (X/10), stars by tier, an always-
 * positive motivational message, a prominent "Volver a jugar" button and an
 * optional secondary "Salir" button. All copy comes from the i18n resource
 * (see src/i18n) — no hardcoded strings here, per AC-15.
 *
 * Accessibility: the full summary (score + stars + message) is duplicated
 * into a single `role="status"`/`aria-live="polite"` region so screen
 * readers announce it as one coherent sentence as soon as the screen
 * renders, in addition to the visible elements being individually readable.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');

const MIN_SCORE = 0;
const MAX_SCORE = 10;
const MAX_STARS = 3;

// Star tiers per the PRD: 0-3 -> 1 star, 4-6 -> 2 stars, 7-10 -> 3 stars.
const STAR_TIERS = Object.freeze([
  { maxScore: 3, stars: 1 },
  { maxScore: 6, stars: 2 },
  { maxScore: MAX_SCORE, stars: 3 },
]);

// Content-guide guard: words that would read as negative/discouraging to a
// 6-8 year old. Motivational messages must never contain any of these
// (matched as whole, accent-stripped words, not substrings).
const BANNED_WORDS = new Set([
  'mal',
  'malo',
  'mala',
  'malos',
  'malas',
  'fallo',
  'fallos',
  'fallaste',
  'fallar',
  'fallado',
  'perdiste',
  'perder',
  'perdido',
  'error',
  'errores',
  'incorrecto',
  'incorrecta',
  'triste',
  'nunca',
  'fracaso',
  'fracasar',
  'peor',
  'pena',
  'lastima',
  'lento',
  'lenta',
  'torpe',
  'tonto',
  'tonta',
]);

function normalizeToWords(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function calculateStars(score) {
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new Error(`score must be an integer between ${MIN_SCORE} and ${MAX_SCORE}, got ${score}`);
  }

  const tier = STAR_TIERS.find((candidate) => score <= candidate.maxScore);
  return tier.stars;
}

function validateMotivationalMessages(messages) {
  const errors = [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return ['messages must be a non-empty array of strings'];
  }

  messages.forEach((message, index) => {
    if (typeof message !== 'string' || message.trim() === '') {
      errors.push(`message at index ${index} must be a non-empty string`);
      return;
    }

    const words = normalizeToWords(message);
    const bannedWordsFound = words.filter((word) => BANNED_WORDS.has(word));
    if (bannedWordsFound.length > 0) {
      errors.push(
        `message at index ${index} ("${message}") contains negative language: ${bannedWordsFound.join(', ')}`
      );
    }
  });

  return errors;
}

function selectMotivationalMessage(messages, randomFn = Math.random) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array of strings');
  }

  const index = Math.floor(randomFn() * messages.length);
  const safeIndex = Math.min(Math.max(index, 0), messages.length - 1);
  return messages[safeIndex];
}

function formatTemplate(template, values) {
  return Object.keys(values).reduce(
    (result, key) => result.split(`{${key}}`).join(values[key]),
    template
  );
}

function renderResultsScreen(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { results: strings } = getStrings(locale);

  if (!Number.isInteger(options.score) || options.score < MIN_SCORE || options.score > MAX_SCORE) {
    throw new Error(`options.score must be an integer between ${MIN_SCORE} and ${MAX_SCORE}`);
  }

  const score = options.score;
  const total = MAX_SCORE;
  const stars = calculateStars(score);
  const showExitButton = options.showExitButton !== false;
  const message = options.message || selectMotivationalMessage(strings.messages, options.randomFn);

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'results-screen';

  const heading = document.createElement('h1');
  heading.className = 'results-screen__heading';
  heading.textContent = strings.heading;

  const scoreEl = document.createElement('p');
  scoreEl.className = 'results-screen__score';
  scoreEl.textContent = formatTemplate(strings.scoreFormat, { score, total });

  const starsEl = document.createElement('div');
  starsEl.className = 'results-screen__stars';
  starsEl.setAttribute('role', 'img');
  starsEl.setAttribute('aria-label', formatTemplate(strings.starsLabel, { stars, maxStars: MAX_STARS }));
  starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(MAX_STARS - stars);

  const messageEl = document.createElement('p');
  messageEl.className = 'results-screen__message';
  messageEl.textContent = message;

  const announcementEl = document.createElement('p');
  announcementEl.className = 'results-screen__announcement sr-only';
  announcementEl.setAttribute('role', 'status');
  announcementEl.setAttribute('aria-live', 'polite');
  announcementEl.textContent = formatTemplate(strings.summaryAnnouncement, {
    score,
    total,
    stars,
    maxStars: MAX_STARS,
    message,
  });

  const actions = document.createElement('div');
  actions.className = 'results-screen__actions';

  const playAgainButton = document.createElement('button');
  playAgainButton.type = 'button';
  playAgainButton.className = 'results-screen__play-again-button';
  playAgainButton.textContent = strings.playAgainButton;
  if (typeof options.onPlayAgain === 'function') {
    playAgainButton.addEventListener('click', options.onPlayAgain);
  }
  actions.appendChild(playAgainButton);

  let exitButton = null;
  if (showExitButton) {
    exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.className = 'results-screen__exit-button';
    exitButton.textContent = strings.exitButton;
    if (typeof options.onExit === 'function') {
      exitButton.addEventListener('click', options.onExit);
    }
    actions.appendChild(exitButton);
  }

  root.appendChild(heading);
  root.appendChild(scoreEl);
  root.appendChild(starsEl);
  root.appendChild(messageEl);
  root.appendChild(announcementEl);
  root.appendChild(actions);
  container.appendChild(root);

  return { root, scoreEl, starsEl, messageEl, announcementEl, playAgainButton, exitButton };
}

module.exports = {
  MIN_SCORE,
  MAX_SCORE,
  MAX_STARS,
  STAR_TIERS,
  BANNED_WORDS,
  calculateStars,
  validateMotivationalMessages,
  selectMotivationalMessage,
  renderResultsScreen,
};
