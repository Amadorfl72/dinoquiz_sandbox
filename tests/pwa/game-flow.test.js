'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { results: strings, question: questionStrings } = require('../../public/i18n/es.json');
const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');

function buildQuestion(id) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
  };
}

function buildQuestionBank(count) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`));
}

function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS (AC-6) — fast-forward
  // past it so walking through a whole game doesn't take real wall-clock time.
  jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('TRIOFSND-100: app-shell navigation Quiz -> Resultados -> Volver a jugar / Salir', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
  });

  afterEach(() => {
    container.remove();
  });

  test('resolveScreenRenderers resolves all three screens under Node/Jest', () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    expect(typeof renderers.renderHomeScreen).toBe('function');
    expect(typeof renderers.renderQuestionScreen).toBe('function');
    expect(typeof renderers.renderResultsScreen).toBe('function');
  });

  test('startNewGame walks through every question and lands on Resultados with the right score', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: true });
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Volver a jugar" resets game state and navigates to the first question of a new game', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      // First game: get every answer wrong (score stays 0), reach Resultados.
      startNewGame(container, renderers, questions, document, undefined, () => 0);
      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: false });
      }
      expect(container.textContent).toContain('0/10');

      // Replay with a different random seed so a different subset is picked (AC-9).
      getByRole(container, 'button', { name: strings.playAgainButton }).click();

      // We should now be back on a question screen (first question of the new
      // game), not still on Resultados, with a fresh, reset score of 0.
      expect(container.querySelector('.question-screen')).not.toBeNull();
      expect(container.querySelector('.results-screen')).toBeNull();
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);

      // Finish the replayed game to confirm the reset score (not the old
      // game's answers) drives the new result.
      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: true });
      }
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Salir" navigates back to Inicio', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStrings } = require('../../public/i18n/es.json');

    startNewGame(container, renderers, questions, document, undefined, () => 0);
    jest.useFakeTimers();
    try {
      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: true });
      }
    } finally {
      jest.useRealTimers();
    }
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: strings.exitButton }).click();

    // renderHome() resolves asynchronously (it awaits loadHomeStrings), so
    // let its promise chain settle before asserting on the DOM.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector('.results-screen')).toBeNull();
    expect(getByRole(container, 'button', { name: homeStrings.playButton })).toBeInTheDocument();
  });

  test("Home's '¡Jugar!' button starts a new game reaching the first question", () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      expect(container.querySelector('.question-screen')).not.toBeNull();
    });
  });

  test("TRIOFSND-67: Home's '¡Jugar!' button records the aggregated, non-PII partida_iniciada event and closes the tooltip immediately", () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(false),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(() => {
      expect(container.querySelector('.home-screen__tooltip')).not.toBeNull();

      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      // Immediate, synchronous transition off the same click: the tooltip is
      // gone and the first question is already on screen, no awaited step
      // in between.
      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
      expect(container.querySelector('.question-screen')).not.toBeNull();
      expect(storage.recordEvent).toHaveBeenCalledWith('partida_iniciada');
    });
  });
});

describe('TRIOFSND-95: end of game (pregunta 10) computes score and racha, then navigates to Resultados', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
  });

  afterEach(() => {
    container.remove();
  });

  /** Plays a full 10-question game following a hit/miss pattern (C = correct, F = wrong) and returns the options Resultados was rendered with. */
  function playGameWithPattern(pattern) {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);

    const capturedOptions = [];
    const renderResultsScreen = renderers.renderResultsScreen;
    renderers.renderResultsScreen = (resultsContainer, options) => {
      capturedOptions.push(options);
      return renderResultsScreen(resultsContainer, options);
    };

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0);
      pattern.split('').forEach((mark) => {
        answerCurrentQuestion(container, { correct: mark === 'C' });
      });
    } finally {
      jest.useRealTimers();
    }

    return capturedOptions[0];
  }

  test('test_scenario 7/10: reaches Resultados with the final score and the longest streak of hits', () => {
    // 4 hits, a miss, 3 more hits, 2 misses: score 7/10, longest streak 4.
    const options = playGameWithPattern('CCCCFCCCFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('7/10');
    expect(options.score).toBe(7);
    expect(options.maxStreak).toBe(4);
  });

  test('test_scenario 2/10: a low score still reports the correct (shorter) streak', () => {
    // 2 hits back to back surrounded by misses: score 2/10, longest streak 2.
    const options = playGameWithPattern('FFFCCFFFFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('2/10');
    expect(options.score).toBe(2);
    expect(options.maxStreak).toBe(2);
  });

  test('a perfect game (10/10) reports a streak equal to the score', () => {
    const options = playGameWithPattern('CCCCCCCCCC');

    expect(container.textContent).toContain('10/10');
    expect(options.score).toBe(10);
    expect(options.maxStreak).toBe(10);
  });

  test('a game with no hits reports a streak of 0', () => {
    const options = playGameWithPattern('FFFFFFFFFF');

    expect(container.textContent).toContain('0/10');
    expect(options.score).toBe(0);
    expect(options.maxStreak).toBe(0);
  });
});
