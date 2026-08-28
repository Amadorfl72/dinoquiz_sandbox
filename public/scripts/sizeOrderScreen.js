'use strict';

/**
 * Ordena por tamaño board screen (TRIOFSND-286): renders one round's 3-4
 * creatures in the exact `round.initialOrder` they arrived in and drives
 * the "select two, they swap" interaction through to a single confirmed
 * evaluation. Round generation (src/game/sizeOrderRoundGenerator.js), the
 * 10-round game/score flow (src/game/roundContract.js) and the results
 * screen are all out of scope here -- this file only ever renders and
 * evaluates the one round it's given.
 *
 * State machine (four states, no others): `lista` (no selection; select or
 * confirm are both valid), `primera-seleccion` (exactly one creature
 * selected; activating another swaps, re-activating the same one cancels),
 * `evaluada` (confirmed -- every control is disabled, no further mutation is
 * possible) and `error-de-datos` (the round failed local validation -- no
 * board is ever built). `validateRound` is the single gate into the last
 * state; nothing past it ever re-checks round shape.
 *
 * Single source of truth for length: `round.creatures` (the ficha única
 * array `src/game/sizeOrderRoundGenerator.js` already produces, each
 * `{ id, lengthMeters }`) is read by id through `creaturesById` at both
 * sort-time and render-time -- never copied into a second per-card model.
 * The correct order is computed once, locally, from those same lengths
 * (never trusted from `round.correctOrder`, which belongs to the generator
 * and could drift from what this screen independently verifies).
 *
 * Identity-anchored buttons (no drag/drop, AC "sin arrastrar ni deslizar"):
 * one `<button>` per creature id is created once and never rebound to a
 * different creature -- a swap only moves that same DOM node to a new slot
 * in `board` (via `appendChild`, which relocates rather than recreates) and
 * updates its position label. That's what guarantees a swap never touches
 * identity/ficha/name-image association, and why focus survives a swap
 * without any special-casing: the node the player just activated is the
 * exact node still focused afterwards, plus an explicit `.focus()` call
 * right after re-render makes that deterministic in every environment
 * (jsdom does not auto-focus on click the way a real browser does).
 *
 * Keyboard parity: a native `<button>`'s own Enter/Space activation would
 * normally just be "free", but jsdom (unlike every real browser) does not
 * synthesize a `click` from Enter/Space keydown, so this screen wires an
 * explicit `keydown` handler that calls `event.preventDefault()` and then
 * `button.click()` -- `preventDefault` on the keydown is what stops a real
 * browser from *also* firing its own native click, so exactly one
 * activation happens everywhere, mouse/touch/keyboard alike, all funneled
 * through the same `click` listener.
 *
 * One confirmation, atomically: `handleConfirm` checks `status` and flips it
 * to `evaluada` synchronously, before anything else runs (including the
 * `onAnswer` callback) -- a second click/Enter/Space in the same tick reads
 * the already-flipped status and is rejected before any DOM mutation.
 * `resultEmitted` additionally guards `onAnswer` itself so re-entrant calls
 * can never fire it twice. `evaluatedRoundResults` (module-scoped, keyed by
 * the round's own stable id) makes that guarantee survive a full re-render:
 * if a caller re-renders the very same round id after it was evaluated,
 * this screen restores the locked result from that map instead of building
 * a fresh, interactive `lista` board -- a mere re-render can never undo a
 * confirmed answer. A genuinely new round (different id) starts clean.
 *
 * Single aria-live region: `announcementEl` (`role="status"`,
 * `aria-live="polite"`) is the only live region this screen ever writes to
 * -- selection, cancellation, swap and the final result all funnel through
 * it sequentially, so a screen reader never receives two competing
 * simultaneous updates (the failure mode this ticket's own "qué salió mal
 * antes" section calls out).
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of public/scripts/parejasScreen.js. It resolves
 * its i18n strings from `options.strings`, or
 * `window.DinoQuiz.strings.sizeOrder` in the browser, or the `src/i18n`
 * loader under Node -- never a hardcoded string. It registers on
 * `window.DinoQuiz.screens.renderSizeOrderScreen`; the canonical
 * `src/screens/SizeOrderScreen.js` re-exports this file.
 */

(function () {
  var MIN_CREATURES = 3;
  var MAX_CREATURES = 4;
  var IMAGE_BASE_PATH = '/assets/images/';

  var STATUS = Object.freeze({
    LISTA: 'lista',
    PRIMERA_SELECCION: 'primera-seleccion',
    EVALUADA: 'evaluada',
    ERROR_DE_DATOS: 'error-de-datos',
  });

  // Keyed by the round's own stable id (see `resolveRoundId`): once a round
  // has been confirmed, re-rendering that same id restores the locked
  // result instead of a fresh, interactive board (AC "un simple re-render
  // de la misma ronda no lo elimina"). A brand new round id is unaffected.
  var evaluatedRoundResults = {};

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).sizeOrder;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.sizeOrder : null;
  }

  /** Fills "{key}" placeholders in `template` from `values`; unknown keys are left untouched. */
  function formatTemplate(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.split('{' + key + '}').join(String(values[key]));
    }, template);
  }

  function creatureName(strings, creatureId) {
    return (strings.dinosaurNames && strings.dinosaurNames[creatureId]) || creatureId;
  }

  /**
   * The only gate into `error-de-datos`. Returns `null` for anything this
   * screen can't safely present: wrong creature count, duplicate ids in the
   * order, an id with no matching ficha, or a ficha whose `lengthMeters`
   * isn't a finite positive number -- or is tied with another creature's
   * (a tie has no single correct order, so it's invalid for this screen,
   * not something it silently breaks a tie on). On success, returns the
   * validated `order` (a copy) and a `creaturesById` lookup -- the only
   * shape the rest of this module ever reads from.
   */
  function validateRound(round) {
    if (!round || !Array.isArray(round.initialOrder) || !Array.isArray(round.creatures)) {
      return null;
    }

    var order = round.initialOrder;
    if (order.length < MIN_CREATURES || order.length > MAX_CREATURES) {
      return null;
    }

    var seenIds = {};
    for (var i = 0; i < order.length; i += 1) {
      var orderId = order[i];
      if (typeof orderId !== 'string' || orderId === '' || seenIds[orderId]) {
        return null;
      }
      seenIds[orderId] = true;
    }

    var creaturesById = {};
    round.creatures.forEach(function (creature) {
      if (creature && typeof creature.id === 'string') {
        creaturesById[creature.id] = creature;
      }
    });

    var lengths = [];
    for (var j = 0; j < order.length; j += 1) {
      var sheet = creaturesById[order[j]];
      var length = sheet && sheet.lengthMeters;
      if (!sheet || typeof length !== 'number' || !isFinite(length) || length <= 0) {
        return null;
      }
      lengths.push(length);
    }

    var sortedLengths = lengths.slice().sort(function (a, b) {
      return a - b;
    });
    for (var k = 1; k < sortedLengths.length; k += 1) {
      if (sortedLengths[k] === sortedLengths[k - 1]) {
        return null;
      }
    }

    return { order: order.slice(), creaturesById: creaturesById };
  }

  /** A round's stable id: `round.roundId` if the caller set one, else roundContract.js's own `roundIndex` bookkeeping field, else `null` (no cross-render lock is possible without one). */
  function resolveRoundId(round) {
    if (round.roundId !== undefined) {
      return round.roundId;
    }
    if (round.roundIndex !== undefined) {
      return round.roundIndex;
    }
    return null;
  }

  function renderDataErrorState(root, strings) {
    var message = document.createElement('p');
    message.className = 'size-order-screen__data-error';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = strings.dataError.message;
    root.appendChild(message);

    return {
      root: root,
      dataError: message,
      getStatus: function () {
        return STATUS.ERROR_DE_DATOS;
      },
      destroy: function () {},
    };
  }

  function renderSizeOrderScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var roundNumber = options.roundNumber || 1;
    var totalRounds = options.totalRounds || 10;

    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'size-order-screen';
    container.appendChild(root);

    var validated = validateRound(round);
    if (!validated) {
      return renderDataErrorState(root, strings);
    }

    var roundId = resolveRoundId(round);
    var creaturesById = validated.creaturesById;
    var correctOrder = validated.order.slice().sort(function (a, b) {
      return creaturesById[a].lengthMeters - creaturesById[b].lengthMeters;
    });
    var onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;

    var currentOrder = validated.order.slice();
    var selectedIndex = null;
    var status = STATUS.LISTA;
    var resultEmitted = false;
    var destroyed = false;

    var title = document.createElement('h2');
    title.className = 'size-order-screen__title';
    title.textContent = strings.screenTitle;

    var progressRow = document.createElement('div');
    progressRow.className = 'size-order-screen__progress-row';

    if (typeof round.level === 'number') {
      var levelEl = document.createElement('p');
      levelEl.className = 'size-order-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: round.level });
      progressRow.appendChild(levelEl);
    }

    var roundEl = document.createElement('p');
    roundEl.className = 'size-order-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var instructions = document.createElement('p');
    instructions.className = 'size-order-screen__instructions';
    instructions.textContent = strings.instructions;

    var board = document.createElement('div');
    board.className = 'size-order-screen__board';
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', strings.boardLabel);

    var confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'size-order-screen__confirm-button';
    confirmButton.textContent = strings.confirmButton;

    var announcementEl = document.createElement('p');
    announcementEl.className = 'size-order-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    var resultBox = document.createElement('div');
    resultBox.className = 'size-order-screen__result';
    resultBox.hidden = true;

    var resultBadge = document.createElement('p');
    resultBadge.className = 'size-order-screen__result-badge';

    var resultIcon = document.createElement('span');
    resultIcon.className = 'size-order-screen__result-icon';
    resultIcon.setAttribute('aria-hidden', 'true');

    var resultLabel = document.createElement('span');
    resultLabel.className = 'size-order-screen__result-label';

    resultBadge.appendChild(resultIcon);
    resultBadge.appendChild(resultLabel);

    var resultMessage = document.createElement('p');
    resultMessage.className = 'size-order-screen__result-message';

    var solutionHeading = document.createElement('h3');
    solutionHeading.className = 'size-order-screen__solution-heading';
    solutionHeading.textContent = strings.roundResult.orderLabel;

    var solutionList = document.createElement('ol');
    solutionList.className = 'size-order-screen__solution-list';

    resultBox.appendChild(resultBadge);
    resultBox.appendChild(resultMessage);
    resultBox.appendChild(solutionHeading);
    resultBox.appendChild(solutionList);

    var creatureButtons = {};
    var creaturePositionEls = {};
    var creatureBadgeEls = {};

    function positionOf(id) {
      return currentOrder.indexOf(id) + 1;
    }

    function ariaLabelFor(id, isSelected) {
      var values = { dinosaur: creatureName(strings, id), position: positionOf(id), total: currentOrder.length };
      if (status === STATUS.EVALUADA) {
        return formatTemplate(strings.selection.lockedAriaLabelFormat, values);
      }
      return formatTemplate(isSelected ? strings.selection.selectedAriaLabelFormat : strings.selection.selectAriaLabelFormat, values);
    }

    /** Re-syncs every creature button's DOM slot, position label and selection state from `currentOrder`/`selectedIndex`. Never recreates a button -- only relocates/relabels the existing one, which is what keeps identity, ficha and focus intact across a swap. */
    function renderPositions() {
      var selectedId = selectedIndex !== null ? currentOrder[selectedIndex] : null;
      currentOrder.forEach(function (id) {
        var button = creatureButtons[id];
        var isSelected = id === selectedId;
        button.setAttribute('aria-label', ariaLabelFor(id, isSelected));
        button.setAttribute('aria-pressed', String(isSelected));
        button.classList.toggle('size-order-screen__creature--selected', isSelected);
        creaturePositionEls[id].textContent = String(positionOf(id));
        creatureBadgeEls[id].hidden = !isSelected;
        board.appendChild(button);
      });
    }

    function lockBoard() {
      Object.keys(creatureButtons).forEach(function (id) {
        creatureButtons[id].disabled = true;
      });
      confirmButton.disabled = true;
    }

    function renderResultUI(result) {
      status = STATUS.EVALUADA;
      currentOrder = result.order.slice();
      selectedIndex = null;
      lockBoard();
      renderPositions();

      resultBadge.classList.toggle('size-order-screen__result-badge--correct', result.isCorrect);
      resultBadge.classList.toggle('size-order-screen__result-badge--incorrect', !result.isCorrect);
      resultIcon.textContent = result.isCorrect ? '✓' : '✗';
      resultLabel.textContent = result.isCorrect ? strings.feedback.correctLabel : strings.feedback.incorrectLabel;
      resultMessage.textContent = result.isCorrect ? strings.feedback.correct : strings.feedback.incorrect;

      solutionList.innerHTML = '';
      correctOrder.forEach(function (id) {
        var item = document.createElement('li');
        item.className = 'size-order-screen__solution-item';
        item.textContent = formatTemplate(strings.roundResult.creatureLengthFormat, {
          dinosaur: creatureName(strings, id),
          lengthMeters: creaturesById[id].lengthMeters,
        });
        solutionList.appendChild(item);
      });

      resultBox.hidden = false;

      var orderedNames = correctOrder
        .map(function (id) {
          return creatureName(strings, id);
        })
        .join(', ');
      var announcementFormat = result.isCorrect
        ? strings.roundResult.correctAnnouncementFormat
        : strings.roundResult.incorrectAnnouncementFormat;
      announcementEl.textContent = formatTemplate(announcementFormat, { order: orderedNames });
    }

    function handleConfirm() {
      if (destroyed || (status !== STATUS.LISTA && status !== STATUS.PRIMERA_SELECCION)) {
        return;
      }

      // A pending first selection is cleared, never swapped, on confirm.
      selectedIndex = null;

      var isCorrect =
        currentOrder.length === correctOrder.length &&
        currentOrder.every(function (id, index) {
          return id === correctOrder[index];
        });

      var result = { roundId: roundId, isCorrect: isCorrect, order: currentOrder.slice(), correctOrder: correctOrder.slice() };

      renderResultUI(result);

      if (roundId !== null) {
        evaluatedRoundResults[roundId] = result;
      }
      if (!resultEmitted) {
        resultEmitted = true;
        if (onAnswer) {
          onAnswer(result);
        }
      }
    }

    function handleCreatureActivate(id) {
      if (destroyed || status === STATUS.EVALUADA) {
        return;
      }

      var button = creatureButtons[id];
      var index = currentOrder.indexOf(id);

      if (status === STATUS.LISTA) {
        selectedIndex = index;
        status = STATUS.PRIMERA_SELECCION;
        renderPositions();
        announcementEl.textContent = formatTemplate(strings.selection.selectedAnnouncementFormat, {
          dinosaur: creatureName(strings, id),
          position: positionOf(id),
          total: currentOrder.length,
        });
        button.focus();
        return;
      }

      if (index === selectedIndex) {
        selectedIndex = null;
        status = STATUS.LISTA;
        renderPositions();
        announcementEl.textContent = formatTemplate(strings.selection.deselectAnnouncementFormat, {
          dinosaur: creatureName(strings, id),
        });
        button.focus();
        return;
      }

      var firstId = currentOrder[selectedIndex];
      var secondId = id;
      currentOrder[selectedIndex] = secondId;
      currentOrder[index] = firstId;
      selectedIndex = null;
      status = STATUS.LISTA;
      renderPositions();

      announcementEl.textContent = formatTemplate(strings.selection.swapAnnouncementFormat, {
        firstDinosaur: creatureName(strings, firstId),
        secondDinosaur: creatureName(strings, secondId),
        firstPosition: positionOf(firstId),
        secondPosition: positionOf(secondId),
        total: currentOrder.length,
      });
      button.focus();
    }

    /** Enter/Space parity (jsdom never synthesizes a click from either key the way a real browser does): `preventDefault` stops a real browser's own native click from *also* firing, then this triggers the exact same `click` path by hand. */
    function handleActivationKey(event, button) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        button.click();
      }
    }

    validated.order.forEach(function (id) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'size-order-screen__creature';
      button.setAttribute('aria-pressed', 'false');

      var image = document.createElement('img');
      image.className = 'size-order-screen__creature-image';
      image.src = IMAGE_BASE_PATH + 'dinosaurs/' + id + '.svg';
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');

      var position = document.createElement('span');
      position.className = 'size-order-screen__creature-position';
      position.setAttribute('aria-hidden', 'true');

      var name = document.createElement('span');
      name.className = 'size-order-screen__creature-name';
      name.textContent = creatureName(strings, id);

      var badge = document.createElement('span');
      badge.className = 'size-order-screen__creature-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = strings.selection.selectedBadge;
      badge.hidden = true;

      button.appendChild(image);
      button.appendChild(position);
      button.appendChild(name);
      button.appendChild(badge);

      button.addEventListener('click', function () {
        handleCreatureActivate(id);
      });
      button.addEventListener('keydown', function (event) {
        handleActivationKey(event, button);
      });

      board.appendChild(button);
      creatureButtons[id] = button;
      creaturePositionEls[id] = position;
      creatureBadgeEls[id] = badge;
    });

    confirmButton.addEventListener('click', handleConfirm);
    confirmButton.addEventListener('keydown', function (event) {
      handleActivationKey(event, confirmButton);
    });

    root.appendChild(title);
    root.appendChild(progressRow);
    root.appendChild(instructions);
    root.appendChild(board);
    root.appendChild(confirmButton);
    root.appendChild(resultBox);
    root.appendChild(announcementEl);

    renderPositions();

    var lockedResult = roundId !== null ? evaluatedRoundResults[roundId] : null;
    if (lockedResult) {
      resultEmitted = true;
      renderResultUI(lockedResult);
    } else {
      announcementEl.textContent = formatTemplate(strings.roundChangeAnnouncementFormat, {
        current: roundNumber,
        total: totalRounds,
      });
    }

    return {
      root: root,
      board: board,
      creatureButtons: creatureButtons,
      confirmButton: confirmButton,
      announcementEl: announcementEl,
      announcement: announcementEl,
      resultBox: resultBox,
      resultBadge: resultBadge,
      resultLabel: resultLabel,
      resultMessage: resultMessage,
      solutionList: solutionList,
      getStatus: function () {
        return status;
      },
      getOrder: function () {
        return currentOrder.slice();
      },
      destroy: function () {
        destroyed = true;
      },
    };
  }

  var api = {
    STATUS: STATUS,
    renderSizeOrderScreen: renderSizeOrderScreen,
    validateRound: validateRound,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderSizeOrderScreen = renderSizeOrderScreen;
  }
})();
