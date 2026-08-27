'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { results: strings, question: questionStrings, ageGate: ageGateStrings } = require('../../public/i18n/es.json');

// TRIOFSND-193: '¡Jugar!' now opens the age gate before the first question.
// TRIOFSND-232: the age gate is followed by the illustrated mode selector,
// so reaching the game now also needs a tap on the Quiz card there. Every
// test below that clicks the real Home play button (as opposed to calling
// startNewGame/startLevelGame directly) must go through both to reach the
// game.
function selectAgeGateOption(container) {
  getByRole(container, 'button', { name: ageGateStrings.eightPlusOption }).click();
  container.querySelector('[data-mode-id="quiz"]').click();
}

// `level` defaults to 1 so every existing caller that doesn't care about
// multi-level orchestration (TRIOFSND-207) still gets a single, always-valid
// level-1 pool -- exactly like before that feature existed.
function buildQuestion(id, level) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
    level: level || 1,
  };
}

function buildQuestionBank(count, level) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`, level));
}

/** A flat bank covering every level in `levels` (10 questions each), for TRIOFSND-207's level-chaining scenarios. */
function buildLeveledQuestionBank(levels) {
  return levels.reduce((all, level) => all.concat(buildQuestionBank(10, level).map((question, index) => ({
    ...question,
    id: `q-l${level}-${index}`,
  }))), []);
}

// Answers the currently visible question and advances manually via
// "Siguiente" (TRIOFSND-84): the button only becomes clickable once the
// question screen's own MIN_ADVANCE_DELAY_MS gate (AC-6) has elapsed, so
// fake timers must be advanced past it first.
async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS after answering
  // (AC-6); fast-forward past it (async, so any pending microtask work — e.g.
  // the aria-live announcement — flushes too) so walking through a whole
  // game doesn't take real wall-clock time.
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

/** Reads the current question's prompt, then answers it and advances (see answerCurrentQuestion). */
async function readPromptThenAdvance(container, { correct }) {
  const prompt = container.querySelector('.question-screen__prompt').textContent;
  await answerCurrentQuestion(container, { correct });
  return prompt;
}

// Lets any promise chains already queued (e.g. renderHome's several
// `.then()` hops across fetch/storage) settle. renderHome does not depend on
// any timer firing, so this drops back to real timers for one tick rather
// than guessing how many fake-timer advances would cover every `.then()` hop.
async function flushPromises() {
  jest.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 0));
  jest.useFakeTimers();
}
describe('TRIOFSND-100/TRIOFSND-84: app-shell navigation Quiz -> Resultados -> Volver a jugar / Salir', () => {
  let container;
  let addEventListenerSpy;

  beforeAll(() => {
    // Requiring main.js self-attaches a `window.addEventListener('load', ...)`
    // bootstrap (it drives the real PWA's startup). These tests call
    // startNewGame/renderHome directly instead, so that bootstrap is unwanted
    // here — worse, jsdom's own (real) 'load' dispatch is deferred behind a
    // timer, so advancing fake timers below can trigger it mid-test and
    // clobber #app with a freshly-bootstrapped Home screen. Swallow it.
    const originalAddEventListener = window.addEventListener.bind(window);
    addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'load' || type === 'hashchange') {
        return undefined;
      }
      return originalAddEventListener(type, listener, options);
    });
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
  });

  let originalAudio;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    jest.useFakeTimers();

    // jsdom has no real media playback; stub it out so answering questions
    // here (which plays the TRIOFSND-78 feedback sfx) doesn't hit jsdom's
    // "not implemented" HTMLMediaElement.play() warning.
    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    jest.useRealTimers();
    window.Audio = originalAudio;
  });

  test('resolveScreenRenderers resolves all three screens under Node/Jest', () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    expect(typeof renderers.renderHomeScreen).toBe('function');
    expect(typeof renderers.renderQuestionScreen).toBe('function');
    expect(typeof renderers.renderResultsScreen).toBe('function');
  });

  test('acierto: reveals the "Dato Curioso" for the answered question before "Siguiente" is used to advance', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(2);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    const [correctButton] = container.querySelectorAll('.question-screen__option');
    correctButton.click();

    const funFactBox = container.querySelector('.question-screen__fun-fact-box');
    expect(funFactBox.hidden).toBe(false);
    expect(funFactBox.textContent).toContain(questions[0].funFact);

    jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
    getByRole(container, 'button', { name: questionStrings.nextButton }).click();

    expect(container.querySelector('.question-screen__prompt').textContent).toContain(questions[1].question);
  });

  test('fallo: also reveals the "Dato Curioso" (no penalty, no negative copy) before advancing to the next question', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(2);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    const buttons = container.querySelectorAll('.question-screen__option');
    buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

    const funFactBox = container.querySelector('.question-screen__fun-fact-box');
    expect(funFactBox.hidden).toBe(false);
    expect(funFactBox.textContent).toContain(questions[0].funFact);
    expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);

    jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
    getByRole(container, 'button', { name: questionStrings.nextButton }).click();

    expect(container.querySelector('.question-screen__prompt').textContent).toContain(questions[1].question);
  });

  test('startNewGame walks through every question, acertando todas, and lands on Resultados with the right score', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('startNewGame walks through every question, fallando todas, and lands on Resultados without penalizing the score', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('0/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Volver a jugar" resets game state and navigates to the first question of a new game', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      // First game: get every answer wrong (score stays 0), reach Resultados.
      startNewGame(container, renderers, questions, document, undefined, () => 0);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
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
        await answerCurrentQuestion(container, { correct: true });
      }
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('TRIOFSND-80: resolving a question records pregunta_respondida (id_pregunta + acierto/fallo, no PII)', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const storage = { recordQuestionAnswered: jest.fn().mockResolvedValue({ attempts: 1, correct: 1 }) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, storage);

      await answerCurrentQuestion(container, { correct: true });
      expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(1, 'q-0', true);

      await answerCurrentQuestion(container, { correct: false });
      expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(2, 'q-1', false);

      expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test('TRIOFSND-80: onAnswer persists the pregunta_respondida event and updates the aggregate through the real storage service', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);
    const recordSpy = jest.spyOn(storage, 'recordQuestionAnswered');

    startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, storage);

    const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
    buttons[0].click(); // correctAnswerIndex is always 0 (buildQuestion)
    await recordSpy.mock.results[0].value;

    expect(await storage.get('questionAnsweredEvents')).toEqual([
      { tipo: 'pregunta_respondida', id_pregunta: 'q-0', acierto: true },
    ]);
    expect(await storage.getQuestionStats('q-0')).toEqual({
      total_respuestas: 1,
      total_aciertos: 1,
      porcentaje_acierto: 100,
    });
  });

  test('TRIOFSND-80: a duplicate tap on an already-answered question does not persist or aggregate a second time', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);
    const recordSpy = jest.spyOn(storage, 'recordQuestionAnswered');

    startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, storage);

    const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
    buttons[1].click(); // wrong answer first (correctAnswerIndex is 0)
    await recordSpy.mock.results[0].value;
    buttons[0].click(); // second tap on the same, already-answered question: ignored

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(await storage.getQuestionStats('q-0')).toEqual({
      total_respuestas: 1,
      total_aciertos: 0,
      porcentaje_acierto: 0,
    });
  });

  test('TRIOFSND-129: onAnswer registers the fun fact as discovered, on both a hit and a miss', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = { markFunFactDiscovered: jest.fn().mockResolvedValue(undefined) };

    // previousQuestionIds (8th slot) is left undefined so the positional-drift
    // compatibility shim in startNewGame doesn't need to guess where `storage`
    // belongs; analyticsStorage/storage (9th/10th) are set directly instead.
    startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, storage, storage);

    await answerCurrentQuestion(container, { correct: true });
    expect(storage.markFunFactDiscovered).toHaveBeenNthCalledWith(1, 'q-0');

    await answerCurrentQuestion(container, { correct: false });
    expect(storage.markFunFactDiscovered).toHaveBeenNthCalledWith(2, 'q-1');

    expect(storage.markFunFactDiscovered).toHaveBeenCalledTimes(2);
  });

  test('TRIOFSND-129: a duplicate tap on an already-answered question does not register the fun fact a second time', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = { markFunFactDiscovered: jest.fn().mockResolvedValue(undefined) };

    startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, storage, storage);

    const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
    buttons[1].click(); // wrong answer first (correctAnswerIndex is 0)
    buttons[0].click(); // second tap on the same, already-answered question: ignored

    expect(storage.markFunFactDiscovered).toHaveBeenCalledTimes(1);
  });

  test('TRIOFSND-101: "Volver a jugar" avoids repeating the previous game\'s questions when the bank has enough fresh candidates (AC-9)', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(40);

      startNewGame(container, renderers, questions, document, undefined, () => 0.1);
      const firstGamePrompts = [];
      for (let i = 0; i < 10; i += 1) {
        firstGamePrompts.push(await readPromptThenAdvance(container, { correct: true }));
      }

      getByRole(container, 'button', { name: strings.playAgainButton }).click();

      const secondGamePrompts = [];
      for (let i = 0; i < 10; i += 1) {
        secondGamePrompts.push(await readPromptThenAdvance(container, { correct: true }));
      }

      const overlap = secondGamePrompts.filter((prompt) => firstGamePrompts.includes(prompt));
      expect(overlap).toEqual([]);
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
        await answerCurrentQuestion(container, { correct: true });
      }
      expect(container.querySelector('.results-screen')).not.toBeNull();

      getByRole(container, 'button', { name: strings.exitButton }).click();

      // renderHome() resolves asynchronously (it awaits loadHomeStrings), so
      // let its promise chain settle before asserting on the DOM.
      await jest.advanceTimersByTimeAsync(0);

      expect(container.querySelector('.results-screen')).toBeNull();
      expect(getByRole(container, 'button', { name: homeStrings.playButton })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test("Home's '¡Jugar!' button starts a new game reaching the first question", () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      expect(container.querySelector('.age-gate-screen')).not.toBeNull();
      selectAgeGateOption(container);

      expect(container.querySelector('.question-screen')).not.toBeNull();
    });
    jest.advanceTimersByTime(0);
    return rendered;
  });

  describe('TRIOFSND-193: age gate shown between "¡Jugar!" and the prepared game', () => {
    test('picking "7 años o menos" also proceeds into the game', () => {
      const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const fetchFn = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
      });

      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

      const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn).then(() => {
        getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

        expect(ageGateStrings.sixOption).toBeUndefined();
        getByRole(container, 'button', { name: ageGateStrings.sevenOption }).click();

        // TRIOFSND-232: the age gate hands off to the illustrated mode
        // selector next, not straight into the game.
        expect(container.querySelector('.age-gate-screen')).toBeNull();
        expect(container.querySelector('.mode-selector-screen')).not.toBeNull();

        container.querySelector('[data-mode-id="quiz"]').click();
        expect(container.querySelector('.question-screen')).not.toBeNull();
      });
      jest.advanceTimersByTime(0);
      return rendered;
    });

    test('renderAgeGate falls straight through to onSelected when no age-gate renderer is available (never blocks the game)', () => {
      const { renderAgeGate } = require(MAIN_JS_PATH);
      const onSelected = jest.fn();

      renderAgeGate(container, {}, undefined, onSelected);

      expect(onSelected).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.age-gate-screen')).toBeNull();
    });

    test('the age-band selection is never written to any storage backend passed to renderHome (only the last-selected mode is, TRIOFSND-235)', () => {
      const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const fetchFn = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
      });
      const storage = {
        hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
        markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
        recordEventOnce: jest.fn().mockResolvedValue(1),
        recordEvent: jest.fn().mockResolvedValue(1),
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
      };

      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

      const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn, storage).then(() => {
        getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();
        selectAgeGateOption(container);

        // The only write is main.js's own last-selected-mode persistence
        // (dinoquiz:lastMode, TRIOFSND-235) firing once Quiz starts -- the
        // age band picked just before it is never itself written anywhere.
        expect(storage.setItem).toHaveBeenCalledTimes(1);
        expect(storage.setItem).toHaveBeenCalledWith('dinoquiz:lastMode', JSON.stringify('quiz'));
      });
      jest.advanceTimersByTime(0);
      return rendered;
    });
  });

  describe('avance automático tras el temporizador (TRIOFSND-84)', () => {
    test('acierto: advances to the next question on its own once the auto-advance delay elapses, without a "Siguiente" tap', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      // Not enough time has passed yet: still on the same question.
      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).toBe(firstPrompt);

      // Past MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS with no manual tap:
      // the controller advances automatically.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });

    test('fallo: also advances automatically, carrying forward the unchanged score', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const buttons = container.querySelectorAll('.question-screen__option');
      buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);
    });

    test('auto-advances straight to Resultados when the last question times out unanswered-via-"Siguiente"', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(1);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('1/1');
    });

    test('a manual "Siguiente" tap cancels the pending auto-advance timer so the next question only advances once', async () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(3);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      await answerCurrentQuestion(container, { correct: true });
      const secondPrompt = container.querySelector('.question-screen__prompt').textContent;

      // The first question's now-stale auto-advance timer would fire around
      // here if it hadn't been cancelled by the manual click above.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).toBe(secondPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
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

    return renderHome(document, renderers.renderHomeScreen, fetchFn, storage).then(() => {
      expect(container.querySelector('.home-screen__tooltip')).not.toBeNull();

      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      // Immediate, synchronous transition off the same click: the tooltip is
      // gone and the age gate (TRIOFSND-193) is already on screen, no
      // awaited step in between.
      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
      expect(container.querySelector('.age-gate-screen')).not.toBeNull();
      expect(storage.recordEvent).toHaveBeenCalledWith('partida_iniciada');

      selectAgeGateOption(container);
      expect(container.querySelector('.question-screen')).not.toBeNull();
    });
  });

  test('TRIOFSND-92: an incorrect answer records the aggregated, non-PII pregunta_respondida and pregunta_respondida_fallo events', async () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(async () => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();
      selectAgeGateOption(container);

      jest.useFakeTimers();
      try {
        await answerCurrentQuestion(container, { correct: false });
      } finally {
        jest.useRealTimers();
      }

      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida');
      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida_fallo');
    });
  });

  test('TRIOFSND-92: a correct answer records the pregunta_respondida event but not the pregunta_respondida_fallo event', async () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(async () => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();
      selectAgeGateOption(container);

      jest.useFakeTimers();
      try {
        await answerCurrentQuestion(container, { correct: true });
      } finally {
        jest.useRealTimers();
      }

      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida');
      expect(storage.recordEvent).not.toHaveBeenCalledWith('pregunta_respondida_fallo');
    });
  });

  test('TRIOFSND-98: landing on Resultados records the aggregated, non-PII partida_completada event with the final score', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const analyticsStorage = { recordGameCompleted: jest.fn().mockResolvedValue({ gamesCompleted: 1, totalScore: 7, averageScore: 7 }) };

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, analyticsStorage);
      for (const mark of 'CCCCFCCCFF'.split('')) {
        await answerCurrentQuestion(container, { correct: mark === 'C' });
      }
    } finally {
      jest.useRealTimers();
    }

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(analyticsStorage.recordGameCompleted).toHaveBeenCalledTimes(1);
    expect(analyticsStorage.recordGameCompleted).toHaveBeenCalledWith(7);
  });

  describe('auto-advance behavior', () => {
    test('acierto: advances to the next question on its own once the auto-advance delay elapses, without a "Siguiente" tap', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      // Not enough time has passed yet: still on the same question.
      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).toBe(firstPrompt);

      // Past MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS with no manual tap:
      // the controller advances automatically.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });

    test('fallo: also advances automatically, carrying forward the unchanged score', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const buttons = container.querySelectorAll('.question-screen__option');
      buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);
    });

    test('auto-advances straight to Resultados when the last question times out unanswered-via-"Siguiente"', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(1);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('1/1');
    });

    test('a manual "Siguiente" tap cancels the pending auto-advance timer so the next question only advances once', async () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(3);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      await answerCurrentQuestion(container, { correct: true });
      const secondPrompt = container.querySelector('.question-screen__prompt').textContent;

      // The first question's now-stale auto-advance timer would fire around
      // here if it hadn't been cancelled by the manual click above.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).toBe(secondPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
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
  async function playGameWithPattern(pattern) {
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
      for (const mark of pattern.split('')) {
        await answerCurrentQuestion(container, { correct: mark === 'C' });
      }
    } finally {
      jest.useRealTimers();
    }

    return capturedOptions[0];
  }

  test('test_scenario 7/10: reaches Resultados with the final score and the longest streak of hits', async () => {
    // 4 hits, a miss, 3 more hits, 2 misses: score 7/10, longest streak 4.
    const options = await playGameWithPattern('CCCCFCCCFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('7/10');
    expect(options.score).toBe(7);
    expect(options.maxStreak).toBe(4);
  });

  test('test_scenario 2/10: a low score still reports the correct (shorter) streak', async () => {
    // 2 hits back to back surrounded by misses: score 2/10, longest streak 2.
    const options = await playGameWithPattern('FFFCCFFFFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('2/10');
    expect(options.score).toBe(2);
    expect(options.maxStreak).toBe(2);
  });

  test('a perfect game (10/10) reports a streak equal to the score', async () => {
    const options = await playGameWithPattern('CCCCCCCCCC');

    expect(container.textContent).toContain('10/10');
    expect(options.score).toBe(10);
    expect(options.maxStreak).toBe(10);
  });

  test('a game with no hits reports a streak of 0', async () => {
    const options = await playGameWithPattern('FFFFFFFFFF');

    expect(container.textContent).toContain('0/10');
    expect(options.score).toBe(0);
    expect(options.maxStreak).toBe(0);
  });
});

describe('TRIOFSND-128: end of game persists the best score and longest racha to storage', () => {
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

  test('a finished game persists its final score and racha via storage.recordScore/recordStreak', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    jest.useFakeTimers();
    try {
      // 4 hits, a miss, 3 more hits, 2 misses: score 7/10, longest streak 4.
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      for (const mark of 'CCCCFCCCFF'.split('')) {
        await answerCurrentQuestion(container, { correct: mark === 'C' });
      }
      // The persistence write is fire-and-forget (it never delays Resultados
      // rendering, see persistBestScoreAndStreak's doc comment) -- flush the
      // pending microtasks it queued before reading storage back.
      await jest.advanceTimersByTimeAsync(0);
    } finally {
      jest.useRealTimers();
    }

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(await storage.get('bestScore')).toBe(7);
    expect(await storage.get('maxStreak')).toBe(4);
  });

  test('a worse replay never lowers the previously persisted best score/racha (monotonic)', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }
      await jest.advanceTimersByTimeAsync(0);
      expect(await storage.get('bestScore')).toBe(10);
      expect(await storage.get('maxStreak')).toBe(10);

      getByRole(container, 'button', { name: strings.playAgainButton }).click();
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
      }
      await jest.advanceTimersByTimeAsync(0);
    } finally {
      jest.useRealTimers();
    }

    expect(await storage.get('bestScore')).toBe(10);
    expect(await storage.get('maxStreak')).toBe(10);
  });
});

describe('TRIOFSND-96: Resultados and Inicio show the persisted best score and longest racha', () => {
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

  test('a first game shows its own score/racha as the best so far', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    jest.useFakeTimers();
    try {
      // 4 hits, a miss, 3 more hits, 2 misses: score 7/10, longest streak 4.
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      for (const mark of 'CCCCFCCCFF'.split('')) {
        await answerCurrentQuestion(container, { correct: mark === 'C' });
      }
    } finally {
      jest.useRealTimers();
    }

    expect(container.querySelector('.results-screen__best-score')).toHaveTextContent('7');
    expect(container.querySelector('.results-screen__best-streak')).toHaveTextContent('4');
  });

  test('a worse replay still shows the previously-persisted best score/racha, never the worse one just played', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }
      await jest.advanceTimersByTimeAsync(0);

      getByRole(container, 'button', { name: strings.playAgainButton }).click();
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
      }
    } finally {
      jest.useRealTimers();
    }

    // The just-played replay scored 0/10, but the best score/racha shown is
    // still the 10/10 from the first game -- monotonic, never lowered.
    expect(container.querySelector('.results-screen__score')).toHaveTextContent('0/10');
    expect(container.querySelector('.results-screen__best-score')).toHaveTextContent('10');
    expect(container.querySelector('.results-screen__best-streak')).toHaveTextContent('10');
  });

  test('reopening the app on Inicio shows the best score/racha persisted from a previous session', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const adapter = createMemoryAdapter();

    // Session 1: play a game, best score/racha get persisted.
    const sessionOneStorage = new DinoQuizStorage([adapter]);
    await sessionOneStorage.recordScore(8);
    await sessionOneStorage.recordStreak(5);

    // Session 2 (app reopened): a fresh storage instance over the same
    // backend reads the previous session's persisted best back.
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home, privacy, purchase } = require('../../public/i18n/es.json');
    const sessionTwoStorage = new DinoQuizStorage([adapter]);

    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home, privacy, purchase }),
    });

    await renderHome(doc, renderHomeScreen, fetchFn, sessionTwoStorage);

    expect(container).toHaveTextContent(home.bestScoreFormat.replace('{bestScore}', '8'));
    expect(container).toHaveTextContent(home.bestStreakFormat.replace('{bestStreak}', '5'));
  });
});

describe('TRIOFSND-129: Resultados shows the persisted discovered-fun-facts progress', () => {
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

  test('reflects the fun facts discovered during the just-finished game, out of the full loaded bank', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    const capturedOptions = [];
    const renderResultsScreen = renderers.renderResultsScreen;
    renderers.renderResultsScreen = (resultsContainer, options) => {
      capturedOptions.push(options);
      return renderResultsScreen(resultsContainer, options);
    };

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, storage, storage);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }
    } finally {
      jest.useRealTimers();
    }

    expect(capturedOptions[0].discoveredFunFactsCount).toBe(10);
    expect(capturedOptions[0].totalFunFacts).toBe(10);
    expect(container.textContent).toContain(strings.funFactsProgressFormat.replace('{count}', '10').replace('{total}', '10'));
  });
});

describe('TRIOFSND-97: Resultados banner/rewarded ad gated by the remove-ads purchase flag', () => {
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

  test('shows the banner and rewarded ad on Resultados when the purchase has not been made', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame, ADS_REMOVED_STORAGE_KEY } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

      startNewGame(container, renderers, questions, document, undefined, () => 0, storageObj);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }

      expect(storageObj.getItem).toHaveBeenCalledWith(ADS_REMOVED_STORAGE_KEY);
      expect(container.querySelector('.results-screen__ads')).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('hides the banner and rewarded ad on Resultados once the purchase has been made', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame, ADS_REMOVED_STORAGE_KEY } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const storageObj = {
        getItem: jest.fn((key) => (key === ADS_REMOVED_STORAGE_KEY ? 'true' : null)),
        setItem: jest.fn(),
      };

      startNewGame(container, renderers, questions, document, undefined, () => 0, storageObj);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }

      expect(container.querySelector('.results-screen')).not.toBeNull();
      expect(container.querySelector('.results-screen__ads')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('a purchase confirmed on Home hides ads on the very next game\'s Resultados screen', async () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStrings, purchase: purchaseStrings } = require('../../public/i18n/es.json');
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, purchase: purchaseStrings }),
    });
    const memoryBackend = {};
    const storageObj = {
      getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(memoryBackend, key) ? memoryBackend[key] : null)),
      setItem: jest.fn((key, value) => {
        memoryBackend[key] = value;
      }),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, undefined, storageObj).then(async () => {
      const purchaseButton = getByRole(container, 'button', { name: homeStrings.globalControls.purchaseButton });
      purchaseButton.click();
      const purchaseConfirmButton = getByRole(container, 'button', { name: purchaseStrings.purchaseButton });
      purchaseConfirmButton.click();

      const playButton = getByRole(container, 'button', { name: homeStrings.playButton });
      jest.useFakeTimers();
      try {
        playButton.click();
        selectAgeGateOption(container);
        // TRIOFSND-207: a level-1-only bank has no level 2 to unlock, so this
        // stays at level 1 -- score doesn't matter to what's under test here
        // (the ads-removed flag), but leveling up would need a real level 2
        // pool this fixture doesn't provide.
        for (let i = 0; i < 10; i += 1) {
          await answerCurrentQuestion(container, { correct: false });
        }
        // TRIOFSND-207: finishing a level persists/reads maxUnlockedLevel
        // through the (async, Promise-based) storage service before
        // Resultados renders -- let that settle before asserting on the DOM.
        await jest.advanceTimersByTimeAsync(0);
      } finally {
        jest.useRealTimers();
      }

      expect(container.querySelector('.results-screen')).not.toBeNull();
      expect(container.querySelector('.results-screen__ads')).toBeNull();
    });
  });
});

describe('TRIOFSND-207: multi-level orchestration (continuar/desbloquear/terminar) and safe exit on level generation failure', () => {
  let container;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();

    // jsdom has no real media playback; stub it out like the sibling suite above.
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
  });

  /** Plays every question of the currently rendered level following a hit/miss pattern (C/F), then lets the async level-completion work (maxUnlockedLevel persistence) settle. */
  async function playLevelWithPattern(pattern) {
    for (const mark of pattern.split('')) {
      await answerCurrentQuestion(container, { correct: mark === 'C' });
    }
    await jest.advanceTimersByTimeAsync(0);
  }

  test('restricción 7 años o menos: el juego siempre termina tras el nivel 1, aunque la puntuación sea perfecta', async () => {
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    // A level 2 pool exists too, so a wrong "always unlocks" implementation
    // would be caught by this test instead of failing to generate anyway.
    const questions = buildLeveledQuestionBank([1, 2]);

    startLevelGame(container, renderers, questions, document, undefined, { ageBand: 'seven', randomFn: () => 0 });

    await playLevelWithPattern('CCCCCCCCCC');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain(strings.levelOutcome.ageRestricted);
    expect(container.querySelector('.results-screen__level')).toHaveTextContent('1');

    // "Volver a jugar" starts over at level 1 (game over, whatever the score).
    getByRole(container, 'button', { name: strings.playAgainButton }).click();
    expect(container.querySelector('.age-gate-screen')).toBeNull();
    expect(container.querySelector('.question-screen__level')).toHaveTextContent('1');
  });

  test('desbloqueo con 8 años: >=6 aciertos desbloquea y continúa en el nivel siguiente, persistiendo el nivel máximo desbloqueado en el dispositivo', async () => {
    const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
    const { createMemoryAdapter } = require('../../src/services/storage/adapters/memoryAdapter');
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);
    const storage = new DinoQuizStorage([createMemoryAdapter()]);

    expect(await storage.getMaxUnlockedLevel()).toBe(1);

    startLevelGame(container, renderers, questions, document, undefined, {
      ageBand: 'eight-plus',
      randomFn: () => 0,
      storage,
    });

    // 6/10 is exactly the level-up threshold (gameFlow.js's LEVEL_UP_MIN_CORRECT).
    await playLevelWithPattern('CCCCCCFFFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain(strings.levelOutcome.levelUp.replace('{nextLevel}', '2'));
    expect(container.querySelector('.results-screen__max-level-unlocked')).toHaveTextContent('2');

    // Persistence (TRIOFSND-205): the unlocked level survives independently
    // of the rendered screen, readable through the same storage instance.
    expect(await storage.getMaxUnlockedLevel()).toBe(2);

    // Persistence (TRIOFSND-128): the level's final score/racha are recorded
    // the same way the flat, single-level flow does, through the same storage
    // instance -- 6 hits back to back (score 6/10, longest streak 6).
    expect(await storage.get('bestScore')).toBe(6);
    expect(await storage.get('maxStreak')).toBe(6);

    // "Volver a jugar" continues straight into the already-unlocked level 2
    // -- no age gate, no fresh level 1. The main button now reads the
    // next-level label instead of the generic "Volver a jugar".
    getByRole(container, 'button', { name: strings.nextLevelButtonFormat.replace('{level}', '2') }).click();
    expect(container.querySelector('.age-gate-screen')).toBeNull();
    expect(container.querySelector('.question-screen__level')).toHaveTextContent('2');
  });

  test('fin por puntuación insuficiente: <6 aciertos en un nivel intermedio termina la partida sin desbloquear el siguiente nivel', async () => {
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);

    startLevelGame(container, renderers, questions, document, undefined, { ageBand: 'eight-plus', randomFn: () => 0 });

    // 5/10 is one short of the level-up threshold.
    await playLevelWithPattern('CCCCCFFFFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain(strings.levelOutcome.insufficientScore);
    expect(container.querySelector('.results-screen__max-level-unlocked')).toBeNull();

    // "Volver a jugar" starts a fresh level 1 game, not level 2.
    getByRole(container, 'button', { name: strings.playAgainButton }).click();
    expect(container.querySelector('.question-screen__level')).toHaveTextContent('1');
  });

  test('fin en nivel 10: la partida siempre termina al completar el nivel 10 (MAX_LEVEL), sea cual sea la puntuación', async () => {
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10, 10);

    startLevelGame(container, renderers, questions, document, undefined, {
      ageBand: 'eight-plus',
      level: 10,
      randomFn: () => 0,
    });

    expect(container.querySelector('.question-screen__level')).toHaveTextContent('10');

    await playLevelWithPattern('CCCCCCCCCC');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain(strings.levelOutcome.completedAllLevels);
    expect(container.querySelector('.results-screen__max-level-unlocked')).toBeNull();
  });

  test('TRIOFSND-209: "Volver a jugar" records the aggregated, non-PII replay_pulsado event, whether it continues into the next unlocked level or restarts a fresh level 1', async () => {
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);
    const analyticsStorage = { recordEvent: jest.fn().mockResolvedValue(1) };

    function replayEventCount() {
      return analyticsStorage.recordEvent.mock.calls.filter((call) => call[0] === 'replay_pulsado').length;
    }

    startLevelGame(container, renderers, questions, document, undefined, {
      ageBand: 'eight-plus',
      randomFn: () => 0,
      analyticsStorage,
    });

    // 6/10 unlocks level 2 -- "Volver a jugar" continues straight into it.
    await playLevelWithPattern('CCCCCCFFFF');
    getByRole(container, 'button', { name: strings.nextLevelButtonFormat.replace('{level}', '2') }).click();

    expect(replayEventCount()).toBe(1);

    // Finishing level 2 with an insufficient score ends the game --
    // "Volver a jugar" here restarts fresh at level 1, still the same event.
    await playLevelWithPattern('FFFFFFFFFF');
    getByRole(container, 'button', { name: strings.playAgainButton }).click();

    expect(replayEventCount()).toBe(2);
  });

  describe('salida segura a Inicio cuando gameFlow no puede generar un nivel (menos de 10 preguntas válidas)', () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('el propio nivel 1 no se puede generar: se muestra Inicio en vez de una partida rota', async () => {
      const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      // Only 5 valid level-1 questions -- below gameFlow.js's QUESTIONS_PER_GAME (10).
      const questions = buildQuestionBank(5, 1);
      const fetchFn = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
      });

      // The safe exit renders Inicio via renderHome(), which resolves
      // asynchronously (it awaits the i18n fetch) -- await it directly.
      await startLevelGame(container, renderers, questions, document, fetchFn, { ageBand: 'eight-plus' });

      expect(container.querySelector('.question-screen')).toBeNull();

      // No crash, no broken screen: back to a normal, playable Inicio.
      expect(getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton })).toBeInTheDocument();

      // The diagnostic never carries the child's age band or any answer --
      // only the technical level/count gameFlow.js's startLevel already logs.
      const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls).toLowerCase();
      expect(serializedLogs).not.toContain('eight-plus');
      expect(serializedLogs).not.toContain('ageband');
    });

    test('el nivel siguiente no se puede generar al desbloquearlo: sale a Inicio en vez de prometer un nivel roto', async () => {
      const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      // Level 1 is complete (10 questions) but level 2 only has 4 -- fewer
      // than gameFlow.js's QUESTIONS_PER_GAME (10) once unlocked.
      const questions = buildQuestionBank(10, 1).concat(buildQuestionBank(4, 2));
      const fetchFn = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
      });

      startLevelGame(container, renderers, questions, document, fetchFn, { ageBand: 'eight-plus', randomFn: () => 0 });

      // 10/10 unlocks level 2, which this bank can't actually generate.
      await playLevelWithPattern('CCCCCCCCCC');

      expect(container.querySelector('.results-screen')).toBeNull();
      expect(getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton })).toBeInTheDocument();

      const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls).toLowerCase();
      expect(serializedLogs).not.toContain('eight-plus');
      expect(serializedLogs).not.toContain('ageband');
    });
  });
});
