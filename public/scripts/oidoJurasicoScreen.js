'use strict';

/**
 * Oído Jurásico screen (TRIOFSND-270): the pre-game explanation, the
 * per-round board (play/repeat + four-option guess) and the round-generation
 * logic for the "listen to an imagined sound, guess the creature" mode.
 *
 * Round generation lives in this same file rather than a separate
 * `src/game/` module (unlike e.g. shadowGuessRound.js): the real per-creature
 * data this mode needs -- which ids have a sound asset -- is just the fixed
 * set of `.wav` files under `public/assets/sounds/oido-jurasico/` (see that
 * folder's own CREDITS.md), so there is no `fs`/questionBank-shaped catalog
 * this screen would otherwise be unable to `require` in a real, bundler-less
 * browser (the same constraint shadowGuessScreen.js's own doc comment
 * documents for why it keeps a local literal copy of transform data instead
 * of requiring creatureSheet.js's Node-only chain).
 *
 * `generateOidoJurasicoRound(roundIndex, context)` matches the exact
 * `(roundIndex, context)` signature `src/game/roundContract.js`'s
 * `startGame({ generateRound, context })` calls -- so a caller (main.js) can
 * hand it straight to the shared 10-round contract instead of hand-rolling a
 * "start/evaluate/advance" loop a ninth time: the contract's own
 * `evaluateAnswer` already rejects a second answer for the same round (AC:
 * "selección de respuesta sin doble conteo"), and `advanceRound` is what
 * enforces the game ends at exactly ROUNDS_PER_GAME (10) rounds. `context`
 * (built once per game by `buildOidoJurasicoRoundContext`) is a single
 * mutable object the contract passes back unchanged on every call; this
 * module deliberately writes `context.previousCorrectId` on each round it
 * generates so the *next* call never repeats the same creature back to back,
 * mirroring `shadowGuessRound.js generateShadowRounds`'s own
 * previousDinosaurId threading, just done in-place instead of by an outer
 * loop (roundContract calls this one round at a time, not all ten up front).
 *
 * Pre-game explanation (PRD G4: "Oído Jurásico presenta los sonidos
 * explícitamente como imaginados", AC "explicación previa localizada antes
 * de la primera partida"): `renderOidoJurasicoIntro` renders the
 * `imaginedSoundNotice` copy (already shipped for TRIOFSND-269's audio
 * service) as a full pre-game screen with a single continue button --
 * `hasSeenIntro`/`markIntroSeen` persist a namespaced
 * (`dinoquiz:oidoJurasico:introSeen`) per-device flag so the caller only
 * renders it once, ever, before the very first game (see main.js's
 * `renderOidoJurasicoRoute`), never again on replays.
 *
 * Validation/blocked state (AC: "bloqueo controlado y accesible con vuelta
 * al selector si falta un recurso"): `generateOidoJurasicoRound` returns
 * `{ error: ERRORS.CATALOG_TOO_SMALL }` instead of a round when fewer than
 * OPTIONS_PER_ROUND (4) creature sounds are available, and
 * `renderOidoJurasicoScreen` renders a localized blocked message plus a
 * "back to selector" button instead of a broken board when handed such a
 * round (or none at all) -- mirrors shadowGuessScreen.js's own
 * `renderBlockedState`, just with the extra back button this AC asks for.
 * A *runtime* playback failure (a throwing/rejecting `Audio`, surfaced by
 * oidoJurasicoAudioService.js's `onError`) blocks the same way, via its own
 * `playbackError` panel with the same back button, instead of leaving the
 * child stuck on a dead play button.
 *
 * Mute (PRD: "todo audio debe respetar dinoquiz:muted antes de cualquier
 * reproducción"; AC "aviso de dinoquiz:muted con opciones de activar sonido
 * o volver"): before rendering the playable board this screen checks
 * `audioService.isMuted()` up front -- i.e. before any playback is even
 * attempted -- and if muted shows the `mutedNotice` panel (heading, message,
 * "Activar sonido"/"Volver al selector") instead of the board. The same
 * panel is shown reactively if a mid-round mute toggle makes a later
 * play/repeat tap come back muted (oidoJurasicoAudioService.js re-checks the
 * flag fresh on every attempt): the `onMuted` callback wired into the
 * service this screen creates swaps the same two panels' visibility rather
 * than tearing the round down. "Activar sonido" writes the mute flag off
 * (via appShell.js's own `writeStoredMute`, the single place that key format
 * is defined) and reveals the board again without losing the round in
 * progress; "Volver al selector" calls `options.onBack`.
 *
 * Feedback (PRD: "ninguna instrucción o estado puede comunicarse únicamente
 * mediante color, sonido o animación"; AC "feedback por texto+icono+anuncio
 * accesible que refuerza que el sonido es una interpretación"): outcomes
 * render through feedbackComponent.js (text + icon + its own muted-aware
 * sound), same as shadowGuessScreen.js/mazeScreen.js's sibling modes, and
 * this screen's own `role="status"` announcement -- which always appends
 * `answerReinforcement.message` (G4's "not a proven reconstruction"
 * reminder), win or lose, every round, not just on a miss.
 *
 * Counted once (AC): `answered` guards `handleSelect` exactly like
 * shadowGuessScreen.js's own local flag; roundContract.js's own
 * `evaluateAnswer` (used by the caller) is a second, independent guard.
 *
 * Keyboard/accessible controls (AC): every control is a native `<button>`
 * (free keyboard support, no custom keydown wiring needed, same reasoning
 * shadowGuessScreen.js/parejasScreen.js document for their own buttons), the
 * options group and every notice/message region carry the same
 * role="group"/role="status" pattern the rest of the app already uses, and
 * focus moves to the screen's own heading on mount so a screen-reader/
 * keyboard player lands somewhere meaningful without hunting for it.
 *
 * 375px width (PRD): layout (title/instructions/progress, sound panel, a
 * 2-column options grid) mirrors shadow-guess-screen's own proven-safe
 * layout (main.css), which already fits 375px without horizontal scroll.
 *
 * Browser bridge: no bundler, so this file follows the same dual
 * CommonJS/`window.DinoQuiz` pattern as shadowGuessScreen.js/mazeScreen.js.
 * `module.exports`/`window.DinoQuiz.game.oidoJurasico` expose the whole api
 * (round generation included) for main.js's game-logic resolver; the render
 * functions are additionally mirrored flat onto `window.DinoQuiz.screens`
 * for `resolveScreenRenderers`'s dictionary, matching every sibling screen.
 * The canonical `src/screens/OidoJurasicoScreen.js` re-exports this file.
 */

(function () {
  var OPTION_CLASS = 'oido-jurasico-screen__option';
  var CORRECT_CLASS = 'oido-jurasico-screen__option--correct';
  var NEUTRAL_CLASS = 'oido-jurasico-screen__option--neutral';

  var DEFAULT_TOTAL_ROUNDS = 10;
  var DEFAULT_ROUND_NUMBER = 1;
  var DEFAULT_SCORE = 0;

  var SOUND_BASE_PATH = '/assets/sounds/oido-jurasico/';
  var OPTIONS_PER_ROUND = 4;

  // The fixed set of creatures with an actual "imagined sound" asset (see
  // public/assets/sounds/oido-jurasico/CREDITS.md) -- every id here has a
  // matching public/i18n/*.json oidoJurasico.dinosaurNames entry and a
  // `<id>.wav` file, and every one of those files is precached
  // (public/service-worker.js) for 100% offline play.
  var SOUND_CREATURE_IDS = Object.freeze([
    'trex',
    'triceratops',
    'velociraptor',
    'estegosaurio',
    'braquiosaurio',
    'ankylosaurus',
    'pteranodon',
    'spinosaurus',
    'dilophosaurus',
    'pachycephalosaurus',
    'compsognathus',
    'diplodocus',
    'iguanodon',
    'parasaurolophus',
  ]);

  var ERRORS = Object.freeze({
    CATALOG_TOO_SMALL: 'oido_jurasico_round_catalog_too_small',
  });

  var INTRO_SEEN_STORAGE_KEY = 'dinoquiz:oidoJurasico:introSeen';

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).oidoJurasico;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.oidoJurasico : null;
  }

  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
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

  function resolveAudioServiceModule(options) {
    options = options || {};
    if (options.audioServiceModule) {
      return options.audioServiceModule;
    }
    if (typeof require === 'function') {
      return require('./oidoJurasicoAudioService');
    }
    return (
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.oidoJurasicoAudioService) ||
      null
    );
  }

  function resolveAppShell(options) {
    options = options || {};
    if (options.appShell) {
      return options.appShell;
    }
    if (typeof require === 'function') {
      return require('./appShell');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.appShell) || null;
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

  /** Whether `dinoquiz:oidoJurasico:introSeen` was already recorded on this device -- never throws (private-browsing/no-storage degrades to "not seen"). */
  function hasSeenIntro(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }
    try {
      return storageObj.getItem(INTRO_SEEN_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  /** Records that the pre-game "sonido imaginado" explanation was shown, so it never shows again on this device. */
  function markIntroSeen(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }
    try {
      storageObj.setItem(INTRO_SEEN_STORAGE_KEY, 'true');
    } catch (error) {
      // Storage unavailable (e.g. private browsing): the explanation simply
      // shows again next time, which is safe (never blocks play).
    }
  }

  /** Picks the round's correct creature: uniform random from `pool`, excluding `previousCorrectId` when the pool has another option -- never the same target two rounds in a row. */
  function pickTarget(previousCorrectId, pool, randomFn) {
    var candidates = pool.length > 1 ? pool.filter(function (id) { return id !== previousCorrectId; }) : pool;
    var index = Math.floor(randomFn() * candidates.length);
    return candidates[Math.min(index, candidates.length - 1)];
  }

  /** Picks `count` creatures from `pool`, distinct from `targetId`, shuffled via gameFlow.js's shuffle (never reimplemented here). */
  function pickDistractors(targetId, pool, count, randomFn) {
    var gameFlowApi = resolveGameFlow();
    var others = pool.filter(function (id) { return id !== targetId; });
    var shuffled = gameFlowApi && typeof gameFlowApi.shuffle === 'function' ? gameFlowApi.shuffle(others, randomFn) : others.slice();
    return shuffled.slice(0, count);
  }

  /**
   * Builds the mutable, per-game context `generateOidoJurasicoRound` reads
   * and writes across the whole game (see this file's own doc comment).
   * `options.creatureIds` overrides the default sound pool (tests only --
   * production always plays the full shipped SOUND_CREATURE_IDS).
   */
  function buildOidoJurasicoRoundContext(options) {
    options = options || {};
    var pool = Array.isArray(options.creatureIds) && options.creatureIds.length > 0 ? options.creatureIds : SOUND_CREATURE_IDS;
    return {
      creatureIds: pool,
      randomFn: options.randomFn || Math.random,
      previousCorrectId: null,
    };
  }

  /**
   * Generates round `roundIndex` (0-based) of an Oído Jurásico game. Matches
   * roundContract.js's `generateRound(roundIndex, context)` signature (see
   * file doc comment). Returns `{ error: ERRORS.CATALOG_TOO_SMALL, details }`
   * -- never a partial/guessed round -- when `context.creatureIds` can't
   * even fill OPTIONS_PER_ROUND (4) choices.
   */
  function generateOidoJurasicoRound(roundIndex, context) {
    context = context || {};
    var pool = Array.isArray(context.creatureIds) && context.creatureIds.length > 0 ? context.creatureIds : SOUND_CREATURE_IDS;
    var randomFn = context.randomFn || Math.random;

    if (pool.length < OPTIONS_PER_ROUND) {
      return { error: ERRORS.CATALOG_TOO_SMALL, details: { need: OPTIONS_PER_ROUND, have: pool.length } };
    }

    var correctId = pickTarget(context.previousCorrectId, pool, randomFn);
    context.previousCorrectId = correctId;

    var distractors = pickDistractors(correctId, pool, OPTIONS_PER_ROUND - 1, randomFn);
    var gameFlowApi = resolveGameFlow();
    var shuffledOptions =
      gameFlowApi && typeof gameFlowApi.shuffle === 'function'
        ? gameFlowApi.shuffle([correctId].concat(distractors), randomFn)
        : [correctId].concat(distractors);

    return {
      roundIndex: roundIndex,
      correctId: correctId,
      options: shuffledOptions,
      soundUrl: SOUND_BASE_PATH + correctId + '.wav',
      status: 'playing',
    };
  }

  /**
   * Renders the localized pre-game explanation (AC: "explicación previa
   * localizada antes de la primera partida"): the same `imaginedSoundNotice`
   * copy oidoJurasicoAudioService.js's own doc comment already points to,
   * shown as its own screen with a single continue button. Callers decide
   * *whether* to show this (via `hasSeenIntro`) -- this function always
   * renders it when called.
   */
  function renderOidoJurasicoIntro(container, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var notice = strings.imaginedSoundNotice;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'oido-jurasico-intro';

    var icon = document.createElement('span');
    icon.className = 'oido-jurasico-intro__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🎧';

    var heading = document.createElement('h2');
    heading.className = 'oido-jurasico-intro__heading';
    heading.textContent = notice.heading;
    heading.tabIndex = -1;

    var message = document.createElement('p');
    message.className = 'oido-jurasico-intro__message';
    message.textContent = notice.message;

    var continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'oido-jurasico-intro__continue-button';
    continueButton.textContent = notice.continueButton;
    continueButton.setAttribute('aria-label', notice.continueButtonAriaLabel);
    continueButton.addEventListener('click', function () {
      if (typeof options.onContinue === 'function') {
        options.onContinue();
      }
    });

    root.appendChild(icon);
    root.appendChild(heading);
    root.appendChild(message);
    root.appendChild(continueButton);
    container.appendChild(root);

    if (typeof heading.focus === 'function') {
      heading.focus();
    }

    return { root: root, heading: heading, message: message, continueButton: continueButton };
  }

  function renderBlockedState(container, root, strings, options) {
    var blocked = document.createElement('div');
    blocked.className = 'oido-jurasico-screen__blocked';

    var icon = document.createElement('span');
    icon.className = 'oido-jurasico-screen__blocked-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔒';

    var message = document.createElement('p');
    message.className = 'oido-jurasico-screen__blocked-message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.textContent = strings.blocked.insufficientCatalog;

    var backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'oido-jurasico-screen__back-button';
    backButton.textContent = strings.blocked.backButtonLabel;
    backButton.addEventListener('click', function () {
      if (typeof options.onBack === 'function') {
        options.onBack();
      }
    });

    blocked.appendChild(icon);
    blocked.appendChild(message);
    blocked.appendChild(backButton);
    root.appendChild(blocked);
    container.appendChild(root);

    return {
      root: root,
      blocked: blocked,
      blockedMessage: message,
      backButton: backButton,
      isBlocked: function () {
        return true;
      },
    };
  }

  function renderOidoJurasicoScreen(container, round, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var scoring = resolveScoring();
    var feedbackComponentApi = resolveFeedbackComponent(options);
    var audioServiceModule = resolveAudioServiceModule(options);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'oido-jurasico-screen';

    var title = document.createElement('h2');
    title.className = 'oido-jurasico-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;
    root.appendChild(title);

    // Defense-in-depth blocked state (AC): a round-generation failure (or no
    // round at all) never renders a broken/partial board.
    if (!round || round.error) {
      return renderBlockedState(container, root, strings, options);
    }

    var roundNumber = options.roundNumber || DEFAULT_ROUND_NUMBER;
    var totalRounds = options.totalRounds || DEFAULT_TOTAL_ROUNDS;
    var scoreBeforeRound = typeof options.score === 'number' ? options.score : DEFAULT_SCORE;
    var score = scoreBeforeRound;
    var answered = false;
    var hasPlayedOnce = false;

    var instructions = document.createElement('p');
    instructions.className = 'oido-jurasico-screen__instructions';
    instructions.textContent = strings.instructions;

    var progressRow = document.createElement('div');
    progressRow.className = 'oido-jurasico-screen__progress-row';

    var roundEl = document.createElement('p');
    roundEl.className = 'oido-jurasico-screen__round';
    roundEl.textContent = formatTemplate(strings.roundFormat, { current: roundNumber, total: totalRounds });
    progressRow.appendChild(roundEl);

    var scoreEl = document.createElement('p');
    scoreEl.className = 'oido-jurasico-screen__score';
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var soundPanel = document.createElement('div');
    soundPanel.className = 'oido-jurasico-screen__sound-panel';

    var playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'oido-jurasico-screen__play-button';
    playButton.textContent = strings.playButton;
    playButton.setAttribute('aria-label', strings.playButtonAriaLabel);
    soundPanel.appendChild(playButton);

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'oido-jurasico-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    // Muted notice (AC: "aviso de dinoquiz:muted con opciones de activar
    // sonido o volver"): hidden unless muted, shown instead of (never
    // alongside) the playable board -- guessing a sound you can't hear isn't
    // meaningful play.
    var mutedSection = document.createElement('div');
    mutedSection.className = 'oido-jurasico-screen__muted-notice';
    mutedSection.hidden = true;

    var mutedHeading = document.createElement('h3');
    mutedHeading.className = 'oido-jurasico-screen__muted-heading';
    mutedHeading.textContent = strings.mutedNotice.heading;
    mutedHeading.tabIndex = -1;

    var mutedMessage = document.createElement('p');
    mutedMessage.className = 'oido-jurasico-screen__muted-message';
    mutedMessage.setAttribute('role', 'status');
    mutedMessage.setAttribute('aria-live', 'polite');
    mutedMessage.textContent = strings.mutedNotice.message;

    var unmuteButton = document.createElement('button');
    unmuteButton.type = 'button';
    unmuteButton.className = 'oido-jurasico-screen__unmute-button';
    unmuteButton.textContent = strings.mutedNotice.unmuteButton;

    var mutedBackButton = document.createElement('button');
    mutedBackButton.type = 'button';
    mutedBackButton.className = 'oido-jurasico-screen__back-button';
    mutedBackButton.textContent = strings.mutedNotice.backButton;

    mutedSection.appendChild(mutedHeading);
    mutedSection.appendChild(mutedMessage);
    mutedSection.appendChild(unmuteButton);
    mutedSection.appendChild(mutedBackButton);

    // Playback error (AC: "bloqueo controlado ... si falta un recurso"):
    // hidden unless oidoJurasicoAudioService.js reports a real failure to
    // play the round's sound.
    var errorSection = document.createElement('div');
    errorSection.className = 'oido-jurasico-screen__error-notice';
    errorSection.hidden = true;

    var errorMessage = document.createElement('p');
    errorMessage.className = 'oido-jurasico-screen__error-message';
    errorMessage.setAttribute('role', 'status');
    errorMessage.setAttribute('aria-live', 'polite');
    errorMessage.textContent = strings.playbackError.message;

    var errorBackButton = document.createElement('button');
    errorBackButton.type = 'button';
    errorBackButton.className = 'oido-jurasico-screen__back-button';
    errorBackButton.textContent = strings.playbackError.backButton;

    errorSection.appendChild(errorMessage);
    errorSection.appendChild(errorBackButton);

    function showMutedNotice() {
      mutedSection.hidden = false;
      soundPanel.hidden = true;
      optionsGroup.hidden = true;
      if (typeof mutedHeading.focus === 'function') {
        mutedHeading.focus();
      }
    }

    function showErrorNotice() {
      errorSection.hidden = false;
      soundPanel.hidden = true;
      optionsGroup.hidden = true;
    }

    mutedBackButton.addEventListener('click', function () {
      if (typeof options.onBack === 'function') {
        options.onBack();
      }
    });
    errorBackButton.addEventListener('click', function () {
      if (typeof options.onBack === 'function') {
        options.onBack();
      }
    });
    unmuteButton.addEventListener('click', function () {
      var storageObj = options.storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
      var appShellApi = resolveAppShell(options);
      if (storageObj) {
        if (appShellApi && typeof appShellApi.writeStoredMute === 'function') {
          appShellApi.writeStoredMute(false, storageObj);
        } else {
          try {
            storageObj.setItem('dinoquiz:muted', 'false');
          } catch (error) {
            // Storage unavailable: nothing more to do, the round stays blocked.
          }
        }
      }
      if (typeof options.onUnmute === 'function') {
        options.onUnmute();
      }
      mutedSection.hidden = true;
      soundPanel.hidden = false;
      optionsGroup.hidden = false;
      if (typeof playButton.focus === 'function') {
        playButton.focus();
      }
    });

    var audioService =
      options.audioService ||
      (audioServiceModule && typeof audioServiceModule.createOidoJurasicoAudioService === 'function'
        ? audioServiceModule.createOidoJurasicoAudioService({
            storageObj: options.storageObj,
            onMuted: showMutedNotice,
            onError: showErrorNotice,
          })
        : null);

    var feedbackMount = document.createElement('div');
    feedbackMount.className = 'oido-jurasico-screen__feedback-mount';
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
    announcementEl.className = 'oido-jurasico-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'oido-jurasico-screen__next-button';
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

    playButton.addEventListener('click', function () {
      if (!audioService) {
        return;
      }
      var state = hasPlayedOnce ? audioService.repeat(round.soundUrl) : audioService.play(round.soundUrl);
      if (state && state.status === 'playing') {
        hasPlayedOnce = true;
        playButton.textContent = strings.replayButton;
        playButton.setAttribute('aria-label', strings.replayButtonAriaLabel);
      }
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
            button.setAttribute(
              'aria-label',
              formatTemplate(strings.correctOptionAriaLabelFormat, { creature: creatureName(strings, creatureId) })
            );
          }
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
          button.setAttribute(
            'aria-label',
            formatTemplate(strings.selectedOptionAriaLabelFormat, { creature: creatureName(strings, creatureId) })
          );
        }
      });

      scoreEl.textContent = strings.scoreLabel + ': ' + score;

      var result = feedbackComponent ? feedbackComponent.showResult({ isCorrect: correct, detail: detail, score: score }) : null;

      // G4 ("no false scientific claims"): every round's accessible
      // announcement repeats the imagined-sound reinforcement, win or lose --
      // never only on a miss.
      var announcementParts = [correct ? strings.feedback.correct : strings.feedback.incorrect];
      if (detail) {
        announcementParts.push(detail);
      }
      announcementParts.push(strings.answerReinforcement.message);
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
    root.appendChild(mutedSection);
    root.appendChild(errorSection);
    root.appendChild(soundPanel);
    root.appendChild(optionsGroup);
    root.appendChild(feedbackMount);
    root.appendChild(announcementEl);
    root.appendChild(nextButton);
    container.appendChild(root);

    // Preemptive mute check (AC: aviso *antes* de cualquier reproducción):
    // never wait for a play attempt to fail before telling the child sound
    // is off.
    if (audioService && typeof audioService.isMuted === 'function' && audioService.isMuted()) {
      showMutedNotice();
    } else if (typeof title.focus === 'function') {
      title.focus();
    }

    return {
      root: root,
      title: title,
      instructions: instructions,
      progressRow: progressRow,
      roundEl: roundEl,
      scoreEl: scoreEl,
      soundPanel: soundPanel,
      playButton: playButton,
      optionsGroup: optionsGroup,
      optionButtons: optionButtons,
      feedbackComponent: feedbackComponent,
      announcementEl: announcementEl,
      announcement: announcementEl,
      nextButton: nextButton,
      mutedSection: mutedSection,
      unmuteButton: unmuteButton,
      mutedBackButton: mutedBackButton,
      errorSection: errorSection,
      errorBackButton: errorBackButton,
      audioService: audioService,
      getScore: function () {
        return score;
      },
      isAnswered: function () {
        return answered;
      },
      isBlocked: function () {
        return false;
      },
      off: function () {
        if (audioService && typeof audioService.off === 'function') {
          audioService.off();
        }
      },
    };
  }

  var api = {
    ROUNDS_PER_GAME: DEFAULT_TOTAL_ROUNDS,
    OPTIONS_PER_ROUND: OPTIONS_PER_ROUND,
    SOUND_BASE_PATH: SOUND_BASE_PATH,
    SOUND_CREATURE_IDS: SOUND_CREATURE_IDS,
    ERRORS: ERRORS,
    INTRO_SEEN_STORAGE_KEY: INTRO_SEEN_STORAGE_KEY,
    hasSeenIntro: hasSeenIntro,
    markIntroSeen: markIntroSeen,
    buildOidoJurasicoRoundContext: buildOidoJurasicoRoundContext,
    generateOidoJurasicoRound: generateOidoJurasicoRound,
    renderOidoJurasicoIntro: renderOidoJurasicoIntro,
    renderOidoJurasicoScreen: renderOidoJurasicoScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderOidoJurasicoIntro = renderOidoJurasicoIntro;
    window.DinoQuiz.screens.renderOidoJurasicoScreen = renderOidoJurasicoScreen;
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.oidoJurasico = api;
  }
})();
