'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getAllByRole } = require('@testing-library/dom');

const { renderClassifyScreen } = require('./ClassifyScreen');
const { classify: strings } = require('../../public/i18n/es.json');
const { DINOSAURS } = require('../data/questionBank');
const { createSoundService, SOUND_SRC } = require('../services/sound');

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

/** TREX is carnivoro, TRICERATOPS is herbivoro in the shipped creature sheet -- see src/data/creatureSheet.js. */
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

describe('ClassifyScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the creature and three touch/keyboard-reachable category buttons inside a labeled group', () => {
    const round = buildRound();
    const { categoriesGroup, creature } = renderClassifyScreen(container, round, { locale: 'es' });

    expect(getByRole(container, 'group', { name: strings.categoriesGroupLabel })).toBe(categoriesGroup);
    const buttons = getAllByRole(categoriesGroup, 'button');
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

  test('shows the level and round progress', () => {
    const round = buildRound({ level: 4 });
    const { root } = renderClassifyScreen(container, round, { roundNumber: 3, totalRounds: 10 });

    expect(root.textContent).toContain('Nivel 4');
    expect(root.textContent).toContain('Ronda 3 de 10');
  });

  describe('answering a round (real classifyGame.js integration)', () => {
    test('a correct pick reveals the outcome via text + icon + aria-live, and plays the correct sound', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const onAnswer = jest.fn();
      const { categoryButtons, feedbackMessage, announcementEl, nextButton, getGameState } = renderClassifyScreen(
        container,
        round,
        { soundService, onAnswer }
      );

      categoryButtons.carnivoro.click();

      expect(categoryButtons.carnivoro.classList.contains('classify-screen__category-button--correct')).toBe(true);
      expect(categoryButtons.carnivoro.getAttribute('aria-label')).toContain('Categoría correcta');
      expect(feedbackMessage.hidden).toBe(false);
      expect(feedbackMessage.textContent).toContain(strings.dinosaurNames.trex);
      expect(feedbackMessage.classList.contains('classify-screen__feedback-message--correct')).toBe(true);
      expect(announcementEl.textContent).toContain(strings.dinosaurNames.trex);
      expect(nextButton.hidden).toBe(false);

      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(0);

      expect(getGameState().score).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'carnivoro', round: expect.objectContaining({ status: 'completed', isCorrect: true }) })
      );

      Object.values(categoryButtons).forEach((button) => expect(button.disabled).toBe(true));
    });

    test('a wrong pick still reveals the correct category (never color-only) and marks the child\'s own pick neutrally', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, feedbackMessage } = renderClassifyScreen(container, round, { soundService });

      categoryButtons.herbivoro.click();

      expect(categoryButtons.carnivoro.classList.contains('classify-screen__category-button--correct')).toBe(true);
      expect(categoryButtons.herbivoro.classList.contains('classify-screen__category-button--selected')).toBe(true);
      expect(categoryButtons.herbivoro.getAttribute('aria-label')).toContain('Tu respuesta');
      expect(feedbackMessage.classList.contains('classify-screen__feedback-message--incorrect')).toBe(true);
      expect(feedbackMessage.textContent).toContain(strings.dinosaurNames.trex);

      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
    });

    test('a second click on any category is ignored once the round is finished', () => {
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, getGameState } = renderClassifyScreen(container, round, {});

      categoryButtons.carnivoro.click();
      categoryButtons.herbivoro.click();

      expect(getGameState().score).toBe(1);
      expect(getGameState().answers).toHaveLength(1);
    });
  });

  describe('speed bonus (classifyTimer.js integration)', () => {
    test('a correct answer inside the bonus window shows the redundant text+icon bonus badge', () => {
      const timer = { getState: () => ({ status: 'active', bonusEligible: true }), off: jest.fn() };
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, bonusBadge } = renderClassifyScreen(container, round, { timer });

      categoryButtons.carnivoro.click();

      expect(bonusBadge.hidden).toBe(false);
      expect(bonusBadge.textContent).toContain(strings.feedback.bonusMessage);
      expect(timer.off).toHaveBeenCalledTimes(1);
    });

    test('a correct answer outside the bonus window never shows the badge', () => {
      const timer = { getState: () => ({ status: 'expired', bonusEligible: false }), off: jest.fn() };
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, bonusBadge } = renderClassifyScreen(container, round, { timer });

      categoryButtons.carnivoro.click();

      expect(bonusBadge.hidden).toBe(true);
    });

    test('a wrong answer never shows the bonus badge, even inside the bonus window', () => {
      const timer = { getState: () => ({ status: 'active', bonusEligible: true }), off: jest.fn() };
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, bonusBadge } = renderClassifyScreen(container, round, { timer });

      categoryButtons.herbivoro.click();

      expect(bonusBadge.hidden).toBe(true);
    });
  });

  describe('the controlled guard for an unverifiable ficha (blocked round)', () => {
    test('never asks the child to guess: categories stay hidden and the blocked message shows via text + aria-live, with no sound', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const round = buildRound();
      const onAnswer = jest.fn();
      const createTimer = jest.fn();

      const { categoriesGroup, blockedMessage, feedbackMessage, announcementEl, nextButton } = renderClassifyScreen(
        container,
        round,
        {
          soundService,
          onAnswer,
          getCreatureSheet: () => null,
          classifyTimer: { createTimer },
        }
      );

      expect(categoriesGroup.hidden).toBe(true);
      expect(blockedMessage.hidden).toBe(false);
      expect(blockedMessage.textContent).toContain(strings.blocked.message);
      expect(feedbackMessage.hidden).toBe(true);
      expect(announcementEl.textContent).toContain(strings.dinosaurNames.trex);
      expect(nextButton.hidden).toBe(false);

      expect(audioFactory.created[SOUND_SRC.correct]).toBeUndefined();
      expect(audioFactory.created[SOUND_SRC.incorrect]).toBeUndefined();
      expect(createTimer).not.toHaveBeenCalled();

      expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ round: expect.objectContaining({ status: 'blocked' }) }));
    });
  });

  describe('advancing rounds', () => {
    test('the next button calls onNext with the updated score when this is not the last round', () => {
      const onNext = jest.fn();
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, nextButton } = renderClassifyScreen(container, round, {
        roundNumber: 3,
        totalRounds: 10,
        score: 2,
        onNext,
      });

      categoryButtons.carnivoro.click();
      nextButton.click();

      expect(onNext).toHaveBeenCalledWith(3);
    });

    test('the next button calls onGameOver on the last round and shows the game-over heading', () => {
      const onGameOver = jest.fn();
      const round = buildRound({ dinosaur: DINOSAURS.TREX });
      const { categoryButtons, nextButton, resultHeading } = renderClassifyScreen(container, round, {
        roundNumber: 10,
        totalRounds: 10,
        score: 6,
        onGameOver,
      });

      categoryButtons.carnivoro.click();
      expect(resultHeading.hidden).toBe(false);
      expect(resultHeading.textContent).toBe(strings.gameOver.heading);

      nextButton.click();

      expect(onGameOver).toHaveBeenCalledWith(7);
    });
  });

  test('the categories CSS caps its width so it never forces horizontal scroll at 375px', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.classify-screen__categories\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/width:\s*min\(100%,\s*320px\)/);
  });

  test('every category button meets the shared 48px minimum tap target', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const ruleMatch = css.match(/\.classify-screen__category-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch[1]).toMatch(/min-height:\s*var\(--tap-target-min\)/);
  });
});
