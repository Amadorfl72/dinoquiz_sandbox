'use strict';

/**
 * Results ("Resultados") screen: score (X/10), stars by tier, an always-
 * positive motivational message, a prominent "Volver a jugar" button and an
 * optional secondary "Salir" button. All copy comes from the i18n resource —
 * no hardcoded strings here, per AC-15.
 *
 * Accessibility: the full summary (score + stars + message) is duplicated
 * into a single `role="status"`/`aria-live="polite"` region so screen
 * readers announce it as one coherent sentence as soon as the screen
 * renders, in addition to the visible elements being individually readable.
 *
 * Ads (TRIOFSND-97, AC-20/AC-21): a discreet banner and an optional, clearly
 * labeled rewarded ad render below the actions row -- but only while
 * `options.adsRemoved` is not `true`. That flag is read from local storage
 * by the caller (see `renderResultsFor` in public/scripts/main.js, which
 * mirrors the `dinoquiz:adsRemoved` key the home screen's remove-ads
 * purchase button sets); this screen stays a pure, DOM-only component that
 * doesn't touch storage itself, consistent with how `onPlayAgain`/`onExit`
 * are handled. Watching the rewarded ad is entirely optional and never
 * blocks "Volver a jugar" -- if `options.onWatchRewardedAd` is omitted the
 * button simply renders with no effect, per the PRD's "si no se ve el
 * rewarded, la partida funciona igual".
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen — which the browser
 * actually runs — lives under `public/` and follows the dual CommonJS/global
 * pattern of public/scripts/homeScreen.js. It resolves its i18n strings from
 * `options.strings` (injected by the app shell after it fetches
 * /i18n/es.json), or `window.DinoQuiz.strings.results` in the browser, or the
 * `src/i18n` loader under Node. It registers on
 * `window.DinoQuiz.screens.renderResultsScreen`; the canonical
 * `src/screens/ResultsScreen.js` re-exports this file.
 *
 * Level progress UI (TRIOFSND-206): three independent, optional pieces of
 * level state render alongside the existing score/stars for the level just
 * played -- `options.level` (which level this result is for),
 * `options.levelOutcome` (the `gameFlow.js` `resolveLevelOutcome`/
 * `completeLevel` shape, resolved into an always-positive message describing
 * whether the next level unlocked or the game ended, and why), and
 * `options.maxLevelUnlocked` (the highest level unlocked on this device so
 * far). None of the three touch storage or expose the child's age band --
 * this screen stays a pure, DOM-only component, same as `options.adsRemoved`
 * above. Omitting all three renders exactly what this screen rendered before
 * TRIOFSND-206.
 *
 * Discovered fun facts progress (TRIOFSND-129): when both `options.discoveredFunFactsCount`
 * and `options.totalFunFacts` are provided, a line shows how many "datos
 * curiosos" have been seen on this device so far out of the total available
 * in the bank -- read from local storage by the caller (`renderResultsFor`,
 * public/scripts/main.js), same pattern as `options.maxLevelUnlocked` above.
 * Omitting either renders nothing extra.
 *
 * Best score / longest racha (TRIOFSND-96, PRD "Persistencia exclusivamente
 * local de mejor puntuación, racha máxima"): `options.bestScore` and
 * `options.bestStreak` each render their own line -- the best score/longest
 * racha achieved on this device so far, including the game just played --
 * resolved by the caller (`persistBestScoreAndStreak` in
 * public/scripts/main.js), same read-only rationale as the other optional
 * pieces above. Each is independently optional.
 *
 * Own-mode score, percentage, stars and level-progress actions (TRIOFSND-252,
 * PRD "Resultados comunes con porcentaje y estrellas"): a mode's own game need
 * not score out of 10 -- `options.maxScore` generalizes the score/star scale
 * this screen renders against (defaults to `MAX_SCORE`, preserving Quiz's
 * existing 0-10 behaviour). `calculateStars`/the percentage shown alongside
 * it both delegate to scoring.js's mode-agnostic `normalizeOutcome(score,
 * maxScore)` (TRIOFSND-251), so every mode's result -- however it arrived at
 * its own score -- lands on the same 0-100%/1-3 star scale. Three further
 * optional actions round out per-mode level progress, alongside the existing
 * `options.level`/`options.maxLevelUnlocked`: `options.onRepeatLevel` replays
 * the level just played; `options.onGoToNextUnlockedLevel` jumps straight to
 * `options.level + 1` and only renders while that level is already unlocked
 * (`options.maxLevelUnlocked > options.level`); `options.onBackToSelector`
 * returns to the illustrated mode selector. Each is independently optional
 * and, like every other option above, this screen never resolves them
 * itself -- the caller supplies the level/maxLevelUnlocked/callbacks.
 *
 * Hall of Fame entry point: `options.onViewHallOfFame`, when provided, adds
 * a "Salón de la Fama" action alongside the others above -- the label
 * reuses `options.hallOfFameStrings.title` (the same string
 * hallOfFameScreen.js already uses as its own heading) instead of a second,
 * separate string, resolved the same optional-injection way `strings` is
 * resolved via `resolveStrings`. Like `onBackToSelector`, this screen never
 * decides where the button navigates to -- public/scripts/main.js wires the
 * actual screen switch and passes through the just-finished game's entry
 * identifier for hallOfFameScreen.js to highlight.
 */

(function () {
  var MIN_SCORE = 0;
  var MAX_SCORE = 10;
  var MAX_STARS = 3;

  // Resolves scoring.js the same way resolveContentGuide (below) resolves
  // the content guide: `require` under Node/Jest, `window.DinoQuiz.scoring`
  // for the `<script>`-loaded PWA.
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('../../src/game/scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  // Content-guide guard: words that would read as negative/discouraging to a
  // 6-8 year old. Motivational messages must never contain any of these
  // (matched as whole, accent-stripped words, not substrings). Exported so
  // other screens (e.g. QuestionScreen's failure feedback, TRIOFSND-91) can
  // audit their own copy against the same list instead of duplicating it.
  var BANNED_WORDS = new Set([
    'mal',
    'malo',
    'mala',
    'malos',
    'malas',
    'fallo',
    'fallos',
    'fallaste',
    'fallar',
    'fallado',
    'perdiste',
    'perder',
    'perdido',
    'error',
    'errores',
    'incorrecto',
    'incorrecta',
    'triste',
    'nunca',
    'fracaso',
    'fracasar',
    'peor',
    'pena',
    'lastima',
    'lento',
    'lenta',
    'torpe',
    'tonto',
    'tonta',
  ]);

  // Content-guide guard (TRIOFSND-91, AC-7): motivational messages must never
  // contain negative/discouraging language. Also exposed through
  // src/i18n/contentGuide.js so other screens (e.g. QuestionScreen's
  // wrong-answer feedback) can share this same list without duplicating it.
  function resolveContentGuide() {
    return typeof require === 'function' ? require('../../src/i18n/contentGuide') : null;
  }

  // Kept as a thin wrapper (delegating to the shared content guide when
  // available) because it is exposed on `api.normalizeToWords` and reused by
  // questionScreen.js's copy audit. The TRIOFSND-91 refactor moved the
  // canonical implementation into src/i18n/contentGuide.js but left this
  // reference dangling on `api` — restoring it un-poisons every suite that
  // requires resultsScreen.js (was: ReferenceError on module load).
  function normalizeToWords(text) {
    var contentGuide = resolveContentGuide();
    if (contentGuide) {
      return contentGuide.normalizeToWords(text);
    }
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).results;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.results : null;
  }

  // Resolved the same optional-injection way resolveStrings resolves
  // `results` above, but pointed at the `hallOfFame` section instead --
  // reused as-is for the "Salón de la Fama" button label (see the module
  // doc) rather than declaring a second, separate string.
  function resolveHallOfFameStrings(options) {
    options = options || {};
    if (options.hallOfFameStrings) {
      return options.hallOfFameStrings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).hallOfFame;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.hallOfFame : null;
  }

  // TRIOFSND-311: the final-summary announcement now goes through the same
  // shared-queue service questionScreen.js uses, instead of this screen
  // hand-rolling its own `aria-live` region -- see a11yAnnouncer.js for why
  // several independent live regions across the app can announce out of
  // order or overlap. A fresh instance per render mirrors `announcementEl`
  // being a fresh node per render before this change; `options.a11yAnnouncer`
  // lets tests inject one directly.
  function resolveA11yAnnouncer(options) {
    if (options.a11yAnnouncer) {
      return options.a11yAnnouncer;
    }
    var createA11yAnnouncer =
      typeof require === 'function'
        ? require('../../src/services/a11yAnnouncer').createA11yAnnouncer
        : (typeof window !== 'undefined' &&
            window.DinoQuiz &&
            window.DinoQuiz.services &&
            window.DinoQuiz.services.createA11yAnnouncer) ||
          null;
    return typeof createA11yAnnouncer === 'function' ? createA11yAnnouncer() : null;
  }

  // Quiz's own score is always an integer out of MAX_SCORE (10); a mode with
  // its own scoring scale passes its own maxScore (TRIOFSND-252). Either way
  // the actual percentage/tier math is the shared, mode-agnostic scoring.js
  // helper (TRIOFSND-251) so every mode's results map onto the same visual
  // scale instead of this screen keeping its own separate tier table.
  function normalizeScore(score, maxScore) {
    var total = typeof maxScore === 'number' ? maxScore : MAX_SCORE;
    if (!Number.isInteger(total) || total <= 0) {
      throw new Error('maxScore must be a positive integer, got ' + maxScore);
    }
    if (!Number.isInteger(score) || score < MIN_SCORE || score > total) {
      throw new Error('score must be an integer between ' + MIN_SCORE + ' and ' + total + ', got ' + score);
    }

    var scoring = resolveScoring();
    if (!scoring || typeof scoring.normalizeOutcome !== 'function') {
      throw new Error('calculateStars requires scoring.js to be available');
    }

    return scoring.normalizeOutcome(score, total);
  }

  function calculateStars(score, maxScore) {
    return normalizeScore(score, maxScore).stars;
  }

  function validateMotivationalMessages(messages) {
    var errors = [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return ['messages must be a non-empty array of strings'];
    }

    var contentGuide = resolveContentGuide();

    messages.forEach(function (message, index) {
      if (typeof message !== 'string' || message.trim() === '') {
        errors.push('message at index ' + index + ' must be a non-empty string');
        return;
      }

      var bannedWordsFound = contentGuide ? contentGuide.findBannedWords(message) : [];
      if (bannedWordsFound.length > 0) {
        errors.push(
          'message at index ' + index + ' ("' + message + '") contains negative language: ' + bannedWordsFound.join(', ')
        );
      }
    });

    return errors;
  }

  function selectMotivationalMessage(messages, randomFn) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array of strings');
    }

    var random = randomFn || Math.random;
    var index = Math.floor(random() * messages.length);
    var safeIndex = Math.min(Math.max(index, 0), messages.length - 1);
    return messages[safeIndex];
  }

  function formatTemplate(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  /**
   * Binds a control to fire `handler` on click AND on an Enter/Espacio
   * `keydown` (TRIOFSND-310). See the matching helper in homeScreen.js for
   * why this is explicit rather than left to the browser's own default
   * action on Enter/Espacio.
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

  // Level progression outcome (TRIOFSND-206): `options.levelOutcome` mirrors
  // the shape `gameFlow.js`'s `resolveLevelOutcome`/`completeLevel` already
  // return -- `{ gameOver, nextLevel, level, correctCount, reason }` -- so a
  // caller can pass that result straight through. `reason` picks the
  // always-positive copy to show: unlocking the next level, finishing at
  // MAX_LEVEL, ending for insufficient score, or the age-restricted single
  // level ending -- never the child's age band or the raw correctCount.
  function resolveLevelOutcomeMessage(strings, levelOutcome) {
    if (!levelOutcome || typeof levelOutcome !== 'object') {
      return null;
    }

    var levelOutcomeStrings = (strings && strings.levelOutcome) || {};

    switch (levelOutcome.reason) {
      case 'level_up':
        return formatTemplate(levelOutcomeStrings.levelUp || '', { nextLevel: levelOutcome.nextLevel });
      case 'completed_all_levels':
        return levelOutcomeStrings.completedAllLevels || '';
      case 'insufficient_score':
        return levelOutcomeStrings.insufficientScore || '';
      case 'age_restricted':
        return levelOutcomeStrings.ageRestricted || '';
      default:
        return null;
    }
  }

  // Main button label (TRIOFSND-206 follow-up): mirrors the exact criterion
  // `finishLevel`'s `onPlayAgain` handler in public/scripts/main.js uses to
  // decide whether "Volver a jugar" continues into the next level
  // (`!levelOutcome.gameOver && levelOutcome.nextLevelGame`) -- if so, the
  // button reads `strings.nextLevelButtonFormat` interpolated with the real
  // next level number instead of the generic `strings.playAgainButton`.
  function resolvePlayAgainButtonLabel(strings, levelOutcome) {
    if (levelOutcome && typeof levelOutcome === 'object' && !levelOutcome.gameOver && levelOutcome.nextLevelGame) {
      return formatTemplate(strings.nextLevelButtonFormat, { level: levelOutcome.nextLevel });
    }
    return strings.playAgainButton;
  }

  function renderResultsScreen(container, options) {
    options = options || {};
    var strings = resolveStrings(options);

    // TRIOFSND-252: a mode's own game need not score out of 10 -- defaults to
    // MAX_SCORE so existing Quiz callers (which never pass maxScore) are
    // unaffected.
    var total = options.maxScore === undefined ? MAX_SCORE : options.maxScore;
    if (!Number.isInteger(total) || total <= 0) {
      throw new Error('options.maxScore must be a positive integer');
    }
    if (!Number.isInteger(options.score) || options.score < MIN_SCORE || options.score > total) {
      throw new Error('options.score must be an integer between ' + MIN_SCORE + ' and ' + total);
    }

    var score = options.score;
    var normalizedOutcome = normalizeScore(score, total);
    var stars = normalizedOutcome.stars;
    var percentage = normalizedOutcome.percentage;
    var showExitButton = options.showExitButton !== false;
    var message = options.message || selectMotivationalMessage(strings.messages, options.randomFn);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'results-screen';

    var heading = document.createElement('h1');
    heading.className = 'results-screen__heading';
    heading.textContent = strings.heading;

    // TRIOFSND-206: identifies which level this result belongs to -- never
    // the child's age band, which stays out of this screen entirely.
    var levelEl = null;
    if (typeof options.level === 'number') {
      levelEl = document.createElement('p');
      levelEl.className = 'results-screen__level';
      levelEl.textContent = formatTemplate(strings.levelFormat, { level: options.level });
    }

    var scoreEl = document.createElement('p');
    scoreEl.className = 'results-screen__score';
    scoreEl.textContent = formatTemplate(strings.scoreFormat, { score: score, total: total });

    // TRIOFSND-252: the shared 0-100 percentage every mode's result maps
    // onto (scoring.js's normalizeOutcome), shown alongside the mode's own
    // score/total so a non-out-of-10 score is still easy to read at a glance.
    var percentageEl = document.createElement('p');
    percentageEl.className = 'results-screen__percentage';
    percentageEl.textContent = formatTemplate(strings.percentageFormat, { percentage: percentage });

    var starsEl = document.createElement('div');
    starsEl.className = 'results-screen__stars';
    starsEl.setAttribute('role', 'img');
    starsEl.setAttribute('aria-label', formatTemplate(strings.starsLabel, { stars: stars, maxStars: MAX_STARS }));
    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(MAX_STARS - stars);

    var messageEl = document.createElement('p');
    messageEl.className = 'results-screen__message';
    messageEl.textContent = message;

    // TRIOFSND-206: whether the next level unlocked, or the game ended (at
    // MAX_LEVEL or for insufficient score) -- see resolveLevelOutcomeMessage.
    var levelOutcomeMessage = resolveLevelOutcomeMessage(strings, options.levelOutcome);
    var levelOutcomeEl = null;
    if (levelOutcomeMessage) {
      levelOutcomeEl = document.createElement('p');
      levelOutcomeEl.className = 'results-screen__level-outcome';
      levelOutcomeEl.textContent = levelOutcomeMessage;
    }

    // TRIOFSND-206: the highest level unlocked on this device so far. Read
    // from local storage by the caller (this screen stays a pure, DOM-only
    // component, same as `options.adsRemoved` above).
    var maxLevelUnlockedEl = null;
    if (typeof options.maxLevelUnlocked === 'number') {
      maxLevelUnlockedEl = document.createElement('p');
      maxLevelUnlockedEl.className = 'results-screen__max-level-unlocked';
      maxLevelUnlockedEl.textContent = formatTemplate(strings.maxLevelUnlockedFormat, {
        maxLevel: options.maxLevelUnlocked,
      });
    }

    // TRIOFSND-129: the count of distinct "datos curiosos" discovered on
    // this device so far, out of the total available in the bank. Read from
    // local storage by the caller, same rationale as maxLevelUnlockedEl above.
    var funFactsProgressEl = null;
    if (Number.isInteger(options.discoveredFunFactsCount) && Number.isInteger(options.totalFunFacts)) {
      funFactsProgressEl = document.createElement('p');
      funFactsProgressEl.className = 'results-screen__fun-facts-progress';
      funFactsProgressEl.textContent = formatTemplate(strings.funFactsProgressFormat, {
        count: options.discoveredFunFactsCount,
        total: options.totalFunFacts,
      });
    }

    // TRIOFSND-96: the best score/longest racha achieved on this device so
    // far (including the game just played), resolved by the caller. Each is
    // independently optional, same rationale as maxLevelUnlockedEl above.
    var bestScoreEl = null;
    if (Number.isInteger(options.bestScore)) {
      bestScoreEl = document.createElement('p');
      bestScoreEl.className = 'results-screen__best-score';
      bestScoreEl.textContent = formatTemplate(strings.bestScoreFormat, { bestScore: options.bestScore });
    }

    var bestStreakEl = null;
    if (Number.isInteger(options.bestStreak)) {
      bestStreakEl = document.createElement('p');
      bestStreakEl.className = 'results-screen__best-streak';
      bestStreakEl.textContent = formatTemplate(strings.bestStreakFormat, { bestStreak: options.bestStreak });
    }

    // TRIOFSND-311: the single reusable aria-live region a11yAnnouncer owns,
    // instead of this screen creating its own independent one.
    var a11yAnnouncer = resolveA11yAnnouncer(options);
    var announcementEl = a11yAnnouncer ? a11yAnnouncer.getRegion() : document.createElement('p');
    announcementEl.classList.add('results-screen__announcement', 'sr-only');
    if (!announcementEl.getAttribute('role')) {
      announcementEl.setAttribute('role', 'status');
    }
    if (!announcementEl.getAttribute('aria-live')) {
      announcementEl.setAttribute('aria-live', 'polite');
    }
    var announcementParts = [
      formatTemplate(strings.summaryAnnouncement, {
        score: score,
        total: total,
        percentage: percentage,
        stars: stars,
        maxStars: MAX_STARS,
        message: message,
      }),
    ];
    if (levelEl) {
      announcementParts.push(levelEl.textContent);
    }
    if (levelOutcomeEl) {
      announcementParts.push(levelOutcomeEl.textContent);
    }
    if (maxLevelUnlockedEl) {
      announcementParts.push(maxLevelUnlockedEl.textContent);
    }
    if (funFactsProgressEl) {
      announcementParts.push(funFactsProgressEl.textContent);
    }
    if (bestScoreEl) {
      announcementParts.push(bestScoreEl.textContent);
    }
    if (bestStreakEl) {
      announcementParts.push(bestStreakEl.textContent);
    }
    // "Fin de partida" (TRIOFSND-311): queued through the shared service so
    // it never overlaps a still-in-flight announcement (e.g. the previous
    // question's feedback, if this render follows one immediately).
    if (a11yAnnouncer) {
      a11yAnnouncer.announce(announcementParts.join(' '));
    }

    var actions = document.createElement('div');
    actions.className = 'results-screen__actions';

    var playAgainButton = document.createElement('button');
    playAgainButton.type = 'button';
    playAgainButton.className = 'results-screen__play-again-button';
    playAgainButton.textContent = resolvePlayAgainButtonLabel(strings, options.levelOutcome);
    if (typeof options.onPlayAgain === 'function') {
      bindActivation(playAgainButton, options.onPlayAgain);
    }
    actions.appendChild(playAgainButton);

    var exitButton = null;
    if (showExitButton) {
      exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'results-screen__exit-button';
      exitButton.textContent = strings.exitButton;
      if (typeof options.onExit === 'function') {
        bindActivation(exitButton, options.onExit);
      }
      actions.appendChild(exitButton);
    }

    // TRIOFSND-252: replays the level just played. Only rendered when the
    // caller supplies onRepeatLevel -- like onPlayAgain/onExit above, this
    // screen never decides on its own what "repeat" means for a mode.
    var repeatLevelButton = null;
    if (typeof options.onRepeatLevel === 'function') {
      repeatLevelButton = document.createElement('button');
      repeatLevelButton.type = 'button';
      repeatLevelButton.className = 'results-screen__repeat-level-button';
      repeatLevelButton.textContent =
        typeof options.level === 'number'
          ? formatTemplate(strings.repeatLevelButtonFormat, { level: options.level })
          : strings.repeatLevelButton;
      repeatLevelButton.addEventListener('click', options.onRepeatLevel);
      actions.appendChild(repeatLevelButton);
    }

    // TRIOFSND-252: jumps straight to the next level of this mode, but only
    // when that level is already unlocked on this device (options.level and
    // options.maxLevelUnlocked are both required to tell) -- otherwise there
    // is nothing to jump to yet, so the button does not render at all.
    var nextUnlockedLevel =
      typeof options.level === 'number' &&
      typeof options.maxLevelUnlocked === 'number' &&
      options.maxLevelUnlocked > options.level
        ? options.level + 1
        : null;

    var goToNextUnlockedLevelButton = null;
    if (nextUnlockedLevel !== null && typeof options.onGoToNextUnlockedLevel === 'function') {
      goToNextUnlockedLevelButton = document.createElement('button');
      goToNextUnlockedLevelButton.type = 'button';
      goToNextUnlockedLevelButton.className = 'results-screen__go-to-next-level-button';
      goToNextUnlockedLevelButton.textContent = formatTemplate(strings.goToNextLevelButtonFormat, {
        level: nextUnlockedLevel,
      });
      goToNextUnlockedLevelButton.addEventListener('click', function () {
        options.onGoToNextUnlockedLevel(nextUnlockedLevel);
      });
      actions.appendChild(goToNextUnlockedLevelButton);
    }

    // TRIOFSND-252: returns to the illustrated mode selector. Only rendered
    // when the caller supplies onBackToSelector.
    var backToSelectorButton = null;
    if (typeof options.onBackToSelector === 'function') {
      backToSelectorButton = document.createElement('button');
      backToSelectorButton.type = 'button';
      backToSelectorButton.className = 'results-screen__back-to-selector-button';
      backToSelectorButton.textContent = strings.backToSelectorButton;
      backToSelectorButton.addEventListener('click', options.onBackToSelector);
      actions.appendChild(backToSelectorButton);
    }

    // Hall of Fame entry point: only rendered when the caller supplies
    // onViewHallOfFame, like onRepeatLevel/onBackToSelector above. Its label
    // reuses hallOfFameStrings.title instead of a separate results-screen
    // string (see the module doc).
    var viewHallOfFameButton = null;
    if (typeof options.onViewHallOfFame === 'function') {
      var hallOfFameStrings = resolveHallOfFameStrings(options);
      viewHallOfFameButton = document.createElement('button');
      viewHallOfFameButton.type = 'button';
      viewHallOfFameButton.className = 'results-screen__hall-of-fame-button';
      viewHallOfFameButton.textContent = hallOfFameStrings ? hallOfFameStrings.title : '';
      bindActivation(viewHallOfFameButton, options.onViewHallOfFame);
      actions.appendChild(viewHallOfFameButton);
    }

    // AC-20/AC-21: hidden once the remove-ads purchase has been made.
    var showAds = options.adsRemoved !== true;
    var adsSection = null;
    var adBanner = null;
    var rewardedAdButton = null;
    if (showAds) {
      var adsStrings = strings.ads;

      adsSection = document.createElement('div');
      adsSection.className = 'results-screen__ads';
      adsSection.setAttribute('role', 'complementary');
      adsSection.setAttribute('aria-label', adsStrings.groupLabel);

      adBanner = document.createElement('div');
      adBanner.className = 'results-screen__ad-banner';

      var adBannerBadge = document.createElement('span');
      adBannerBadge.className = 'results-screen__ad-badge';
      adBannerBadge.textContent = adsStrings.bannerBadge;

      var adBannerMessage = document.createElement('p');
      adBannerMessage.className = 'results-screen__ad-banner-message';
      adBannerMessage.textContent = adsStrings.bannerMessage;

      adBanner.appendChild(adBannerBadge);
      adBanner.appendChild(adBannerMessage);

      rewardedAdButton = document.createElement('button');
      rewardedAdButton.type = 'button';
      rewardedAdButton.className = 'results-screen__rewarded-ad-button';
      rewardedAdButton.setAttribute('aria-label', adsStrings.rewardedBadge + ': ' + adsStrings.rewardedButton);

      var rewardedAdBadge = document.createElement('span');
      rewardedAdBadge.className = 'results-screen__ad-badge';
      rewardedAdBadge.setAttribute('aria-hidden', 'true');
      rewardedAdBadge.textContent = adsStrings.rewardedBadge;

      var rewardedAdLabel = document.createElement('span');
      rewardedAdLabel.textContent = adsStrings.rewardedButton;

      rewardedAdButton.appendChild(rewardedAdBadge);
      rewardedAdButton.appendChild(rewardedAdLabel);
      if (typeof options.onWatchRewardedAd === 'function') {
        bindActivation(rewardedAdButton, options.onWatchRewardedAd);
      }

      adsSection.appendChild(adBanner);
      adsSection.appendChild(rewardedAdButton);
    }

    root.appendChild(heading);
    if (levelEl) {
      root.appendChild(levelEl);
    }
    root.appendChild(scoreEl);
    root.appendChild(percentageEl);
    root.appendChild(starsEl);
    root.appendChild(messageEl);
    if (levelOutcomeEl) {
      root.appendChild(levelOutcomeEl);
    }
    if (maxLevelUnlockedEl) {
      root.appendChild(maxLevelUnlockedEl);
    }
    if (funFactsProgressEl) {
      root.appendChild(funFactsProgressEl);
    }
    if (bestScoreEl) {
      root.appendChild(bestScoreEl);
    }
    if (bestStreakEl) {
      root.appendChild(bestStreakEl);
    }
    root.appendChild(announcementEl);
    root.appendChild(actions);
    if (adsSection) {
      root.appendChild(adsSection);
    }
    container.appendChild(root);

    return {
      root: root,
      levelEl: levelEl,
      scoreEl: scoreEl,
      percentageEl: percentageEl,
      starsEl: starsEl,
      messageEl: messageEl,
      levelOutcomeEl: levelOutcomeEl,
      maxLevelUnlockedEl: maxLevelUnlockedEl,
      funFactsProgressEl: funFactsProgressEl,
      bestScoreEl: bestScoreEl,
      bestStreakEl: bestStreakEl,
      announcementEl: announcementEl,
      playAgainButton: playAgainButton,
      exitButton: exitButton,
      repeatLevelButton: repeatLevelButton,
      goToNextUnlockedLevelButton: goToNextUnlockedLevelButton,
      backToSelectorButton: backToSelectorButton,
      viewHallOfFameButton: viewHallOfFameButton,
      adsSection: adsSection,
      adBanner: adBanner,
      rewardedAdButton: rewardedAdButton,
    };
  }

  var api = {
    MIN_SCORE: MIN_SCORE,
    MAX_SCORE: MAX_SCORE,
    MAX_STARS: MAX_STARS,
    BANNED_WORDS: BANNED_WORDS,
    normalizeToWords: normalizeToWords,
    calculateStars: calculateStars,
    normalizeScore: normalizeScore,
    validateMotivationalMessages: validateMotivationalMessages,
    selectMotivationalMessage: selectMotivationalMessage,
    resolveLevelOutcomeMessage: resolveLevelOutcomeMessage,
    resolvePlayAgainButtonLabel: resolvePlayAgainButtonLabel,
    renderResultsScreen: renderResultsScreen,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderResultsScreen = renderResultsScreen;
  }
})();
