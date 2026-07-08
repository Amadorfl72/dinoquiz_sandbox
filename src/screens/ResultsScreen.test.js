'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const {
  MIN_SCORE,
  MAX_SCORE,
  MAX_STARS,
  calculateStars,
  validateMotivationalMessages,
  selectMotivationalMessage,
  renderResultsScreen,
} = require('./ResultsScreen');
const { results: strings } = require('../../public/i18n/es.json');

describe('calculateStars (tier logic)', () => {
  test.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 2],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 3],
    [10, 3],
  ])('score %i maps to %i star(s)', (score, expectedStars) => {
    expect(calculateStars(score)).toBe(expectedStars);
  });

  test('rejects a non-integer score', () => {
    expect(() => calculateStars(3.5)).toThrow();
  });

  test('rejects a score below the minimum', () => {
    expect(() => calculateStars(MIN_SCORE - 1)).toThrow();
  });

  test('rejects a score above the maximum', () => {
    expect(() => calculateStars(MAX_SCORE + 1)).toThrow();
  });
});

describe('content-guide validation of motivational messages', () => {
  test('the real es.json messages contain no negative language', () => {
    expect(validateMotivationalMessages(strings.messages)).toEqual([]);
  });

  test('there is more than one message so replays feel varied', () => {
    expect(strings.messages.length).toBeGreaterThan(1);
  });

  test('flags a message containing banned negative language', () => {
    const errors = validateMotivationalMessages(['¡Qué mal lo has hecho!']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/negative language/);
  });

  test('flags an empty or non-string message', () => {
    expect(validateMotivationalMessages([''])).toHaveLength(1);
    expect(validateMotivationalMessages([42])).toHaveLength(1);
  });

  test('rejects a non-array or empty list', () => {
    expect(validateMotivationalMessages([])).toHaveLength(1);
    expect(validateMotivationalMessages(undefined)).toHaveLength(1);
  });

  test('does not flag words that merely contain a banned word as a substring', () => {
    expect(validateMotivationalMessages(['¡Aprender sobre dinosaurios mola muchísimo!'])).toEqual([]);
  });
});

describe('selectMotivationalMessage', () => {
  test('always returns one of the provided messages', () => {
    const messages = ['a', 'b', 'c'];
    for (let i = 0; i < messages.length; i += 1) {
      const randomFn = () => i / messages.length;
      expect(messages).toContain(selectMotivationalMessage(messages, randomFn));
    }
  });

  test('throws for an empty message list', () => {
    expect(() => selectMotivationalMessage([])).toThrow();
  });
});

describe('ResultsScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the score as X/10', () => {
    renderResultsScreen(container, { score: 7 });

    expect(getByText(container, '7/10')).toBeInTheDocument();
  });

  test.each([
    [0, 1],
    [4, 2],
    [7, 3],
  ])('renders %i stars filled for a score of %i', (score, expectedStars) => {
    const { starsEl } = renderResultsScreen(container, { score });

    expect(starsEl).toHaveAttribute('role', 'img');
    expect(starsEl.getAttribute('aria-label')).toContain(`${expectedStars} de ${MAX_STARS}`);
    expect(starsEl.textContent).toBe('★'.repeat(expectedStars) + '☆'.repeat(MAX_STARS - expectedStars));
  });

  test('renders a motivational message from the i18n resource', () => {
    const { messageEl } = renderResultsScreen(container, { score: 5 });

    expect(strings.messages).toContain(messageEl.textContent);
  });

  test('renders a specific message when provided explicitly', () => {
    const { messageEl } = renderResultsScreen(container, { score: 5, message: 'Mensaje de prueba' });

    expect(messageEl).toHaveTextContent('Mensaje de prueba');
  });

  test('exposes a single aria-live status region announcing score, stars and message', () => {
    const { announcementEl } = renderResultsScreen(container, { score: 8, message: 'Mensaje de prueba' });

    expect(announcementEl).toHaveAttribute('aria-live', 'polite');
    expect(getByRole(container, 'status')).toBe(announcementEl);
    expect(announcementEl).toHaveTextContent('8');
    expect(announcementEl).toHaveTextContent('3');
    expect(announcementEl).toHaveTextContent('Mensaje de prueba');
  });

  test('renders a prominent "Volver a jugar" button that calls onPlayAgain when clicked', () => {
    const onPlayAgain = jest.fn();
    const { playAgainButton } = renderResultsScreen(container, { score: 6, onPlayAgain });

    expect(getByRole(container, 'button', { name: strings.playAgainButton })).toBe(playAgainButton);
    playAgainButton.click();
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  test('renders a secondary "Salir" button by default that calls onExit when clicked', () => {
    const onExit = jest.fn();
    const { exitButton } = renderResultsScreen(container, { score: 6, onExit });

    expect(getByRole(container, 'button', { name: strings.exitButton })).toBe(exitButton);
    exitButton.click();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test('the "Salir" button can be hidden since it is optional', () => {
    const { exitButton } = renderResultsScreen(container, { score: 6, showExitButton: false });

    expect(exitButton).toBeNull();
    expect(() => getByRole(container, 'button', { name: strings.exitButton })).toThrow();
  });

  test('throws for a score outside the 0-10 range', () => {
    expect(() => renderResultsScreen(container, { score: 11 })).toThrow();
    expect(() => renderResultsScreen(container, { score: -1 })).toThrow();
  });

  test('does not hardcode copy — heading and buttons come from the es locale resource file', () => {
    renderResultsScreen(container, { score: 9, locale: 'es' });

    expect(getByText(container, strings.heading)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.playAgainButton);
    expect(container.textContent).toContain(strings.exitButton);
  });
});
