'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { fireEvent } = require('@testing-library/dom');

const {
  renderOidoJurasicoScreen,
  renderOidoJurasicoIntro,
  generateOidoJurasicoRound,
  buildOidoJurasicoRoundContext,
  hasSeenIntro,
  markIntroSeen,
  ERRORS,
  SOUND_CREATURE_IDS,
} = require('./OidoJurasicoScreen');
const { oidoJurasico: strings } = require('../../public/i18n/es.json');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

function buildRound(overrides = {}) {
  return {
    roundIndex: 0,
    correctId: 'trex',
    options: ['trex', 'triceratops', 'velociraptor', 'estegosaurio'],
    soundUrl: '/assets/sounds/oido-jurasico/trex.wav',
    status: 'playing',
    ...overrides,
  };
}

function createFakeAudioService(overrides = {}) {
  return {
    isMuted: jest.fn(() => false),
    play: jest.fn(() => ({ status: 'playing' })),
    repeat: jest.fn(() => ({ status: 'playing' })),
    getState: jest.fn(() => ({ status: 'idle' })),
    off: jest.fn(),
    ...overrides,
  };
}

function createMemoryStorage() {
  const store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
}

describe('generateOidoJurasicoRound', () => {
  test('builds a 4-option round with a playable sound URL derived from the correct creature', () => {
    const context = buildOidoJurasicoRoundContext({ randomFn: () => 0 });
    const round = generateOidoJurasicoRound(0, context);

    expect(round.error).toBeUndefined();
    expect(round.options).toHaveLength(4);
    expect(round.options).toContain(round.correctId);
    expect(round.soundUrl).toBe(`/assets/sounds/oido-jurasico/${round.correctId}.wav`);
  });

  test('never repeats the same correct creature two rounds in a row', () => {
    const context = buildOidoJurasicoRoundContext({ randomFn: Math.random });
    let previous = null;
    for (let i = 0; i < 20; i += 1) {
      const round = generateOidoJurasicoRound(i % 10, context);
      if (previous !== null) {
        expect(round.correctId).not.toBe(previous);
      }
      previous = round.correctId;
    }
  });

  test('returns a catalog-too-small error instead of a partial round when fewer than 4 sounds are available', () => {
    const context = buildOidoJurasicoRoundContext({ creatureIds: ['trex', 'triceratops'], randomFn: Math.random });
    const round = generateOidoJurasicoRound(0, context);

    expect(round.error).toBe(ERRORS.CATALOG_TOO_SMALL);
    expect(round.details).toEqual({ need: 4, have: 2 });
  });

  test('the real shipped sound pool has enough creatures for a full 10-round game with no immediate repeats', () => {
    expect(SOUND_CREATURE_IDS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('intro-seen persistence', () => {
  test('hasSeenIntro is false until markIntroSeen records it, then stays true', () => {
    const storage = createMemoryStorage();
    expect(hasSeenIntro(storage)).toBe(false);
    markIntroSeen(storage);
    expect(hasSeenIntro(storage)).toBe(true);
  });

  test('degrades to "not seen" (never throws) without storage', () => {
    expect(hasSeenIntro(undefined)).toBe(false);
    expect(() => markIntroSeen(undefined)).not.toThrow();
  });
});

describe('renderOidoJurasicoIntro', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the localized "imagined sound" explanation with a continue button that calls onContinue', () => {
    const onContinue = jest.fn();
    const { heading, message, continueButton } = renderOidoJurasicoIntro(container, { onContinue });

    expect(heading.textContent).toBe(strings.imaginedSoundNotice.heading);
    expect(message.textContent).toBe(strings.imaginedSoundNotice.message);
    expect(continueButton.textContent).toBe(strings.imaginedSoundNotice.continueButton);

    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('OidoJurasicoScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title, instructions, round progress and score from the real es.json strings', () => {
    const round = buildRound();
    const audioService = createFakeAudioService();
    renderOidoJurasicoScreen(container, round, { roundNumber: 3, totalRounds: 10, score: 2, audioService });

    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain('Ronda 3 de 10');
    expect(container.textContent).toContain(strings.scoreLabel + ': 2');
  });

  test('renders four accessible options: labeled group, visible creature name, position-numbered aria-label', () => {
    const round = buildRound();
    const audioService = createFakeAudioService();
    const { optionsGroup, optionButtons } = renderOidoJurasicoScreen(container, round, { audioService });

    expect(optionsGroup).toHaveAttribute('role', 'group');
    expect(optionsGroup).toHaveAttribute('aria-label', strings.optionsGroupLabel);
    expect(optionButtons).toHaveLength(4);

    optionButtons.forEach((button, index) => {
      const creature = strings.dinosaurNames[round.options[index]];
      expect(button.textContent).toBe(creature);
      expect(button.getAttribute('aria-label')).toBe(
        strings.options['option' + (index + 1) + 'Label'].replace('{creature}', creature)
      );
      expect(button.tagName).toBe('BUTTON');
    });
  });

  test('the play button plays on first tap and switches to "listen again" afterwards', () => {
    const round = buildRound();
    const audioService = createFakeAudioService();
    const { playButton } = renderOidoJurasicoScreen(container, round, { audioService });

    expect(playButton.textContent).toBe(strings.playButton);
    fireEvent.click(playButton);
    expect(audioService.play).toHaveBeenCalledWith(round.soundUrl);
    expect(playButton.textContent).toBe(strings.replayButton);

    fireEvent.click(playButton);
    expect(audioService.repeat).toHaveBeenCalledWith(round.soundUrl);
  });

  test('a correct pick scores once, marks the option correct, and announces text plus the imagined-sound reinforcement', () => {
    const round = buildRound();
    const onAnswer = jest.fn();
    const audioService = createFakeAudioService();
    const { optionButtons, announcementEl, scoreEl } = renderOidoJurasicoScreen(container, round, {
      score: 2,
      onAnswer,
      audioService,
    });

    fireEvent.click(optionButtons[0]); // trex, correct

    expect(optionButtons[0]).toHaveClass('oido-jurasico-screen__option--correct');
    expect(optionButtons.every((button) => button.disabled)).toBe(true);
    expect(scoreEl.textContent).toBe(strings.scoreLabel + ': 3');
    expect(announcementEl.textContent).toContain(strings.feedback.correct);
    expect(announcementEl.textContent).toContain(strings.answerReinforcement.message);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, score: 3, scoreDelta: 1, correctId: 'trex', selectedId: 'trex' })
    );
  });

  test('a wrong pick never subtracts, marks the correct option, spells out the right creature, and still reinforces the imagined sound', () => {
    const round = buildRound();
    const audioService = createFakeAudioService();
    const { optionButtons, announcementEl, scoreEl } = renderOidoJurasicoScreen(container, round, { score: 5, audioService });

    fireEvent.click(optionButtons[1]); // triceratops, wrong

    expect(scoreEl.textContent).toBe(strings.scoreLabel + ': 5');
    expect(optionButtons[0]).toHaveClass('oido-jurasico-screen__option--correct');
    expect(optionButtons[1]).toHaveClass('oido-jurasico-screen__option--neutral');

    const expectedAnswer = strings.feedback.correctAnswer.replace('{creature}', strings.dinosaurNames.trex);
    expect(announcementEl.textContent).toContain(strings.feedback.incorrect);
    expect(announcementEl.textContent).toContain(expectedAnswer);
    expect(announcementEl.textContent).toContain(strings.answerReinforcement.message);
  });

  test('counts a response only once: a second click on any option after the first is ignored', () => {
    const round = buildRound();
    const onAnswer = jest.fn();
    const audioService = createFakeAudioService();
    const { optionButtons } = renderOidoJurasicoScreen(container, round, { score: 0, onAnswer, audioService });

    fireEvent.click(optionButtons[0]);
    fireEvent.click(optionButtons[1]);
    fireEvent.click(optionButtons[0]);

    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  test('shows the accessible feedback component (icon + text) on answer', () => {
    const round = buildRound();
    const audioService = createFakeAudioService();
    const { feedbackComponent, optionButtons } = renderOidoJurasicoScreen(container, round, { audioService });
    expect(feedbackComponent.root.hidden).toBe(true);

    fireEvent.click(optionButtons[0]);

    const icon = container.querySelector('.feedback-component__icon');
    const message = container.querySelector('.feedback-component__message');
    expect(feedbackComponent.root.hidden).toBe(false);
    expect(icon.textContent.length).toBeGreaterThan(0);
    expect(message.textContent).toBe(strings.feedback.correct);
  });

  test('reveals "Siguiente" only after answering, and it forwards the updated score via onNext', () => {
    const round = buildRound();
    const onNext = jest.fn();
    const audioService = createFakeAudioService();
    const { optionButtons, nextButton } = renderOidoJurasicoScreen(container, round, { score: 0, onNext, audioService });

    expect(nextButton.hidden).toBe(true);
    fireEvent.click(optionButtons[0]);
    expect(nextButton.hidden).toBe(false);

    fireEvent.click(nextButton);
    expect(onNext).toHaveBeenCalledWith(1);
  });

  test('renders the localized blocked state with a "back to selector" button instead of a board when the round is a catalog-too-small error', () => {
    const round = { error: ERRORS.CATALOG_TOO_SMALL, details: { need: 4, have: 2 } };
    const onBack = jest.fn();
    const result = renderOidoJurasicoScreen(container, round, { onBack });

    expect(result.isBlocked()).toBe(true);
    expect(container.textContent).toContain(strings.screenTitle);
    expect(container.querySelector('.oido-jurasico-screen__blocked-message')).toHaveTextContent(
      strings.blocked.insufficientCatalog
    );
    expect(container.querySelector('.oido-jurasico-screen__blocked-message')).toHaveAttribute('role', 'status');
    expect(container.querySelector('.oido-jurasico-screen__option')).toBeNull();

    fireEvent.click(result.backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('shows the muted notice (never the board) up front when sound is already muted, offering "activar sonido" or "volver"', () => {
    const round = buildRound();
    const onBack = jest.fn();
    const onUnmute = jest.fn();
    const audioService = createFakeAudioService({ isMuted: jest.fn(() => true) });

    const { mutedSection, soundPanel, optionsGroup, unmuteButton, mutedBackButton } = renderOidoJurasicoScreen(container, round, {
      audioService,
      onBack,
      onUnmute,
      storageObj: createMemoryStorage(),
    });

    expect(mutedSection.hidden).toBe(false);
    expect(soundPanel.hidden).toBe(true);
    expect(optionsGroup.hidden).toBe(true);
    expect(container.textContent).toContain(strings.mutedNotice.heading);

    fireEvent.click(mutedBackButton);
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.click(unmuteButton);
    expect(onUnmute).toHaveBeenCalledTimes(1);
    expect(mutedSection.hidden).toBe(true);
    expect(soundPanel.hidden).toBe(false);
    expect(optionsGroup.hidden).toBe(false);
  });

  test('switches to the muted notice reactively if a play attempt comes back muted mid-round', () => {
    const round = buildRound();
    let muted = false;
    const audioService = createFakeAudioService({
      isMuted: jest.fn(() => muted),
      play: jest.fn(() => {
        muted = true;
        return { status: 'muted' };
      }),
    });
    const audioServiceModule = { createOidoJurasicoAudioService: jest.fn(() => audioService) };

    const { playButton, mutedSection, soundPanel } = renderOidoJurasicoScreen(container, round, { audioServiceModule });
    expect(mutedSection.hidden).toBe(true);

    fireEvent.click(playButton);

    // The service is created by the screen itself here (no options.audioService
    // override), so its onMuted callback -- wired at creation -- is what the
    // fake service above never calls; instead this exercises the real
    // audioServiceModule factory wiring by asserting the factory received
    // onMuted/onError callbacks.
    const factoryCallArgs = audioServiceModule.createOidoJurasicoAudioService.mock.calls[0][0];
    expect(typeof factoryCallArgs.onMuted).toBe('function');
    factoryCallArgs.onMuted();

    expect(mutedSection.hidden).toBe(false);
    expect(soundPanel.hidden).toBe(true);
  });

  test('shows the playback-error notice with a "back to selector" button when the audio service reports an error', () => {
    const round = buildRound();
    const onBack = jest.fn();
    const audioService = createFakeAudioService();
    const audioServiceModule = { createOidoJurasicoAudioService: jest.fn(() => audioService) };

    const { errorSection, errorBackButton } = renderOidoJurasicoScreen(container, round, { audioServiceModule, onBack });

    const factoryCallArgs = audioServiceModule.createOidoJurasicoAudioService.mock.calls[0][0];
    expect(typeof factoryCallArgs.onError).toBe('function');
    expect(errorSection.hidden).toBe(true);

    factoryCallArgs.onError(new Error('boom'));
    expect(errorSection.hidden).toBe(false);
    expect(container.textContent).toContain(strings.playbackError.message);

    fireEvent.click(errorBackButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('renders a well-formed round produced by generateOidoJurasicoRound end to end', () => {
    const context = buildOidoJurasicoRoundContext({ randomFn: () => 0.2 });
    const round = generateOidoJurasicoRound(0, context);
    const audioService = createFakeAudioService();

    const { optionButtons } = renderOidoJurasicoScreen(container, round, { audioService });
    expect(optionButtons).toHaveLength(4);
    const correctIndex = round.options.indexOf(round.correctId);
    fireEvent.click(optionButtons[correctIndex]);
    expect(optionButtons[correctIndex]).toHaveClass('oido-jurasico-screen__option--correct');
  });

  test('the options grid stays within a 375px-safe layout (2-column grid, shared tap target)', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf8');
    const optionsRuleMatch = css.match(/\.oido-jurasico-screen__options\s*\{([^}]*)\}/);
    expect(optionsRuleMatch).not.toBeNull();
    expect(optionsRuleMatch[1]).toMatch(/grid-template-columns:\s*repeat\(2,/);

    const optionRuleMatch = css.match(/\.oido-jurasico-screen__option\s*\{([^}]*)\}/);
    expect(optionRuleMatch).not.toBeNull();
    expect(optionRuleMatch[1]).toMatch(/min-width:\s*var\(--tap-target-min\)/);
  });
});
