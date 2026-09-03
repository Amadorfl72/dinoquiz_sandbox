'use strict';

/**
 * Privacy policy ("Política de privacidad") screen: static, kid-and-parent
 * friendly copy on what data DinoQuiz handles, why, user rights and the
 * contact for the data controller — all sourced from the i18n resource
 * (public/i18n/es.json), reachable from Home in a single tap (see
 * public/scripts/homeScreen.js) with a "Volver" control back to Home.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 *
 * Accessibility: the heading receives focus on mount so screen readers
 * announce the new view immediately after the tap that opened it, without
 * relying on a full page navigation.
 *
 * Data-deletion action ("Borrar mis datos", `strings.dataDeletion`): an
 * inline delete-with-confirmation control -- same two-step shape as
 * diagnosticsScreen.js's own reset action, never deletes on the first
 * click. Confirming wipes every piece of on-device player progress this
 * policy documents as locally stored: best score, max streak and
 * discovered fun facts (the plain `dinoquiz:`-prefixed localStorage keys
 * public/scripts/main.js itself reads/writes) plus the Hall of Fame
 * top-10 list via `hallOfFameService.clearAll()` (src/services/
 * hallOfFameService.js), resolved the same require-or-`window.DinoQuiz`
 * way as every other data source in this codebase so both Jest and the
 * real no-bundler browser resolve the same module.
 */

(function () {
  // Same namespaced keys public/scripts/main.js itself reads/writes
  // (BEST_SCORE_KEY/MAX_STREAK_KEY/DISCOVERED_FUN_FACTS_KEY) and
  // src/services/storage/StorageClient.js's own PERSISTED_KEYS persist
  // under -- kept in sync with both by convention, not by import, the same
  // way main.js's own copies already are.
  var PLAYER_PROGRESS_STORAGE_KEYS = ['dinoquiz:bestScore', 'dinoquiz:maxStreak', 'dinoquiz:discoveredFunFacts'];

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).privacyPolicy;
    }
    return null;
  }

  /** Same require-or-`window.DinoQuiz` fallback shape as diagnosticsScreen.js's own resolvers, reaching src/services/hallOfFameService.js. */
  function resolveHallOfFameService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.hallOfFameService) {
      return win.DinoQuiz.services.hallOfFameService;
    }
    if (typeof require === 'function') {
      return require('../../src/services/hallOfFameService');
    }
    return null;
  }

  /** Mirrors hallOfFameService.js's own resolveStorage: accessing `window.localStorage` can itself throw (blocked/private-mode storage), not just the calls on it. */
  function resolveLocalStorage(storageAdapter) {
    if (storageAdapter) {
      return storageAdapter;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  /** Removes the best-score/max-streak/discovered-fun-facts keys; tolerates unavailable storage the same way hallOfFameService.js's own clearAll does (never throws, degrades to false). */
  function clearPlayerProgress(storageAdapter) {
    var storage = resolveLocalStorage(storageAdapter);
    if (!storage) {
      return false;
    }
    try {
      PLAYER_PROGRESS_STORAGE_KEYS.forEach(function (key) {
        storage.removeItem(key);
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function renderSection(section) {
    var sectionEl = document.createElement('section');
    sectionEl.className = 'privacy-policy-screen__section';

    var heading = document.createElement('h2');
    heading.id = 'privacy-policy-' + section.id + '-heading';
    heading.textContent = section.heading;
    sectionEl.setAttribute('aria-labelledby', heading.id);
    sectionEl.appendChild(heading);

    section.paragraphs.forEach(function (paragraph) {
      var p = document.createElement('p');
      p.textContent = paragraph;
      sectionEl.appendChild(p);
    });

    return sectionEl;
  }

  /**
   * Builds the "Borrar mis datos" action DOM (delete button, hidden
   * confirm step with cancel/confirm, and a live status message) without
   * wiring any click handler -- the caller (renderPrivacyPolicyScreen)
   * owns the actual clearing calls, same split as diagnosticsScreen.js's
   * own renderActionsSection.
   */
  function renderDataDeletionAction(strings) {
    var group = document.createElement('section');
    group.className = 'privacy-policy-screen__data-deletion';
    group.setAttribute('aria-labelledby', 'privacy-policy-data-deletion-heading');

    var heading = document.createElement('h2');
    heading.id = 'privacy-policy-data-deletion-heading';
    heading.textContent = strings.heading;
    group.appendChild(heading);

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'privacy-policy-screen__delete-button';
    deleteButton.textContent = strings.buttonLabel;

    var deleteConfirm = document.createElement('div');
    deleteConfirm.className = 'privacy-policy-screen__delete-confirm';
    deleteConfirm.setAttribute('aria-live', 'polite');
    deleteConfirm.hidden = true;

    var deleteConfirmMessage = document.createElement('p');
    deleteConfirmMessage.className = 'privacy-policy-screen__delete-confirm-message';
    deleteConfirmMessage.textContent = strings.confirmMessage;

    var deleteConfirmActions = document.createElement('div');
    deleteConfirmActions.className = 'privacy-policy-screen__delete-confirm-actions';

    var deleteCancelButton = document.createElement('button');
    deleteCancelButton.type = 'button';
    deleteCancelButton.className = 'privacy-policy-screen__delete-cancel-button';
    deleteCancelButton.textContent = strings.cancelButtonLabel;

    var deleteConfirmButton = document.createElement('button');
    deleteConfirmButton.type = 'button';
    deleteConfirmButton.className = 'privacy-policy-screen__delete-confirm-button';
    deleteConfirmButton.textContent = strings.confirmButtonLabel;

    deleteConfirmActions.appendChild(deleteCancelButton);
    deleteConfirmActions.appendChild(deleteConfirmButton);
    deleteConfirm.appendChild(deleteConfirmMessage);
    deleteConfirm.appendChild(deleteConfirmActions);

    var deleteStatus = document.createElement('p');
    deleteStatus.className = 'privacy-policy-screen__delete-status';
    deleteStatus.setAttribute('aria-live', 'polite');

    group.appendChild(deleteButton);
    group.appendChild(deleteConfirm);
    group.appendChild(deleteStatus);

    return {
      section: group,
      deleteButton: deleteButton,
      deleteConfirm: deleteConfirm,
      deleteCancelButton: deleteCancelButton,
      deleteConfirmButton: deleteConfirmButton,
      deleteStatus: deleteStatus,
    };
  }

  function renderPrivacyPolicyScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);
    var hallOfFameService = options.hallOfFameService || resolveHallOfFameService();

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'privacy-policy-screen';

    var backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'privacy-policy-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    if (typeof options.onBack === 'function') {
      backButton.addEventListener('click', options.onBack);
    }

    var title = document.createElement('h1');
    title.className = 'privacy-policy-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var updatedAt = document.createElement('p');
    updatedAt.className = 'privacy-policy-screen__updated-at';
    updatedAt.textContent = strings.updatedAt;

    var callout = document.createElement('section');
    callout.className = 'privacy-policy-screen__callout';
    callout.setAttribute('aria-labelledby', 'privacy-policy-kids-heading');

    var calloutHeading = document.createElement('h2');
    calloutHeading.id = 'privacy-policy-kids-heading';
    calloutHeading.textContent = strings.kidsCallout.heading;

    var calloutBody = document.createElement('p');
    calloutBody.textContent = strings.kidsCallout.body;

    callout.appendChild(calloutHeading);
    callout.appendChild(calloutBody);

    var sectionEls = strings.sections.map(renderSection);
    var dataDeletion = renderDataDeletionAction(strings.dataDeletion);

    root.appendChild(backButton);
    root.appendChild(title);
    root.appendChild(updatedAt);
    root.appendChild(callout);
    sectionEls.forEach(function (sectionEl) {
      root.appendChild(sectionEl);
    });
    root.appendChild(dataDeletion.section);
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    // Two-step delete, never on the first click: the confirm block starts
    // hidden and swaps places with the plain delete button, mirroring
    // diagnosticsScreen.js's own reset action.
    function showDeleteButton() {
      dataDeletion.deleteConfirm.hidden = true;
      dataDeletion.deleteButton.hidden = false;
      if (typeof dataDeletion.deleteButton.focus === 'function') {
        dataDeletion.deleteButton.focus();
      }
    }

    dataDeletion.deleteButton.addEventListener('click', function () {
      dataDeletion.deleteStatus.textContent = '';
      dataDeletion.deleteButton.hidden = true;
      dataDeletion.deleteConfirm.hidden = false;
      if (typeof dataDeletion.deleteCancelButton.focus === 'function') {
        dataDeletion.deleteCancelButton.focus();
      }
    });

    dataDeletion.deleteCancelButton.addEventListener('click', function () {
      showDeleteButton();
    });

    // The actual full-data-wipe (PRD "borrar mis datos"): best score, max
    // streak and discovered fun facts (this module's own
    // clearPlayerProgress) plus the Hall of Fame top-10 list
    // (hallOfFameService.clearAll), so the wipe this policy documents
    // really does remove everything it promises -- never just the Hall of
    // Fame or just the score/streak/facts on their own.
    dataDeletion.deleteConfirmButton.addEventListener('click', function () {
      clearPlayerProgress(options.storage);
      if (hallOfFameService && typeof hallOfFameService.clearAll === 'function') {
        hallOfFameService.clearAll(options.storage);
      }
      showDeleteButton();
      dataDeletion.deleteStatus.textContent = strings.dataDeletion.successMessage;
    });

    return {
      root: root,
      backButton: backButton,
      title: title,
      sections: sectionEls,
      deleteButton: dataDeletion.deleteButton,
      deleteConfirm: dataDeletion.deleteConfirm,
      deleteCancelButton: dataDeletion.deleteCancelButton,
      deleteConfirmButton: dataDeletion.deleteConfirmButton,
      deleteStatus: dataDeletion.deleteStatus,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderPrivacyPolicyScreen: renderPrivacyPolicyScreen };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderPrivacyPolicyScreen = renderPrivacyPolicyScreen;
  }
})();
