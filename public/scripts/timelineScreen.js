'use strict';

/**
 * Línea del tiempo board screen (TRIOFSND-293): renders the creature a
 * single round carries (`round.dinosaur`, as produced by
 * `src/game/timelineRound.js`'s `startRound`/`startGame`) plus the three
 * period controls (Triásico/Jurásico/Cretácico), and drives one round's
 * answer to completion via `timelineRound.js`'s `evaluateRound`. Follows the
 * same per-round-render contract as `classifyScreen.js`/`shadowGuessScreen.js`
 * (one call renders one round; the caller decides when/how to move on).
 *
 * Period controls (AC: "elegir por tacto y teclado"): every period is a
 * native `<button>` inside a single `role="group"` -- free keyboard support
 * (Tab reaches every button in DOM order, Enter/Space activates natively)
 * plus native touch handling, same precedent as `classifyScreen.js`'s
 * category buttons. Each button shows the period's name plus a decorative
 * (aria-hidden) icon as "apoyo visual", and its own `aria-label`
 * (`timeline.options.<period>.a11yLabel`) restates the action for a
 * screen-reader user.
 *
 * Locked mode (PRD: "estado de modo bloqueado ... fichas insuficientes ...
 * acción localizada y accesible para volver al selector"): `startGame`
 * returns `{ error: ERRORS.INSUFFICIENT_ELIGIBLE_CREATURES, details }`
 * instead of a round when the eligible-creature pool can't fill a whole
 * game. A caller passes that same `{ error }` object (or `null`/`undefined`)
 * straight through as this screen's `round` argument -- mirroring
 * `shadowGuessScreen.js`'s own `!round || round.error` guard -- and this
 * screen renders `timeline.locked.message` (text + decorative icon,
 * `role="status"`/`aria-live="polite"`) plus a visible, accessible
 * `timeline.locked.exitLabel` button that calls `options.onBackToSelector`
 * (same callback name `resultsScreen.js` already uses for "volver al
 * selector"), instead of a broken/partial board.
 *
 * Blocked round (defense in depth, mirrors `classifyScreen.js`'s own
 * controlled guard): before showing the period buttons, this screen calls
 * `timelineRound.js`'s pure `resolveVerifiedTimelineFicha(round.dinosaur)`.
 * When the creature's ficha can no longer be verified (a rare edge case --
 * `startGame` already only ever selects eligible creatures), the period
 * buttons are never shown at all -- instead `evaluateRound` is invoked once,
 * immediately, with an arbitrary valid period (the blocked branch never
 * reads it) purely to obtain the canonical blocked round/diagnostic code and
 * fire its log event. The game is never ended for this: `nextButton` still
 * advances to the following round, matching `classifyScreen.js`'s own
 * "never a fatal blocked round" behavior. `timeline.blockedRound.message`
 * carries this text (distinct from the whole-mode `timeline.locked.message`
 * so a single unverifiable round is never confused with the game-level
 * "not enough fichas" state).
 *
 * Feedback (PRD hard constraint: "ninguna instrucción o estado puede
 * comunicarse únicamente mediante color, sonido o animación"): a wrong guess
 * never relies on color alone. The button for the CORRECT period always gets
 * a visible border/fill change, a decorative checkmark and an updated
 * `aria-label` ("Periodo correcto: …"); the button the child actually
 * tapped, when wrong, gets a neutral (never red) "Tu respuesta: …" label. A
 * single always-visible `feedbackMessage` paragraph plus its own decorative
 * icon restates the outcome in one sentence, and a single
 * `role="status"`/`aria-live="polite"` region (`announcementEl`, `.sr-only`,
 * same pattern as `classifyScreen.js`/`mazeScreen.js`) announces it plus the
 * educational explanation below for a screen-reader user -- one coherent
 * sentence per event.
 *
 * Educational explanation (PRD G4: "evitar afirmaciones científicas
 * falsas", scope: "intervalo preciso y clasificación, incl. Pteranodon"):
 * once a round is evaluated, `explanation.temporalRangeMillionsOfYears` (the
 * creature's verified precise interval) is shown via
 * `timeline.explanation.interval`/`intervalRangeFormat` ONLY when the
 * creature's ficha actually documents one (never fabricated, matching
 * `timelineRound.js`'s own contract) -- e.g. Triceratops has none and shows
 * no interval line. `explanation.classification` is shown via
 * `timeline.explanation.pteranodon` whenever it is `'reptil_volador'` (a
 * local literal copy of `creatureSheet.js`'s `CLASSIFICATIONS.REPTIL_VOLADOR`
 * value -- this screen can't `require` that module directly in a real
 * browser, since its dependency chain reaches `questionBank.js`'s `fs`-based
 * loader; same reasoning `shadowGuessScreen.js` documents for its own local
 * `SHADOW_TRANSFORMS` copy) -- e.g. Pteranodon explicitly states it is a
 * flying reptile, not a dinosaur, so the mode never implies otherwise. A
 * plain `'dinosaurio'` classification needs no extra text (the default,
 * unsurprising case).
 *
 * Counted once (AC: "bloquea envíos duplicados"): `finished` guards
 * `handlePeriodSelected`, mirroring `questionScreen.js`/`classifyScreen.js`'s
 * own local flag -- a second tap/keypress on any period after the first is a
 * no-op.
 *
 * Sound (PRD: "todo audio debe respetar dinoquiz:muted antes de cualquier
 * reproducción"): playback is delegated entirely to `soundService.js`'s
 * `playCorrect`/`playIncorrect`, which already reads the `dinoquiz:muted`
 * flag fresh before every play -- never duplicated here. A blocked round or
 * the locked mode state never plays a sound (there is no correct/incorrect
 * outcome to signal).
 *
 * 375px width (PRD: no horizontal scroll at any level): the period button
 * column and the creature illustration are both capped the same way
 * `classifyScreen.js`'s own board already proves out at 375px (main.css).
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of `public/scripts/classifyScreen.js`. Under
 * Node/Jest it `require`s the real `src/game/timelineRound.js`; in a real,
 * unbundled browser it looks for `window.DinoQuiz.game.timelineRound`
 * (registered by a future browser port of that module, the same "screen
 * ships ahead of its game-logic browser port" precedent `classifyScreen.js`/
 * `shadowGuessScreen.js` already set -- neither is wired into `main.js` yet
 * either). It resolves its i18n strings from `options.strings`, or
 * `window.DinoQuiz.strings.timeline` in the browser, or the `src/i18n`
 * loader under Node -- never a hardcoded string. It registers on
 * `window.DinoQuiz.screens.renderTimelineScreen`; the canonical
 * `src/screens/TimelineScreen.js` re-exports this file.
 */

(function () {
  var DEFAULT_TOTAL_ROUNDS = 10;
  var DEFAULT_ROUND_NUMBER = 1;
  var DEFAULT_SCORE = 0;
  var IMAGE_BASE_PATH = '/assets/images/';

  // Local, decorative-only lookups (aria-hidden below, so never the sole
  // carrier of meaning) -- same precedent as classifyScreen.js's
  // CATEGORY_ICON and mazeScreen.js's FOOD_ICON.
  var PERIOD_ICON = {
    triasico: '🌋',
    jurasico: '🦕',
    cretacico: '☄️',
  };
  var FALLBACK_PERIOD_ORDER = ['triasico', 'jurasico', 'cretacico'];
  var CORRECT_ICON = '✅';
  var INCORRECT_ICON = '💡';
  var BLOCKED_ICON = '⚠️';
  var LOCKED_ICON = '🔒';

  // Local literal copy of creatureSheet.js's CLASSIFICATIONS.REPTIL_VOLADOR
  // value (see the file doc comment for why this screen can't just
  // `require` that module's own dependency chain in a real browser).
  var CLASSIFICATION_REPTIL_VOLADOR = 'reptil_volador';

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).timeline;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.timeline : null;
  }

  /** See the file doc comment's "Browser bridge" section for why this can't just `require` timelineRound.js in a real browser yet. */
  function resolveTimelineRound(options) {
    options = options || {};
    if (options.timelineRound) {
      return options.timelineRound;
    }
    if (typeof require === 'function') {
      return require('../../src/game/timelineRound');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.timelineRound) || null;
  }

  function resolveSoundService(options) {
    options = options || {};
    if (options.soundService) {
      return options.soundService;
    }
    if (typeof require === 'function') {
      return require('./soundService').soundService;
    }
    return (
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.soundService) ||
      null
    );
  }

  /** Fills "{key}" placeholders in `template` from `values`; unknown keys are left untouched. */
  function formatTemplate(template, values) {
    if (typeof template !== 'string') {
      return '';
    }
    return Object.keys(values || {}).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  function creatureName(strings, dinosaurId) {
    return (strings.dinosaurNames && strings.dinosaurNames[dinosaurId]) || dinosaurId;
  }

  function periodLabel(strings, period) {
    return (strings.options && strings.options[period] && strings.options[period].label) || period;
  }

  function resolvePeriodOrder(timelineRoundApi) {
    if (timelineRoundApi && Array.isArray(timelineRoundApi.PERIODS)) {
      return timelineRoundApi.PERIODS;
    }
    return FALLBACK_PERIOD_ORDER;
  }

  /** `{ startMya, endMya }` -> localized "X a Y millones de años" text, or null when no precise range is documented (never fabricated). */
  function formatIntervalRange(strings, range) {
    if (!range || typeof range.startMya !== 'number' || typeof range.endMya !== 'number') {
      return null;
    }
    return formatTemplate(strings.explanation.intervalRangeFormat, { startMya: range.startMya, endMya: range.endMya });
  }

  function renderLockedState(container, strings, options) {
    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'timeline-screen';

    var title = document.createElement('h2');
    title.className = 'timeline-screen__title';
    title.textContent = strings.modeName;
    title.tabIndex = -1;

    var locked = document.createElement('div');
    locked.className = 'timeline-screen__locked';

    var icon = document.createElement('span');
    icon.className = 'timeline-screen__locked-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = LOCKED_ICON;

    var message = document.createElement('p');
    message.className = 'timeline-screen__locked-message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = strings.locked.message;

    var exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.className = 'timeline-screen__exit-button';
    exitButton.textContent = strings.locked.exitLabel;
    exitButton.addEventListener('click', function () {
      if (typeof options.onBackToSelector === 'function') {
        options.onBackToSelector();
      }
    });

    locked.appendChild(icon);
    locked.appendChild(message);
    locked.appendChild(exitButton);

    root.appendChild(title);
    root.appendChild(locked);
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      locked: locked,
      lockedMessage: message,
      exitButton: exitButton,
      isLocked: function () {
        return true;
      },
    };
  }

  function renderTimelineScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);

    // Whole-mode locked state (PRD: "fichas insuficientes"): startGame's
    // `{ error }` wrapper (or no round at all) is passed straight through as
    // `round` by the caller -- see the file doc comment.
    if (!round || round.error) {
      return renderLockedState(container, strings, options);
    }

    var timelineRoundApi = resolveTimelineRound(options);
    var soundService = resolveSoundService(options);
    var playSound = options.playSound !== false;
    var periodOrder = resolvePeriodOrder(timelineRoundApi);

    if (!timelineRoundApi || typeof timelineRoundApi.evaluateRound !== 'function' || typeof timelineRoundApi.resolveVerifiedTimelineFicha !== 'function') {
      throw new Error('renderTimelineScreen requires timelineRound to be available (see the file doc comment)');
    }

    var roundNumber = options.roundNumber || DEFAULT_ROUND_NUMBER;
    var totalRounds = options.totalRounds || DEFAULT_TOTAL_ROUNDS;
    var isLastRound = roundNumber >= totalRounds;
    var scoreBeforeRound = typeof options.score === 'number' ? options.score : DEFAULT_SCORE;

    var gameState = options.gameState || { score: scoreBeforeRound, questionIndex: round.roundIndex, answers: [] };
    var finished = false;
    var finalScore = scoreBeforeRound;
    var evaluatedRound = null;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'timeline-screen';

    var title = document.createElement('h2');
    title.className = 'timeline-screen__title';
    title.textContent = strings.modeName;
    title.tabIndex = -1;

    var progressRow = document.createElement('div');
    progressRow.className = 'timeline-screen__progress-row';

    if (typeof round.level === 'number') {
      var levelEl = document.createElement('p');
      levelEl.className = 'timeline-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: round.level });
      progressRow.appendChild(levelEl);
    }

    var roundEl = document.createElement('p');
    roundEl.className = 'timeline-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var scoreEl = document.createElement('p');
    scoreEl.className = 'timeline-screen__score';
    scoreEl.textContent = strings.scoreLabel + ': ' + scoreBeforeRound;

    var instructions = document.createElement('p');
    instructions.className = 'timeline-screen__instructions';
    instructions.textContent = strings.instruction;

    var creature = document.createElement('figure');
    creature.className = 'timeline-screen__creature';

    var creatureImage = document.createElement('img');
    creatureImage.className = 'timeline-screen__creature-image';
    creatureImage.src = IMAGE_BASE_PATH + 'dinosaurs/' + round.dinosaur + '.svg';
    creatureImage.alt = '';
    creatureImage.setAttribute('aria-hidden', 'true');

    var creatureNameEl = document.createElement('figcaption');
    creatureNameEl.className = 'timeline-screen__creature-name';
    creatureNameEl.textContent = creatureName(strings, round.dinosaur);

    creature.appendChild(creatureImage);
    creature.appendChild(creatureNameEl);

    var periodsGroup = document.createElement('div');
    periodsGroup.className = 'timeline-screen__periods';
    periodsGroup.setAttribute('role', 'group');
    periodsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    var periodButtons = {};

    periodOrder.forEach(function (period) {
      var periodStrings = (strings.options && strings.options[period]) || {};

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-screen__period-button';

      var icon = document.createElement('span');
      icon.className = 'timeline-screen__period-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = PERIOD_ICON[period] || '';

      var label = document.createElement('span');
      label.className = 'timeline-screen__period-label';
      label.textContent = periodStrings.label || period;

      button.appendChild(icon);
      button.appendChild(label);
      button.setAttribute('aria-label', periodStrings.a11yLabel || periodStrings.label || period);

      button.addEventListener('click', function () {
        handlePeriodSelected(period, button);
      });

      periodsGroup.appendChild(button);
      periodButtons[period] = button;
    });

    var feedbackIcon = document.createElement('span');
    feedbackIcon.className = 'timeline-screen__feedback-icon';
    feedbackIcon.setAttribute('aria-hidden', 'true');

    var feedbackText = document.createElement('span');
    feedbackText.className = 'timeline-screen__feedback-text';

    var feedbackMessage = document.createElement('p');
    feedbackMessage.className = 'timeline-screen__feedback-message';
    feedbackMessage.hidden = true;
    feedbackMessage.appendChild(feedbackIcon);
    feedbackMessage.appendChild(feedbackText);

    var explanationBox = document.createElement('div');
    explanationBox.className = 'timeline-screen__explanation';
    explanationBox.hidden = true;

    var explanationHeading = document.createElement('h3');
    explanationHeading.className = 'timeline-screen__explanation-heading';
    explanationHeading.textContent = strings.explanation.heading;

    var explanationInterval = document.createElement('p');
    explanationInterval.className = 'timeline-screen__explanation-interval';
    explanationInterval.hidden = true;

    var explanationClassification = document.createElement('p');
    explanationClassification.className = 'timeline-screen__explanation-classification';
    explanationClassification.hidden = true;

    explanationBox.appendChild(explanationHeading);
    explanationBox.appendChild(explanationInterval);
    explanationBox.appendChild(explanationClassification);

    var blockedIcon = document.createElement('span');
    blockedIcon.className = 'timeline-screen__blocked-icon';
    blockedIcon.setAttribute('aria-hidden', 'true');
    blockedIcon.textContent = BLOCKED_ICON;

    var blockedText = document.createElement('span');
    blockedText.className = 'timeline-screen__blocked-text';

    var blockedMessage = document.createElement('p');
    blockedMessage.className = 'timeline-screen__blocked-message';
    blockedMessage.hidden = true;
    blockedMessage.appendChild(blockedIcon);
    blockedMessage.appendChild(blockedText);

    var resultBox = document.createElement('div');
    resultBox.className = 'timeline-screen__result';
    resultBox.hidden = true;

    var resultHeading = document.createElement('h3');
    resultHeading.className = 'timeline-screen__result-heading';
    resultHeading.hidden = true;

    var resultMessage = document.createElement('p');
    resultMessage.className = 'timeline-screen__result-message';

    resultBox.appendChild(resultHeading);
    resultBox.appendChild(resultMessage);

    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'timeline-screen__next-button';
    nextButton.textContent = strings.nextButton;
    nextButton.hidden = true;

    var announcementEl = document.createElement('p');
    announcementEl.className = 'timeline-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    function evaluate(periodGuess) {
      return timelineRoundApi.evaluateRound(round, gameState, periodGuess, {
        getCreatureSheet: options.getCreatureSheet,
        logService: options.logService,
      });
    }

    function finishRound(result, chosenPeriod, chosenButton) {
      evaluatedRound = result.round;
      gameState = result.gameState;
      finished = true;
      finalScore = gameState.score;

      periodOrder.forEach(function (period) {
        periodButtons[period].disabled = true;
      });

      var announcementParts = [];
      var dinosaur = creatureName(strings, round.dinosaur);

      if (evaluatedRound.status === 'blocked') {
        periodsGroup.hidden = true;
        blockedMessage.hidden = false;
        blockedText.textContent = strings.blockedRound.message;
        announcementParts.push(formatTemplate(strings.blockedRound.announcementFormat, { dinosaur: dinosaur }));
      } else {
        var isCorrect = evaluatedRound.isCorrect;
        var explanation = evaluatedRound.explanation;
        var correctLabel = periodLabel(strings, explanation.mainPeriod);

        var correctButton = periodButtons[explanation.mainPeriod];
        if (correctButton) {
          correctButton.classList.add('timeline-screen__period-button--correct');
          correctButton.setAttribute('aria-label', formatTemplate(strings.correctOptionAriaLabelFormat, { period: correctLabel }));
        }

        if (!isCorrect && chosenButton) {
          chosenButton.classList.add('timeline-screen__period-button--selected');
          chosenButton.setAttribute(
            'aria-label',
            formatTemplate(strings.selectedOptionAriaLabelFormat, { period: periodLabel(strings, chosenPeriod) })
          );
        }

        feedbackMessage.hidden = false;
        feedbackMessage.classList.toggle('timeline-screen__feedback-message--correct', isCorrect);
        feedbackMessage.classList.toggle('timeline-screen__feedback-message--incorrect', !isCorrect);
        feedbackIcon.textContent = isCorrect ? CORRECT_ICON : INCORRECT_ICON;

        var messageFormat = isCorrect ? strings.feedback.correct : strings.feedback.incorrect;
        feedbackText.textContent = formatTemplate(messageFormat, { periodo: correctLabel });
        announcementParts.push(feedbackText.textContent);

        // Educational explanation (PRD G4): only ever shown when the
        // creature's verified ficha actually documents it -- never
        // fabricated (see the file doc comment).
        explanationBox.hidden = false;
        var intervalText = formatIntervalRange(strings, explanation.temporalRangeMillionsOfYears);
        if (intervalText) {
          explanationInterval.hidden = false;
          explanationInterval.textContent = formatTemplate(strings.explanation.interval, { intervalo: intervalText });
          announcementParts.push(explanationInterval.textContent);
        } else {
          explanationInterval.hidden = true;
        }

        if (explanation.classification === CLASSIFICATION_REPTIL_VOLADOR) {
          explanationClassification.hidden = false;
          explanationClassification.textContent = strings.explanation.pteranodon;
          announcementParts.push(strings.explanation.pteranodon);
        } else {
          explanationClassification.hidden = true;
        }

        if (playSound && soundService) {
          if (isCorrect && typeof soundService.playCorrect === 'function') {
            soundService.playCorrect();
          } else if (!isCorrect && typeof soundService.playIncorrect === 'function') {
            soundService.playIncorrect();
          }
        }
      }

      scoreEl.textContent = strings.scoreLabel + ': ' + finalScore;
      announcementParts.push(strings.scoreLabel + ': ' + finalScore);

      if (isLastRound) {
        resultHeading.hidden = false;
        resultHeading.textContent = strings.gameOver.heading;
        resultMessage.textContent = strings.gameOver.message;
        resultBox.hidden = false;
        announcementParts.push(formatTemplate(strings.gameOver.announcementFormat, { score: finalScore, total: totalRounds }));
      }

      announcementEl.textContent = announcementParts.join(' ');
      nextButton.hidden = false;

      if (typeof options.onAnswer === 'function') {
        options.onAnswer({
          round: evaluatedRound,
          gameState: gameState,
          periodGuess: chosenPeriod,
        });
      }
    }

    function handlePeriodSelected(period, button) {
      if (finished) {
        return;
      }
      finishRound(evaluate(period), period, button);
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
    root.appendChild(scoreEl);
    root.appendChild(instructions);
    root.appendChild(creature);
    root.appendChild(periodsGroup);
    root.appendChild(feedbackMessage);
    root.appendChild(explanationBox);
    root.appendChild(blockedMessage);
    root.appendChild(resultBox);
    root.appendChild(nextButton);
    root.appendChild(announcementEl);
    container.appendChild(root);

    var verified = timelineRoundApi.resolveVerifiedTimelineFicha(round.dinosaur, { getCreatureSheet: options.getCreatureSheet });

    if (verified.error) {
      finishRound(evaluate(periodOrder[0]), null, null);
    } else {
      if (playSound && soundService && typeof soundService.preload === 'function') {
        soundService.preload();
      }
      announcementEl.textContent = formatTemplate(strings.roundChangeAnnouncementFormat, {
        current: roundNumber,
        total: totalRounds,
        dinosaur: creatureName(strings, round.dinosaur),
      });
    }

    // A real Tab/Enter press targets `document.activeElement` (`<body>` by
    // default); focusing `title` (tabIndex=-1 + .focus(), same pattern as
    // classifyScreen.js/mazeScreen.js) puts an element inside `root` in
    // focus so a screen reader announces the new screen immediately.
    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      creature: creature,
      periodsGroup: periodsGroup,
      periodButtons: periodButtons,
      feedbackMessage: feedbackMessage,
      explanationBox: explanationBox,
      explanationInterval: explanationInterval,
      explanationClassification: explanationClassification,
      blockedMessage: blockedMessage,
      resultBox: resultBox,
      resultHeading: resultHeading,
      resultMessage: resultMessage,
      nextButton: nextButton,
      announcement: announcementEl,
      announcementEl: announcementEl,
      getEvaluatedRound: function () {
        return evaluatedRound;
      },
      getGameState: function () {
        return gameState;
      },
      isFinished: function () {
        return finished;
      },
      isLocked: function () {
        return false;
      },
    };
  }

  var api = {
    renderTimelineScreen: renderTimelineScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderTimelineScreen = renderTimelineScreen;
  }
})();
