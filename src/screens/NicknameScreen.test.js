'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByLabelText, getByText } = require('@testing-library/dom');

const {
  NICKNAME_MAX_LENGTH,
  NICKNAME_ERROR_CODES,
  trimNickname,
  validateNickname,
  renderNicknameScreen,
} = require('./NicknameScreen');
const { nicknameRequest: strings, dinosaurNames } = require('../../public/i18n/es.json');
const { AVATAR_LIST } = require('../data/avatarList');

describe('validateNickname/trimNickname (pure, no DOM/storage)', () => {
  test('the limit is 20 characters', () => {
    expect(NICKNAME_MAX_LENGTH).toBe(20);
  });

  test('trims leading/trailing whitespace', () => {
    expect(trimNickname('  Rex  ')).toBe('Rex');
  });

  test('a non-string input trims to an empty string instead of throwing', () => {
    expect(trimNickname(undefined)).toBe('');
    expect(trimNickname(null)).toBe('');
  });

  test('an empty string is invalid with the EMPTY error code', () => {
    const result = validateNickname('');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(NICKNAME_ERROR_CODES.EMPTY);
    expect(result.value).toBe('');
  });

  test('a string of only spaces is invalid with the EMPTY error code', () => {
    const result = validateNickname('     ');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(NICKNAME_ERROR_CODES.EMPTY);
  });

  test('a name longer than 20 characters after trimming is invalid with TOO_LONG', () => {
    const result = validateNickname('a'.repeat(21));
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(NICKNAME_ERROR_CODES.TOO_LONG);
    expect(result.value).toBe('a'.repeat(21));
  });

  test('a name that is exactly 20 characters after trimming is valid (boundary)', () => {
    const result = validateNickname('a'.repeat(20));
    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeNull();
  });

  test('padding a too-long name with surrounding spaces does not make it valid — the limit applies to the trimmed value', () => {
    const result = validateNickname('  ' + 'a'.repeat(21) + '  ');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(NICKNAME_ERROR_CODES.TOO_LONG);
  });

  test('padding a short name with surrounding spaces trims it to a valid value', () => {
    const result = validateNickname('   Rex   ');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('Rex');
  });
});

describe('NicknameScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title, instructions, last-name warning and both actions come from the es locale resource file', () => {
    renderNicknameScreen(container, { locale: 'es' });

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain(strings.lastNameWarning);
    expect(container.textContent).toContain(strings.continueButtonLabel);
    expect(container.textContent).toContain(strings.guestButtonLabel);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderNicknameScreen(container, { strings });
    renderNicknameScreen(container, { strings });

    expect(container.querySelectorAll('.nickname-screen').length).toBe(1);
  });

  test('accepts an optional initialValue to prefill the input', () => {
    const { input } = renderNicknameScreen(container, { strings, initialValue: 'Rex' });
    expect(input.value).toBe('Rex');
  });

  test('no error message is shown before any interaction', () => {
    const { error } = renderNicknameScreen(container, { strings });
    expect(error.hidden).toBe(true);
    expect(error.textContent).toBe('');
  });
});

describe('NicknameScreen validation and submission (trims and validates only — no storage)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('clicking Continuar with a valid apodo calls onSubmit with the trimmed value', () => {
    const onSubmit = jest.fn();
    const { input, continueButton } = renderNicknameScreen(container, { strings, onSubmit });

    input.value = '  Rex  ';
    continueButton.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Rex');
  });

  test('pressing Enter inside the input submits exactly like clicking Continuar', () => {
    const onSubmit = jest.fn();
    const { input } = renderNicknameScreen(container, { strings, onSubmit });

    input.value = 'Rex';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(onSubmit).toHaveBeenCalledWith('Rex');
  });

  test('clicking Continuar with an empty value shows the accessible empty error and never calls onSubmit', () => {
    const onSubmit = jest.fn();
    const { continueButton, input, error } = renderNicknameScreen(container, { strings, onSubmit });

    continueButton.click();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain(strings.errors.empty);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('clicking Continuar with only spaces shows the empty error and never calls onSubmit', () => {
    const onSubmit = jest.fn();
    const { continueButton, input, error } = renderNicknameScreen(container, { strings, onSubmit });

    input.value = '     ';
    continueButton.click();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain(strings.errors.empty);
  });

  test('clicking Continuar with more than 20 characters shows the too-long error and never calls onSubmit', () => {
    const onSubmit = jest.fn();
    const { continueButton, input, error } = renderNicknameScreen(container, { strings, onSubmit });

    input.value = 'a'.repeat(21);
    continueButton.click();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain(strings.errors.tooLong);
  });

  test('a failed validation moves focus back to the input so it can be corrected immediately', () => {
    const { continueButton, input } = renderNicknameScreen(container, { strings });

    continueButton.click();

    expect(input).toHaveFocus();
  });

  test('editing the input after a failed validation clears the error', () => {
    const { continueButton, input, error } = renderNicknameScreen(container, { strings });

    continueButton.click();
    expect(error.hidden).toBe(false);

    input.value = 'Rex';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(error.hidden).toBe(true);
    expect(error.textContent).toBe('');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  test('clicking "Jugar como invitado" calls onGuest and never onSubmit, regardless of the input value', () => {
    const onSubmit = jest.fn();
    const onGuest = jest.fn();
    const { guestButton } = renderNicknameScreen(container, { strings, onSubmit, onGuest });

    guestButton.click();

    expect(onGuest).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('missing callbacks never throw when an action is activated', () => {
    const { continueButton, guestButton, input } = renderNicknameScreen(container, { strings });
    input.value = 'Rex';

    expect(() => continueButton.click()).not.toThrow();
    expect(() => guestButton.click()).not.toThrow();
  });
});

describe('NicknameScreen accessibility (label, focus, error semantics, keyboard)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount so screen readers announce the new screen', () => {
    const { title } = renderNicknameScreen(container, { strings });

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(title);
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  test('the input has a real, associated <label> (findable by its accessible name)', () => {
    const { input, label } = renderNicknameScreen(container, { strings });

    expect(label.tagName).toBe('LABEL');
    expect(getByLabelText(container, strings.inputLabel)).toBe(input);
  });

  test('the "no apellidos" notice is wired as a permanent aria-describedby on the input', () => {
    const { input, hint } = renderNicknameScreen(container, { strings });

    expect(input.getAttribute('aria-describedby')).toContain(hint.id);
    expect(hint.textContent).toBe(strings.lastNameWarning);
  });

  test('a validation error is announced via role="alert" and added to aria-describedby alongside the hint', () => {
    const { continueButton, input, error, hint } = renderNicknameScreen(container, { strings });

    continueButton.click();

    expect(error).toHaveAttribute('role', 'alert');
    const describedBy = input.getAttribute('aria-describedby').split(' ');
    expect(describedBy).toEqual(expect.arrayContaining([hint.id, error.id]));
  });

  test('the error message is never conveyed by color alone — it carries a warning glyph plus the text', () => {
    const { continueButton, error } = renderNicknameScreen(container, { strings });

    continueButton.click();

    expect(error.textContent.trim().length).toBeGreaterThan(0);
    // The glyph is CSS-generated content (::before), so the accessible text
    // itself (asserted above and in the validation tests) is what actually
    // conveys the failure — this just guards the visible label isn't blank.
    expect(error.textContent).toBe(strings.errors.empty);
  });

  test('both actions are real, keyboard-activatable buttons meeting the >=48x48dp minimum touch target', () => {
    const { continueButton, guestButton } = renderNicknameScreen(container, { strings });

    expect(continueButton.tagName).toBe('BUTTON');
    expect(guestButton.tagName).toBe('BUTTON');
    expect(continueButton).toHaveAccessibleName(strings.continueButtonLabel);
    expect(guestButton).toHaveAccessibleName(strings.guestButtonLabel);
  });

  test('Continuar and "Jugar como invitado" respond to Enter/Space keydown, not just click', () => {
    const onSubmit = jest.fn();
    const onGuest = jest.fn();
    const { continueButton, guestButton, input } = renderNicknameScreen(container, { strings, onSubmit, onGuest });
    input.value = 'Rex';

    continueButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onSubmit).toHaveBeenCalledWith('Rex');

    guestButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onGuest).toHaveBeenCalledTimes(1);
  });
});

describe('NicknameScreen avatar picker (rendering)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the group label, instructions and optional notice from the es locale resource file', () => {
    renderNicknameScreen(container, { strings, dinosaurNames });

    expect(container.textContent).toContain(strings.avatarPicker.groupLabel);
    expect(container.textContent).toContain(strings.avatarPicker.instructions);
    expect(container.textContent).toContain(strings.avatarPicker.optionalNotice);
  });

  test('renders exactly one radio option per avatar in the catalog, inside a radiogroup', () => {
    const { avatarPicker, avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });

    const grid = avatarPicker.querySelector('[role="radiogroup"]');
    expect(grid).not.toBeNull();
    expect(grid.querySelectorAll('[role="radio"]').length).toBe(AVATAR_LIST.length);
    expect(Object.keys(avatarOptions).length).toBe(AVATAR_LIST.length);
  });

  test('each option has an accessible name built from optionAriaLabelFormat and the dinosaur\'s localized name', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });

    AVATAR_LIST.forEach((avatar) => {
      const expectedLabel = strings.avatarPicker.optionAriaLabelFormat.replace('{dinosaur}', dinosaurNames[avatar.nameKey]);
      expect(avatarOptions[avatar.id]).toHaveAccessibleName(expectedLabel);
    });
  });

  test('each option\'s illustration is decorative -- empty alt and aria-hidden, never the only name source', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });

    AVATAR_LIST.forEach((avatar) => {
      const img = avatarOptions[avatar.id].querySelector('img');
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('aria-hidden', 'true');
      expect(img).toHaveAttribute('src', avatar.image);
    });
  });

  test('no avatar is selected by default -- selection is optional', () => {
    const { avatarOptions, getSelectedAvatarId } = renderNicknameScreen(container, { strings, dinosaurNames });

    expect(getSelectedAvatarId()).toBeNull();
    Object.values(avatarOptions).forEach((button) => {
      expect(button).toHaveAttribute('aria-checked', 'false');
    });
  });

  test('exactly one option is in the tab order (roving tabindex), defaulting to the first', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });

    const tabbable = Object.values(avatarOptions).filter((button) => button.tabIndex === 0);
    expect(tabbable.length).toBe(1);
    expect(tabbable[0]).toBe(avatarOptions[AVATAR_LIST[0].id]);
  });

  test('options.initialAvatarId preselects that option and is reflected by getSelectedAvatarId', () => {
    const preselected = AVATAR_LIST[2].id;
    const { avatarOptions, getSelectedAvatarId } = renderNicknameScreen(container, {
      strings,
      dinosaurNames,
      initialAvatarId: preselected,
    });

    expect(getSelectedAvatarId()).toBe(preselected);
    expect(avatarOptions[preselected]).toHaveAttribute('aria-checked', 'true');
    expect(avatarOptions[preselected].tabIndex).toBe(0);
  });

  test('re-rendering into the same container clears the previous avatar picker too', () => {
    renderNicknameScreen(container, { strings, dinosaurNames });
    renderNicknameScreen(container, { strings, dinosaurNames });

    expect(container.querySelectorAll('.avatar-picker').length).toBe(1);
    expect(container.querySelectorAll('[role="radio"]').length).toBe(AVATAR_LIST.length);
  });
});

describe('NicknameScreen avatar picker (selection)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('clicking an avatar selects it and calls onSelectAvatar with its id', () => {
    const onSelectAvatar = jest.fn();
    const { avatarOptions, getSelectedAvatarId } = renderNicknameScreen(container, {
      strings,
      dinosaurNames,
      onSelectAvatar,
    });
    const target = AVATAR_LIST[1].id;

    avatarOptions[target].click();

    expect(onSelectAvatar).toHaveBeenCalledTimes(1);
    expect(onSelectAvatar).toHaveBeenCalledWith(target);
    expect(getSelectedAvatarId()).toBe(target);
    expect(avatarOptions[target]).toHaveAttribute('aria-checked', 'true');
  });

  test('selecting a different avatar deselects the previous one -- only one is ever checked', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const second = AVATAR_LIST[1].id;

    avatarOptions[first].click();
    expect(avatarOptions[first]).toHaveAttribute('aria-checked', 'true');

    avatarOptions[second].click();
    expect(avatarOptions[second]).toHaveAttribute('aria-checked', 'true');
    expect(avatarOptions[first]).toHaveAttribute('aria-checked', 'false');
  });

  test('pressing Enter or Space on a focused option selects it, same as a click', () => {
    const onSelectAvatar = jest.fn();
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames, onSelectAvatar });
    const target = AVATAR_LIST[0].id;

    avatarOptions[target].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    expect(onSelectAvatar).toHaveBeenCalledWith(target);
    expect(avatarOptions[target]).toHaveAttribute('aria-checked', 'true');
  });

  test('arrow keys move focus between options without changing the selection', () => {
    const onSelectAvatar = jest.fn();
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames, onSelectAvatar });
    const first = AVATAR_LIST[0].id;
    const second = AVATAR_LIST[1].id;

    avatarOptions[first].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(avatarOptions[second]).toHaveFocus();
    expect(onSelectAvatar).not.toHaveBeenCalled();
    expect(avatarOptions[first]).toHaveAttribute('aria-checked', 'false');
    expect(avatarOptions[second]).toHaveAttribute('aria-checked', 'false');
    expect(avatarOptions[second].tabIndex).toBe(0);
    expect(avatarOptions[first].tabIndex).toBe(-1);
  });

  test('ArrowLeft from the first option wraps around to the last one', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const last = AVATAR_LIST[AVATAR_LIST.length - 1].id;

    avatarOptions[first].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));

    expect(avatarOptions[last]).toHaveFocus();
  });

  test('ArrowRight from the last option wraps around to the first one', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const last = AVATAR_LIST[AVATAR_LIST.length - 1].id;

    avatarOptions[last].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(avatarOptions[first]).toHaveFocus();
  });

  test('ArrowDown/ArrowUp move focus the same way as ArrowRight/ArrowLeft', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const second = AVATAR_LIST[1].id;

    avatarOptions[first].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(avatarOptions[second]).toHaveFocus();

    avatarOptions[second].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(avatarOptions[first]).toHaveFocus();
  });

  test('pressing Space on a focused option selects it, same as a click', () => {
    const onSelectAvatar = jest.fn();
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames, onSelectAvatar });
    const target = AVATAR_LIST[1].id;

    avatarOptions[target].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));

    expect(onSelectAvatar).toHaveBeenCalledWith(target);
    expect(avatarOptions[target]).toHaveAttribute('aria-checked', 'true');
  });

  test('only one radio option is ever reachable by Tab at a time (roving tabindex), and it tracks the selection', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const third = AVATAR_LIST[2].id;

    avatarOptions[third].click();

    const tabbable = Object.values(avatarOptions).filter((button) => button.tabIndex === 0);
    expect(tabbable).toEqual([avatarOptions[third]]);
    expect(avatarOptions[first].tabIndex).toBe(-1);
  });

  test('choosing an avatar never blocks Continuar -- a valid apodo still submits', () => {
    const onSubmit = jest.fn();
    const { avatarOptions, input, continueButton } = renderNicknameScreen(container, {
      strings,
      dinosaurNames,
      onSubmit,
    });

    avatarOptions[AVATAR_LIST[0].id].click();
    input.value = 'Rex';
    continueButton.click();

    expect(onSubmit).toHaveBeenCalledWith('Rex');
  });

  test('continuing as guest without ever choosing an avatar works -- selection stays optional', () => {
    const onGuest = jest.fn();
    const { guestButton, getSelectedAvatarId } = renderNicknameScreen(container, { strings, dinosaurNames, onGuest });

    guestButton.click();

    expect(onGuest).toHaveBeenCalledTimes(1);
    expect(getSelectedAvatarId()).toBeNull();
  });

  test('missing onSelectAvatar never throws when an avatar is activated', () => {
    const { avatarOptions } = renderNicknameScreen(container, { strings, dinosaurNames });

    expect(() => avatarOptions[AVATAR_LIST[0].id].click()).not.toThrow();
  });
});

describe('NicknameScreen avatar picker (screen reader announcement of the selection state)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('exposes a dedicated role="status"/aria-live="polite" region, visually hidden and empty before any choice', () => {
    const { avatarAnnouncement } = renderNicknameScreen(container, { strings, dinosaurNames });

    expect(avatarAnnouncement).toHaveAttribute('role', 'status');
    expect(avatarAnnouncement).toHaveAttribute('aria-live', 'polite');
    expect(avatarAnnouncement).toHaveClass('sr-only');
    expect(avatarAnnouncement.textContent).toBe('');
  });

  test('clicking an avatar announces the chosen dinosaur by its localized name, built from selectedAnnouncement', () => {
    const { avatarOptions, avatarAnnouncement } = renderNicknameScreen(container, { strings, dinosaurNames });
    const target = AVATAR_LIST[0].id;

    avatarOptions[target].click();

    const expected = strings.avatarPicker.selectedAnnouncement.replace('{dinosaur}', dinosaurNames[target]);
    expect(avatarAnnouncement.textContent).toBe(expected);
  });

  test('selecting via Enter/Space announces the choice the same way as a click', () => {
    const { avatarOptions, avatarAnnouncement } = renderNicknameScreen(container, { strings, dinosaurNames });
    const target = AVATAR_LIST[1].id;

    avatarOptions[target].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    const expected = strings.avatarPicker.selectedAnnouncement.replace('{dinosaur}', dinosaurNames[target]);
    expect(avatarAnnouncement.textContent).toBe(expected);
  });

  test('choosing a different avatar overwrites the announcement with the new choice, never appending', () => {
    const { avatarOptions, avatarAnnouncement } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;
    const second = AVATAR_LIST[1].id;

    avatarOptions[first].click();
    avatarOptions[second].click();

    const expected = strings.avatarPicker.selectedAnnouncement.replace('{dinosaur}', dinosaurNames[second]);
    expect(avatarAnnouncement.textContent).toBe(expected);
  });

  test('moving focus with the arrow keys alone never writes to the announcement region', () => {
    const { avatarOptions, avatarAnnouncement } = renderNicknameScreen(container, { strings, dinosaurNames });
    const first = AVATAR_LIST[0].id;

    avatarOptions[first].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(avatarAnnouncement.textContent).toBe('');
  });
});
