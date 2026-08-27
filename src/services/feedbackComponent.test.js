'use strict';

require('@testing-library/jest-dom');
const { getByRole, queryByRole } = require('@testing-library/dom');

const { CORRECT_ICON, INCORRECT_ICON, renderFeedbackComponent, attachToSession } = require('./feedbackComponent');
const { createSoundService } = require('./sound');
const { startGame, evaluateAnswer, advanceRound, HOOK_EVENTS } = require('../game/roundContract');
const { feedback: strings } = require('../../public/i18n/es.json');

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

function buildGenerateRound() {
  let calls = 0;
  return () => {
    calls += 1;
    return { prompt: `round-${calls}` };
  };
}

describe('renderFeedbackComponent (TRIOFSND-243)', () => {
  test('renders nothing visible before the first result', () => {
    const container = document.createElement('div');
    renderFeedbackComponent(container, { strings });

    expect(getByRole(container, 'status', { hidden: true })).toHaveTextContent('');
    expect(container.querySelector('.feedback-component')).toHaveAttribute('hidden');
  });

  test('a correct result renders a visible text message and a decorative (aria-hidden) icon -- never icon-only', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });

    component.showResult({ isCorrect: true });

    expect(component.root).not.toHaveAttribute('hidden');
    expect(component.root).toHaveClass('feedback-component--correct');
    expect(component.message).toHaveTextContent(strings.correct.message);
    expect(component.message.textContent.trim()).not.toBe('');
    expect(component.icon).toHaveAttribute('aria-hidden', 'true');
    expect(component.icon).toHaveTextContent(CORRECT_ICON);
  });

  test('an incorrect result renders its own text/icon/color state, distinct from correct', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });

    component.showResult({ isCorrect: false });

    expect(component.root).toHaveClass('feedback-component--incorrect');
    expect(component.root).not.toHaveClass('feedback-component--correct');
    expect(component.message).toHaveTextContent(strings.incorrect.message);
    expect(component.icon).toHaveTextContent(INCORRECT_ICON);
  });

  test('exposes a single role="status" aria-live region stating the outcome, detail and score as one sentence', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });

    component.showResult({ isCorrect: true, detail: 'La respuesta correcta era: Triceratops.', score: 30 });

    const status = getByRole(container, 'status');
    expect(status).toHaveTextContent(strings.correct.message);
    expect(status).toHaveTextContent('Triceratops');
    expect(status).toHaveTextContent('30');
    expect(component.announcement).toHaveClass('sr-only');
    expect(queryByRole(container, 'status')).toBe(component.announcement);
  });

  test('reset() clears text/icon/color and hides the fragment again', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });

    component.showResult({ isCorrect: true });
    component.reset();

    expect(component.root).toHaveAttribute('hidden');
    expect(component.message).toHaveTextContent('');
    expect(component.icon).toHaveTextContent('');
    expect(component.announcement).toHaveTextContent('');
    expect(component.root).not.toHaveClass('feedback-component--correct');
  });

  describe('sound (muted-aware, PRD: respects dinoquiz:muted before any playback)', () => {
    test('plays the positive sound on a correct result when unmuted', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ 'dinoquiz:muted': 'false' });
      const soundService = createSoundService({ audioFactory, storageObj });
      const container = document.createElement('div');
      const component = renderFeedbackComponent(container, { strings, soundService });

      component.showResult({ isCorrect: true });

      const played = Object.values(audioFactory.created).some((audio) => audio.played > 0);
      expect(played).toBe(true);
    });

    test('never plays any sound when dinoquiz:muted is the string "true"', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ 'dinoquiz:muted': 'true' });
      const soundService = createSoundService({ audioFactory, storageObj });
      const container = document.createElement('div');
      const component = renderFeedbackComponent(container, { strings, soundService });

      component.showResult({ isCorrect: true });
      component.showResult({ isCorrect: false });

      const played = Object.values(audioFactory.created).some((audio) => audio.played > 0);
      expect(played).toBe(false);
      // Muting only silences audio -- text/icon feedback still renders.
      expect(component.message.textContent.trim()).not.toBe('');
    });

    test('a mid-game mute toggle takes effect on the very next result (mute is read fresh, not cached)', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ 'dinoquiz:muted': 'false' });
      const soundService = createSoundService({ audioFactory, storageObj });
      const container = document.createElement('div');
      const component = renderFeedbackComponent(container, { strings, soundService });

      component.showResult({ isCorrect: true });
      const playedBeforeMute = Object.values(audioFactory.created).some((audio) => audio.played > 0);
      expect(playedBeforeMute).toBe(true);

      storageObj.setItem('dinoquiz:muted', 'true');
      Object.values(audioFactory.created).forEach((audio) => {
        audio.played = 0;
      });
      component.showResult({ isCorrect: false });

      const playedAfterMute = Object.values(audioFactory.created).some((audio) => audio.played > 0);
      expect(playedAfterMute).toBe(false);
    });
  });
});

describe('attachToSession (TRIOFSND-243, hooked to roundContract\'s evaluation step)', () => {
  function startSession() {
    return startGame({ generateRound: buildGenerateRound() });
  }

  test('showResult runs automatically off roundContract\'s ANSWER_EVALUATED hook', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();

    attachToSession(component, session, {});

    const evaluated = evaluateAnswer(session, { isCorrect: true });
    expect(evaluated.accepted).toBe(true);

    expect(component.root).not.toHaveAttribute('hidden');
    expect(component.root).toHaveClass('feedback-component--correct');
    expect(component.message).toHaveTextContent(strings.correct.message);
  });

  test('forwards the evaluated session\'s updated score into the announcement', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();

    attachToSession(component, session, {});
    const evaluated = evaluateAnswer(session, { isCorrect: true });

    expect(getByRole(container, 'status')).toHaveTextContent(String(evaluated.session.state.score));
  });

  test('options.buildDetail supplies the mode-specific "correct answer was X" sentence', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();

    attachToSession(component, session, {
      buildDetail: (payload) => `Detalle de la ronda ${payload.roundIndex}`,
    });
    evaluateAnswer(session, { isCorrect: false });

    expect(getByRole(container, 'status')).toHaveTextContent('Detalle de la ronda 0');
  });

  test('clears the previous outcome via reset() when a new round starts (ROUND_STARTED)', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();

    attachToSession(component, session, {});
    const evaluated = evaluateAnswer(session, { isCorrect: true });
    expect(component.root).not.toHaveAttribute('hidden');

    advanceRound(evaluated.session);

    expect(component.root).toHaveAttribute('hidden');
    expect(component.message).toHaveTextContent('');
  });

  test('off() detaches both subscriptions so later hook events no longer touch the component', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();

    const off = attachToSession(component, session, {});
    off();

    evaluateAnswer(session, { isCorrect: true });

    expect(component.root).toHaveAttribute('hidden');
  });

  test('throws when the session has no active hooks (defensive: never silently no-ops)', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });

    expect(() => attachToSession(component, null, {})).toThrow();
    expect(() => attachToSession(null, startSession(), {})).toThrow();
  });

  test('HOOK_EVENTS.ANSWER_EVALUATED is the exact roundContract event driving the component', () => {
    const container = document.createElement('div');
    const component = renderFeedbackComponent(container, { strings, soundService: null });
    let session = startSession();
    const seen = [];
    session.hooks.on(HOOK_EVENTS.ANSWER_EVALUATED, (payload) => seen.push(payload));

    attachToSession(component, session, {});
    evaluateAnswer(session, { isCorrect: true });

    expect(seen).toHaveLength(1);
  });
});
