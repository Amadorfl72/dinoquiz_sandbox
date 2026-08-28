'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getAllByRole } = require('@testing-library/dom');

const { renderTimelineScreen } = require('./TimelineScreen');
const { timeline: strings } = require('../../public/i18n/es.json');
const { DINOSAURS } = require('../data/questionBank');
const { ERRORS } = require('../game/timelineRound');
const { createSoundService, SOUND_SRC } = require('../services/sound');
const { contrastRatio } = require('../theme/contrast');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

function createFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

function createFakeAudio() {
  return {
    src: '',
    preload: '',
    currentTime: 0,
    played: 0,
    play() {
      this.played += 1;
      return Promise.resolve();
    },
  };
}

function createFakeAudioFactory() {
  const created = {};
  const factory = (src) => {
    const audio = createFakeAudio();
    audio.src = src;
    created[src] = audio;
    return audio;
  };
  factory.created = created;
  return factory;
}

/** TREX -> cretacico with a documented interval, TRICERATOPS -> cretacico with none, PTERANODON -> reptil_volador -- see src/data/creatureSheet.js. */
function buildRound(overrides = {}) {
  return {
    roundIndex: 0,
    level: 2,
    dinosaur: DINOSAURS.TREX,
    status: 'playing',
    evaluated: false,
    ...overrides,
  };
}

describe('TimelineScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the creature and three touch/keyboard-reachable period buttons inside a labeled group', () => {
    const round = buildRound();
    const { periodsGroup, creature } = renderTimelineScreen(container, round, { locale: 'es' });

    expect(getByRole(container, 'group', { name: strings.optionsGroupLabel })).toBe(periodsGroup);
    const buttons = getAllByRole(periodsGroup, 'button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.disabled).toBe(false);
    });

    expect(creature.textContent).toContain(strings.dinosaurNames.trex);
    const image = creature.querySelector('img');
    expect(image.getAttribute('src')).toBe('/assets/images/dinosaurs/trex.svg');
    expect(image.getAttribute('aria-hidden')).toBe('true');
  });

  test('shows the level and round progress plus the instruction text from i18n', () => {
    const round = buildRound({ level: 4 });
    const { root } = renderTimelineScreen(container, round, { roundNumber: 3, totalRounds: 10 });

    expect(root.textContent).toContain('Nivel 4');
    expect(root.textContent).toContain('Ronda 3 de 10');
    expect(root.textContent).toContain(strings.instruction);
  });

  describe('answering a round (real timelineRound.js integration)', () => {
    test('a correct pick reveals the outcome via text + icon + aria-live, the precise interval, and plays the correct sound', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const onAnswer = jest.fn();
      const { periodButtons, feedbackMessage, explanationInterval, explanationClassification, announcementEl, nextButton, getGameState } =
        renderTimelineScreen(container, round, { soundService, onAnswer });

      periodButtons.cretacico.click();

      expect(periodButtons.cretacico.classList.contains('timeline-screen__period-button--correct')).toBe(true);
      expect(periodButtons.cretacico.getAttribute('aria-label')).toContain('Periodo correcto');
      expect(feedbackMessage.hidden).toBe(false);
      expect(feedbackMessage.classList.contains('timeline-screen__feedback-message--correct')).toBe(true);
      expect(feedbackMessage.textContent).toContain('Cretácico');

      expect(explanationInterval.hidden).toBe(false);
      expect(explanationInterval.textContent).toContain('68 a 66 millones de años');
      expect(explanationClassification.hidden).toBe(true);

      expect(announcementEl.textContent).toContain(strings.feedback.correct.replace('{periodo}', 'Cretácico'));
      expect(announcementEl.textContent).toContain('68 a 66 millones de años');
      expect(nextButton.hidden).toBe(false);

      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(0);

      expect(getGameState().score).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ periodGuess: 'cretacico', round: expect.objectContaining({ status: 'completed', isCorrect: true }) })
      );

      Object.values(periodButtons).forEach((button) => expect(button.disabled).toBe(true));
    });

    test("a wrong pick still reveals the correct period (never color-only) and marks the child's own pick neutrally", () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { periodButtons, feedbackMessage } = renderTimelineScreen(container, round, { soundService });

      periodButtons.triasico.click();

      expect(periodButtons.cretacico.classList.contains('timeline-screen__period-button--correct')).toBe(true);
      expect(periodButtons.triasico.classList.contains('timeline-screen__period-button--selected')).toBe(true);
      expect(periodButtons.triasico.getAttribute('aria-label')).toContain('Tu respuesta');
      expect(feedbackMessage.classList.contains('timeline-screen__feedback-message--incorrect')).toBe(true);
      expect(feedbackMessage.textContent).toContain('Cretácico');

      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
    });

    test('shows no interval line for a creature with no documented precise interval (never fabricated)', () => {
      const round = buildRound({ dinosaur: DINOSAURS.TRICERATOPS });
      const { periodButtons, explanationInterval } = renderTimelineScreen(container, round, {});

      periodButtons.cretacico.click();

      expect(explanationInterval.hidden).toBe(true);
    });

    test('states Pteranodon as a flying reptile, not a dinosaur, via the classification explanation', () => {
      const round = buildRound({ dinosaur: DINOSAURS.PTERANODON });
      const { periodButtons, explanationClassification, announcementEl } = renderTimelineScreen(container, round, {});

      periodButtons.cretacico.click();

      expect(explanationClassification.hidden).toBe(false);
      expect(explanationClassification.textContent).toBe(strings.explanation.pteranodon);
      expect(announcementEl.textContent).toContain(strings.explanation.pteranodon);
    });

    test('a second click on any period is ignored once the round is finished', () => {
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { periodButtons, getGameState } = renderTimelineScreen(container, round, {});

      periodButtons.cretacico.click();
      periodButtons.triasico.click();

      expect(getGameState().score).toBe(1);
      expect(getGameState().answers).toHaveLength(1);
    });
  });

  describe('the controlled guard for an unverifiable ficha (blocked round)', () => {
    test('never asks the child to guess: periods stay hidden and the blocked message shows via text + aria-live, with no sound, but the game continues', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound();
      const onAnswer = jest.fn();

      const { periodsGroup, blockedMessage, feedbackMessage, announcementEl, nextButton } = renderTimelineScreen(container, round, {
        soundService,
        onAnswer,
        getCreatureSheet: () => null,
      });

      expect(periodsGroup.hidden).toBe(true);
      expect(blockedMessage.hidden).toBe(false);
      expect(blockedMessage.textContent).toContain(strings.blockedRound.message);
      expect(feedbackMessage.hidden).toBe(true);
      expect(announcementEl.textContent).toContain(strings.dinosaurNames.trex);
      expect(nextButton.hidden).toBe(false);

      expect(audioFactory.created[SOUND_SRC.correct]).toBeUndefined();
      expect(audioFactory.created[SOUND_SRC.incorrect]).toBeUndefined();

      expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ round: expect.objectContaining({ status: 'blocked' }) }));
    });
  });

  describe('the whole-mode locked state (PRD: fichas insuficientes)', () => {
    test('renders the localized locked message and an accessible exit action instead of a broken board, given a startGame error', () => {
      const onBackToSelector = jest.fn();
      const { root, lockedMessage, exitButton, isLocked } = renderTimelineScreen(
        container,
        { error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES, details: { need: 10, have: 2 } },
        { onBackToSelector }
      );

      expect(root.textContent).toContain(strings.modeName);
      expect(getByRole(container, 'status')).toBe(lockedMessage);
      expect(lockedMessage.textContent).toBe(strings.locked.message);
      expect(isLocked()).toBe(true);

      const button = getByRole(container, 'button', { name: strings.locked.exitLabel });
      expect(button).toBe(exitButton);
      button.click();
      expect(onBackToSelector).toHaveBeenCalledTimes(1);
    });

    test('also locks when no round is given at all (defense in depth)', () => {
      const { isLocked } = renderTimelineScreen(container, null, {});
      expect(isLocked()).toBe(true);
    });
  });

  describe('advancing rounds', () => {
    test('the next button calls onNext with the updated score when this is not the last round', () => {
      const onNext = jest.fn();
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { periodButtons, nextButton } = renderTimelineScreen(container, round, {
        roundNumber: 3,
        totalRounds: 10,
        score: 2,
        onNext,
      });

      periodButtons.cretacico.click();
      nextButton.click();

      expect(onNext).toHaveBeenCalledWith(3);
    });

    test('the next button calls onGameOver on the last round and shows the game-over heading', () => {
      const onGameOver = jest.fn();
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { periodButtons, nextButton, resultHeading } = renderTimelineScreen(container, round, {
        roundNumber: 10,
        totalRounds: 10,
        score: 6,
        onGameOver,
      });

      periodButtons.cretacico.click();
      expect(resultHeading.hidden).toBe(false);
      expect(resultHeading.textContent).toBe(strings.gameOver.heading);

      nextButton.click();

      expect(onGameOver).toHaveBeenCalledWith(7);
    });
  });

  test('the periods column CSS caps its width so it never forces horizontal scroll at 375px', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.timeline-screen__periods\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/width:\s*min\(100%,\s*320px\)/);
  });

  test('every period button meets the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.timeline-screen__period-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);
  });

  test('the exit button on the locked state meets the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.timeline-screen__exit-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);
  });

  test('the educational explanation box color pair meets WCAG AA 4.5:1', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.timeline-screen__explanation\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/background-color:\s*#fff9c4/);
    expect(ruleMatch[1]).toMatch(/color:\s*#5d4037/);
    expect(contrastRatio('#fff9c4', '#5d4037')).toBeGreaterThanOrEqual(4.5);
  });
});
