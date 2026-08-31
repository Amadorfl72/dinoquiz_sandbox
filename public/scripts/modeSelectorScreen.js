'use strict';

/**
 * Illustrated mode selector screen (TRIOFSND-231, PRD "Selector ilustrado de
 * modos"): eight cards, one per mode in modesCatalog.js's MODES_CATALOG,
 * each showing a decorative illustration, the mode's localized name, an
 * accessible label, and its current availability -- wired to the real
 * availability evaluator (public/scripts/modesCatalog.js, TRIOFSND-228) and
 * the last-selected-mode service (public/scripts/modeStorage.js,
 * TRIOFSND-230).
 *
 * Layout (AC "sin scroll horizontal a 375px"): the eight cards sit in a
 * fixed 2-column CSS grid (see `.mode-selector-screen__grid` in
 * public/styles/main.css), which comfortably fits two ~160px cards side by
 * side inside the app's 375px viewport with room for the grid gap and the
 * screen's own padding -- unlike a 1-row horizontal layout, it never needs
 * to scroll.
 *
 * Card illustrations (TRIOFSND-232) are a decorative SVG icon per mode, one
 * per file under public/assets/images/modes/ (see MODE_ILLUSTRATION_SRCS
 * below), original artwork licensed and attributed in that folder's own
 * CREDITS.md. Each is rendered as `<img alt="" aria-hidden="true">` -- never
 * the only way a mode is identified, since the visible name and the button's
 * accessible label both come from i18n text regardless.
 *
 * Availability (blocked cards): a blocked card is never a native `disabled`
 * `<button>` -- disabled elements are pulled out of the tab order and most
 * assistive tech skips reading them entirely, which would hide exactly the
 * blocked-state text/reason the PRD requires screen readers to expose. It
 * stays a real, focusable, clickable `<button>` with `aria-disabled="true"`;
 * tapping/activating it never calls `onSelectMode`, only logs a local,
 * non-PII `mode_blocked` diagnostic (LogService#logModeBlocked, already
 * approved in src/services/analytics/approvedEvents.js). The visible
 * "Bloqueado" status text and the reason paragraph (mapped from the
 * evaluator's machine-readable cause code via
 * `modeSelector.blockedReasons`) are real DOM text nodes, not color alone,
 * and are also wired into the button's `aria-describedby` so the reason is
 * announced together with the button's name.
 *
 * Last-used mode: marked with `aria-current="true"` (the ARIA attribute for
 * "the current item in a set of related items", exactly this case) plus a
 * visible badge -- never `aria-selected`/`disabled`, which would imply an
 * exclusive choice or take the other cards out of play. Every other card
 * stays fully interactive regardless of which one was played last.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 */

(function () {
  var MODE_ILLUSTRATION_SRCS = {
    quiz: '/assets/images/modes/quiz.svg',
    laberinto: '/assets/images/modes/laberinto.svg',
    sombra: '/assets/images/modes/sombra.svg',
    oidoJurasico: '/assets/images/modes/oidoJurasico.svg',
    parejas: '/assets/images/modes/parejas.svg',
    clasifica: '/assets/images/modes/clasifica.svg',
    ordenaPorTamano: '/assets/images/modes/ordenaPorTamano.svg',
    lineaDelTiempo: '/assets/images/modes/lineaDelTiempo.svg',
  };

  function resolveDefaultLocaleStrings(locale, section) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE)[section];
    }
    return null;
  }

  function resolveModesCatalog(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.game && win.DinoQuiz.game.modesCatalog) {
      return win.DinoQuiz.game.modesCatalog;
    }
    if (typeof require === 'function') {
      return require('./modesCatalog');
    }
    return null;
  }

  function resolveLastModeService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.modeStorage) {
      return win.DinoQuiz.services.modeStorage;
    }
    if (typeof require === 'function') {
      return require('./modeStorage');
    }
    return null;
  }

  /**
   * Resolves a ready-to-use LogService instance, following the same dual
   * CommonJS/global pattern main.js's `resolveLogger` already uses.
   */
  function resolveLogService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var LogServiceCtor =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.logging && win.DinoQuiz.services.logging.LogService) ||
      (typeof require === 'function' ? require('../../src/services/logging').LogService : undefined);

    if (typeof LogServiceCtor !== 'function') {
      return null;
    }
    return new LogServiceCtor();
  }

  /**
   * Resolves src/services/diagnostics.js (TRIOFSND-317/318's local,
   * aggregated counters), same require-or-`window.DinoQuiz` fallback shape
   * as `resolveLogService` above -- this service has no browser-global
   * registration yet, so it resolves to null in the real, unbundled browser
   * and the `selectorOpen` tally below simply no-ops there.
   */
  function resolveDiagnostics(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.diagnostics) {
      return win.DinoQuiz.services.diagnostics;
    }
    if (typeof require === 'function') {
      return require('../../src/services/diagnostics');
    }
    return null;
  }

  /**
   * Resolves the availability verdict for every mode. `options.availability`
   * (a precomputed evaluateModes() result) short-circuits everything else,
   * which is what tests use to exercise available/blocked cards without a
   * real resource catalog. Otherwise evaluates `options.resourceCatalog`
   * (or the live `buildCurrentResourceCatalog()`) against `options.modes`
   * (or the full MODES_CATALOG).
   */
  function resolveAvailability(options, modesCatalog) {
    if (Array.isArray(options.availability)) {
      return options.availability;
    }
    if (!modesCatalog) {
      return [];
    }
    var catalog = options.resourceCatalog || modesCatalog.buildCurrentResourceCatalog();
    var evaluateModes = options.evaluateModes || modesCatalog.evaluateModes;
    var modes = options.modes || modesCatalog.MODES_CATALOG;
    return evaluateModes(catalog, modes);
  }

  // `<button>`'s content model only permits phrasing content (see the other
  // screens in this file's family -- homeScreen.js/ageGateScreen.js only
  // ever nest `<span>`s inside a button), so this and its children are all
  // `<span>`, never `<div>`/`<p>`.
  //
  // `doc` is always an explicit parameter here (the render context's
  // document, e.g. `container.ownerDocument`) -- never a free/global `doc`
  // or `document` reference. That keeps this helper usable from any render
  // context without an implicit, possibly-undefined binding.
  function buildCardMeta(doc, idPrefix, mode, verdict, strings, isLastUsed) {
    var meta = doc.createElement('span');
    meta.className = 'mode-selector-screen__card-meta';
    meta.id = idPrefix + '-meta';

    var status = doc.createElement('span');
    status.className = verdict.available
      ? 'mode-selector-screen__card-status mode-selector-screen__card-status--available'
      : 'mode-selector-screen__card-status mode-selector-screen__card-status--blocked';
    status.textContent = verdict.available ? strings.status.available : strings.status.blocked;
    meta.appendChild(status);

    if (!verdict.available) {
      var reason = doc.createElement('span');
      reason.className = 'mode-selector-screen__card-reason';
      reason.textContent = strings.blockedReasons[verdict.cause] || strings.status.blocked;
      meta.appendChild(reason);
    }

    if (isLastUsed) {
      var badge = doc.createElement('span');
      badge.className = 'mode-selector-screen__card-badge';
      badge.textContent = strings.lastPlayedBadge;
      meta.appendChild(badge);
    }

    return meta;
  }

  function buildCard(doc, mode, verdict, selectorStrings, isLastUsed, handlers) {
    var idPrefix = 'mode-selector-card-' + mode.id;
    var modeSelectorEntry = selectorStrings.modes[mode.id];

    var cell = doc.createElement('li');
    cell.className = 'mode-selector-screen__cell';

    var button = doc.createElement('button');
    button.type = 'button';
    button.className = verdict.available
      ? 'mode-selector-screen__card mode-selector-screen__card--available'
      : 'mode-selector-screen__card mode-selector-screen__card--blocked';
    button.setAttribute('data-mode-id', mode.id);
    button.setAttribute('aria-label', modeSelectorEntry ? modeSelectorEntry.accessibleLabel : mode.id);
    if (!verdict.available) {
      button.setAttribute('aria-disabled', 'true');
    }
    if (isLastUsed) {
      button.setAttribute('aria-current', 'true');
    }

    var illustration = doc.createElement('img');
    illustration.className = 'mode-selector-screen__card-illustration';
    illustration.setAttribute('aria-hidden', 'true');
    illustration.setAttribute('alt', '');
    illustration.setAttribute('src', MODE_ILLUSTRATION_SRCS[mode.id] || '/icons/icon.svg');

    var name = doc.createElement('span');
    name.className = 'mode-selector-screen__card-name';
    name.textContent = (selectorStrings.modesNames && selectorStrings.modesNames[mode.id]) || mode.id;

    var meta = buildCardMeta(doc, idPrefix, mode, verdict, selectorStrings, isLastUsed);
    button.setAttribute('aria-describedby', meta.id);

    button.appendChild(illustration);
    button.appendChild(name);
    button.appendChild(meta);

    button.addEventListener('click', function () {
      if (verdict.available) {
        handlers.onSelect(mode.id);
      } else {
        handlers.onBlocked(mode.id, verdict.cause);
      }
    });

    cell.appendChild(button);
    return { cell: cell, button: button, meta: meta };
  }

  function renderModeSelectorScreen(container, options) {
    options = options || {};
    // The document is always derived explicitly from the render context
    // (the container passed in) rather than read off a free/global `doc` or
    // `document` binding, so every element-creation helper below receives a
    // valid reference regardless of which document/window rendered it.
    var doc = container.ownerDocument || (typeof document !== 'undefined' ? document : undefined);
    var selectorStrings = options.strings || resolveDefaultLocaleStrings(options.locale, 'modeSelector');
    var modesStrings = options.modesStrings || resolveDefaultLocaleStrings(options.locale, 'modes');
    // buildCard only needs each mode's display name, keyed by mode id --
    // reads straight from the canonical `modes.<id>.name` (modesCatalog.js's
    // i18nKeyPrefix target) instead of duplicating it under modeSelector.
    var modesNames = {};
    Object.keys(modesStrings || {}).forEach(function (modeId) {
      modesNames[modeId] = modesStrings[modeId].name;
    });
    var strings = Object.assign({}, selectorStrings, { modesNames: modesNames });

    var modesCatalog = options.modesCatalog || resolveModesCatalog();
    var lastModeService = options.lastModeService || resolveLastModeService();
    var logService = options.logService || resolveLogService();
    var diagnostics = options.diagnostics || resolveDiagnostics();

    var modes = options.modes || (modesCatalog && modesCatalog.MODES_CATALOG) || [];
    var availability = resolveAvailability(options, modesCatalog);
    var availabilityByModeId = {};
    availability.forEach(function (verdict) {
      availabilityByModeId[verdict.modeId] = verdict;
    });

    // Read fresh on every build (per the render call, never cached across
    // shows) and fail closed: a throwing service, and any value that isn't
    // a non-empty string, both collapse to "no last mode" instead of
    // crashing the selector or being coerced into a false match below.
    var lastMode = null;
    if (lastModeService) {
      try {
        var rawLastMode = lastModeService.getLastMode();
        lastMode = typeof rawLastMode === 'string' && rawLastMode.length > 0 ? rawLastMode : null;
      } catch (error) {
        lastMode = null;
      }
    }

    container.innerHTML = '';

    var root = doc.createElement('div');
    root.className = 'mode-selector-screen';

    var backButton = doc.createElement('button');
    backButton.type = 'button';
    backButton.className = 'mode-selector-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    if (typeof options.onBack === 'function') {
      backButton.addEventListener('click', options.onBack);
    }

    var title = doc.createElement('h1');
    title.id = 'mode-selector-screen-title';
    title.className = 'mode-selector-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var grid = doc.createElement('ul');
    grid.className = 'mode-selector-screen__grid';
    grid.setAttribute('aria-labelledby', title.id);

    var cards = {};

    function markLastUsed(modeId) {
      Object.keys(cards).forEach(function (id) {
        var card = cards[id];
        var isLastUsed = id === modeId;
        if (isLastUsed) {
          card.button.setAttribute('aria-current', 'true');
        } else {
          card.button.removeAttribute('aria-current');
        }
        var existingBadge = card.meta.querySelector('.mode-selector-screen__card-badge');
        if (isLastUsed && !existingBadge) {
          var badge = doc.createElement('span');
          badge.className = 'mode-selector-screen__card-badge';
          badge.textContent = strings.lastPlayedBadge;
          card.meta.appendChild(badge);
        } else if (!isLastUsed && existingBadge) {
          existingBadge.remove();
        }
      });
    }

    function handleSelect(modeId) {
      if (lastModeService) {
        lastModeService.setLastMode(modeId);
      }
      markLastUsed(modeId);
      if (typeof options.onSelectMode === 'function') {
        options.onSelectMode(modeId);
      }
    }

    function handleBlocked(modeId, cause) {
      if (logService) {
        logService.logModeBlocked(modeId, cause);
      }
      if (typeof options.onBlockedModeAttempt === 'function') {
        options.onBlockedModeAttempt(modeId, cause);
      }
    }

    modes.forEach(function (mode) {
      var verdict = availabilityByModeId[mode.id] || { modeId: mode.id, available: false, cause: null };
      // Exact id match is not enough: a stale/blocked mode never gets
      // marked, and there is no fallback to another card when it isn't.
      var isLastUsed = mode.id === lastMode && !!verdict.available;
      var built = buildCard(doc, mode, verdict, strings, isLastUsed, {
        onSelect: handleSelect,
        onBlocked: handleBlocked,
      });
      cards[mode.id] = built;
      grid.appendChild(built.cell);
    });

    root.appendChild(backButton);
    root.appendChild(title);
    root.appendChild(grid);
    container.appendChild(root);

    if (logService) {
      logService.logSelectorOpen();
    }
    // TRIOFSND-318: apertura del selector, tallied once per render call --
    // exactly once per time the illustrated mode selector is actually shown.
    if (diagnostics) {
      diagnostics.incrementCounter('selectorOpen');
    }

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      backButton: backButton,
      title: title,
      grid: grid,
      cards: Object.keys(cards).reduce(function (acc, modeId) {
        acc[modeId] = cards[modeId].button;
        return acc;
      }, {}),
    };
  }

  var api = {
    MODE_ILLUSTRATION_SRCS: MODE_ILLUSTRATION_SRCS,
    renderModeSelectorScreen: renderModeSelectorScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderModeSelectorScreen = renderModeSelectorScreen;
  }
})();
