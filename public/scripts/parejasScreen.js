'use strict';

/**
 * Parejas jurásicas board screen (TRIOFSND-274): renders the memory-match
 * card grid a single round carries (`round.cards`/`round.columns`/
 * `round.rows`, as produced by `src/game/parejasGame.js`'s `startRound`) and
 * drives one round's reveal/match interaction to completion.
 *
 * Flip/match rules: this screen never re-derives the round's own state
 * machine from `parejasGame.js` (unreachable from a real, unbundled browser
 * -- see public/scripts/mazeGame.js's own doc comment for why a browser
 * copy of the Node-side game module can't just be `require`d here) --
 * instead it keeps a small local mirror of the exact same rules
 * (`MAX_VISIBLE_UNMATCHED`, hidden/revealed/matched), so a tap/keypress
 * renders instantly without a round-trip through a caller. `options.onReveal`
 * / `options.onResolve` let a caller (the future app-shell orchestration)
 * mirror the same attempt into `parejasGame.js`'s real `revealCard`/
 * `resolveSelection` for scoring/diagnostics, exactly how mazeScreen.js's
 * `options.onMove` lets `main.js` mirror a move into `mazeGame.applyMove`.
 *
 * Card semantics (AC: "posición, estado, identidad ... vía atributos/
 * etiquetas ARIA"): every card is a native `<button>` -- free keyboard
 * support (Tab for logical DOM/reading order, which already matches the
 * board's row-major layout since `parejasGame.js` positions cards by
 * `cardId` in that same order; Enter/Space activates a button natively, no
 * custom keydown wiring needed) -- whose own `aria-label` spells out
 * position + state + (once revealed/matched) the creature's name, and whose
 * `aria-pressed` mirrors hidden (false) vs revealed/matched (true). A
 * matched card is additionally `disabled` (can't be re-flipped) and gets a
 * small visible "✓ Pareja" badge, so the matched state is never carried by
 * color/opacity alone.
 *
 * Feedback (no color/sound/animation-only state, PRD hard constraint): a
 * single `role="status"`/`aria-live="polite"` region (`announcementEl`)
 * carries every event as one sentence (round change, blocked third reveal,
 * match, mismatch, round result, game over) -- same pattern as
 * mazeScreen.js's own announcement node. A second, always-visible
 * `matchMessage` paragraph repeats the match/mismatch outcome in text for a
 * sighted player who isn't using a screen reader, and `progressText` spells
 * out "Parejas encontradas: N de M" as digits, not just a filling board.
 *
 * Mismatch timing: two revealed-but-unmatched cards flip back to hidden
 * after `MISMATCH_RESET_DELAY_MS` (a plain `setTimeout`) so the player has
 * time to see both faces before they hide again; while that timer is pending, every
 * still-hidden card is disabled so a third tap can't race the reveal count
 * (mirrors `parejasGame.js`'s own hard MAX_VISIBLE_UNMATCHED rule).
 *
 * 375px width (PRD: no horizontal scroll at any level): the board is a CSS
 * grid sized from `round.columns`/`round.rows` via inline custom properties
 * (`--parejas-cols`/`--parejas-rows`, set below) and capped at
 * `min(100%, 320px)` in main.css -- the same recipe mazeScreen.js already
 * uses for its own board -- so the hardest level's 4x4 (16-card) board
 * shrinks its cells instead of growing past the viewport.
 *
 * Card art: the front reuses the fourteen existing cartoon dinosaur
 * illustrations (`public/assets/images/dinosaurs/<id>.svg`, the same asset
 * the quiz already shows); the back is the single shared
 * `public/assets/images/cards/back.svg` (see that folder's CREDITS.md). Both
 * images are `alt="" aria-hidden="true"` -- the accessible name always comes
 * from the wrapping button's `aria-label`, never the image.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of public/scripts/mazeScreen.js. It resolves its
 * i18n strings from `options.strings`, or `window.DinoQuiz.strings.parejas`
 * in the browser, or the `src/i18n` loader under Node -- never a hardcoded
 * string. It registers on `window.DinoQuiz.screens.renderParejasScreen`; the
 * canonical `src/screens/ParejasScreen.js` re-exports this file.
 */

(function () {
  var DEFAULT_TOTAL_ROUNDS = 10;
  var DEFAULT_ROUND_NUMBER = 1;
  var DEFAULT_SCORE = 0;

  // Mirrors parejasGame.js's own MAX_VISIBLE_UNMATCHED (2): at most this many
  // not-yet-matched cards can be face up together.
  var MAX_VISIBLE_UNMATCHED = 2;
  var MISMATCH_RESET_DELAY_MS = 1100;

  var CARD_STATES = {
    HIDDEN: 'hidden',
    REVEALED: 'revealed',
    MATCHED: 'matched',
  };

  var IMAGE_BASE_PATH = '/assets/images/';
  var CARD_BACK_IMAGE = IMAGE_BASE_PATH + 'cards/back.svg';

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).parejas;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.parejas : null;
  }

  /** Fills "{key}" placeholders in `template` from `values`; unknown keys are left untouched. */
  function formatTemplate(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  function creatureName(strings, creatureId) {
    return (strings.dinosaurNames && strings.dinosaurNames[creatureId]) || creatureId;
  }

  function renderParejasScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var roundNumber = options.roundNumber || DEFAULT_ROUND_NUMBER;
    var totalRounds = options.totalRounds || DEFAULT_TOTAL_ROUNDS;
    var isLastRound = roundNumber >= totalRounds;
    var scoreBeforeRound = typeof options.score === 'number' ? options.score : DEFAULT_SCORE;

    // Local mirror of round.cards/revealedCardIds/matchedPairs/attempts, so
    // taps render instantly without waiting on a caller round-trip (see the
    // file doc comment for why this can't just call parejasGame.js).
    var cards = round.cards.map(function (card) {
      return {
        cardId: card.cardId,
        creatureId: card.creatureId,
        pairId: card.pairId,
        state: card.state,
      };
    });
    var pairCount = round.pairCount;
    var revealedCardIds = (round.revealedCardIds || []).slice();
    var matchedPairs = round.matchedPairs || 0;
    var attempts = round.attempts || 0;
    var mismatches = round.mismatches || 0;
    var softAttemptLimit = round.softAttemptLimit;
    var softLimitReached = Boolean(round.softLimitReached);
    var status = round.status || 'playing';
    var resolving = false;
    var finished = false;
    var finalScore = scoreBeforeRound;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'parejas-screen';

    var title = document.createElement('h2');
    title.className = 'parejas-screen__title';
    title.textContent = strings.screenTitle;

    var progressRow = document.createElement('div');
    progressRow.className = 'parejas-screen__progress-row';

    if (typeof round.level === 'number') {
      var levelEl = document.createElement('p');
      levelEl.className = 'parejas-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: round.level });
      progressRow.appendChild(levelEl);
    }

    var roundEl = document.createElement('p');
    roundEl.className = 'parejas-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var instructions = document.createElement('p');
    instructions.className = 'parejas-screen__instructions';
    instructions.textContent = strings.instructions;

    var progressText = document.createElement('p');
    progressText.className = 'parejas-screen__match-progress';

    var board = document.createElement('div');
    board.className = 'parejas-screen__board';
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', strings.boardLabel);
    board.style.setProperty('--parejas-cols', round.columns);
    board.style.setProperty('--parejas-rows', round.rows);

    var matchMessage = document.createElement('p');
    matchMessage.className = 'parejas-screen__match-message';

    var hintMessage = document.createElement('p');
    hintMessage.className = 'parejas-screen__hint-message';

    var announcementEl = document.createElement('p');
    announcementEl.className = 'parejas-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    var resultBox = document.createElement('div');
    resultBox.className = 'parejas-screen__result';
    resultBox.hidden = true;

    var resultHeading = document.createElement('h3');
    resultHeading.className = 'parejas-screen__result-heading';
    resultHeading.hidden = true;

    var resultMessage = document.createElement('p');
    resultMessage.className = 'parejas-screen__result-message';

    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'parejas-screen__next-button';
    nextButton.textContent = strings.roundResult.nextButton;
    nextButton.hidden = true;

    resultBox.appendChild(resultHeading);
    resultBox.appendChild(resultMessage);

    var cardButtons = [];
    var cardImages = [];
    var cardBadges = [];

    function findCard(cardId) {
      return cards.filter(function (card) {
        return card.cardId === cardId;
      })[0];
    }

    function updateProgressText() {
      progressText.textContent = formatTemplate(strings.progressFormat, { matched: matchedPairs, total: pairCount });
    }

    function cardAriaLabel(card) {
      var position = card.cardId + 1;
      if (card.state === CARD_STATES.HIDDEN) {
        return formatTemplate(strings.card.hiddenAriaLabelFormat, { position: position });
      }
      var creature = creatureName(strings, card.creatureId);
      var formatKey = card.state === CARD_STATES.MATCHED ? 'matchedAriaLabelFormat' : 'revealedAriaLabelFormat';
      return formatTemplate(strings.card[formatKey], { position: position, creature: creature });
    }

    function renderCard(cardId) {
      var card = findCard(cardId);
      var button = cardButtons[cardId];
      var image = cardImages[cardId];
      var badge = cardBadges[cardId];

      button.className = 'parejas-screen__card parejas-screen__card--' + card.state;
      button.setAttribute('aria-label', cardAriaLabel(card));
      button.setAttribute('aria-pressed', card.state === CARD_STATES.HIDDEN ? 'false' : 'true');
      button.disabled = card.state === CARD_STATES.MATCHED || (resolving && card.state === CARD_STATES.HIDDEN);

      if (card.state === CARD_STATES.HIDDEN) {
        image.src = CARD_BACK_IMAGE;
      } else {
        image.src = IMAGE_BASE_PATH + 'dinosaurs/' + card.creatureId + '.svg';
      }

      badge.hidden = card.state !== CARD_STATES.MATCHED;
    }

    function renderAllCards() {
      cards.forEach(function (card) {
        renderCard(card.cardId);
      });
    }

    cards.forEach(function (card) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'parejas-screen__card';

      var image = document.createElement('img');
      image.className = 'parejas-screen__card-image';
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');

      var badge = document.createElement('span');
      badge.className = 'parejas-screen__card-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = strings.card.matchedBadge;
      badge.hidden = true;

      button.appendChild(image);
      button.appendChild(badge);
      button.addEventListener('click', function () {
        handleCardActivate(card.cardId);
      });

      board.appendChild(button);
      cardButtons[card.cardId] = button;
      cardImages[card.cardId] = image;
      cardBadges[card.cardId] = badge;
    });

    function handleRoundComplete() {
      status = 'completed';
      finished = true;
      finalScore = scoreBeforeRound + 1;
      renderAllCards();

      if (isLastRound) {
        resultHeading.hidden = false;
        resultHeading.textContent = strings.gameOver.heading;
        resultMessage.textContent = strings.gameOver.message;
        announcementEl.textContent = formatTemplate(strings.gameOver.announcementFormat, {
          score: finalScore,
          total: totalRounds,
        });
      } else {
        resultHeading.hidden = true;
        resultMessage.textContent = formatTemplate(strings.roundResult.correctMessageFormat, {
          total: pairCount,
          attempts: attempts,
        });
        announcementEl.textContent = resultMessage.textContent;
      }

      resultBox.hidden = false;
      nextButton.hidden = false;
    }

    function resolveSelection() {
      var firstId = revealedCardIds[0];
      var secondId = revealedCardIds[1];
      var first = findCard(firstId);
      var second = findCard(secondId);
      var isMatch = first.creatureId === second.creatureId;

      attempts += 1;
      if (isMatch) {
        matchedPairs += 1;
      } else {
        mismatches += 1;
      }
      softLimitReached = typeof softAttemptLimit === 'number' && attempts >= softAttemptLimit;

      if (typeof options.onResolve === 'function') {
        options.onResolve({
          matched: isMatch,
          firstCardId: firstId,
          secondCardId: secondId,
          attempts: attempts,
          mismatches: mismatches,
          softLimitReached: softLimitReached,
        });
      }

      if (isMatch) {
        first.state = CARD_STATES.MATCHED;
        second.state = CARD_STATES.MATCHED;
        revealedCardIds = [];
        resolving = false;
        updateProgressText();
        matchMessage.textContent = formatTemplate(strings.feedback.matchMessageFormat, {
          creature: creatureName(strings, first.creatureId),
        });
        announcementEl.textContent = matchMessage.textContent;
        renderAllCards();

        if (matchedPairs === pairCount) {
          handleRoundComplete();
        }
        return;
      }

      var firstName = creatureName(strings, first.creatureId);
      var secondName = creatureName(strings, second.creatureId);
      matchMessage.textContent = formatTemplate(strings.feedback.mismatchMessageFormat, {
        first: firstName,
        second: secondName,
      });
      announcementEl.textContent = matchMessage.textContent;
      hintMessage.textContent = softLimitReached ? strings.feedback.softLimitHint : '';

      setTimeout(function () {
        if (finished) {
          return;
        }
        first.state = CARD_STATES.HIDDEN;
        second.state = CARD_STATES.HIDDEN;
        revealedCardIds = [];
        resolving = false;
        renderAllCards();
      }, MISMATCH_RESET_DELAY_MS);
    }

    function handleCardActivate(cardId) {
      if (finished || status !== 'playing') {
        return;
      }

      var card = findCard(cardId);
      if (!card || card.state !== CARD_STATES.HIDDEN) {
        return;
      }

      if (resolving || revealedCardIds.length >= MAX_VISIBLE_UNMATCHED) {
        matchMessage.textContent = strings.feedback.blockedMessage;
        announcementEl.textContent = strings.feedback.blockedAnnouncement;
        if (typeof options.onReveal === 'function') {
          options.onReveal({ cardId: cardId, blocked: true });
        }
        return;
      }

      card.state = CARD_STATES.REVEALED;
      revealedCardIds.push(cardId);
      matchMessage.textContent = '';
      hintMessage.textContent = '';
      renderCard(cardId);

      if (typeof options.onReveal === 'function') {
        options.onReveal({ cardId: cardId, blocked: false });
      }

      if (revealedCardIds.length === MAX_VISIBLE_UNMATCHED) {
        resolving = true;
        renderAllCards();
        resolveSelection();
      }
    }

    nextButton.addEventListener('click', function () {
      if (isLastRound) {
        if (typeof options.onGameOver === 'function') {
          options.onGameOver(finalScore);
        }
      } else if (typeof options.onNext === 'function') {
        options.onNext(finalScore);
      }
    });

    root.appendChild(title);
    root.appendChild(progressRow);
    root.appendChild(instructions);
    root.appendChild(progressText);
    root.appendChild(board);
    root.appendChild(matchMessage);
    root.appendChild(hintMessage);
    root.appendChild(resultBox);
    root.appendChild(nextButton);
    root.appendChild(announcementEl);
    container.appendChild(root);

    updateProgressText();
    renderAllCards();
    announcementEl.textContent = formatTemplate(strings.roundChangeAnnouncementFormat, {
      current: roundNumber,
      total: totalRounds,
    });

    return {
      root: root,
      board: board,
      progressText: progressText,
      cardButtons: cardButtons,
      matchMessage: matchMessage,
      hintMessage: hintMessage,
      resultBox: resultBox,
      resultHeading: resultHeading,
      resultMessage: resultMessage,
      nextButton: nextButton,
      announcement: announcementEl,
      announcementEl: announcementEl,
      getCards: function () {
        return cards.map(function (card) {
          return { cardId: card.cardId, creatureId: card.creatureId, pairId: card.pairId, state: card.state };
        });
      },
      getMatchedPairs: function () {
        return matchedPairs;
      },
      getAttempts: function () {
        return attempts;
      },
      isFinished: function () {
        return finished;
      },
    };
  }

  var api = {
    MISMATCH_RESET_DELAY_MS: MISMATCH_RESET_DELAY_MS,
    renderParejasScreen: renderParejasScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderParejasScreen = renderParejasScreen;
  }
})();
