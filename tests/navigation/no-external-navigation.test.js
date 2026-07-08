'use strict';

/**
 * TRIOFSND-121: the child's flow (Inicio -> Quiz -> Resultados) must stay a
 * closed loop with no way to leave the PWA — no external links, no deep
 * links, no window.open/location escapes reachable from a tap, click or
 * keyboard activation.
 *
 * This guards every screen module under src/screens two ways:
 *  - statically, scanning each module's source for known escape patterns, so
 *    any screen added later to that directory (e.g. Resultados) is covered
 *    automatically without editing this file;
 *  - at runtime, rendering each existing screen, exercising every
 *    interactive element, and asserting the DOM never grows an anchor/href
 *    and window.open is never called.
 */

require('@testing-library/jest-dom');

const fs = require('fs');
const path = require('path');

const { renderHomeScreen } = require('../../src/screens/HomeScreen');
const { renderQuestionScreen } = require('../../src/screens/QuestionScreen');

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');
const REPO_ROOT = path.resolve(__dirname, '../..');

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
    matches: (src) => src.includes('window.open') || src.includes('.open('),
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
];

function listScreenSourceFiles() {
  return fs
    .readdirSync(SCREENS_DIR)
    .filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
    .map((file) => path.join(SCREENS_DIR, file));
}

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
  describe('static audit of every screen module', () => {
    const files = listScreenSourceFiles();

    test('at least one screen module exists to audit', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    files.forEach((filePath) => {
      const relativePath = path.relative(REPO_ROOT, filePath);
      const source = fs.readFileSync(filePath, 'utf-8');

      FORBIDDEN_PATTERNS.forEach(({ name, matches }) => {
        test(`${relativePath} does not contain: ${name}`, () => {
          expect(matches(source)).toBe(false);
        });
      });
    });
  });

  describe('HomeScreen (Inicio)', () => {
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
  });

  describe('QuestionScreen (Quiz)', () => {
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

    test('answering a question and advancing never opens an external window/tab', () => {
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
});
