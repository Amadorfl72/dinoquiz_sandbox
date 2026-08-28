'use strict';

/**
 * Adivina la sombra board screen (TRIOFSND-263): renders one round's
 * silhouette puzzle (`round.correctId`/`round.options`/`round.transform`, as
 * produced by `src/game/shadowGuessRound.js`'s `generateShadowRound`) and
 * drives that round's four-option guess to completion, following the same
 * per-round-render pattern as questionScreen.js (one call renders one round;
 * the caller decides when/how to move to the next).
 *
 * Silhouette rendering: no new image asset is needed -- the same cartoon
 * illustration Parejas jurásicas already shows
 * (`public/assets/images/dinosaurs/<id>.svg`, see parejasScreen.js) is
 * reused here with a CSS filter (`.shadow-guess-screen__silhouette-image`,
 * main.css) that blacks it out into a silhouette regardless of the source
 * artwork's own colors, so this mode never needs a second, license-encumbered
 * asset per creature. `round.transform` (one of shadowGuessRound.js's
 * SHADOW_TRANSFORMS values, or `null` for identity) is applied as a CSS
 * class modifier (`--flip`/`--rotate-90`/`--rotate-180`) -- the values are a
 * small local literal copy, not a `require` of src/data/creatureSheet.js:
 * that module's require chain reaches `src/data/questionBank.js`, which
 * reads the bank off disk with `fs` and cannot run as a plain `<script>` in
 * this no-bundler browser (see gameFlow.js's own doc comment on the same
 * constraint) -- exactly the reasoning mazeScreen.js already documents for
 * keeping its own local copy of mazeGenerator.js's wall model instead of
 * requiring that module directly.
 *
 * The silhouette `<img>` is `alt="" aria-hidden="true"`: it is the puzzle
 * itself (revealing what it depicts in text would give the answer away), and
 * a screen-reader player still gets the full task from `strings.instructions`
 * plus each option button's own accessible name -- nothing about the
 * silhouette's shape is required to play, only which option to pick.
 *
 * Four accessible options (AC: "etiqueta accesible, área táctil apta para 6
 * años, operables por teclado y tacto"): each is a native `<button>` (free
 * keyboard support -- Tab order, Enter/Space activation -- and native touch
 * handling, no custom keydown wiring needed, same reasoning parejasScreen.js
 * documents for its own card buttons) sized to the shared
 * `--tap-target-min` (48px) floor every mode's controls use. Visible text is
 * the creature's display name (`strings.dinosaurNames`); the `aria-label` is
 * built from `strings.options.option<N>Label` (`"Opción {n}: {creature}"`),
 * announcing the option's position -- never just the bare name -- so a
 * screen-reader user always knows which of the four they are about to
 * activate.
 *
 * Counted once (AC: "cuenta la respuesta una sola vez"): `answered` guards
 * `handleSelect`, mirroring questionScreen.js's own local flag -- a second
 * tap/keypress on any option after the first is a no-op.
 *
 * Feedback (PRD hard constraint: "ninguna instrucción o estado puede
 * comunicarse únicamente mediante color, sonido o animación"): the outcome is
 * rendered through `feedbackComponent.js` (`renderFeedbackComponent`) --
 * text + icon + a `role="status"`/`aria-live="polite"` announcement, plus a
 * muted-aware sound via that component's own soundService integration --
 * instead of this screen hand-rolling that pattern a fourth time (Quiz,
 * Parejas, Laberinto already lean on questionScreen.js/parejasScreen.js's
 * own local versions; feedbackComponent.js exists precisely so shadowGuess
 * and the remaining modes reuse the one implementation, see that file's own
 * doc comment). On a miss, `feedback.correctAnswer` ("La respuesta correcta
 * era {creature}.") is passed as the component's `detail`, so the sr-only
 * announcement spells out the right creature in words, never relying on the
 * green border alone (mirrors questionScreen.js's TRIOFSND-90 fix). The
 * correct option additionally gets a descriptive `aria-label`
 * (`correctOptionAriaLabelFormat`) when it wasn't the one tapped, and the
 * tapped wrong option gets a neutral "Tu respuesta: …" label
 * (`selectedOptionAriaLabelFormat`) -- same two-label pattern as
 * questionScreen.js's own miss handling.
 *
 * 10-round contract (PRD "contrato técnico ... común para los modos"): the
 * round this screen renders always comes from shadowGuessRound.js's
 * `generateShadowRound`, which already enforces the shared ROUNDS_PER_GAME
 * (10) shape and the mode's own catalog/geometry safety checks -- this
 * screen never re-derives round content, only draws whatever it is given.
 * Scoring reuses scoring.js's `applyAnswerToScore` verbatim (the same +1/+0,
 * never-penalize rule every mode shares), so a caller can feed the final
 * score straight into scoring.js's `normalizeOutcome` for the shared
 * percentage/star tier once all 10 rounds are done, exactly like the other
 * modes already do via their own `onNext`/`onGameOver` score callbacks.
 *
 * Blocked state (AC: "mostrar el estado bloqueado localizado cuando el
 * catálogo es insuficiente"): modeSelectorScreen.js already keeps a child
 * from entering this mode at all while the catalog is too small
 * (modesCatalog.js's own MIN_CREATURES check), but `generateShadowRound`
 * can still report `round.error` (catalog/geometry too small once here --
 * see shadowGuessRound.js's ERRORS) as a second, defense-in-depth guard.
 * Given such a round (or no round at all), this screen renders the
 * localized `strings.blocked.insufficientCatalog` message instead of a
 * broken/partial puzzle -- text plus a decorative lock icon, in a
 * `role="status"`/`aria-live="polite"` region, never a silent blank screen.
 *
 * 375px width (PRD: "sin desplazamiento horizontal"): the silhouette frame
 * and the two-column options grid are both capped the same way
 * question-screen__options already proves out at 375px (main.css) --
 * no per-level sizing logic needed since every round always shows exactly
 * OPTIONS_PER_ROUND (4) options.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen -- which the
 * browser actually runs -- lives under `public/` and follows the dual
 * CommonJS/global pattern of public/scripts/questionScreen.js. It resolves
 * its i18n strings from `options.strings`, or
 * `window.DinoQuiz.strings.shadowGuess` in the browser, or the `src/i18n`
 * loader under Node -- never a hardcoded string. It registers on
 * `window.DinoQuiz.screens.renderShadowGuessScreen`; the canonical
 * `src/screens/ShadowGuessScreen.js` re-exports this file.
 */

(function () {
  var OPTION_CLASS = 'shadow-guess-screen__option';
  var CORRECT_CLASS = 'shadow-guess-screen__option--correct';
  var NEUTRAL_CLASS = 'shadow-guess-screen__option--neutral';

  var IMAGE_BASE_PATH = '/assets/images/';
  var DEFAULT_TOTAL_ROUNDS = 10;
  var DEFAULT_ROUND_NUMBER = 1;
  var DEFAULT_SCORE = 0;

  // Local literal copy of shadowGuessRound.js's SHADOW_TRANSFORMS values
  // (see the file doc comment for why this can't just `require` that
  // module's own dependency chain in a real browser). Any transform not
  // listed here (including `null`, identity) renders with no modifier class.
  var TRANSFORM_MODIFIER_CLASS = {
    flipHorizontal: 'shadow-guess-screen__silhouette-image--flip',
    rotate90: 'shadow-guess-screen__silhouette-image--rotate-90',
    rotate180: 'shadow-guess-screen__silhouette-image--rotate-180',
  };

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).shadowGuess;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.shadowGuess : null;
  }

  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  function resolveFeedbackComponent(options) {
    options = options || {};
    if (options.feedbackComponent) {
      return options.feedbackComponent;
    }
    if (typeof require === 'function') {
      return require('./feedbackComponent');
    }
    return (
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.components && window.DinoQuiz.components.feedbackComponent) ||
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

  function creatureName(strings, creatureId) {
    return (strings.dinosaurNames && strings.dinosaurNames[creatureId]) || creatureId;
  }

  function silhouetteImageClassName(transform) {
    var modifier = TRANSFORM_MODIFIER_CLASS[transform];
    return modifier ? 'shadow-guess-screen__silhouette-image ' + modifier : 'shadow-guess-screen__silhouette-image';
  }

  function renderBlockedState(container, root, strings) {
    var blocked = document.createElement('div');
    blocked.className = 'shadow-guess-screen__blocked';

    var icon = document.createElement('span');
    icon.className = 'shadow-guess-screen__blocked-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔒';

    var message = document.createElement('p');
    message.className = 'shadow-guess-screen__blocked-message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = strings.blocked.insufficientCatalog;

    blocked.appendChild(icon);
    blocked.appendChild(message);
    root.appendChild(blocked);
    container.appendChild(root);

    return {
      root: root,
      blocked: blocked,
      blockedMessage: message,
      isBlocked: function () {
        return true;
      },
    };
  }

  function renderShadowGuessScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var scoring = resolveScoring();
    var feedbackComponentApi = resolveFeedbackComponent(options);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'shadow-guess-screen';

    var title = document.createElement('h2');
    title.className = 'shadow-guess-screen__title';
    title.textContent = strings.name;
    root.appendChild(title);

    // Defense-in-depth blocked state (AC): a round-generation failure (or no
    // round at all) never renders a broken/partial puzzle.
    if (!round || round.error) {
      return renderBlockedState(container, root, strings);
    }

    var roundNumber = options.roundNumber || DEFAULT_ROUND_NUMBER;
    var totalRounds = options.totalRounds || DEFAULT_TOTAL_ROUNDS;
    var scoreBeforeRound = typeof options.score === 'number' ? options.score : DEFAULT_SCORE;
    var score = scoreBeforeRound;
    var answered = false;

    var instructions = document.createElement('p');
    instructions.className = 'shadow-guess-screen__instructions';
    instructions.textContent = strings.instructions;

    var progressRow = document.createElement('div');
    progressRow.className = 'shadow-guess-screen__progress-row';

    var levelEl = null;
    if (typeof round.level === 'number') {
      levelEl = document.createElement('p');
      levelEl.className = 'shadow-guess-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: round.level });
      progressRow.appendChild(levelEl);
    }

    var roundEl = document.createElement('p');
    roundEl.className = 'shadow-guess-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var scoreEl = document.createElement('p');
    scoreEl.className = 'shadow-guess-screen__score';
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var silhouetteFrame = document.createElement('div');
    silhouetteFrame.className = 'shadow-guess-screen__silhouette-frame';

    var silhouetteImage = document.createElement('img');
    silhouetteImage.className = silhouetteImageClassName(round.transform);
    silhouetteImage.src = IMAGE_BASE_PATH + 'dinosaurs/' + round.correctId + '.svg';
    // Decorative puzzle graphic (see file doc comment): the answer must
    // never leak through alt text, and strings.instructions already tells a
    // screen-reader player everything needed to play from the options alone.
    silhouetteImage.alt = '';
    silhouetteImage.setAttribute('aria-hidden', 'true');
    silhouetteImage.decoding = 'async';
    silhouetteFrame.appendChild(silhouetteImage);

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'shadow-guess-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    var feedbackMount = document.createElement('div');
    feedbackMount.className = 'shadow-guess-screen__feedback-mount';
    var feedbackComponent = feedbackComponentApi
      ? feedbackComponentApi.renderFeedbackComponent(feedbackMount, {
          strings: {
            correct: { message: strings.feedback.correct },
            incorrect: { message: strings.feedback.incorrect },
          },
          soundService: options.soundService,
        })
      : null;

    var announcementEl = document.createElement('p');
    announcementEl.className = 'shadow-guess-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'shadow-guess-screen__next-button';
    nextButton.textContent = strings.nextButton;
    nextButton.hidden = true;

    var optionButtons = round.options.map(function (creatureId, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = OPTION_CLASS;
      button.textContent = creatureName(strings, creatureId);
      var labelFormat = strings.options['option' + (index + 1) + 'Label'];
      button.setAttribute('aria-label', formatTemplate(labelFormat, { creature: creatureName(strings, creatureId) }));
      button.addEventListener('click', function () {
        handleSelect(index, creatureId);
      });
      optionsGroup.appendChild(button);
      return button;
    });

    function handleSelect(selectedIndex, selectedCreatureId) {
      if (answered) return;
      answered = true;

      var correct = selectedCreatureId === round.correctId;
      var previousScore = score;
      score = scoring.applyAnswerToScore(score, correct);
      var correctCreatureName = creatureName(strings, round.correctId);
      var detail = correct ? null : formatTemplate(strings.feedback.correctAnswer, { creature: correctCreatureName });

      optionButtons.forEach(function (button, index) {
        button.disabled = true;
        var creatureId = round.options[index];

        if (creatureId === round.correctId) {
          button.classList.add(CORRECT_CLASS);
          if (!correct) {
            // Descriptive label (mirrors questionScreen.js TRIOFSND-90):
            // a screen reader announces this as the correct answer even
            // without seeing the green border.
            button.setAttribute('aria-label', formatTemplate(strings.correctOptionAriaLabelFormat, { creature: creatureName(strings, creatureId) }));
          }
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
          // Neutral label (never "wrong"/"incorrect") for the tapped option.
          button.setAttribute('aria-label', formatTemplate(strings.selectedOptionAriaLabelFormat, { creature: creatureName(strings, creatureId) }));
        }
      });

      scoreEl.textContent = strings.scoreLabel + ': ' + score;

      var result = feedbackComponent ? feedbackComponent.showResult({ isCorrect: correct, detail: detail, score: score }) : null;

      var announcementParts = [correct ? strings.feedback.correct : strings.feedback.incorrect];
      if (detail) {
        announcementParts.push(detail);
      }
      announcementParts.push(strings.scoreLabel + ': ' + score);
      announcementEl.textContent = announcementParts.join(' ');

      nextButton.hidden = false;

      if (typeof options.onAnswer === 'function') {
        options.onAnswer({
          isCorrect: correct,
          scoreDelta: score - previousScore,
          score: score,
          selectedId: selectedCreatureId,
          correctId: round.correctId,
          result: result,
        });
      }
    }

    nextButton.addEventListener('click', function () {
      if (typeof options.onNext === 'function') {
        options.onNext(score);
      }
    });

    root.appendChild(instructions);
    root.appendChild(progressRow);
    root.appendChild(scoreEl);
    root.appendChild(silhouetteFrame);
    root.appendChild(optionsGroup);
    root.appendChild(feedbackMount);
    root.appendChild(announcementEl);
    root.appendChild(nextButton);
    container.appendChild(root);

    return {
      root: root,
      title: title,
      instructions: instructions,
      progressRow: progressRow,
      levelEl: levelEl,
      roundEl: roundEl,
      scoreEl: scoreEl,
      silhouetteFrame: silhouetteFrame,
      silhouetteImage: silhouetteImage,
      optionsGroup: optionsGroup,
      optionButtons: optionButtons,
      feedbackComponent: feedbackComponent,
      announcementEl: announcementEl,
      announcement: announcementEl,
      nextButton: nextButton,
      getScore: function () {
        return score;
      },
      isAnswered: function () {
        return answered;
      },
      isBlocked: function () {
        return false;
      },
    };
  }

  var api = {
    renderShadowGuessScreen: renderShadowGuessScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderShadowGuessScreen = renderShadowGuessScreen;
  }
})();
