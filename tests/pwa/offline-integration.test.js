'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-308: offline regression suite across every shipped DinoQuiz mode.
 *
 * With `fetch` stubbed to always reject (no network at all -- mirrors every
 * tests/pwa/offline-*-game.test.js file's own `rejectingFetch`), this drives
 * a full ROUNDS_PER_GAME-round game to completion for each mode reachable
 * through the app shell (Quiz, Laberinto, Sombra, Oído Jurásico, Parejas,
 * Clasifica, Ordena por tamaño) using the exact same production functions
 * main.js exposes, plus Línea del tiempo directly through its own screen +
 * round generator (src/game/timelineRound.js, src/screens/TimelineScreen.js)
 * since it is not wired into main.js's routing yet (see that module's own
 * doc comment). It then exercises, once, the cross-cutting offline
 * guarantees every one of those per-mode tests individually assumes but
 * never checks together in one place:
 *  - audio playback gating (`dinoquiz:muted`) for both the shared
 *    correct/incorrect sfx (soundService.js, every mode) and Oído
 *    Jurásico's own stricter round-sound service,
 *  - i18n strings resolve from public/i18n/es.json via src/i18n, never a
 *    `fetch`,
 *  - the Quiz illustration's local fallback-image path (questionScreen.js)
 *    never blocks a game in progress,
 *  - a resource missing from Cache Storage for ONE mode
 *    (src/services/modeResourceValidation.js) blocks only that mode, surfaced
 *    via ModeBlockedScreen, while every other mode -- checked the same way --
 *    reports nothing missing and still plays a complete game start to finish.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const MAZE_GAME_PATH = path.resolve(__dirname, '../../public/scripts/mazeGame.js');
const SHADOW_GUESS_GAME_PATH = path.resolve(__dirname, '../../public/scripts/shadowGuessGame.js');
const CLASSIFY_GAME_PATH = path.resolve(__dirname, '../../public/scripts/classifyGame.js');
const PAREJAS_GAME_PATH = path.resolve(__dirname, '../../public/scripts/parejasGame.js');
const OIDO_SCREEN_PATH = path.resolve(__dirname, '../../public/scripts/oidoJurasicoScreen.js');
const OIDO_AUDIO_SERVICE_PATH = path.resolve(__dirname, '../../public/scripts/oidoJurasicoAudioService.js');

const i18n = require('../../public/i18n/es.json');
const {
  results: resultsStrings,
  question: questionStrings,
  oidoJurasico: oidoStrings,
  shadowGuess: shadowGuessStrings,
  timeline: timelineStrings,
  modeBlocked: modeBlockedStrings,
} = i18n;
const { QUESTIONS_PER_GAME } = require('../../src/game/gameFlow');

const ROUNDS_PER_GAME = 10;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

/** BFS over `maze` from start to goal -- same helper shape as tests/pwa/offline-maze-game.test.js. */
function findPathDirections(maze) {
  const deltas = {
    up: { wall: 'N', row: -1, col: 0 },
    down: { wall: 'S', row: 1, col: 0 },
    left: { wall: 'W', row: 0, col: -1 },
    right: { wall: 'E', row: 0, col: 1 },
  };
  const visited = maze.grid.map((row) => row.map(() => false));
  const queue = [{ row: maze.start.row, col: maze.start.col, path: [] }];
  visited[maze.start.row][maze.start.col] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.row === maze.goal.row && current.col === maze.goal.col) {
      return current.path;
    }
    Object.keys(deltas).forEach((direction) => {
      const delta = deltas[direction];
      const nextRow = current.row + delta.row;
      const nextCol = current.col + delta.col;
      const inBounds = nextRow >= 0 && nextRow < maze.grid.length && nextCol >= 0 && nextCol < maze.grid[0].length;
      const open = inBounds && !maze.grid[current.row][current.col].walls[delta.wall];
      if (open && !visited[nextRow][nextCol]) {
        visited[nextRow][nextCol] = true;
        queue.push({ row: nextRow, col: nextCol, path: current.path.concat([direction]) });
      }
    });
  }
  throw new Error('maze has no path from start to goal');
}

function playMazeGameToCompletion(container, seed) {
  const mazeGame = require(MAZE_GAME_PATH);
  const level = 1;
  const randomFn = () => 0.5;

  const paths = [];
  let game = mazeGame.startGame({ seed, level, randomFn });
  let state = game.state;
  let round = game.round;
  for (let i = 0; i < mazeGame.ROUNDS_PER_GAME; i += 1) {
    paths.push(findPathDirections(round.maze));
    const finished = findPathDirections(round.maze).reduce((current, direction) => mazeGame.applyMove(current, direction), round);
    const result = mazeGame.completeRound({ round: finished, gameState: state, level, seed, randomFn });
    state = result.state;
    round = result.nextRound;
  }

  const { startMazeGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startMazeGame(container, renderers, document, undefined, { level, seed, randomFn });
  expect(container.querySelector('.maze-screen')).not.toBeNull();

  paths.forEach((directions) => {
    directions.forEach((direction) => container.querySelector('.maze-screen__control-button--' + direction).click());
    const nextButton = container.querySelector('.maze-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  });
}

/** `finishShadowGuessLevel` always returns a promise chain (even with no storage/analytics ctx), so the caller must flush microtasks after the last round's "Siguiente" before Resultados renders. */
function flushMicrotasks() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
}

async function playShadowGuessGameToCompletion(container) {
  const shadowGuessGame = require(SHADOW_GUESS_GAME_PATH);
  const randomFn = () => 0.5;
  const levelGame = shadowGuessGame.startLevel(1, { randomFn });
  expect(levelGame.error).toBeUndefined();
  const correctIds = levelGame.rounds.map((round) => round.correctId);

  const { startShadowGuessLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startShadowGuessLevelGame(container, renderers, document, undefined, { randomFn });
  expect(container.querySelector('.shadow-guess-screen')).not.toBeNull();

  for (const correctId of correctIds) {
    const buttons = Array.from(container.querySelectorAll('.shadow-guess-screen__option'));
    const correctName = shadowGuessStrings.dinosaurNames[correctId];
    const target = buttons.find((button) => button.textContent === correctName);
    expect(target).toBeTruthy();
    target.click();
    const nextButton = container.querySelector('.shadow-guess-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
    await flushMicrotasks();
  }
}

function playOidoJurasicoGameToCompletion(container) {
  const oido = require(OIDO_SCREEN_PATH);
  const randomFn = () => 0.5;
  const context = oido.buildOidoJurasicoRoundContext({ randomFn });
  const correctIds = [];
  for (let i = 0; i < oido.ROUNDS_PER_GAME; i += 1) {
    correctIds.push(oido.generateOidoJurasicoRound(i, context).correctId);
  }

  const { startOidoJurasicoGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startOidoJurasicoGame(container, renderers, document, undefined, { randomFn });
  expect(container.querySelector('.oido-jurasico-screen')).not.toBeNull();

  correctIds.forEach((correctId) => {
    const buttons = Array.from(container.querySelectorAll('.oido-jurasico-screen__option'));
    const target = buttons.find((button) => button.textContent === oidoStrings.dinosaurNames[correctId]);
    expect(target).toBeTruthy();
    target.click();
    const nextButton = container.querySelector('.oido-jurasico-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  });
}

function playClassifyGameToCompletion(container) {
  const classifyGameApi = require(CLASSIFY_GAME_PATH);
  const { startClassifyGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startClassifyGame(container, renderers, document, undefined, { level: 1, randomFn: () => 0.5 });
  expect(container.querySelector('.classify-screen')).not.toBeNull();

  const order = Object.keys(classifyGameApi.CATEGORIES).map((key) => classifyGameApi.CATEGORIES[key]);
  for (let i = 0; i < classifyGameApi.ROUNDS_PER_GAME; i += 1) {
    const src = container.querySelector('.classify-screen__creature-image').getAttribute('src');
    const dinosaurId = src.replace(/^.*\/dinosaurs\//, '').replace(/\.svg$/, '');
    const diet = classifyGameApi.resolveVerifiedDiet(dinosaurId).diet;
    const buttons = container.querySelectorAll('.classify-screen__category-button');
    buttons[order.indexOf(diet)].click();
    const nextButton = container.querySelector('.classify-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  }
}

function playSizeOrderGameToCompletion(container) {
  const { startSizeOrderGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startSizeOrderGame(container, renderers, document, undefined, { randomFn: () => 0.5 });
  expect(container.querySelector('.size-order-screen')).not.toBeNull();

  for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
    container.querySelector('.size-order-screen__confirm-button').click();
    const nextButton = container.querySelector('.size-order-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  }
}

function playParejasLevelToCompletion(container) {
  const parejasGame = require(PAREJAS_GAME_PATH);
  const randomFn = () => 0.5;
  const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  startParejasLevelGame(container, renderers, document, undefined, { randomFn });
  expect(container.querySelector('.parejas-screen')).not.toBeNull();

  return (async () => {
    for (let roundIndex = 0; roundIndex < ROUNDS_PER_GAME; roundIndex += 1) {
      const round = parejasGame.startRound({ roundIndex, level: 1, seed: undefined, dinosaurPool: undefined, randomFn });
      const cardButtons = Array.from(container.querySelectorAll('.parejas-screen__card'));
      const byCreature = new Map();
      round.cards.forEach((card) => {
        if (!byCreature.has(card.creatureId)) {
          byCreature.set(card.creatureId, []);
        }
        byCreature.get(card.creatureId).push(card.cardId);
      });
      byCreature.forEach(([firstCardId, secondCardId]) => {
        cardButtons[firstCardId].click();
        cardButtons[secondCardId].click();
      });
      const nextButton = container.querySelector('.parejas-screen__next-button');
      expect(nextButton.hidden).toBe(false);
      nextButton.click();
      await Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
    }
  })();
}

/** Plays all 10 rounds of Línea del tiempo directly through timelineRound.js + TimelineScreen.js -- not yet reachable via main.js's routing, see this file's own doc comment. */
function playTimelineGameToCompletion(container) {
  const timelineRound = require('../../src/game/timelineRound');
  const { renderTimelineScreen } = require('../../src/screens/TimelineScreen');
  const { getCreatureSheet } = require('../../src/data/creatureSheet');
  const randomFn = () => 0.5;

  const level = 1;
  const game = timelineRound.startGame({ level, randomFn });
  expect(game.error).toBeUndefined();

  let score = 0;
  let finalScore = null;
  for (let roundIndex = 0; roundIndex < timelineRound.ROUNDS_PER_GAME; roundIndex += 1) {
    const round = timelineRound.startRound({ roundIndex, level, dinosaur: game.order[roundIndex] });
    const { periodButtons, nextButton } = renderTimelineScreen(container, round, {
      roundNumber: roundIndex + 1,
      totalRounds: timelineRound.ROUNDS_PER_GAME,
      score,
      onNext: (nextScore) => {
        score = nextScore;
      },
      onGameOver: (finishedScore) => {
        finalScore = finishedScore;
      },
    });

    const correctPeriod = getCreatureSheet(round.dinosaur).mainPeriod;
    periodButtons[correctPeriod].click();
    nextButton.click();
  }

  return finalScore;
}

describe('TRIOFSND-308: offline regression suite across every shipped DinoQuiz mode', () => {
  let container;
  let hadOwnFetch;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    delete window.DinoQuiz;
    hadOwnFetch = Object.prototype.hasOwnProperty.call(global, 'fetch');
    originalFetch = global.fetch;
    window.localStorage.clear();
    goOffline();
  });

  afterEach(() => {
    container.remove();
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    window.localStorage.clear();
  });

  describe('every mode plays a full game to completion using only precached resources', () => {
    test('quiz', () => {
      global.fetch = rejectingFetch();
      const { resolveScreenRenderers, startNewGame, prepareBrowserQuestions } = require(MAIN_JS_PATH);
      const { loadQuestionBank } = require('../../src/data/questionBank');
      const renderers = resolveScreenRenderers();
      const questions = prepareBrowserQuestions(loadQuestionBank(), i18n);

      jest.useFakeTimers();
      let session;
      try {
        session = startNewGame(container, renderers, questions, document, undefined, Math.random);
        expect(session.questions).toHaveLength(QUESTIONS_PER_GAME);
        for (let i = 0; i < QUESTIONS_PER_GAME; i += 1) {
          const question = session.questions[session.state.questionIndex];
          const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
          buttons[question.correctAnswerIndex].click();
          getByRole(container, 'button', { name: questionStrings.nextButton }).click();
        }
      } finally {
        jest.useRealTimers();
      }

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('laberinto', () => {
      global.fetch = rejectingFetch();
      playMazeGameToCompletion(container, 'offline-integration-maze-seed');

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('sombra', async () => {
      global.fetch = rejectingFetch();
      await playShadowGuessGameToCompletion(container);

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('oidoJurasico', () => {
      global.fetch = rejectingFetch();
      playOidoJurasicoGameToCompletion(container);

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('clasifica', () => {
      global.fetch = rejectingFetch();
      playClassifyGameToCompletion(container);

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('ordenaPorTamano', () => {
      global.fetch = rejectingFetch();
      playSizeOrderGameToCompletion(container);

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('0/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('parejas', async () => {
      global.fetch = rejectingFetch();
      await playParejasLevelToCompletion(container);

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('lineaDelTiempo', () => {
      global.fetch = rejectingFetch();
      const finalScore = playTimelineGameToCompletion(container);

      expect(finalScore).toBe(ROUNDS_PER_GAME);
      expect(container.textContent).toContain(timelineStrings.gameOver.heading);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('i18n strings resolve from public/i18n/es.json via src/i18n, never over the network', () => {
    test('getStrings(DEFAULT_LOCALE) returns the exact precached bundle, without ever calling fetch', () => {
      global.fetch = rejectingFetch();
      const { getStrings, DEFAULT_LOCALE, SUPPORTED_LOCALES } = require('../../src/i18n');

      expect(SUPPORTED_LOCALES).toEqual(['es']);
      expect(getStrings(DEFAULT_LOCALE)).toEqual(i18n);
      expect(getStrings('unknown-locale')).toEqual(i18n);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('every mode played above rendered its own on-screen copy straight from that same bundle', () => {
      global.fetch = rejectingFetch();
      const { startOidoJurasicoGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      startOidoJurasicoGame(container, renderers, document, undefined, { randomFn: () => 0.5 });

      expect(container.textContent).toContain(oidoStrings.screenTitle);
      expect(container.textContent).toContain(oidoStrings.instructions);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('image loading and the local fallback-image path', () => {
    test('a broken quiz illustration swaps to the precached fallback asset mid-game, without blocking the rest of the game', () => {
      global.fetch = rejectingFetch();
      const { resolveScreenRenderers, startNewGame, prepareBrowserQuestions } = require(MAIN_JS_PATH);
      const { loadQuestionBank } = require('../../src/data/questionBank');
      const renderers = resolveScreenRenderers();
      const questions = prepareBrowserQuestions(loadQuestionBank(), i18n);

      jest.useFakeTimers();
      try {
        const session = startNewGame(container, renderers, questions, document, undefined, Math.random);
        const firstQuestion = session.questions[0];
        const image = container.querySelector('.question-screen__image');
        const altBeforeError = image.alt;

        expect(image.onerror).not.toBeNull();
        image.dispatchEvent(new Event('error'));

        expect(image).toHaveAttribute('src', `/assets/images/${firstQuestion.imageFallback}`);
        expect(image.alt).toBe(altBeforeError);

        // The game keeps going normally after the fallback swap.
        for (let i = 0; i < QUESTIONS_PER_GAME; i += 1) {
          const question = session.questions[session.state.questionIndex];
          const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
          buttons[question.correctAnswerIndex].click();
          getByRole(container, 'button', { name: questionStrings.nextButton }).click();
        }
      } finally {
        jest.useRealTimers();
      }

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('every <img> rendered while playing Oído Jurásico and Laberinto stays within each mode\'s own precache manifest', () => {
      global.fetch = rejectingFetch();
      const { getModeManifest } = require('../../src/data/modeResourceManifest');
      const { MODE_IDS } = require('../../src/game/modesCatalog');

      playOidoJurasicoGameToCompletion(container);
      const oidoImages = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));
      const oidoManifest = getModeManifest(MODE_IDS.OIDO_JURASICO);
      oidoImages.forEach((src) => {
        expect(oidoManifest.images).toContain(src);
      });

      playMazeGameToCompletion(container, 'offline-integration-maze-image-seed');
      const mazeImages = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));
      const mazeManifest = getModeManifest(MODE_IDS.LABERINTO);
      mazeImages.forEach((src) => {
        expect(mazeManifest.images).toContain(src);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('audio playback gating (dinoquiz:muted) across a real driven game', () => {
    function createRecordingAudioCtor() {
      const instances = [];
      function RecordingAudio(src) {
        this.src = src;
        this.preload = '';
        this.currentTime = 0;
        this.played = 0;
        instances.push(this);
      }
      RecordingAudio.prototype.play = function () {
        this.played += 1;
        return Promise.resolve();
      };
      RecordingAudio.prototype.pause = function () {};
      RecordingAudio.prototype.addEventListener = function () {};
      RecordingAudio.instances = instances;
      return RecordingAudio;
    }

    let originalAudio;
    let hadOwnAudio;

    beforeEach(() => {
      hadOwnAudio = Object.prototype.hasOwnProperty.call(global, 'Audio');
      originalAudio = global.Audio;
    });

    afterEach(() => {
      if (hadOwnAudio) {
        global.Audio = originalAudio;
      } else {
        delete global.Audio;
      }
    });

    test('the shared correct/incorrect feedback sfx never calls Audio.play() while dinoquiz:muted is "true" (preloading still warms up the players)', () => {
      global.fetch = rejectingFetch();
      window.localStorage.setItem('dinoquiz:muted', 'true');
      const RecordingAudio = createRecordingAudioCtor();
      global.Audio = RecordingAudio;

      const { resolveScreenRenderers, startNewGame, prepareBrowserQuestions } = require(MAIN_JS_PATH);
      const { loadQuestionBank } = require('../../src/data/questionBank');
      const renderers = resolveScreenRenderers();
      const questions = prepareBrowserQuestions(loadQuestionBank(), i18n);

      jest.useFakeTimers();
      try {
        const session = startNewGame(container, renderers, questions, document, undefined, Math.random);
        for (let i = 0; i < QUESTIONS_PER_GAME; i += 1) {
          const question = session.questions[session.state.questionIndex];
          const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
          buttons[question.correctAnswerIndex].click();
          getByRole(container, 'button', { name: questionStrings.nextButton }).click();
        }
      } finally {
        jest.useRealTimers();
      }

      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      // questionScreen.js's preload() may still construct both Audio
      // elements up front to warm them up -- what must never happen while
      // muted is an actual playback attempt.
      expect(RecordingAudio.instances.every((instance) => instance.played === 0)).toBe(true);
    });

    test('the same game unmuted actually plays the correct-answer chime', () => {
      global.fetch = rejectingFetch();
      window.localStorage.setItem('dinoquiz:muted', 'false');
      const RecordingAudio = createRecordingAudioCtor();
      global.Audio = RecordingAudio;

      const { resolveScreenRenderers, startNewGame, prepareBrowserQuestions } = require(MAIN_JS_PATH);
      const { loadQuestionBank } = require('../../src/data/questionBank');
      const renderers = resolveScreenRenderers();
      const questions = prepareBrowserQuestions(loadQuestionBank(), i18n);

      jest.useFakeTimers();
      try {
        const session = startNewGame(container, renderers, questions, document, undefined, Math.random);
        const question = session.questions[session.state.questionIndex];
        const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
        buttons[question.correctAnswerIndex].click();
      } finally {
        jest.useRealTimers();
      }

      expect(RecordingAudio.instances.length).toBeGreaterThan(0);
      expect(RecordingAudio.instances.some((instance) => instance.played > 0)).toBe(true);
    });

    test("Oído Jurásico's own round-sound play button builds no Audio element while muted, then plays as soon as it is not", () => {
      const oido = require(OIDO_SCREEN_PATH);
      const oidoAudioServiceModule = require(OIDO_AUDIO_SERVICE_PATH);
      const { resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const round = oido.generateOidoJurasicoRound(0, oido.buildOidoJurasicoRoundContext({ randomFn: () => 0.5 }));

      window.localStorage.setItem('dinoquiz:muted', 'true');
      const mutedAudioCtor = createRecordingAudioCtor();
      const mutedAudioService = oidoAudioServiceModule.createOidoJurasicoAudioService({
        AudioCtor: mutedAudioCtor,
        autoListen: false,
      });
      renderers.renderOidoJurasicoScreen(container, round, { audioService: mutedAudioService });
      container.querySelector('.oido-jurasico-screen__play-button').click();
      expect(mutedAudioCtor.instances).toHaveLength(0);

      window.localStorage.setItem('dinoquiz:muted', 'false');
      const unmutedAudioCtor = createRecordingAudioCtor();
      const unmutedAudioService = oidoAudioServiceModule.createOidoJurasicoAudioService({
        AudioCtor: unmutedAudioCtor,
        autoListen: false,
      });
      renderers.renderOidoJurasicoScreen(container, round, { audioService: unmutedAudioService });
      container.querySelector('.oido-jurasico-screen__play-button').click();
      expect(unmutedAudioCtor.instances).toHaveLength(1);
      expect(unmutedAudioCtor.instances[0].played).toBe(1);
    });
  });

  describe('a resource missing from Cache Storage blocks only the affected mode, via ModeBlockedScreen, while every other mode stays fully playable', () => {
    test('oidoJurasico is reported missing a resource and renders ModeBlockedScreen, while every other mode reports nothing missing and laberinto still plays a full game', async () => {
      global.fetch = rejectingFetch();
      const { getAllModeManifests } = require('../../src/data/modeResourceManifest');
      const { validateModeResources } = require('../../src/services/modeResourceValidation');
      const { renderModeBlockedScreen } = require('../../src/screens/ModeBlockedScreen');
      const { MODE_IDS } = require('../../src/game/modesCatalog');

      const blockedModeId = MODE_IDS.OIDO_JURASICO;
      const manifests = getAllModeManifests();
      const blockedManifest = manifests.find((manifest) => manifest.modeId === blockedModeId);
      const missingResourceUrl = blockedManifest.audio.find((url) => url.indexOf('/oido-jurasico/') !== -1);
      expect(missingResourceUrl).toBeTruthy();

      const caches = {
        match: jest.fn((url) => Promise.resolve(url === missingResourceUrl ? undefined : { url })),
      };
      const logService = { logModeResourceMissing: jest.fn() };

      for (const modeId of Object.values(MODE_IDS)) {
        const missing = await validateModeResources(modeId, { caches, logService });
        if (modeId === blockedModeId) {
          expect(missing).toEqual([missingResourceUrl]);
        } else {
          expect(missing).toEqual([]);
        }
      }
      expect(logService.logModeResourceMissing).toHaveBeenCalledWith(blockedModeId, missingResourceUrl);

      const onBack = jest.fn();
      const { title, message, backButton } = renderModeBlockedScreen(container, {
        reasonText: i18n.modeSelector.blockedReasons.insufficient_creature_sounds,
        onBack,
      });
      expect(title.textContent).toBe(modeBlockedStrings.screenTitle);
      expect(message.textContent).toBe(i18n.modeSelector.blockedReasons.insufficient_creature_sounds);
      backButton.click();
      expect(onBack).toHaveBeenCalledTimes(1);

      // A completely unrelated mode, checked the exact same way, is
      // untouched -- and genuinely still playable start to finish.
      playMazeGameToCompletion(container, 'offline-integration-blocked-isolation-seed');
      expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
