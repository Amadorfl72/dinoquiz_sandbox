'use strict';

/**
 * Diagnostics screen ("Diagnóstico técnico", TRIOFSND-319): an adult/QA-only
 * view of the aggregated counters and local technical health already
 * recorded on this device -- never a single player's name, answer or
 * selection (PRD "ningún dato generado por el jugador puede salir del
 * dispositivo"). Reachable only via the hidden `#/diagnostico` hash route
 * (see public/scripts/main.js, same pattern as `PRIVACY_POLICY_HASH`) --
 * there is no visible link to it from Home or the mode selector.
 *
 * Data sources, all local-only:
 *  - src/services/diagnostics.js (`getCounters`/`getErrors`) for the
 *    aggregated per-mode counters and the recent structured error codes
 *    (date/mode/category/code -- never the round content).
 *  - public/scripts/offlineStatus.js (`getSwVersion`/`getLastPreloadAt`) for
 *    the cache version and the last full precache completion mark.
 *  - public/scripts/modesCatalog.js (`evaluateModes`) for per-mode resource
 *    availability, the same evaluator the mode selector already uses.
 *  - `navigator.serviceWorker` for whether a service worker currently
 *    controls this page.
 *
 * Same self-resolving pattern as public/scripts/modeSelectorScreen.js: every
 * data source above is read live via a `resolveX()` helper (require under
 * Node/Jest, `window.DinoQuiz` in the real no-bundler browser), and every
 * one of them can be overridden through `options` so tests exercise the
 * rendering with plain fixtures instead of the real services.
 *
 * Accessibility: the heading receives focus on mount (mirrors
 * privacyPolicyScreen.js) so screen readers announce the new view
 * immediately; every value is a real text node (status words, not color
 * alone), and every interactive control -- the back button and the two
 * maintenance actions below -- is a plain `<button>` with an accessible
 * name, reachable and activatable by keyboard like every other screen in
 * this app.
 *
 * Maintenance actions (TRIOFSND-320):
 *  - "Borrar datos de diagnóstico" asks for confirmation inline before
 *    calling `diagnostics.resetDiagnostics()`; it never touches a mode's
 *    progress/unlock/session keys (see that function's own doc comment),
 *    only this module's own counters/errors/retention.
 *  - "Exportar resumen técnico" only ever runs from this explicit adult
 *    click -- there is no automatic/background export anywhere in this
 *    file. It asks `diagnostics.buildExportSummary()` for a single
 *    aggregated, non-identifiable snapshot (counts only, no name, no
 *    per-round answer, no free text) and hands it to the adult locally --
 *    clipboard first, falling back to a same-device file download -- with
 *    no network request of any kind.
 *
 * Restauraciones fallidas (TRIOFSND-301, PRD "Diagnóstico y métricas
 * agregadas almacenadas únicamente en el dispositivo"): a dedicated section
 * sourced from `LogService#getRestoreDiscardCount`/`getRestoreDiscardDiagnostics`
 * (public/scripts/logging.js, resolved live the same dual CommonJS/
 * `window.DinoQuiz` way as every other data source above) shows the
 * aggregated number of in-progress rounds GameSessionStorage.js's
 * `restoreSession` had to discard on reload, the same recent-codes table
 * shape as the generic errors section (date/mode/category/code, most recent
 * first), and the schema version this build currently expects
 * (src/services/storage/types.js's `MODE_STATE_SCHEMA_VERSION`) so a
 * mismatch against a shown discard's own `schemaVersion` is visible at a
 * glance -- never the discarded round's own content.
 */

(function () {
  var MAX_DISPLAYED_ERRORS = 50;

  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).diagnostics;
    }
    return null;
  }

  function resolveDefaultModesStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).modes;
    }
    return null;
  }

  function resolveDiagnosticsService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.diagnostics) {
      return win.DinoQuiz.services.diagnostics;
    }
    if (typeof require === 'function') {
      return require('./diagnostics');
    }
    return null;
  }

  function resolveOfflineStatusService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.offlineStatus) {
      return win.DinoQuiz.services.offlineStatus;
    }
    if (typeof require === 'function') {
      return require('./offlineStatus');
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

  /** 'active' (a service worker currently controls this page), 'inactive' (registered but not controlling) or 'unsupported' (no Service Worker API at all). */
  function resolveServiceWorkerStatus(nav) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
    if (!nav || !('serviceWorker' in nav)) {
      return 'unsupported';
    }
    return nav.serviceWorker.controller ? 'active' : 'inactive';
  }

  function resolveCounters(options, diagnosticsService) {
    if (options.counters) {
      return options.counters;
    }
    if (diagnosticsService && typeof diagnosticsService.getCounters === 'function') {
      return diagnosticsService.getCounters();
    }
    return {};
  }

  function resolveErrors(options, diagnosticsService) {
    if (options.errors) {
      return options.errors;
    }
    if (diagnosticsService && typeof diagnosticsService.getErrors === 'function') {
      return diagnosticsService.getErrors();
    }
    return [];
  }

  /**
   * Resolves a ready-to-read LogService instance, following the same dual
   * CommonJS/global pattern as main.js's own `resolveLogger`: the browser
   * loads logging.js as a plain `<script>` and exposes it on
   * `window.DinoQuiz.services.logging`; Node/Jest requires it directly. A
   * fresh instance always reflects this device's current localStorage state.
   */
  function resolveLogService(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var LogServiceCtor =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.logging && win.DinoQuiz.services.logging.LogService) ||
      (typeof require === 'function' ? require('./logging').LogService : undefined);
    if (typeof LogServiceCtor !== 'function') {
      return null;
    }
    return new LogServiceCtor();
  }

  /** `options.restoreDiscardCount` short-circuits (what tests use); otherwise reads LogService's own aggregated count live. */
  function resolveRestoreDiscardCount(options, logService) {
    if (typeof options.restoreDiscardCount !== 'undefined') {
      return options.restoreDiscardCount;
    }
    return logService && typeof logService.getRestoreDiscardCount === 'function' ? logService.getRestoreDiscardCount() : 0;
  }

  /** `options.restoreDiscardEntries` short-circuits (what tests use); otherwise reads LogService's own structured log live. */
  function resolveRestoreDiscardEntries(options, logService) {
    if (Array.isArray(options.restoreDiscardEntries)) {
      return options.restoreDiscardEntries;
    }
    return logService && typeof logService.getRestoreDiscardDiagnostics === 'function' ? logService.getRestoreDiscardDiagnostics() : [];
  }

  /** The schema version this build currently expects (src/services/storage/types.js's MODE_STATE_SCHEMA_VERSION), never a locally re-derived value. `options.schemaVersion` short-circuits for tests. */
  function resolveSchemaVersion(options) {
    if (typeof options.schemaVersion !== 'undefined') {
      return options.schemaVersion;
    }
    if (typeof require === 'function') {
      try {
        return require('../../src/services/storage/types').MODE_STATE_SCHEMA_VERSION;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function resolveSwVersion(options, offlineStatusService) {
    if (typeof options.swVersion !== 'undefined') {
      return options.swVersion;
    }
    if (offlineStatusService && typeof offlineStatusService.getSwVersion === 'function') {
      return offlineStatusService.getSwVersion();
    }
    return null;
  }

  function resolveLastPreloadAt(options, offlineStatusService) {
    if (typeof options.lastPreloadAt !== 'undefined') {
      return options.lastPreloadAt;
    }
    if (offlineStatusService && typeof offlineStatusService.getLastPreloadAt === 'function') {
      return offlineStatusService.getLastPreloadAt();
    }
    return null;
  }

  /** Mirrors modeSelectorScreen.js's own `resolveAvailability`: `options.resourceAvailability` short-circuits everything else (what tests use), otherwise evaluates the live resource catalog. */
  function resolveResourceAvailability(options, modesCatalog) {
    if (Array.isArray(options.resourceAvailability)) {
      return options.resourceAvailability;
    }
    if (!modesCatalog) {
      return [];
    }
    var catalog = options.resourceCatalog || modesCatalog.buildCurrentResourceCatalog();
    var modes = options.modes || modesCatalog.MODES_CATALOG;
    return modesCatalog.evaluateModes(catalog, modes);
  }

  /**
   * Splits the opaque counter names diagnostics.js stores (see that
   * module's own doc comment, e.g. `gameStarted:parejas`,
   * `gamesByModeLevel:parejas:2`, or mode-less names like `selectorOpen`)
   * into a per-mode bucket (keyed by the segment right after the first
   * `:`, when it names a known mode) plus a `general` bucket for
   * everything else. Never mutates `counters`; returns buckets sorted by
   * counter name for a stable, deterministic render.
   */
  function groupCountersByMode(counters, modeIds) {
    var byMode = {};
    modeIds.forEach(function (modeId) {
      byMode[modeId] = [];
    });
    var general = [];

    Object.keys(counters)
      .sort()
      .forEach(function (key) {
        var value = counters[key];
        var parts = key.split(':');
        var modeId = parts.length > 1 ? parts[1] : null;
        if (modeId && Object.prototype.hasOwnProperty.call(byMode, modeId)) {
          var rest = parts.length > 2 ? ':' + parts.slice(2).join(':') : '';
          byMode[modeId].push({ key: key, label: parts[0] + rest, value: value });
        } else {
          general.push({ key: key, label: key, value: value });
        }
      });

    return { byMode: byMode, general: general };
  }

  function formatLocalTimestamp(isoString) {
    if (typeof isoString !== 'string' || isoString.length === 0) {
      return null;
    }
    var date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString();
  }

  function renderDefinitionRow(doc, dl, term, description) {
    var dt = doc.createElement('dt');
    dt.textContent = term;
    var dd = doc.createElement('dd');
    dd.textContent = description;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function renderHealthSection(doc, strings, health) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-health-heading';
    heading.textContent = strings.health.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var dl = doc.createElement('dl');
    dl.className = 'diagnostics-screen__definition-list';

    renderDefinitionRow(
      doc,
      dl,
      strings.health.serviceWorkerLabel,
      strings.health.serviceWorkerStatus[health.serviceWorkerStatus] || strings.health.unknownValue
    );
    renderDefinitionRow(doc, dl, strings.health.cacheVersionLabel, health.swVersion || strings.health.unknownValue);
    renderDefinitionRow(
      doc,
      dl,
      strings.health.lastPreloadLabel,
      formatLocalTimestamp(health.lastPreloadAt) || strings.health.unknownValue
    );

    section.appendChild(dl);
    return section;
  }

  function renderResourceAvailabilitySection(doc, strings, availability, modesNames) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-availability-heading';
    heading.textContent = strings.resourceAvailability.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var list = doc.createElement('ul');
    list.className = 'diagnostics-screen__availability-list';

    availability.forEach(function (verdict) {
      var item = doc.createElement('li');
      item.className = verdict.available
        ? 'diagnostics-screen__availability-item diagnostics-screen__availability-item--available'
        : 'diagnostics-screen__availability-item diagnostics-screen__availability-item--blocked';

      var name = doc.createElement('span');
      name.className = 'diagnostics-screen__availability-name';
      name.textContent = (modesNames && modesNames[verdict.modeId]) || verdict.modeId;
      item.appendChild(name);

      var status = doc.createElement('span');
      status.className = 'diagnostics-screen__availability-status';
      status.textContent = verdict.available
        ? strings.resourceAvailability.statusAvailable
        : strings.resourceAvailability.statusBlocked;
      item.appendChild(status);

      if (!verdict.available) {
        var reason = doc.createElement('span');
        reason.className = 'diagnostics-screen__availability-reason';
        reason.textContent =
          strings.resourceAvailability.blockedReasons[verdict.cause] || strings.resourceAvailability.unknownReason;
        item.appendChild(reason);
      }

      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  function renderCounterGroup(doc, headingText, headingId, entries) {
    var group = doc.createElement('div');
    group.className = 'diagnostics-screen__counter-group';

    var heading = doc.createElement('h3');
    heading.id = headingId;
    heading.textContent = headingText;
    group.appendChild(heading);

    var dl = doc.createElement('dl');
    dl.className = 'diagnostics-screen__definition-list';
    dl.setAttribute('aria-labelledby', headingId);
    entries.forEach(function (entry) {
      renderDefinitionRow(doc, dl, entry.label, String(entry.value));
    });
    group.appendChild(dl);

    return group;
  }

  function renderCountersSection(doc, strings, grouped, modeIds, modesNames) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-counters-heading';
    heading.textContent = strings.counters.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var modeIdsWithCounters = modeIds.filter(function (modeId) {
      return grouped.byMode[modeId].length > 0;
    });

    if (modeIdsWithCounters.length === 0 && grouped.general.length === 0) {
      var empty = doc.createElement('p');
      empty.textContent = strings.counters.emptyMessage;
      section.appendChild(empty);
      return section;
    }

    modeIdsWithCounters.forEach(function (modeId) {
      var headingText = (modesNames && modesNames[modeId]) || modeId;
      section.appendChild(
        renderCounterGroup(doc, headingText, 'diagnostics-counters-' + modeId + '-heading', grouped.byMode[modeId])
      );
    });

    if (grouped.general.length > 0) {
      section.appendChild(
        renderCounterGroup(doc, strings.counters.generalHeading, 'diagnostics-counters-general-heading', grouped.general)
      );
    }

    return section;
  }

  function renderErrorsSection(doc, strings, errors) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-errors-heading';
    heading.textContent = strings.errors.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    if (errors.length === 0) {
      var empty = doc.createElement('p');
      empty.textContent = strings.errors.emptyMessage;
      section.appendChild(empty);
      return section;
    }

    // Most recent first: diagnostics.js appends in chronological order, and
    // "recientes" (recent) reads top-to-bottom as newest-to-oldest.
    var mostRecentFirst = errors.slice().reverse();
    var shown = mostRecentFirst.slice(0, MAX_DISPLAYED_ERRORS);

    var table = doc.createElement('table');
    table.className = 'diagnostics-screen__errors-table';
    table.setAttribute('aria-labelledby', heading.id);

    var thead = doc.createElement('thead');
    var headRow = doc.createElement('tr');
    [strings.errors.columns.date, strings.errors.columns.mode, strings.errors.columns.category, strings.errors.columns.code].forEach(
      function (columnLabel) {
        var th = doc.createElement('th');
        th.scope = 'col';
        th.textContent = columnLabel;
        headRow.appendChild(th);
      }
    );
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = doc.createElement('tbody');
    shown.forEach(function (entry) {
      var row = doc.createElement('tr');
      [entry.date, entry.mode, entry.category, entry.code].forEach(function (cellValue) {
        var td = doc.createElement('td');
        td.textContent = cellValue;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    section.appendChild(table);

    if (mostRecentFirst.length > shown.length) {
      var note = doc.createElement('p');
      note.className = 'diagnostics-screen__errors-truncated-note';
      note.textContent = strings.errors.truncatedNote
        .replace('{shown}', String(shown.length))
        .replace('{total}', String(mostRecentFirst.length));
      section.appendChild(note);
    }

    return section;
  }

  /**
   * "Restauraciones fallidas" (TRIOFSND-301): the aggregated discard count
   * and the schema version this build expects (a definition list, same
   * shape as the health section above), then the same recent-codes table
   * shape as `renderErrorsSection` (date/mode/category/code, most recent
   * first) fed from LogService's own restore-discard log instead of
   * diagnostics.js's generic errors -- never the discarded round's content.
   */
  function renderRestoreDiagnosticsSection(doc, strings, restoreDiagnostics) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-restore-diagnostics-heading';
    heading.textContent = strings.restoreDiagnostics.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    var dl = doc.createElement('dl');
    dl.className = 'diagnostics-screen__definition-list';
    renderDefinitionRow(doc, dl, strings.restoreDiagnostics.countLabel, String(restoreDiagnostics.count));
    renderDefinitionRow(
      doc,
      dl,
      strings.restoreDiagnostics.schemaVersionLabel,
      restoreDiagnostics.schemaVersion !== null && restoreDiagnostics.schemaVersion !== undefined
        ? String(restoreDiagnostics.schemaVersion)
        : strings.restoreDiagnostics.unknownValue
    );
    section.appendChild(dl);

    var entries = restoreDiagnostics.entries;
    if (entries.length === 0) {
      var empty = doc.createElement('p');
      empty.textContent = strings.restoreDiagnostics.emptyMessage;
      section.appendChild(empty);
      return section;
    }

    // Most recent first: logging.js appends in chronological order, and
    // "recientes" (recent) reads top-to-bottom as newest-to-oldest.
    var mostRecentFirst = entries.slice().reverse();
    var shown = mostRecentFirst.slice(0, MAX_DISPLAYED_ERRORS);

    var table = doc.createElement('table');
    table.className = 'diagnostics-screen__restore-diagnostics-table';
    table.setAttribute('aria-labelledby', heading.id);

    var thead = doc.createElement('thead');
    var headRow = doc.createElement('tr');
    [
      strings.restoreDiagnostics.columns.date,
      strings.restoreDiagnostics.columns.mode,
      strings.restoreDiagnostics.columns.category,
      strings.restoreDiagnostics.columns.code,
    ].forEach(function (columnLabel) {
      var th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = columnLabel;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = doc.createElement('tbody');
    shown.forEach(function (entry) {
      var row = doc.createElement('tr');
      var categoryLabel = (strings.restoreDiagnostics.categories && strings.restoreDiagnostics.categories[entry.category]) || entry.category;
      [entry.date, entry.mode, categoryLabel, entry.code].forEach(function (cellValue) {
        var td = doc.createElement('td');
        td.textContent = cellValue;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    section.appendChild(table);

    if (mostRecentFirst.length > shown.length) {
      var note = doc.createElement('p');
      note.className = 'diagnostics-screen__restore-diagnostics-truncated-note';
      note.textContent = strings.restoreDiagnostics.truncatedNote
        .replace('{shown}', String(shown.length))
        .replace('{total}', String(mostRecentFirst.length));
      section.appendChild(note);
    }

    return section;
  }

  /** Default clipboard delivery: `navigator.clipboard.writeText`, rejecting when the API isn't available (older/insecure-context browsers) so the caller falls back to a download. */
  function defaultCopyToClipboard(text, win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('clipboard unavailable'));
  }

  /** Default same-device file delivery: a `Blob` + object URL fed to a throwaway, never-appended-visibly `<a download>` -- no network request. Returns whether it could run at all (`Blob`/`URL.createObjectURL` missing counts as failure, not a throw). */
  function defaultDownloadFile(text, filename, doc) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    if (!doc || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return false;
    }
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * The two maintenance actions (TRIOFSND-320): delete-with-confirmation and
   * manual export. Built once per render and wired up by the caller, which
   * owns the actual `resetDiagnostics`/`buildExportSummary` calls and the
   * counters/errors refresh afterwards -- this function only builds the DOM
   * and exposes the nodes/buttons the caller needs.
   */
  function renderActionsSection(doc, strings) {
    var section = doc.createElement('section');
    section.className = 'diagnostics-screen__section';

    var heading = doc.createElement('h2');
    heading.id = 'diagnostics-actions-heading';
    heading.textContent = strings.actions.heading;
    section.setAttribute('aria-labelledby', heading.id);
    section.appendChild(heading);

    // Delete, with an inline confirmation step -- the confirm block starts
    // hidden and swaps places with the plain reset button, it never deletes
    // on the first click.
    var resetGroup = doc.createElement('div');
    resetGroup.className = 'diagnostics-screen__action-group';

    var resetButton = doc.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'diagnostics-screen__reset-button';
    resetButton.textContent = strings.actions.resetButtonLabel;

    var resetConfirm = doc.createElement('div');
    resetConfirm.className = 'diagnostics-screen__reset-confirm';
    resetConfirm.setAttribute('aria-live', 'polite');
    resetConfirm.hidden = true;

    var resetConfirmMessage = doc.createElement('p');
    resetConfirmMessage.className = 'diagnostics-screen__reset-confirm-message';
    resetConfirmMessage.textContent = strings.actions.resetConfirmMessage;

    var resetConfirmActions = doc.createElement('div');
    resetConfirmActions.className = 'diagnostics-screen__reset-confirm-actions';

    var resetCancelButton = doc.createElement('button');
    resetCancelButton.type = 'button';
    resetCancelButton.className = 'diagnostics-screen__reset-cancel-button';
    resetCancelButton.textContent = strings.actions.resetCancelButtonLabel;

    var resetConfirmButton = doc.createElement('button');
    resetConfirmButton.type = 'button';
    resetConfirmButton.className = 'diagnostics-screen__reset-confirm-button';
    resetConfirmButton.textContent = strings.actions.resetConfirmButtonLabel;

    resetConfirmActions.appendChild(resetCancelButton);
    resetConfirmActions.appendChild(resetConfirmButton);
    resetConfirm.appendChild(resetConfirmMessage);
    resetConfirm.appendChild(resetConfirmActions);

    var resetStatus = doc.createElement('p');
    resetStatus.className = 'diagnostics-screen__action-status';
    resetStatus.setAttribute('aria-live', 'polite');

    resetGroup.appendChild(resetButton);
    resetGroup.appendChild(resetConfirm);
    resetGroup.appendChild(resetStatus);

    // Manual export -- only ever runs from this button's own click handler.
    var exportGroup = doc.createElement('div');
    exportGroup.className = 'diagnostics-screen__action-group';

    var exportButton = doc.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'diagnostics-screen__export-button';
    exportButton.textContent = strings.actions.exportButtonLabel;

    var exportStatus = doc.createElement('p');
    exportStatus.className = 'diagnostics-screen__action-status';
    exportStatus.setAttribute('aria-live', 'polite');

    exportGroup.appendChild(exportButton);
    exportGroup.appendChild(exportStatus);

    section.appendChild(resetGroup);
    section.appendChild(exportGroup);

    return {
      section: section,
      resetButton: resetButton,
      resetConfirm: resetConfirm,
      resetCancelButton: resetCancelButton,
      resetConfirmButton: resetConfirmButton,
      resetStatus: resetStatus,
      exportButton: exportButton,
      exportStatus: exportStatus,
    };
  }

  function renderDiagnosticsScreen(container, options) {
    options = options || {};
    var doc = container.ownerDocument || (typeof document !== 'undefined' ? document : undefined);
    var strings = options.strings || resolveDefaultStrings(options.locale);
    var modesStrings = options.modesStrings || resolveDefaultModesStrings(options.locale);
    var modesNames = {};
    Object.keys(modesStrings || {}).forEach(function (modeId) {
      modesNames[modeId] = modesStrings[modeId].name;
    });

    var diagnosticsService = options.diagnosticsService || resolveDiagnosticsService();
    var offlineStatusService = options.offlineStatusService || resolveOfflineStatusService();
    var modesCatalog = options.modesCatalog || resolveModesCatalog();
    var logService = options.logService || resolveLogService();

    var counters = resolveCounters(options, diagnosticsService);
    var errors = resolveErrors(options, diagnosticsService);
    var restoreDiagnostics = {
      count: resolveRestoreDiscardCount(options, logService),
      entries: resolveRestoreDiscardEntries(options, logService),
      schemaVersion: resolveSchemaVersion(options),
    };
    var health = {
      serviceWorkerStatus: options.serviceWorkerStatus || resolveServiceWorkerStatus(options.navigator),
      swVersion: resolveSwVersion(options, offlineStatusService),
      lastPreloadAt: resolveLastPreloadAt(options, offlineStatusService),
    };
    var availability = resolveResourceAvailability(options, modesCatalog);
    var modeIds = (modesCatalog && modesCatalog.MODE_IDS && Object.keys(modesCatalog.MODE_IDS).map(function (key) {
      return modesCatalog.MODE_IDS[key];
    })) || [];
    var grouped = groupCountersByMode(counters, modeIds);

    container.innerHTML = '';

    var root = doc.createElement('div');
    root.className = 'diagnostics-screen';

    var backButton = doc.createElement('button');
    backButton.type = 'button';
    backButton.className = 'diagnostics-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    if (typeof options.onBack === 'function') {
      backButton.addEventListener('click', options.onBack);
    }

    var title = doc.createElement('h1');
    title.className = 'diagnostics-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var intro = doc.createElement('p');
    intro.className = 'diagnostics-screen__intro';
    intro.textContent = strings.intro;

    var countersSection = renderCountersSection(doc, strings, grouped, modeIds, modesNames);
    var errorsSection = renderErrorsSection(doc, strings, errors);
    var restoreDiagnosticsSection = renderRestoreDiagnosticsSection(doc, strings, restoreDiagnostics);
    var actions = renderActionsSection(doc, strings);

    root.appendChild(backButton);
    root.appendChild(title);
    root.appendChild(intro);
    root.appendChild(renderHealthSection(doc, strings, health));
    root.appendChild(renderResourceAvailabilitySection(doc, strings, availability, modesNames));
    root.appendChild(countersSection);
    root.appendChild(errorsSection);
    root.appendChild(restoreDiagnosticsSection);
    root.appendChild(actions.section);

    // Re-reads the live counters/errors (never `options.counters`/
    // `options.errors`, which are only ever a fixed test fixture) and
    // replaces the two sections above in place -- used after a confirmed
    // reset so the screen reflects the data it just cleared.
    function refreshCountersAndErrors() {
      var freshCounters =
        diagnosticsService && typeof diagnosticsService.getCounters === 'function' ? diagnosticsService.getCounters() : {};
      var freshErrors =
        diagnosticsService && typeof diagnosticsService.getErrors === 'function' ? diagnosticsService.getErrors() : [];
      var freshGrouped = groupCountersByMode(freshCounters, modeIds);

      var newCountersSection = renderCountersSection(doc, strings, freshGrouped, modeIds, modesNames);
      root.replaceChild(newCountersSection, countersSection);
      countersSection = newCountersSection;

      var newErrorsSection = renderErrorsSection(doc, strings, freshErrors);
      root.replaceChild(newErrorsSection, errorsSection);
      errorsSection = newErrorsSection;
    }

    function showResetButton() {
      actions.resetConfirm.hidden = true;
      actions.resetButton.hidden = false;
      if (typeof actions.resetButton.focus === 'function') {
        actions.resetButton.focus();
      }
    }

    actions.resetButton.addEventListener('click', function () {
      actions.resetStatus.textContent = '';
      actions.resetButton.hidden = true;
      actions.resetConfirm.hidden = false;
      if (typeof actions.resetCancelButton.focus === 'function') {
        actions.resetCancelButton.focus();
      }
    });

    actions.resetCancelButton.addEventListener('click', function () {
      showResetButton();
    });

    actions.resetConfirmButton.addEventListener('click', function () {
      if (diagnosticsService && typeof diagnosticsService.resetDiagnostics === 'function') {
        diagnosticsService.resetDiagnostics();
      }
      showResetButton();
      refreshCountersAndErrors();
      actions.resetStatus.textContent = strings.actions.resetSuccessMessage;
    });

    actions.exportButton.addEventListener('click', function () {
      var summary =
        diagnosticsService && typeof diagnosticsService.buildExportSummary === 'function'
          ? diagnosticsService.buildExportSummary()
          : {};
      var text = JSON.stringify(summary, null, 2);
      var filename = 'dinoquiz-diagnostico.json';
      var copyToClipboard = options.copyToClipboard || defaultCopyToClipboard;
      var downloadFile = options.downloadFile || defaultDownloadFile;

      actions.exportStatus.textContent = '';
      Promise.resolve()
        .then(function () {
          return copyToClipboard(text);
        })
        .then(function () {
          actions.exportStatus.textContent = strings.actions.exportCopiedMessage;
        })
        .catch(function () {
          var downloaded = downloadFile(text, filename, doc);
          actions.exportStatus.textContent = downloaded
            ? strings.actions.exportDownloadedMessage
            : strings.actions.exportFailedMessage;
        });
    });

    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      backButton: backButton,
      title: title,
      resetButton: actions.resetButton,
      resetConfirm: actions.resetConfirm,
      resetCancelButton: actions.resetCancelButton,
      resetConfirmButton: actions.resetConfirmButton,
      resetStatus: actions.resetStatus,
      exportButton: actions.exportButton,
      exportStatus: actions.exportStatus,
    };
  }

  var api = {
    renderDiagnosticsScreen: renderDiagnosticsScreen,
    groupCountersByMode: groupCountersByMode,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderDiagnosticsScreen = renderDiagnosticsScreen;
  }
})();
