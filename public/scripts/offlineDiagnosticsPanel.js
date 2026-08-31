'use strict';

/**
 * Offline status diagnostics panel (TRIOFSND-307, PRD "Conservar
 * funcionamiento offline completo ... privacidad local").
 *
 * Purely local observability screen: it reads two already-local-only
 * sources and renders what they report, computing/sending nothing over the
 * network itself --
 *  - public/scripts/offlineStatus.js's `dinoquiz:swVersion`/
 *    `dinoquiz:lastPreloadAt` (which service worker version last finished
 *    precaching, and when), and
 *  - src/services/modeResourceValidation.js's `validateModeResources`, run
 *    once per public/scripts/modesCatalog.js mode id, to build a per-mode
 *    matrix of which declared resources `caches.match` cannot currently
 *    find.
 * Every value shown already lives in this device's localStorage/Cache
 * Storage; this module adds no new persistence and makes no `fetch`/XHR
 * calls of its own -- see modeResourceValidation.js's own doc comment for
 * why its misses are tallied locally (`logModeResourceMissing`) and never
 * transmitted.
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as modeBlockedScreen.js -- registers on
 * `window.DinoQuiz.screens.offlineDiagnosticsPanel`; the canonical
 * `src/screens/OfflineDiagnosticsPanel.js` re-exports it for Node/Jest.
 *
 * `validateModeResources` itself is a plain CommonJS module (it is only
 * ever required from Node/Jest today, see its own doc comment) -- under a
 * real no-bundler browser `require` does not exist, so
 * `resolveValidateModeResources` below mirrors logging.js's own
 * `resolveScoring`: try `require` first (Node/Jest), otherwise fall back to
 * `window.DinoQuiz.services.modeResourceValidation` (unset today, since no
 * caller has wired that bridge yet), and degrade every mode's row to
 * "no se pudo comprobar" rather than throwing when neither is available --
 * this panel must never crash the page it is diagnosing.
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE);
    }
    return null;
  }

  function resolveStrings(options) {
    if (options.strings) {
      return options.strings;
    }
    var allStrings = resolveDefaultStrings(options.locale);
    return allStrings ? allStrings.offlineDiagnostics : null;
  }

  function resolveModeLabel(allStrings, modeId) {
    return (allStrings && allStrings.modes && allStrings.modes[modeId] && allStrings.modes[modeId].name) || modeId;
  }

  function resolveOfflineStatus(options) {
    if (options.offlineStatus) {
      return options.offlineStatus;
    }
    if (typeof require === 'function') {
      try {
        return require('../../src/services/offlineStatus');
      } catch (error) {
        return null;
      }
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.offlineStatus) || null;
  }

  function resolveValidateModeResources(options) {
    if (options.validateModeResources) {
      return options.validateModeResources;
    }
    if (typeof require === 'function') {
      try {
        return require('../../src/services/modeResourceValidation').validateModeResources;
      } catch (error) {
        return null;
      }
    }
    var service = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.modeResourceValidation) || null;
    return service ? service.validateModeResources : null;
  }

  function resolveModeIds(options) {
    if (Array.isArray(options.modeIds)) {
      return options.modeIds;
    }
    if (typeof require === 'function') {
      try {
        return Object.values(require('../../src/game/modesCatalog').MODE_IDS);
      } catch (error) {
        return [];
      }
    }
    var catalog = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.modesCatalog) || null;
    return catalog ? Object.values(catalog.MODE_IDS) : [];
  }

  function formatTemplate(template, values) {
    if (typeof template !== 'string') {
      return '';
    }
    return Object.keys(values || {}).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  function renderSwStateSection(strings, offlineStatusService, storageAdapter) {
    var section = document.createElement('section');
    section.className = 'offline-diagnostics-panel__sw-state';
    section.setAttribute('aria-labelledby', 'offline-diagnostics-sw-state-heading');

    var heading = document.createElement('h2');
    heading.id = 'offline-diagnostics-sw-state-heading';
    heading.textContent = strings.swState.heading;
    section.appendChild(heading);

    var swVersion = offlineStatusService ? offlineStatusService.getSwVersion(storageAdapter) : null;
    var lastPreloadAt = offlineStatusService ? offlineStatusService.getLastPreloadAt(storageAdapter) : null;

    var list = document.createElement('dl');
    list.className = 'offline-diagnostics-panel__sw-state-list';

    var versionTerm = document.createElement('dt');
    versionTerm.textContent = strings.swState.versionLabel;
    var versionValue = document.createElement('dd');
    versionValue.className = 'offline-diagnostics-panel__sw-version';
    versionValue.textContent = swVersion || strings.swState.notAvailableText;

    var preloadTerm = document.createElement('dt');
    preloadTerm.textContent = strings.swState.lastPreloadLabel;
    var preloadValue = document.createElement('dd');
    preloadValue.className = 'offline-diagnostics-panel__last-preload';
    preloadValue.textContent = lastPreloadAt || strings.swState.notAvailableText;

    list.appendChild(versionTerm);
    list.appendChild(versionValue);
    list.appendChild(preloadTerm);
    list.appendChild(preloadValue);
    section.appendChild(list);

    return { section: section, versionValue: versionValue, preloadValue: preloadValue };
  }

  function renderModeRow(strings, allStrings, modeId) {
    var row = document.createElement('tr');
    row.className = 'offline-diagnostics-panel__mode-row';
    row.dataset.modeId = modeId;

    var modeCell = document.createElement('th');
    modeCell.scope = 'row';
    modeCell.textContent = resolveModeLabel(allStrings, modeId);

    var statusCell = document.createElement('td');
    statusCell.className = 'offline-diagnostics-panel__status-cell';
    statusCell.setAttribute('role', 'status');
    statusCell.setAttribute('aria-live', 'polite');
    statusCell.textContent = strings.modeMatrix.checkingText;

    row.appendChild(modeCell);
    row.appendChild(statusCell);

    return { row: row, statusCell: statusCell };
  }

  function applyModeResult(strings, statusCell, missing) {
    statusCell.innerHTML = '';

    if (missing === null) {
      statusCell.textContent = strings.modeMatrix.statusUnavailableText;
      return;
    }

    if (missing.length === 0) {
      statusCell.textContent = strings.modeMatrix.statusOkText;
      return;
    }

    var summary = document.createElement('p');
    summary.className = 'offline-diagnostics-panel__status-summary';
    summary.textContent = formatTemplate(strings.modeMatrix.statusMissingFormat, { count: missing.length });
    statusCell.appendChild(summary);

    var missingLabel = document.createElement('p');
    missingLabel.className = 'offline-diagnostics-panel__missing-label';
    missingLabel.textContent = strings.modeMatrix.missingResourcesLabel;
    statusCell.appendChild(missingLabel);

    var missingList = document.createElement('ul');
    missingList.className = 'offline-diagnostics-panel__missing-list';
    missing.forEach(function (url) {
      var item = document.createElement('li');
      item.textContent = url;
      missingList.appendChild(item);
    });
    statusCell.appendChild(missingList);
  }

  /**
   * Renders the panel into `container` and kicks off one
   * `validateModeResources` call per mode id. Returns synchronously (the SW
   * state section and a "Comprobando…" row per mode are visible
   * immediately); `result.readyPromise` resolves once every mode's row has
   * been updated with its real status, for callers/tests that need to wait
   * for the full local check to finish.
   */
  function renderOfflineDiagnosticsPanel(container, options) {
    options = options || {};
    var allStrings = options.allStrings || resolveDefaultStrings(options.locale);
    var strings = resolveStrings(options);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'offline-diagnostics-panel';

    var title = document.createElement('h1');
    title.className = 'offline-diagnostics-panel__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;
    root.appendChild(title);

    var intro = document.createElement('p');
    intro.className = 'offline-diagnostics-panel__intro';
    intro.textContent = strings.introText;
    root.appendChild(intro);

    var offlineStatusService = resolveOfflineStatus(options);
    var swStateResult = renderSwStateSection(strings, offlineStatusService, options.storageAdapter);
    root.appendChild(swStateResult.section);

    var matrixSection = document.createElement('section');
    matrixSection.className = 'offline-diagnostics-panel__mode-matrix';
    matrixSection.setAttribute('aria-labelledby', 'offline-diagnostics-mode-matrix-heading');

    var matrixHeading = document.createElement('h2');
    matrixHeading.id = 'offline-diagnostics-mode-matrix-heading';
    matrixHeading.textContent = strings.modeMatrix.heading;
    matrixSection.appendChild(matrixHeading);

    var table = document.createElement('table');
    table.className = 'offline-diagnostics-panel__mode-table';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    var modeHeader = document.createElement('th');
    modeHeader.scope = 'col';
    modeHeader.textContent = strings.modeMatrix.modeColumnLabel;
    var statusHeader = document.createElement('th');
    statusHeader.scope = 'col';
    statusHeader.textContent = strings.modeMatrix.statusColumnLabel;
    headRow.appendChild(modeHeader);
    headRow.appendChild(statusHeader);
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    table.appendChild(tbody);
    matrixSection.appendChild(table);
    root.appendChild(matrixSection);

    container.appendChild(root);

    var validateModeResources = resolveValidateModeResources(options);
    var modeIds = resolveModeIds(options);
    var rowByModeId = {};

    modeIds.forEach(function (modeId) {
      var rendered = renderModeRow(strings, allStrings, modeId);
      tbody.appendChild(rendered.row);
      rowByModeId[modeId] = rendered.statusCell;
    });

    var readyPromise = Promise.all(
      modeIds.map(function (modeId) {
        if (typeof validateModeResources !== 'function') {
          applyModeResult(strings, rowByModeId[modeId], null);
          return Promise.resolve();
        }
        return Promise.resolve(validateModeResources(modeId, options.validationOptions))
          .then(function (missing) {
            applyModeResult(strings, rowByModeId[modeId], missing);
          })
          .catch(function () {
            applyModeResult(strings, rowByModeId[modeId], null);
          });
      }),
    );

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      title: title,
      swVersionValue: swStateResult.versionValue,
      lastPreloadValue: swStateResult.preloadValue,
      table: table,
      rowByModeId: rowByModeId,
      readyPromise: readyPromise,
    };
  }

  var api = {
    renderOfflineDiagnosticsPanel: renderOfflineDiagnosticsPanel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderOfflineDiagnosticsPanel = renderOfflineDiagnosticsPanel;
    window.DinoQuiz.screens.offlineDiagnosticsPanel = api;
  }
})();
