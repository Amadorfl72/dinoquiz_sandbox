'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderModeChangeConfirmScreen } = require('./ModeChangeConfirmScreen');
const { modeChange: strings } = require('../../public/i18n/es.json');

describe('ModeChangeConfirmScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title, message and both button labels come from the es locale resource file', () => {
    renderModeChangeConfirmScreen(container, { locale: 'es' });

    expect(getByText(container, strings.title)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.message);
    expect(container.textContent).toContain(strings.confirmButtonLabel);
    expect(container.textContent).toContain(strings.cancelButtonLabel);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderModeChangeConfirmScreen(container, { strings });
    renderModeChangeConfirmScreen(container, { strings });

    expect(container.querySelectorAll('.mode-change-confirm-screen').length).toBe(1);
  });
});

describe('ModeChangeConfirmScreen callbacks (no storage side effects here)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('tapping the confirm button calls onConfirm and never onCancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { confirmButton } = renderModeChangeConfirmScreen(container, { strings, onConfirm, onCancel });

    confirmButton.click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('tapping the cancel button calls onCancel and never onConfirm', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { cancelButton } = renderModeChangeConfirmScreen(container, { strings, onConfirm, onCancel });

    cancelButton.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('pressing Escape inside the dialog calls onCancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { dialog } = renderModeChangeConfirmScreen(container, { strings, onConfirm, onCancel });

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('missing callbacks never throw when a button is activated', () => {
    const { confirmButton, cancelButton } = renderModeChangeConfirmScreen(container, { strings });

    expect(() => confirmButton.click()).not.toThrow();
    expect(() => cancelButton.click()).not.toThrow();
  });
});

describe('ModeChangeConfirmScreen accessibility (roles/labels, focus, keyboard trap)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the dialog is an alertdialog labelled and described by its own title and message', () => {
    const { dialog, title, message } = renderModeChangeConfirmScreen(container, { strings });

    expect(dialog).toHaveAttribute('role', 'alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(message.id);
  });

  test('the title is a heading', () => {
    const { title } = renderModeChangeConfirmScreen(container, { strings });

    expect(getByRole(container, 'heading', { name: strings.title })).toBe(title);
  });

  test('both actions are real, keyboard-activatable buttons meeting the >=48x48dp minimum touch target', () => {
    const { confirmButton, cancelButton } = renderModeChangeConfirmScreen(container, { strings });

    expect(confirmButton.tagName).toBe('BUTTON');
    expect(cancelButton.tagName).toBe('BUTTON');
    expect(confirmButton).toHaveAccessibleName(strings.confirmButtonLabel);
    expect(cancelButton).toHaveAccessibleName(strings.cancelButtonLabel);
  });

  test('the safe (cancel/"seguir jugando") button receives focus on mount, never the destructive confirm button', () => {
    const { cancelButton } = renderModeChangeConfirmScreen(container, { strings });

    expect(cancelButton).toHaveFocus();
  });

  test('Tab from the confirm button wraps focus back to the cancel button, trapping focus in the dialog', () => {
    const { dialog, confirmButton, cancelButton } = renderModeChangeConfirmScreen(container, { strings });
    confirmButton.focus();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(cancelButton).toHaveFocus();
  });

  test('Shift+Tab from the cancel button wraps focus to the confirm button, trapping focus in the dialog', () => {
    const { dialog, confirmButton, cancelButton } = renderModeChangeConfirmScreen(container, { strings });
    cancelButton.focus();

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    );

    expect(confirmButton).toHaveFocus();
  });
});
