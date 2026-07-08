'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderHomeScreen } = require('./HomeScreen');
const { home: strings } = require('../i18n/es.json');

describe('HomeScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title and the "¡Jugar!" button from the i18n resource', () => {
    renderHomeScreen(container);

    expect(getByText(container, strings.title)).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: strings.playButton })).toBeInTheDocument();
  });

  test('renders an optional parental notice explaining local-only progress loss', () => {
    renderHomeScreen(container);

    const notice = getByRole(container, 'note');
    expect(notice).toHaveTextContent(strings.parentalNotice.message);
    expect(notice).toHaveAccessibleName(strings.parentalNotice.label);
  });

  test('the parental notice does not block or disable the play button', () => {
    const { playButton } = renderHomeScreen(container);

    playButton.focus();
    expect(document.activeElement).toBe(playButton);
    expect(playButton.disabled).toBe(false);
  });

  test('the notice is not required reading: it carries no tabindex and is not the first focusable element', () => {
    renderHomeScreen(container);

    const notice = getByRole(container, 'note');
    expect(notice).not.toHaveAttribute('tabindex');
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    renderHomeScreen(container, { locale: 'es' });

    expect(container.textContent).toContain(strings.parentalNotice.message);
  });

  describe('navigation safety (TRIOFSND-121: closed child flow, no external escapes)', () => {
    let openSpy;
    let startingHref;

    beforeEach(() => {
      openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      startingHref = window.location.href;
    });

    afterEach(() => {
      openSpy.mockRestore();
    });

    test('the "¡Jugar!" button is a plain, non-navigating button with no href/target', () => {
      const { playButton } = renderHomeScreen(container);

      expect(playButton.tagName).toBe('BUTTON');
      expect(playButton.getAttribute('type')).toBe('button');
      expect(playButton).not.toHaveAttribute('href');
      expect(playButton).not.toHaveAttribute('target');
    });

    test('renders with no anchors, hrefs or blank-target elements anywhere in the screen', () => {
      renderHomeScreen(container);

      expect(container.querySelectorAll('a')).toHaveLength(0);
      expect(container.querySelectorAll('[href]')).toHaveLength(0);
      expect(container.querySelectorAll('[target="_blank"]')).toHaveLength(0);
    });

    test('tapping "¡Jugar!" never opens an external window/tab or navigates the page away', () => {
      const { playButton } = renderHomeScreen(container);

      playButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      expect(window.location.href).toBe(startingHref);
    });

    test('activating "¡Jugar!" via keyboard (Enter) never opens an external window/tab', () => {
      const { playButton } = renderHomeScreen(container);

      playButton.focus();
      playButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      playButton.click();

      expect(openSpy).not.toHaveBeenCalled();
      expect(window.location.href).toBe(startingHref);
    });
  });
});
