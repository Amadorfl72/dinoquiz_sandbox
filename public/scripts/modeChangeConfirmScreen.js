'use strict';

/**
 * Mode-change confirmation dialog (TRIOFSND-237, PRD "Contrato técnico y
 * visual común para los modos"): a small reusable `role="alertdialog"`
 * shown when the player asks to switch mode while a game is still in
 * progress, so they can confirm or cancel before that progress is lost.
 *
 * This module owns rendering and the confirm/cancel callbacks only -- it
 * never touches storage itself. Deciding *whether* a game is incomplete and
 * *what* happens to it (keep it, discard it) is the caller's job; this
 * screen just asks the question and reports the answer via
 * `options.onConfirm`/`options.onCancel`.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 *
 * Accessibility: real `<button>` elements (native keyboard activation and
 * >=48x48dp touch targets), the dialog is labelled/described by its own
 * title and message (`aria-labelledby`/`aria-describedby`), the "seguir
 * jugando" (cancel/safe) button receives focus on mount -- mirroring the
 * age-gate/eight-plus "safe default" convention of never defaulting to the
 * destructive choice -- and `Escape` cancels from anywhere inside the
 * dialog. Tab/Shift+Tab are trapped between the two buttons so keyboard
 * focus can never silently leave the open dialog for the screen behind it.
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).modeChange;
    }
    return null;
  }

  function renderModeChangeConfirmScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var overlay = document.createElement('div');
    overlay.className = 'mode-change-confirm-screen';

    var dialog = document.createElement('div');
    dialog.className = 'mode-change-confirm-screen__dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');

    var title = document.createElement('h2');
    title.id = 'mode-change-confirm-screen-title';
    title.className = 'mode-change-confirm-screen__title';
    title.textContent = strings.title;
    title.tabIndex = -1;

    var message = document.createElement('p');
    message.id = 'mode-change-confirm-screen-message';
    message.className = 'mode-change-confirm-screen__message';
    message.textContent = strings.message;

    dialog.setAttribute('aria-labelledby', title.id);
    dialog.setAttribute('aria-describedby', message.id);

    var actions = document.createElement('div');
    actions.className = 'mode-change-confirm-screen__actions';

    var cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'mode-change-confirm-screen__cancel-button';
    cancelButton.textContent = strings.cancelButtonLabel;

    var confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'mode-change-confirm-screen__confirm-button';
    confirmButton.textContent = strings.confirmButtonLabel;

    cancelButton.addEventListener('click', function () {
      if (typeof options.onCancel === 'function') {
        options.onCancel();
      }
    });

    confirmButton.addEventListener('click', function () {
      if (typeof options.onConfirm === 'function') {
        options.onConfirm();
      }
    });

    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      // Trap Tab/Shift+Tab between the two buttons so focus can't leave
      // the open dialog for the screen underneath.
      if (event.shiftKey && document.activeElement === cancelButton) {
        event.preventDefault();
        confirmButton.focus();
      } else if (!event.shiftKey && document.activeElement === confirmButton) {
        event.preventDefault();
        cancelButton.focus();
      }
    });

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);

    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    container.appendChild(overlay);

    if (typeof cancelButton.focus === 'function') {
      cancelButton.focus();
    }

    return {
      root: overlay,
      dialog: dialog,
      title: title,
      message: message,
      cancelButton: cancelButton,
      confirmButton: confirmButton,
    };
  }

  var api = {
    renderModeChangeConfirmScreen: renderModeChangeConfirmScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderModeChangeConfirmScreen = renderModeChangeConfirmScreen;
    window.DinoQuiz.screens.modeChangeConfirm = api;
  }
})();
