'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderModeBlockedScreen } = require('./ModeBlockedScreen');
const { modeBlocked: strings } = require('../../public/i18n/es.json');

describe('ModeBlockedScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title, message and the back button label come from the es locale resource file', () => {
    renderModeBlockedScreen(container, { locale: 'es' });

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.message);
    expect(container.textContent).toContain(strings.backButtonLabel);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderModeBlockedScreen(container, { strings });
    renderModeBlockedScreen(container, { strings });

    expect(container.querySelectorAll('.mode-blocked-screen').length).toBe(1);
  });

  test('an injected reasonText overrides the generic message without touching the title/back button copy', () => {
    renderModeBlockedScreen(container, { strings, reasonText: 'Necesitamos descargar algunos archivos.' });

    expect(container.textContent).toContain('Necesitamos descargar algunos archivos.');
    expect(container.textContent).not.toContain(strings.message);
    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.backButtonLabel);
  });
});

describe('ModeBlockedScreen callbacks', () => {
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
    const { backButton } = renderModeBlockedScreen(container, { strings, onBack });

    backButton.click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('a missing onBack callback never throws when the button is activated', () => {
    const { backButton } = renderModeBlockedScreen(container, { strings });

    expect(() => backButton.click()).not.toThrow();
  });
});

describe('ModeBlockedScreen accessibility', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount', () => {
    const { title } = renderModeBlockedScreen(container, { strings });

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(title);
    expect(title).toHaveFocus();
  });

  test('the message is announced via role="status"/aria-live="polite"', () => {
    const { message } = renderModeBlockedScreen(container, { strings });

    expect(message).toHaveAttribute('role', 'status');
    expect(message).toHaveAttribute('aria-live', 'polite');
  });

  test('the back action is a real, keyboard-activatable button whose accessible name matches its visible text', () => {
    const { backButton } = renderModeBlockedScreen(container, { strings });

    expect(backButton.tagName).toBe('BUTTON');
    expect(backButton).toHaveAccessibleName(strings.backButtonLabel);
  });

  test('nothing is communicated by color/icon alone -- the decorative icon is hidden from assistive tech', () => {
    renderModeBlockedScreen(container, { strings });

    const icon = container.querySelector('.mode-blocked-screen__icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
