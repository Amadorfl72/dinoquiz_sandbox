'use strict';

/**
 * Clasifica board screen (TRIOFSND-281): renders the creature a single round
 * carries (`round.dinosaur`, as produced by `src/game/classifyGame.js`'s
 * `startRound`) plus the three diet category controls, and drives one
 * round's answer to completion via `classifyGame.js`'s `evaluateRound` and
 * `classifyTimer.js`'s speed-bonus clock.
 *
 * Category controls (AC: "alcanzables y activables por tacto y teclado"):
 * every category is a native `<button>` inside a single `role="group"` --
 * free keyboard support (Tab reaches every button in DOM order, Enter/Space
 * activates natively, no custom keydown wiring needed), same precedent as
 * `parejasScreen.js`'s card buttons. Each button's own `aria-label` spells
 * out the category name plus a one-line description (never just the bare
 * word), so a screen-reader user gets the same context a sighted child gets
 * from the icon + label pair.
 *
 * Controlled guard (mirrors `classifyGame.js`'s own doc comment): before
 * rendering any category button this screen calls `classifyGame.js`'s pure
 * `resolveVerifiedDiet(round.dinosaur)`. When the creature's diet can't be
 * verified, the category controls are never shown at all (there is nothing
 * a correct answer could be) -- instead `evaluateRound` is invoked once,
 * immediately, with an arbitrary valid category (the blocked branch never
 * reads it, see that module's doc comment) purely to obtain the canonical
 * blocked round/diagnostic code and to fire its `classify_round_blocked`
 * log event exactly the same way a real wrong/right answer would fire
 * evaluateRound. The player is never asked to guess a category the game
 * itself cannot check.
 *
 * Error feedback (PRD hard constraint: "ninguna instrucción o estado puede
 * comunicarse únicamente mediante color, sonido o animación"): a wrong
 * guess never relies on color alone. The button for the CORRECT category
 * always gets a visible text badge, a decorative (aria-hidden) checkmark
 * icon and an updated `aria-label` ("Categoría correcta: …"); the button the
 * child actually tapped, when wrong, gets a neutral (never red) "Tu
 * respuesta: …" label. A single always-visible `feedbackMessage` paragraph
 * plus its own decorative icon restates the same outcome in one sentence,
 * and a single `role="status"`/`aria-live="polite"` region
 * (`announcementEl`, `.sr-only`, same pattern as `mazeScreen.js`/
 * `parejasScreen.js`) announces it for a screen-reader user -- one coherent
 * sentence per event, never simultaneous competing live regions. A blocked
 * round follows the exact same three-channel rule (text + icon +
 * announcement), just with its own copy instead of a correct/incorrect one.
 *
 * Sound (PRD: "todo audio debe respetar dinoquiz:muted antes de cualquier
 * reproducción"): playback is delegated entirely to `soundService.js`'s
 * `playCorrect`/`playIncorrect`, which already reads the `dinoquiz:muted`
 * localStorage flag fresh before every play -- never duplicated here. A
 * blocked round never plays a sound (there is no correct/incorrect outcome
 * to signal).
 *
 * Speed bonus (`classifyTimer.js`, TRIOFSND-280): a fresh timer is created
 * when a round actually has a category to answer (never for an
 * already-blocked round). The instant the child answers, this screen reads
 * `timer.getState().bonusEligible` -- capturing whether the answer landed
 * inside the bonus window -- and immediately calls `timer.off()` so the
 * timer's `visibilitychange` listener never outlives the round. A bonus is
 * only ever shown on a CORRECT answer, as a redundant text+icon badge (never
 * color/animation alone) folded into both the visible message and the
 * `aria-live` announcement. Scoring itself stays `classifyGame.js`'s job;
 * this screen only surfaces the bonus, it never invents extra points.
 *
 * 375px width (PRD: no horizontal scroll at any level): the three category
 * buttons stack in a single column capped at `min(100%, 320px)` in
 * main.css, and the creature illustration is capped the same way
 * `parejasScreen.js`'s card art already is, so no element grows past a
 * 375px-wide viewport.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of `public/scripts/parejasScreen.js`. Under
 * Node/Jest it `require`s the real `src/game/classifyGame.js` /
 * `src/game/classifyTimer.js` (both exercised end-to-end by this screen's
 * own tests); in a real, unbundled browser it looks for
 * `window.DinoQuiz.game.classify` / `window.DinoQuiz.game.classifyTimer` --
 * not yet registered by any file, since `classifyGame.js` transitively
 * `require`s `src/data/questionBank.js` (which reads the bank off disk with
 * `fs`) and can't be loaded as a plain `<script>` yet. A browser-runnable
 * port (mirroring `public/scripts/mazeGame.js`'s own precedent) is future
 * work; until then this screen is exercised via Node/Jest and via
 * `options.classifyGame`/`options.classifyTimer` injected directly. It
 * resolves its i18n strings from `options.strings`, or
 * `window.DinoQuiz.strings.classify` in the browser, or the `src/i18n`
 * loader under Node -- never a hardcoded string. It registers on
 * `window.DinoQuiz.screens.renderClassifyScreen`; the canonical
 * `src/screens/ClassifyScreen.js` re-exports this file.
 */

(function () {
  var DEFAULT_TOTAL_ROUNDS = 10;
  var DEFAULT_ROUND_NUMBER = 1;
  var DEFAULT_SCORE = 0;
  var IMAGE_BASE_PATH = '/assets/images/';

  // Local, decorative-only lookups (aria-hidden below, so never the sole
  // carrier of meaning) -- same precedent as mazeScreen.js's FOOD_ICON and
  // feedbackComponent.js's CORRECT_ICON/INCORRECT_ICON.
  var CATEGORY_ICON = {
    carnivoro: '🍖',
    herbivoro: '🌿',
    omnivoro: '🍽️',
  };
  var FALLBACK_CATEGORY_ORDER = ['carnivoro', 'herbivoro', 'omnivoro'];
  var CORRECT_ICON = '✅';
  var INCORRECT_ICON = '💡';
  var BLOCKED_ICON = '⚠️';
  var BONUS_ICON = '⚡';

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).classify;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.classify : null;
  }

  /** See the file doc comment's "Browser bridge" section for why this can't just `require` classifyGame.js in a real browser yet. */
  function resolveClassifyGame(options) {
    options = options || {};
    if (options.classifyGame) {
      return options.classifyGame;
    }
    if (typeof require === 'function') {
      return require('../../src/game/classifyGame');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.classify) || null;
  }

  function resolveClassifyTimer(options) {
    options = options || {};
    if (options.classifyTimer) {
      return options.classifyTimer;
    }
    if (typeof require === 'function') {
      return require('../../src/game/classifyTimer');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.classifyTimer) || null;
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

  function categoryLabel(strings, category) {
    return (strings.categories && strings.categories[category] && strings.categories[category].label) || category;
  }

  function resolveCategoryOrder(classifyGame) {
    if (classifyGame && classifyGame.CATEGORIES) {
      return Object.keys(classifyGame.CATEGORIES).map(function (key) {
        return classifyGame.CATEGORIES[key];
      });
    }
    return FALLBACK_CATEGORY_ORDER;
  }

  function renderClassifyScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var classifyGame = resolveClassifyGame(options);
    var classifyTimerApi = resolveClassifyTimer(options);
    var soundService = resolveSoundService(options);
    var playSound = options.playSound !== false;
    var categoryOrder = resolveCategoryOrder(classifyGame);

    var roundNumber = options.roundNumber || DEFAULT_ROUND_NUMBER;
    var totalRounds = options.totalRounds || DEFAULT_TOTAL_ROUNDS;
    var isLastRound = roundNumber >= totalRounds;
    var scoreBeforeRound = typeof options.score === 'number' ? options.score : DEFAULT_SCORE;

    var gameState = options.gameState || { score: scoreBeforeRound, questionIndex: round.roundIndex, answers: [] };
    var finished = false;
    var finalScore = scoreBeforeRound;
    var evaluatedRound = null;
    var timer = null;

    if (!classifyGame || typeof classifyGame.evaluateRound !== 'function' || typeof classifyGame.resolveVerifiedDiet !== 'function') {
      throw new Error('renderClassifyScreen requires classifyGame to be available (see the file doc comment)');
    }

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'classify-screen';

    var title = document.createElement('h2');
    title.className = 'classify-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var progressRow = document.createElement('div');
    progressRow.className = 'classify-screen__progress-row';

    if (typeof round.level === 'number') {
      var levelEl = document.createElement('p');
      levelEl.className = 'classify-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: round.level });
      progressRow.appendChild(levelEl);
    }

    var roundEl = document.createElement('p');
    roundEl.className = 'classify-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var instructions = document.createElement('p');
    instructions.className = 'classify-screen__instructions';
    instructions.textContent = strings.instructions;

    var creature = document.createElement('figure');
    creature.className = 'classify-screen__creature';

    var creatureImage = document.createElement('img');
    creatureImage.className = 'classify-screen__creature-image';
    creatureImage.src = IMAGE_BASE_PATH + 'dinosaurs/' + round.dinosaur + '.svg';
    creatureImage.alt = '';
    creatureImage.setAttribute('aria-hidden', 'true');

    var creatureNameEl = document.createElement('figcaption');
    creatureNameEl.className = 'classify-screen__creature-name';
    creatureNameEl.textContent = creatureName(strings, round.dinosaur);

    creature.appendChild(creatureImage);
    creature.appendChild(creatureNameEl);

    var categoriesGroup = document.createElement('div');
    categoriesGroup.className = 'classify-screen__categories';
    categoriesGroup.setAttribute('role', 'group');
    categoriesGroup.setAttribute('aria-label', strings.categoriesGroupLabel);

    var categoryButtons = {};

    categoryOrder.forEach(function (category) {
      var categoryStrings = (strings.categories && strings.categories[category]) || {};

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'classify-screen__category-button';

      var icon = document.createElement('span');
      icon.className = 'classify-screen__category-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = CATEGORY_ICON[category] || '';

      var label = document.createElement('span');
      label.className = 'classify-screen__category-label';
      label.textContent = categoryStrings.label || category;

      button.appendChild(icon);
      button.appendChild(label);
      button.setAttribute(
        'aria-label',
        formatTemplate(strings.categoryButtonAriaLabelFormat, {
          label: categoryStrings.label || category,
          description: categoryStrings.description || '',
        })
      );

      button.addEventListener('click', function () {
        handleCategorySelected(category, button);
      });

      categoriesGroup.appendChild(button);
      categoryButtons[category] = button;
    });

    var feedbackIcon = document.createElement('span');
    feedbackIcon.className = 'classify-screen__feedback-icon';
    feedbackIcon.setAttribute('aria-hidden', 'true');

    var feedbackText = document.createElement('span');
    feedbackText.className = 'classify-screen__feedback-text';

    var feedbackMessage = document.createElement('p');
    feedbackMessage.className = 'classify-screen__feedback-message';
    feedbackMessage.hidden = true;
    feedbackMessage.appendChild(feedbackIcon);
    feedbackMessage.appendChild(feedbackText);

    var bonusBadge = document.createElement('p');
    bonusBadge.className = 'classify-screen__bonus-badge';
    bonusBadge.hidden = true;

    var blockedIcon = document.createElement('span');
    blockedIcon.className = 'classify-screen__blocked-icon';
    blockedIcon.setAttribute('aria-hidden', 'true');
    blockedIcon.textContent = BLOCKED_ICON;

    var blockedText = document.createElement('span');
    blockedText.className = 'classify-screen__blocked-text';

    var blockedMessage = document.createElement('p');
    blockedMessage.className = 'classify-screen__blocked-message';
    blockedMessage.hidden = true;
    blockedMessage.appendChild(blockedIcon);
    blockedMessage.appendChild(blockedText);

    var resultBox = document.createElement('div');
    resultBox.className = 'classify-screen__result';
    resultBox.hidden = true;

    var resultHeading = document.createElement('h3');
    resultHeading.className = 'classify-screen__result-heading';
    resultHeading.hidden = true;

    var resultMessage = document.createElement('p');
    resultMessage.className = 'classify-screen__result-message';

    resultBox.appendChild(resultHeading);
    resultBox.appendChild(resultMessage);

    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'classify-screen__next-button';
    nextButton.textContent = strings.roundResult.nextButton;
    nextButton.hidden = true;

    var announcementEl = document.createElement('p');
    announcementEl.className = 'classify-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    function evaluate(category) {
      return classifyGame.evaluateRound(round, gameState, category, {
        getCreatureSheet: options.getCreatureSheet,
        logService: options.logService,
      });
    }

    function finishRound(result, chosenCategory, chosenButton) {
      evaluatedRound = result.round;
      gameState = result.gameState;
      finished = true;
      finalScore = gameState.score;

      categoryOrder.forEach(function (category) {
        categoryButtons[category].disabled = true;
      });

      var announcementParts = [];
      var dinosaur = creatureName(strings, round.dinosaur);

      if (evaluatedRound.status === 'blocked') {
        categoriesGroup.hidden = true;
        blockedMessage.hidden = false;
        blockedText.textContent = strings.blocked.message;
        announcementParts.push(formatTemplate(strings.blocked.announcementFormat, { dinosaur: dinosaur }));
      } else {
        var isCorrect = evaluatedRound.isCorrect;
        var correctLabel = categoryLabel(strings, evaluatedRound.diet);

        var correctButton = categoryButtons[evaluatedRound.diet];
        if (correctButton) {
          correctButton.classList.add('classify-screen__category-button--correct');
          correctButton.setAttribute('aria-label', formatTemplate(strings.categoryCorrectAriaLabelFormat, { label: correctLabel }));
        }

        if (!isCorrect && chosenButton) {
          chosenButton.classList.add('classify-screen__category-button--selected');
          chosenButton.setAttribute(
            'aria-label',
            formatTemplate(strings.categorySelectedAriaLabelFormat, { label: categoryLabel(strings, chosenCategory) })
          );
        }

        feedbackMessage.hidden = false;
        feedbackMessage.classList.toggle('classify-screen__feedback-message--correct', isCorrect);
        feedbackMessage.classList.toggle('classify-screen__feedback-message--incorrect', !isCorrect);
        feedbackIcon.textContent = isCorrect ? CORRECT_ICON : INCORRECT_ICON;

        var messageFormat = isCorrect ? strings.feedback.correctMessageFormat : strings.feedback.incorrectMessageFormat;
        feedbackText.textContent = formatTemplate(messageFormat, {
          dinosaur: dinosaur,
          category: correctLabel,
          yourCategory: categoryLabel(strings, chosenCategory),
        });
        announcementParts.push(feedbackText.textContent);

        var timerState = timer && typeof timer.getState === 'function' ? timer.getState() : null;
        var bonusEligible = Boolean(isCorrect && timerState && timerState.bonusEligible);
        if (bonusEligible) {
          bonusBadge.hidden = false;
          bonusBadge.textContent = BONUS_ICON + ' ' + strings.feedback.bonusMessage;
          announcementParts.push(strings.feedback.bonusMessage);
        }

        if (playSound && soundService) {
          if (isCorrect && typeof soundService.playCorrect === 'function') {
            soundService.playCorrect();
          } else if (!isCorrect && typeof soundService.playIncorrect === 'function') {
            soundService.playIncorrect();
          }
        }
      }

      if (timer && typeof timer.off === 'function') {
        timer.off();
      }

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
          category: chosenCategory,
        });
      }
    }

    function handleCategorySelected(category, button) {
      if (finished) {
        return;
      }
      finishRound(evaluate(category), category, button);
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
    root.appendChild(creature);
    root.appendChild(categoriesGroup);
    root.appendChild(feedbackMessage);
    root.appendChild(bonusBadge);
    root.appendChild(blockedMessage);
    root.appendChild(resultBox);
    root.appendChild(nextButton);
    root.appendChild(announcementEl);
    container.appendChild(root);

    var verified = classifyGame.resolveVerifiedDiet(round.dinosaur, { getCreatureSheet: options.getCreatureSheet });

    if (verified.error) {
      finishRound(evaluate(categoryOrder[0]), null, null);
    } else {
      if (classifyTimerApi && typeof classifyTimerApi.createTimer === 'function') {
        timer = options.timer || classifyTimerApi.createTimer(options.timerOptions);
      }
      // Eagerly creates both Audio elements now (mirrors questionScreen.js's
      // own preload-on-mount) so the child's first tap never pays a
      // first-run allocation/decode cost.
      if (soundService && typeof soundService.preload === 'function') {
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
    // mazeScreen.js/modeSelectorScreen.js) puts an element inside `root` in
    // focus so a screen reader announces the new screen immediately.
    if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      creature: creature,
      categoriesGroup: categoriesGroup,
      categoryButtons: categoryButtons,
      feedbackMessage: feedbackMessage,
      bonusBadge: bonusBadge,
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
    };
  }

  var api = {
    renderClassifyScreen: renderClassifyScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderClassifyScreen = renderClassifyScreen;
  }
})();
