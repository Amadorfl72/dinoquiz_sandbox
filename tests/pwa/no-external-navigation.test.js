'use strict';

/**
 * TRIOFSND-121: the child's closed flow (Inicio -> Quiz -> Resultados) must
 * never offer a way to leave the PWA -- no external `<a>`, no deep links, no
 * `window.open`/`location` escapes reachable from a tap, click or keyboard
 * activation.
 *
 * Guards the three child-flow screens (their real, browser-loaded
 * implementation lives under public/scripts/ -- see the "Browser bridge"
 * comment in each file; src/screens/*.js just re-exports them) two ways:
 *  - statically, scanning each screen's source for known escape patterns;
 *  - at runtime, rendering each screen, exercising every interactive
 *    element (including Home's mute/privacy/purchase controls and the
 *    disclosure panels they open), and asserting the DOM never grows an
 *    anchor/href/blank-target element and `window.open` is never called.
 */

require('@testing-library/jest-dom');

const fs = require('fs');
const path = require('path');

const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const { renderResultsScreen } = require('../../public/scripts/resultsScreen');

const REPO_ROOT = path.resolve(__dirname, '../..');
const CHILD_FLOW_SCREEN_FILES = [
  path.resolve(__dirname, '../../public/scripts/homeScreen.js'),
  path.resolve(__dirname, '../../public/scripts/questionScreen.js'),
  path.resolve(__dirname, '../../public/scripts/resultsScreen.js'),
];

const FORBIDDEN_PATTERNS = [
  {
    name: 'anchor tag creation',
    matches: (src) => src.includes("createElement('a')") || src.includes('createElement("a")'),
  },
  {
    name: 'href attribute or property',
    matches: (src) => src.includes('href'),
  },
  {
    name: 'window.open call',
    matches: (src) => src.includes('window.open') || /(?<!console\.)\.open\(/.test(src),
  },
  {
    name: 'target="_blank"',
    matches: (src) => /target\s*=\s*["']_blank["']/.test(src),
  },
  {
    name: 'location reassignment or navigation call',
    matches: (src) =>
      /(window\.)?location\s*=/.test(src) ||
      src.includes('location.assign') ||
      src.includes('location.replace') ||
      src.includes('location.href'),
  },
  {
    // Security (TRIOFSND-121): a protocol-relative URL such as '//evil.example'
    // is a real escape hatch -- it inherits the current scheme and navigates
    // off the PWA, yet a naive "starts with '/' => internal" check would treat
    // it as safe. Forbid any protocol-relative or external-scheme URL *string
    // literal* in the child-flow screens (a leading quote distinguishes it from
    // a harmless `//` JS comment, so this never false-positives on comments).
    name: 'protocol-relative or external URL literal',
    matches: (src) =>
      /["']\/\//.test(src) ||
      /["']https?:\/\//.test(src) ||
      /["'](?:mailto|tel):/.test(src),
  },
];

function assertNoExternalEscapeHatches(container) {
  expect(container.querySelectorAll('a')).toHaveLength(0);
  expect(container.querySelectorAll('[href]')).toHaveLength(0);
  expect(container.querySelectorAll('[target="_blank"]')).toHaveLength(0);

  container.querySelectorAll('button').forEach((button) => {
    expect(button.getAttribute('type')).toBe('button');
  });
}

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

describe('TRIOFSND-121: closed linear child flow — no external navigation', () => {
  describe('static audit of every child-flow screen module', () => {
    CHILD_FLOW_SCREEN_FILES.forEach((filePath) => {
      const relativePath = path.relative(REPO_ROOT, filePath);
      const source = fs.readFileSync(filePath, 'utf-8');

      FORBIDDEN_PATTERNS.forEach(({ name, matches }) => {
        test(`${relativePath} does not contain: ${name}`, () => {
          expect(matches(source)).toBe(false);
        });
      });
    });
  });

  describe('Home (Inicio)', () => {
    let container;
    let openSpy;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      openSpy.mockRestore();
      container.remove();
    });

    test('renders with no anchors, hrefs or blank-target elements', () => {
      renderHomeScreen(container);

      assertNoExternalEscapeHatches(container);
    });

    test('tapping "¡Jugar!" never opens an external window/tab', () => {
      const { playButton } = renderHomeScreen(container);

      playButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('toggling mute never opens an external window/tab', () => {
      const { muteButton } = renderHomeScreen(container);

      muteButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('opening the privacy policy disclosure panel never opens an external window/tab', () => {
      const { privacyButton } = renderHomeScreen(container);

      privacyButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('opening the remove-ads purchase disclosure panel and confirming never opens an external window/tab', () => {
      const { purchaseButton, purchasePanel } = renderHomeScreen(container);

      purchaseButton.click();
      const confirmButton = purchasePanel.querySelector('.home-screen__purchase-confirm-button');
      confirmButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('the legacy full-screen privacy policy button only ever calls back into the app, never a real navigation', () => {
      const onOpenPrivacyPolicy = jest.fn();
      const { privacyPolicyButton } = renderHomeScreen(container, { onOpenPrivacyPolicy });

      privacyPolicyButton.click();

      expect(onOpenPrivacyPolicy).toHaveBeenCalledTimes(1);
      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('showing and dismissing the first-run tooltip never opens an external window/tab', () => {
      // The tooltip installs a document-level click listener to dismiss on the
      // first tap anywhere — exercise that gesture too, since it is an
      // interactive path the child triggers before pressing "¡Jugar!".
      const { playButton } = renderHomeScreen(container, { showTooltip: true });
      assertNoExternalEscapeHatches(container);

      playButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });

    test('closing an opened disclosure panel never opens an external window/tab', () => {
      const { privacyButton, privacyPanel } = renderHomeScreen(container);

      privacyButton.click();
      const closeButton = privacyPanel.querySelector('.home-screen__panel-close-button');
      closeButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });
  });

  describe('Quiz (Pregunta)', () => {
    let container;
    let openSpy;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      openSpy.mockRestore();
      container.remove();
    });

    test('renders with no anchors, hrefs or blank-target elements', () => {
      renderQuestionScreen(container, buildQuestion());

      assertNoExternalEscapeHatches(container);
    });

    test('answering correctly and advancing never opens an external window/tab', () => {
      const onNext = jest.fn();
      const question = buildQuestion();
      const { optionButtons, nextButton } = renderQuestionScreen(container, question, { onNext });

      optionButtons[question.correctAnswerIndex].click();
      assertNoExternalEscapeHatches(container);

      nextButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      expect(onNext).toHaveBeenCalledTimes(1);
      assertNoExternalEscapeHatches(container);
    });

    test('picking a wrong option never opens an external window/tab', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, index) => index !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(openSpy).not.toHaveBeenCalled();
      assertNoExternalEscapeHatches(container);
    });
  });

  describe('Resultados', () => {
    let container;
    let openSpy;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      openSpy.mockRestore();
      container.remove();
    });

    test('renders with no anchors, hrefs or blank-target elements', () => {
      renderResultsScreen(container, { score: 7 });

      assertNoExternalEscapeHatches(container);
    });

    test('"Volver a jugar" never opens an external window/tab', () => {
      const onPlayAgain = jest.fn();
      const { playAgainButton } = renderResultsScreen(container, { score: 7, onPlayAgain });

      playAgainButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
      assertNoExternalEscapeHatches(container);
    });

    test('"Salir" never opens an external window/tab', () => {
      const onExit = jest.fn();
      const { exitButton } = renderResultsScreen(container, { score: 7, onExit });

      exitButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      expect(onExit).toHaveBeenCalledTimes(1);
      assertNoExternalEscapeHatches(container);
    });
  });
});
