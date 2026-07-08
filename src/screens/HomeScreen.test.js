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

  describe('privacy policy access (TRIOFSND-116, AC-16: reachable in a single tap)', () => {
    test('renders an accessible privacy button with a visible icon and a descriptive label', () => {
      const { privacyButton } = renderHomeScreen(container);

      expect(getByRole(container, 'button', { name: strings.privacyButton.ariaLabel })).toBe(privacyButton);
      expect(privacyButton).toHaveTextContent(strings.privacyButton.label);
      expect(privacyButton.querySelector('svg')).not.toBeNull();
    });

    test('calls onOpenPrivacy when tapped', () => {
      const onOpenPrivacy = jest.fn();
      const { privacyButton } = renderHomeScreen(container, { onOpenPrivacy });

      privacyButton.click();

      expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
    });

    test('does nothing if no onOpenPrivacy handler is provided', () => {
      const { privacyButton } = renderHomeScreen(container);

      expect(() => privacyButton.click()).not.toThrow();
    });
  });
});
