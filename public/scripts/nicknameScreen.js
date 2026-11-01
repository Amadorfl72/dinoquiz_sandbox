'use strict';

/**
 * Nickname request screen ("pantalla de solicitud de nombre"): shown before
 * the first question whenever no nickname has been saved yet, so the game
 * can greet the player and personalize feedback without ever asking for a
 * real name. A short apodo field, an explicit "no apellidos" (no last
 * names) notice, and two ways forward -- 'Continuar' with a valid apodo, or
 * 'Jugar como invitado' to skip straight into the game.
 *
 * This module owns rendering, trimming and validation only -- it never
 * touches storage itself, mirroring public/scripts/modeChangeConfirmScreen.js.
 * Deciding *whether* a saved nickname already exists (so this screen should
 * be skipped) and *persisting* the value `options.onSubmit` receives is the
 * caller's job, wired up in the flow-integration task that connects this
 * screen to src/services/storage.
 *
 * `validateNickname`/`trimNickname`/`NICKNAME_MAX_LENGTH` are exported
 * standalone (no DOM needed) so that future integration code and tests can
 * reuse the exact same trimming/validation rule instead of re-deriving it.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 *
 * Accessibility: the heading receives focus on mount (same convention as
 * public/scripts/ageGateScreen.js) so screen readers announce the new view
 * immediately. The label is associated to the input via `for`/`id`, the
 * "no apellidos" notice is wired as a permanent `aria-describedby` on the
 * input, and a validation failure adds the error paragraph (`role="alert"`)
 * to that same `aria-describedby` list and sets `aria-invalid="true"` --
 * so the failure is conveyed by an announced, read-out message and not by
 * color alone. Both actions are real `<button>`s, and Enter from inside the
 * text field submits exactly like the 'Continuar' button (no native
 * `<form>` involved, consistent with the rest of the app's screens).
 *
 * Avatar picker (player-avatars convention, TRIOFSND): a grid of the
 * dinosaur avatars from public/scripts/avatarList.js, rendered as an ARIA
 * `radiogroup` of `role="radio"` buttons -- real, focusable, keyboard
 * operable `<button>`s rather than native `<input type="radio">`s, matching
 * every other option control in this app (e.g. modeSelectorScreen.js's
 * cards). Choosing an avatar is always optional: nothing here blocks
 * 'Continuar'/'Jugar como invitado', and no option starts selected unless
 * `options.initialAvatarId` names one. A roving `tabindex` keeps exactly one
 * option in the Tab order; per the `avatarPicker.instructions` copy itself
 * (public/i18n/es.json), the arrow keys only move that focus between
 * options, and Enter/Space/click is what actually chooses one -- so arrowing
 * through the grid to look around never silently changes the selection.
 * Choosing an option calls `options.onSelectAvatar(avatarId)`; persisting it
 * (via nicknameService.js, same as the nickname itself) is the caller's job,
 * same separation of concerns as `onSubmit` above. Each option's accessible
 * name comes from `avatarPicker.optionAriaLabelFormat` interpolated with the
 * dinosaur's localized name (`dinosaurNames`) -- never the bare id -- and
 * its illustration is `alt=""`/`aria-hidden="true"` since that accessible
 * name already conveys which dinosaur it is.
 */

(function () {
  var NICKNAME_MAX_LENGTH = 20;

  var NICKNAME_ERROR_CODES = {
    EMPTY: 'empty',
    TOO_LONG: 'too_long',
  };

  /**
   * Binds a control to fire `handler` on click AND on an Enter/Espacio
   * `keydown`, matching public/scripts/homeScreen.js's `bindActivation`: a
   * real `<button>` gets Enter/Space activation for free in a real browser,
   * but jsdom does not implement that default action, so it is wired
   * explicitly to keep keyboard operability verifiable in tests.
   */
  function bindActivation(element, handler) {
    element.addEventListener('click', handler);
    element.addEventListener('keydown', function (event) {
      if (element.disabled) return;
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        handler(event);
      }
    });
  }

  function trimNickname(raw) {
    return typeof raw === 'string' ? raw.trim() : '';
  }

  /**
   * Pure validation: trims the raw value and reports whether the result is
   * usable, with no DOM/storage involved. `value` is always the trimmed
   * string, so a valid result is exactly what the caller should persist.
   */
  function validateNickname(raw) {
    var value = trimNickname(raw);
    if (value === '') {
      return { value: value, valid: false, errorCode: NICKNAME_ERROR_CODES.EMPTY };
    }
    if (value.length > NICKNAME_MAX_LENGTH) {
      return { value: value, valid: false, errorCode: NICKNAME_ERROR_CODES.TOO_LONG };
    }
    return { value: value, valid: true, errorCode: null };
  }

  function resolveDefaultStrings(locale, section) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE)[section || 'nicknameRequest'];
    }
    return null;
  }

  function resolveAvatarList(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.data && win.DinoQuiz.data.avatarList) {
      return win.DinoQuiz.data.avatarList.AVATAR_LIST;
    }
    if (typeof require === 'function') {
      return require('./avatarList').AVATAR_LIST;
    }
    return [];
  }

  /**
   * Builds the avatar picker (see the module doc comment's "Avatar picker"
   * section) -- a `role="radiogroup"` of `role="radio"` option buttons, one
   * per `avatarList` entry, with a roving `tabindex` and a selection that
   * only ever changes on click or Enter/Space, never on arrow navigation
   * alone.
   */
  function buildAvatarPicker(doc, avatarList, dinosaurNames, pickerStrings, initialAvatarId, onSelectAvatar) {
    pickerStrings = pickerStrings || {};
    dinosaurNames = dinosaurNames || {};
    var selectedId = typeof initialAvatarId === 'string' && initialAvatarId.length > 0 ? initialAvatarId : null;

    var root = doc.createElement('div');
    root.className = 'avatar-picker';

    var label = doc.createElement('p');
    label.id = 'nickname-screen-avatar-picker-label';
    label.className = 'avatar-picker__label';
    label.textContent = pickerStrings.groupLabel;

    var instructions = doc.createElement('p');
    instructions.id = 'nickname-screen-avatar-picker-instructions';
    instructions.className = 'avatar-picker__instructions';
    instructions.textContent = pickerStrings.instructions;

    var grid = doc.createElement('div');
    grid.className = 'avatar-picker__grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-labelledby', label.id);
    grid.setAttribute('aria-describedby', instructions.id);

    var optionButtons = [];
    var optionsById = {};

    function accessibleLabelFor(avatar) {
      var name = dinosaurNames[avatar.nameKey] || avatar.nameKey;
      var format = pickerStrings.optionAriaLabelFormat || '{dinosaur}';
      return format.replace('{dinosaur}', name);
    }

    function setFocusableIndex(index) {
      optionButtons.forEach(function (button, i) {
        button.tabIndex = i === index ? 0 : -1;
      });
    }

    function focusIndex(index) {
      if (optionButtons.length === 0) return;
      var wrapped = (index + optionButtons.length) % optionButtons.length;
      setFocusableIndex(wrapped);
      optionButtons[wrapped].focus();
    }

    function selectAvatar(avatarId) {
      selectedId = avatarId;
      optionButtons.forEach(function (button) {
        button.setAttribute('aria-checked', button.getAttribute('data-avatar-id') === avatarId ? 'true' : 'false');
      });
      if (typeof onSelectAvatar === 'function') {
        onSelectAvatar(avatarId);
      }
    }

    avatarList.forEach(function (avatar, index) {
      var button = doc.createElement('button');
      button.type = 'button';
      button.className = 'avatar-picker__option';
      button.setAttribute('role', 'radio');
      button.setAttribute('data-avatar-id', avatar.id);
      button.setAttribute('aria-checked', avatar.id === selectedId ? 'true' : 'false');
      button.setAttribute('aria-label', accessibleLabelFor(avatar));
      button.tabIndex = -1;

      var image = doc.createElement('img');
      image.className = 'avatar-picker__image';
      image.setAttribute('alt', '');
      image.setAttribute('aria-hidden', 'true');
      image.setAttribute('src', avatar.image);
      button.appendChild(image);

      button.addEventListener('click', function () {
        setFocusableIndex(index);
        selectAvatar(avatar.id);
      });

      button.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          focusIndex(index + 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          focusIndex(index - 1);
        } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          selectAvatar(avatar.id);
        }
      });

      optionButtons.push(button);
      optionsById[avatar.id] = button;
      grid.appendChild(button);
    });

    var initialFocusIndex = avatarList.findIndex(function (avatar) {
      return avatar.id === selectedId;
    });
    setFocusableIndex(initialFocusIndex >= 0 ? initialFocusIndex : 0);

    var optionalNotice = doc.createElement('p');
    optionalNotice.className = 'avatar-picker__optional-notice';
    optionalNotice.textContent = pickerStrings.optionalNotice;

    root.appendChild(label);
    root.appendChild(instructions);
    root.appendChild(grid);
    root.appendChild(optionalNotice);

    return {
      root: root,
      grid: grid,
      label: label,
      instructions: instructions,
      optionalNotice: optionalNotice,
      options: optionsById,
      getSelectedAvatarId: function () {
        return selectedId;
      },
    };
  }

  function renderNicknameScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);
    var dinosaurNames = options.dinosaurNames || resolveDefaultStrings(options.locale, 'dinosaurNames');
    var avatarList = options.avatarList || resolveAvatarList();

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'nickname-screen';

    var title = document.createElement('h1');
    title.id = 'nickname-screen-title';
    title.className = 'nickname-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var instructions = document.createElement('p');
    instructions.className = 'nickname-screen__instructions';
    instructions.textContent = strings.instructions;

    var field = document.createElement('div');
    field.className = 'nickname-screen__field';

    var label = document.createElement('label');
    label.className = 'nickname-screen__label';
    label.setAttribute('for', 'nickname-screen-input');
    label.textContent = strings.inputLabel;

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'nickname-screen-input';
    input.className = 'nickname-screen__input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (typeof options.initialValue === 'string') {
      input.value = options.initialValue;
    }

    var hint = document.createElement('p');
    hint.id = 'nickname-screen-hint';
    hint.className = 'nickname-screen__hint';
    hint.textContent = strings.lastNameWarning;

    var error = document.createElement('p');
    error.id = 'nickname-screen-error';
    error.className = 'nickname-screen__error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    input.setAttribute('aria-describedby', hint.id);

    function clearError() {
      if (error.hidden) return;
      error.hidden = true;
      error.textContent = '';
      input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', hint.id);
    }

    function showError(errorCode) {
      var message = errorCode === NICKNAME_ERROR_CODES.TOO_LONG ? strings.errors.tooLong : strings.errors.empty;
      error.textContent = message;
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', hint.id + ' ' + error.id);
    }

    input.addEventListener('input', clearError);

    field.appendChild(label);
    field.appendChild(input);
    field.appendChild(hint);
    field.appendChild(error);

    var avatarPicker = buildAvatarPicker(
      document,
      avatarList,
      dinosaurNames,
      strings.avatarPicker,
      options.initialAvatarId,
      options.onSelectAvatar
    );

    var actions = document.createElement('div');
    actions.className = 'nickname-screen__actions';

    var continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'nickname-screen__continue-button';
    continueButton.textContent = strings.continueButtonLabel;

    var guestButton = document.createElement('button');
    guestButton.type = 'button';
    guestButton.className = 'nickname-screen__guest-button';
    guestButton.textContent = strings.guestButtonLabel;

    function handleContinue() {
      var validation = validateNickname(input.value);

      if (!validation.valid) {
        showError(validation.errorCode);
        input.focus();
        return;
      }

      clearError();
      if (typeof options.onSubmit === 'function') {
        options.onSubmit(validation.value);
      }
    }

    function handleGuest() {
      clearError();
      if (typeof options.onGuest === 'function') {
        options.onGuest();
      }
    }

    bindActivation(continueButton, handleContinue);
    bindActivation(guestButton, handleGuest);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleContinue();
      }
    });

    actions.appendChild(continueButton);
    actions.appendChild(guestButton);

    root.appendChild(title);
    root.appendChild(instructions);
    root.appendChild(field);
    root.appendChild(avatarPicker.root);
    root.appendChild(actions);
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      title: title,
      instructions: instructions,
      avatarPicker: avatarPicker.root,
      avatarOptions: avatarPicker.options,
      getSelectedAvatarId: avatarPicker.getSelectedAvatarId,
      label: label,
      input: input,
      hint: hint,
      error: error,
      continueButton: continueButton,
      guestButton: guestButton,
    };
  }

  var api = {
    NICKNAME_MAX_LENGTH: NICKNAME_MAX_LENGTH,
    NICKNAME_ERROR_CODES: NICKNAME_ERROR_CODES,
    trimNickname: trimNickname,
    validateNickname: validateNickname,
    renderNicknameScreen: renderNicknameScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderNicknameScreen = renderNicknameScreen;
    window.DinoQuiz.screens.nickname = api;
  }
})();
