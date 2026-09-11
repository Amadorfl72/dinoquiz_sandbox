'use strict';

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const { renderHomeScreen } = require('./homeScreen');
const { home: strings, hallOfFame: hallOfFameStrings } = require('../i18n/es.json');

describe('Hall of Fame entry point (options.onOpenHallOfFame)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders a Hall of Fame button labelled with the reused hallOfFame.title string', () => {
    const { hallOfFameButton } = renderHomeScreen(container, { strings, hallOfFameStrings });

    expect(getByRole(container, 'button', { name: hallOfFameStrings.title })).toBe(hallOfFameButton);
  });

  test('calls onOpenHallOfFame when clicked', () => {
    const onOpenHallOfFame = jest.fn();
    const { hallOfFameButton } = renderHomeScreen(container, { strings, hallOfFameStrings, onOpenHallOfFame });

    hallOfFameButton.click();

    expect(onOpenHallOfFame).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenHallOfFame on Enter/Espacio, matching every other control\'s bindActivation behaviour', () => {
    const onOpenHallOfFame = jest.fn();
    const { hallOfFameButton } = renderHomeScreen(container, { strings, hallOfFameStrings, onOpenHallOfFame });

    hallOfFameButton.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onOpenHallOfFame).toHaveBeenCalledTimes(1);
  });

  test('renders the button even without onOpenHallOfFame, but it does nothing when clicked', () => {
    const { hallOfFameButton } = renderHomeScreen(container, { strings, hallOfFameStrings });

    expect(hallOfFameButton).not.toBeNull();
    expect(() => hallOfFameButton.click()).not.toThrow();
  });

  test('meets the 48x48dp minimum touch target, like the privacy policy icon button beside it', () => {
    const { hallOfFameButton } = renderHomeScreen(container, { strings, hallOfFameStrings });

    expect(hallOfFameButton).toHaveClass('home-screen__hall-of-fame-button');
    expect(hallOfFameButton.tagName).toBe('BUTTON');
    expect(hallOfFameButton).toHaveAttribute('type', 'button');
  });
});
