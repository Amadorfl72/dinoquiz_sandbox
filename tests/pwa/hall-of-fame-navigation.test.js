'use strict';

require('@testing-library/jest-dom');
const path = require('path');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');
const fullI18n = require('../../public/i18n/es.json');
const { home: homeStrings, results: resultsStrings, hallOfFame: hallOfFameStrings, question: questionStrings } = fullI18n;
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');

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
  return Array.from({ length: count }, (_unused, index) => buildQuestion(`q-${index}`, level));
}

/** A flat bank covering every level in `levels` (10 questions each) -- lets a 6/10 score actually unlock the next level instead of hitting gameFlow's level-generation-failure safe exit. */
function buildLeveledQuestionBank(levels) {
  return levels.reduce(
    (all, level) =>
      all.concat(buildQuestionBank(10, level).map((question, index) => ({ ...question, id: `q-l${level}-${index}` }))),
    []
  );
}

async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1;
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('Hall of Fame navigation: entry points from Inicio and Resultados', () => {
  test('index.html loads the Hall of Fame screen/service scripts before the bootstrap script', () => {
    const fs = require('fs');
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const hallOfFameScreenIndex = indexHtml.indexOf('/scripts/hallOfFameScreen.js');
    const hallOfFameServiceIndex = indexHtml.indexOf('/scripts/hallOfFameService.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(hallOfFameScreenIndex).toBeGreaterThan(-1);
    expect(hallOfFameServiceIndex).toBeGreaterThan(-1);
    expect(hallOfFameScreenIndex).toBeLessThan(mainIndex);
    expect(hallOfFameServiceIndex).toBeLessThan(mainIndex);
  });

  test('loadHallOfFameStrings fetches the i18n resource and returns the hallOfFame strings', async () => {
    const { loadHallOfFameStrings } = require(MAIN_JS_PATH);
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ hallOfFame: hallOfFameStrings }) });

    const result = await loadHallOfFameStrings(fetchFn, '/i18n/es.json');

    expect(fetchFn).toHaveBeenCalledWith('/i18n/es.json');
    expect(result).toBe(hallOfFameStrings);
  });

  test('loadHomeResources also resolves the hallOfFame section, alongside home/privacy/purchase', async () => {
    const { loadHomeResources } = require(MAIN_JS_PATH);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: {}, privacy: {}, purchase: {}, hallOfFame: hallOfFameStrings }),
    });

    const result = await loadHomeResources(fetchFn);

    expect(result.hallOfFame).toBe(hallOfFameStrings);
  });

  test('resolveHallOfFameService resolves the registered window.DinoQuiz service', () => {
    const { resolveHallOfFameService } = require(MAIN_JS_PATH);
    const fakeService = { addEntry: jest.fn(), getEntries: jest.fn(), clearAll: jest.fn() };

    const resolved = resolveHallOfFameService({ DinoQuiz: { services: { hallOfFameService: fakeService } } });

    expect(resolved).toBe(fakeService);
  });

  test('renderHallOfFame renders into #app, forwarding highlightEntryId and onBack', async () => {
    const { renderHallOfFame } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderHallOfFameScreen = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ hallOfFame: hallOfFameStrings }) });
    const onBack = jest.fn();

    global.window.DinoQuiz = { screens: { renderHallOfFameScreen } };

    await renderHallOfFame(doc, undefined, fetchFn, { highlightEntryId: 12345, onBack });

    expect(renderHallOfFameScreen).toHaveBeenCalledTimes(1);
    const [renderedContainer, options] = renderHallOfFameScreen.mock.calls[0];
    expect(renderedContainer).toBe(container);
    expect(options.strings).toBe(hallOfFameStrings);
    expect(options.highlightEntryId).toBe(12345);
    expect(options.onBack).toBe(onBack);
  });

  test('renderHome wires onOpenHallOfFame on the home screen options', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const container = { id: 'app' };
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const renderHomeScreen = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ home: {}, hallOfFame: hallOfFameStrings }) });

    await renderHome(doc, renderHomeScreen, fetchFn, undefined, undefined, undefined);

    expect(renderHomeScreen).toHaveBeenCalledTimes(1);
    const [, options] = renderHomeScreen.mock.calls[0];
    expect(options.hallOfFameStrings).toBe(hallOfFameStrings);
    expect(typeof options.onOpenHallOfFame).toBe('function');
  });
});

/** Lets any promise chains already queued (e.g. renderHome's/renderHallOfFame's several `.then()` hops across fetch/storage) settle, mirroring game-flow.test.js's own flushPromises. */
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Hall of Fame navigation: full click-through (Inicio -> Hall of Fame -> back to Inicio)', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    window.localStorage.clear();
  });

  afterEach(() => {
    container.remove();
  });

  test('the Hall of Fame button opens the Hall of Fame screen, and its back button returns to a freshly-rendered Inicio', async () => {
    // Registers both screens on window.DinoQuiz (dual CommonJS/global pattern).
    require('../../public/scripts/hallOfFameScreen');
    require('../../public/scripts/hallOfFameService');
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const doc = document;
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve(fullI18n) });

    await renderHome(doc, renderers.renderHomeScreen, fetchFn, undefined, undefined, undefined);

    const hallOfFameButton = getByRole(container, 'button', { name: hallOfFameStrings.title });
    hallOfFameButton.click();
    await flushPromises();

    expect(container.querySelector('.hall-of-fame-screen')).not.toBeNull();
    expect(container.querySelector('.home-screen__play-button')).toBeNull();

    const backButton = getByRole(container, 'button', { name: hallOfFameStrings.backButtonLabel });
    backButton.click();
    await flushPromises();

    expect(container.querySelector('.home-screen__play-button')).not.toBeNull();
    expect(container.querySelector('.hall-of-fame-screen')).toBeNull();
  });
});

describe('Hall of Fame navigation: full click-through (Resultados -> Hall of Fame -> back to Resultados, with highlight)', () => {
  let container;
  let originalAudio;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    window.localStorage.clear();

    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
  });

  test('finishing a Quiz level records a Hall of Fame entry and shows a "Salón de la Fama" button that highlights it, with a back path to the same Resultados', async () => {
    require('../../public/scripts/hallOfFameScreen');
    const hallOfFameService = require('../../public/scripts/hallOfFameService');
    const { resolveScreenRenderers, startLevelGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);

    startLevelGame(container, renderers, questions, document, undefined, { ageBand: 'eight-plus', randomFn: () => 0 });

    // 6/10: acierta las 6 primeras, falla las 4 últimas.
    for (const mark of 'CCCCCCFFFF') {
      await answerCurrentQuestion(container, { correct: mark === 'C' });
    }
    await jest.advanceTimersByTimeAsync(0);

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen__score')).toHaveTextContent('6/10');

    // The just-finished game was recorded, on this device, as a Hall of Fame entry.
    const entries = hallOfFameService.getEntries();
    expect(entries.some((entry) => entry.score === 6)).toBe(true);

    const viewHallOfFameButton = getByRole(container, 'button', { name: hallOfFameStrings.title });
    viewHallOfFameButton.click();
    await jest.advanceTimersByTimeAsync(0);

    expect(container.querySelector('.hall-of-fame-screen')).not.toBeNull();
    const highlightedRow = container.querySelector('.hall-of-fame-screen__row--highlight');
    expect(highlightedRow).not.toBeNull();
    expect(highlightedRow).toHaveTextContent('6');
    expect(highlightedRow.querySelector('.hall-of-fame-screen__badge')).toHaveTextContent(hallOfFameStrings.highlightBadge);

    const backButton = getByRole(container, 'button', { name: hallOfFameStrings.backButtonLabel });
    backButton.click();
    await jest.advanceTimersByTimeAsync(0);

    // Back on the very same Resultados -- not a dead end, not Inicio.
    expect(container.querySelector('.hall-of-fame-screen')).toBeNull();
    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen__score')).toHaveTextContent('6/10');
    expect(getByRole(container, 'button', { name: resultsStrings.nextLevelButtonFormat.replace('{level}', '2') })).toBeTruthy();
  });
});
