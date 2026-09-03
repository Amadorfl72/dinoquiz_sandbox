'use strict';

/**
 * Hall of Fame ("Salón de la Fama") screen.
 *
 * Renders the on-device top-10 scores kept by
 * public/scripts/hallOfFameService.js as a table: rank, player name, score --
 * never more than MAX_ENTRIES rows, since that service already caps the
 * stored list at 10. All copy comes from the i18n `hallOfFame` resource --
 * no hardcoded UI strings here, matching every other screen's convention.
 *
 * Guest rows: hallOfFameService's documented no-name contract stores a game
 * finished without a name as `name: null` (never an empty string). This
 * screen renders that as the single, documented `strings.guestLabel` ("Jugador
 * invitado") instead of a blank cell, so a guest's row is always readable.
 *
 * Highlighting the just-finished game: entries have no explicit `id` field
 * (only `name`/`score`/`timestamp`), so `options.highlightEntryId` is matched
 * against each entry's own `timestamp` -- the value hallOfFameService.addEntry
 * was called with for that game, and the only field that uniquely identifies
 * one entry in the list. A fixture entry may also carry an explicit `id`
 * (checked first) so tests don't have to fabricate a timestamp.
 *
 * No-color-only signal (matches questionScreen.js's NEUTRAL_CLASS/
 * CORRECT_CLASS convention, which never relies on color alone): the matched
 * row gets a visibly distinct `--highlight` style AND a plain-text
 * `strings.highlightBadge` badge next to the player's name, so the highlight
 * still reads correctly for a colorblind or low-vision player and is exposed
 * to screen readers as ordinary text, not just a background color.
 *
 * Delete action: "Borrar Hall of Fame" never deletes on the first click --
 * it swaps in an inline confirm/cancel step (same pattern as
 * diagnosticsScreen.js's "Borrar datos de diagnóstico") before calling
 * `hallOfFameService.clearAll()`. The table section is rebuilt in place from
 * the fresh (now empty) list afterwards, so the screen falls back to the
 * empty-state message without a full re-render.
 *
 * 375px width, no horizontal scroll: main.css collapses the table into a
 * stacked/condensed layout at narrow widths (visually hidden header row,
 * each cell labelled via `data-label` + `::before`) instead of letting a
 * 3-column table force horizontal scrolling.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of public/scripts/resultsScreen.js/
 * questionScreen.js. It resolves its i18n strings from `options.strings`, or
 * `window.DinoQuiz.strings.hallOfFame` in the browser, or the `src/i18n`
 * loader under Node. It registers on
 * `window.DinoQuiz.screens.renderHallOfFameScreen`; the canonical
 * `src/screens/HallOfFameScreen.js` re-exports this file.
 */

(function () {
  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).hallOfFame;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.hallOfFame : null;
  }

  function resolveHallOfFameService(options, win) {
    options = options || {};
    if (options.hallOfFameService) {
      return options.hallOfFameService;
    }
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.hallOfFameService) {
      return win.DinoQuiz.services.hallOfFameService;
    }
    if (typeof require === 'function') {
      try {
        return require('./hallOfFameService');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Binds a control to fire `handler` on click AND on an Enter/Espacio
   * `keydown`, mirroring the same helper in resultsScreen.js/homeScreen.js.
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

  function resolveEntries(options, hallOfFameService) {
    if (Array.isArray(options.entries)) {
      return options.entries;
    }
    if (hallOfFameService && typeof hallOfFameService.getEntries === 'function') {
      return hallOfFameService.getEntries(options.storageAdapter);
    }
    return [];
  }

  /** The identifier used to match `options.highlightEntryId` -- an explicit `id` on the entry if present, else its `timestamp` (see module doc). */
  function entryIdentifier(entry) {
    return entry.id !== undefined ? entry.id : entry.timestamp;
  }

  function isHighlighted(entry, options) {
    return options.highlightEntryId !== undefined && entryIdentifier(entry) === options.highlightEntryId;
  }

  /** Builds the table (rank/player/score rows) shown while there is at least one entry. */
  function buildTable(doc, strings, entries, options) {
    var table = doc.createElement('table');
    table.className = 'hall-of-fame-screen__table';
    table.setAttribute('aria-label', strings.title);

    var thead = doc.createElement('thead');
    var headRow = doc.createElement('tr');
    [strings.columns.rank, strings.columns.player, strings.columns.score].forEach(function (label) {
      var th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    var tbody = doc.createElement('tbody');
    var rows = entries.map(function (entry, index) {
      var tr = doc.createElement('tr');
      tr.className = 'hall-of-fame-screen__row';

      var highlighted = isHighlighted(entry, options);
      if (highlighted) {
        tr.classList.add('hall-of-fame-screen__row--highlight');
      }

      var rankCell = doc.createElement('td');
      rankCell.setAttribute('data-label', strings.columns.rank);
      rankCell.textContent = String(index + 1);

      var nameCell = doc.createElement('td');
      nameCell.setAttribute('data-label', strings.columns.player);
      var nameText = entry.name === null ? strings.guestLabel : entry.name;
      nameCell.textContent = nameText;

      if (highlighted) {
        // Non-color cue (matches questionScreen.js's convention of never
        // relying on color alone): a plain-text badge, not just a background.
        var badge = doc.createElement('span');
        badge.className = 'hall-of-fame-screen__badge';
        badge.textContent = strings.highlightBadge;
        nameCell.appendChild(doc.createTextNode(' '));
        nameCell.appendChild(badge);
      }

      var scoreCell = doc.createElement('td');
      scoreCell.setAttribute('data-label', strings.columns.score);
      scoreCell.textContent = String(entry.score);

      tr.appendChild(rankCell);
      tr.appendChild(nameCell);
      tr.appendChild(scoreCell);
      tbody.appendChild(tr);

      return { tr: tr, entry: entry, highlighted: highlighted };
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return { table: table, rows: rows };
  }

  /**
   * Builds the whole body (table + delete action, or the empty-state
   * message) for the current `entries` list. Rebuilt wholesale after a
   * confirmed delete instead of patched in place, mirroring
   * diagnosticsScreen.js's `refreshCountersAndErrors`.
   */
  function buildBody(doc, strings, entries, options) {
    var body = doc.createElement('div');
    body.className = 'hall-of-fame-screen__body';

    if (entries.length === 0) {
      var empty = doc.createElement('p');
      empty.className = 'hall-of-fame-screen__empty';
      empty.textContent = strings.emptyMessage;
      body.appendChild(empty);
      return { body: body, table: null, rows: [] };
    }

    var built = buildTable(doc, strings, entries, options);
    body.appendChild(built.table);

    // Delete action, with an inline confirmation step -- the confirm block
    // starts hidden and swaps places with the plain delete button, it never
    // deletes on the first click (same pattern as diagnosticsScreen.js).
    var actionGroup = doc.createElement('div');
    actionGroup.className = 'hall-of-fame-screen__action-group';

    var deleteButton = doc.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'hall-of-fame-screen__delete-button';
    deleteButton.textContent = strings.deleteButtonLabel;

    var deleteConfirm = doc.createElement('div');
    deleteConfirm.className = 'hall-of-fame-screen__delete-confirm';
    deleteConfirm.setAttribute('aria-live', 'polite');
    deleteConfirm.hidden = true;

    var deleteConfirmMessage = doc.createElement('p');
    deleteConfirmMessage.className = 'hall-of-fame-screen__delete-confirm-message';
    deleteConfirmMessage.textContent = strings.deleteConfirmMessage;

    var deleteConfirmActions = doc.createElement('div');
    deleteConfirmActions.className = 'hall-of-fame-screen__delete-confirm-actions';

    var deleteCancelButton = doc.createElement('button');
    deleteCancelButton.type = 'button';
    deleteCancelButton.className = 'hall-of-fame-screen__delete-cancel-button';
    deleteCancelButton.textContent = strings.deleteCancelButtonLabel;

    var deleteConfirmButton = doc.createElement('button');
    deleteConfirmButton.type = 'button';
    deleteConfirmButton.className = 'hall-of-fame-screen__delete-confirm-button';
    deleteConfirmButton.textContent = strings.deleteConfirmButtonLabel;

    deleteConfirmActions.appendChild(deleteCancelButton);
    deleteConfirmActions.appendChild(deleteConfirmButton);
    deleteConfirm.appendChild(deleteConfirmMessage);
    deleteConfirm.appendChild(deleteConfirmActions);

    var deleteStatus = doc.createElement('p');
    deleteStatus.className = 'hall-of-fame-screen__delete-status';
    deleteStatus.setAttribute('aria-live', 'polite');

    actionGroup.appendChild(deleteButton);
    actionGroup.appendChild(deleteConfirm);
    actionGroup.appendChild(deleteStatus);
    body.appendChild(actionGroup);

    return {
      body: body,
      table: built.table,
      rows: built.rows,
      deleteButton: deleteButton,
      deleteConfirm: deleteConfirm,
      deleteCancelButton: deleteCancelButton,
      deleteConfirmButton: deleteConfirmButton,
      deleteStatus: deleteStatus,
    };
  }

  function renderHallOfFameScreen(container, options) {
    options = options || {};
    var doc = container.ownerDocument || (typeof document !== 'undefined' ? document : undefined);
    var strings = resolveStrings(options);
    var hallOfFameService = resolveHallOfFameService(options);

    container.innerHTML = '';

    var root = doc.createElement('div');
    root.className = 'hall-of-fame-screen';

    var heading = doc.createElement('h1');
    heading.className = 'hall-of-fame-screen__heading';
    heading.textContent = strings.title;
    heading.tabIndex = -1;

    var entries = resolveEntries(options, hallOfFameService);
    var current = buildBody(doc, strings, entries, options);

    // Survives the body rebuild below (a sibling of `current.body`, never
    // replaced with it) so the "Hall of Fame borrado" confirmation stays
    // announced/readable even once the table itself has been swapped for the
    // empty-state message.
    var clearedStatus = doc.createElement('p');
    clearedStatus.className = 'hall-of-fame-screen__cleared-status';
    clearedStatus.setAttribute('aria-live', 'polite');

    root.appendChild(heading);
    root.appendChild(current.body);
    root.appendChild(clearedStatus);
    container.appendChild(root);

    function showDeleteButton() {
      current.deleteConfirm.hidden = true;
      current.deleteButton.hidden = false;
      if (typeof current.deleteButton.focus === 'function') {
        current.deleteButton.focus();
      }
    }

    function wireDeleteActions() {
      if (!current.deleteButton) {
        return;
      }

      bindActivation(current.deleteButton, function () {
        current.deleteStatus.textContent = '';
        current.deleteButton.hidden = true;
        current.deleteConfirm.hidden = false;
        if (typeof current.deleteCancelButton.focus === 'function') {
          current.deleteCancelButton.focus();
        }
      });

      bindActivation(current.deleteCancelButton, function () {
        showDeleteButton();
      });

      bindActivation(current.deleteConfirmButton, function () {
        if (hallOfFameService && typeof hallOfFameService.clearAll === 'function') {
          hallOfFameService.clearAll(options.storageAdapter);
        }

        var freshEntries = resolveEntries({ storageAdapter: options.storageAdapter }, hallOfFameService);
        var rebuilt = buildBody(doc, strings, freshEntries, options);
        root.replaceChild(rebuilt.body, current.body);
        current = rebuilt;
        wireDeleteActions();
        clearedStatus.textContent = strings.deleteSuccessMessage;

        if (typeof options.onCleared === 'function') {
          options.onCleared();
        }
      });
    }

    wireDeleteActions();

    if (typeof heading.focus === 'function') {
      heading.focus();
    }

    return {
      root: root,
      heading: heading,
      getBody: function () {
        return current.body;
      },
      getTable: function () {
        return current.table;
      },
      getRows: function () {
        return current.rows;
      },
      getDeleteButton: function () {
        return current.deleteButton;
      },
      getDeleteConfirmButton: function () {
        return current.deleteConfirmButton;
      },
      getDeleteCancelButton: function () {
        return current.deleteCancelButton;
      },
      getDeleteStatus: function () {
        return current.deleteStatus;
      },
    };
  }

  var api = {
    renderHallOfFameScreen: renderHallOfFameScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderHallOfFameScreen = renderHallOfFameScreen;
  }
})();
