'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderModeFallbackWarningScreen } = require('./ModeFallbackWarningScreen');
const { modeFallbackWarning: strings } = require('../../public/i18n/es.json');

describe('ModeFallbackWarningScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title, message and the back button label come from the es locale resource file', () => {
    renderModeFallbackWarningScreen(container, { locale: 'es' });

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.message);
    expect(container.textContent).toContain(strings.backButtonLabel);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderModeFallbackWarningScreen(container, { strings });
    renderModeFallbackWarningScreen(container, { strings });

    expect(container.querySelectorAll('.mode-fallback-warning-screen').length).toBe(1);
  });
});

describe('ModeFallbackWarningScreen callbacks', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('tapping the back button calls onBack', () => {
    const onBack = jest.fn();
    const { backButton } = renderModeFallbackWarningScreen(container, { strings, onBack });

    backButton.click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('a missing onBack callback never throws when the button is activated', () => {
    const { backButton } = renderModeFallbackWarningScreen(container, { strings });

    expect(() => backButton.click()).not.toThrow();
  });
});

describe('ModeFallbackWarningScreen accessibility', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount', () => {
    const { title } = renderModeFallbackWarningScreen(container, { strings });

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(title);
    expect(title).toHaveFocus();
  });

  test('the message is announced via role="status"/aria-live="polite"', () => {
    const { message } = renderModeFallbackWarningScreen(container, { strings });

    expect(message).toHaveAttribute('role', 'status');
    expect(message).toHaveAttribute('aria-live', 'polite');
  });

  test('the back action is a real, keyboard-activatable button whose accessible name matches its visible text', () => {
    const { backButton } = renderModeFallbackWarningScreen(container, { strings });

    expect(backButton.tagName).toBe('BUTTON');
    expect(backButton).toHaveAccessibleName(strings.backButtonLabel);
  });

  test('nothing is communicated by color/icon alone -- the decorative icon is hidden from assistive tech', () => {
    renderModeFallbackWarningScreen(container, { strings });

    const icon = container.querySelector('.mode-fallback-warning-screen__icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
