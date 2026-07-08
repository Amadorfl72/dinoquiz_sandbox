'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderResultsScreen, getStarCount, getMessageTier } = require('./ResultsScreen');
const { results: strings } = require('../i18n/es.json');
const { getGameState, resetGameState, recordAnswer } = require('../game/gameState');
const { SCREENS, getCurrentScreen, navigateTo } = require('../navigation/navigator');

describe('ResultsScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title, score and motivational message from the i18n resource', () => {
    renderResultsScreen(container, { score: 8 });

    expect(getByText(container, strings.title)).toBeInTheDocument();
    expect(getByText(container, 'Puntuación: 8 de 10')).toBeInTheDocument();
    expect(getByText(container, strings.messages.high)).toBeInTheDocument();
  });

  test('renders "Volver a jugar" as a button with the AC-2/AC-23 sizing class and "Salir" as a secondary button', () => {
    renderResultsScreen(container);

    const playAgainButton = getByRole(container, 'button', { name: strings.playAgainButton });
    expect(playAgainButton).toBeInTheDocument();
    expect(playAgainButton).toHaveClass('results-screen__play-again-button');

    const exitButton = getByRole(container, 'button', { name: strings.exitButton });
    expect(exitButton).toBeInTheDocument();
    expect(exitButton).toHaveClass('results-screen__exit-button');
  });

  test('clicking "Volver a jugar" invokes onPlayAgain so the caller can further react to the reset', () => {
    const onPlayAgain = jest.fn();
    const { playAgainButton } = renderResultsScreen(container, { onPlayAgain });

    playAgainButton.click();

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  test('clicking "Volver a jugar" resets the game state (score, question index, answers) and navigates to the first question', () => {
    navigateTo(SCREENS.RESULTS);
    resetGameState();
    recordAnswer(true);
    recordAnswer(false);
    recordAnswer(true);
    expect(getGameState()).toEqual({ score: 2, questionIndex: 3, answers: expect.any(Array) });

    const { playAgainButton } = renderResultsScreen(container, { score: 2 });
    playAgainButton.click();

    expect(getGameState()).toEqual({ score: 0, questionIndex: 0, answers: [] });
    expect(getCurrentScreen()).toBe(SCREENS.QUESTION);
  });

  test('clicking "Salir" invokes onExit so the caller can further react to the navigation', () => {
    const onExit = jest.fn();
    const { exitButton } = renderResultsScreen(container, { onExit });

    exitButton.click();

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test('clicking "Salir" navigates to the Home screen', () => {
    navigateTo(SCREENS.RESULTS);

    const { exitButton } = renderResultsScreen(container);
    exitButton.click();

    expect(getCurrentScreen()).toBe(SCREENS.HOME);
  });

  test('does not throw when no callbacks are supplied', () => {
    const { playAgainButton, exitButton } = renderResultsScreen(container);

    expect(() => playAgainButton.click()).not.toThrow();
    expect(() => exitButton.click()).not.toThrow();
  });

  describe.each([
    [0, 1, 'low'],
    [3, 1, 'low'],
    [4, 2, 'mid'],
    [6, 2, 'mid'],
    [7, 3, 'high'],
    [10, 3, 'high'],
  ])('score %i (AC-8 tramos)', (score, expectedStars, expectedTier) => {
    test(`maps to ${expectedStars} star(s) and the "${expectedTier}" message`, () => {
      expect(getStarCount(score)).toBe(expectedStars);
      expect(getMessageTier(score)).toBe(expectedTier);

      const { stars, message } = renderResultsScreen(container, { score });

      expect(stars).toHaveAccessibleName(`${expectedStars} de 3 estrellas`);
      expect(stars.textContent).toBe('⭐'.repeat(expectedStars));
      expect(message).toHaveTextContent(strings.messages[expectedTier]);
    });
  });

  test('the motivational message is always positive, never penalizing a low score', () => {
    const { message } = renderResultsScreen(container, { score: 0 });

    expect(message.textContent).not.toMatch(/mal|fallo|perdiste|incorrect/i);
  });

  test('clamps an out-of-range score into [0, totalQuestions]', () => {
    const { scoreText } = renderResultsScreen(container, { score: 42 });

    expect(scoreText).toHaveTextContent('Puntuación: 10 de 10');
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    renderResultsScreen(container, { locale: 'es', score: 5 });

    expect(container.textContent).toContain(strings.messages.mid);
  });
});
