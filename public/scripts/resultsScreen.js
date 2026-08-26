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
 */

(function () {
  var MIN_SCORE = 0;
  var MAX_SCORE = 10;
  var MAX_STARS = 3;

  // Star tiers per the PRD: 0-3 -> 1 star, 4-6 -> 2 stars, 7-10 -> 3 stars.
  var STAR_TIERS = Object.freeze([
    { maxScore: 3, stars: 1 },
    { maxScore: 6, stars: 2 },
    { maxScore: MAX_SCORE, stars: 3 },
  ]);

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

  function calculateStars(score) {
    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
      throw new Error('score must be an integer between ' + MIN_SCORE + ' and ' + MAX_SCORE + ', got ' + score);
    }

    var tier = STAR_TIERS.find(function (candidate) {
      return score <= candidate.maxScore;
    });
    return tier.stars;
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

  function renderResultsScreen(container, options) {
    options = options || {};
    var strings = resolveStrings(options);

    if (!Number.isInteger(options.score) || options.score < MIN_SCORE || options.score > MAX_SCORE) {
      throw new Error('options.score must be an integer between ' + MIN_SCORE + ' and ' + MAX_SCORE);
    }

    var score = options.score;
    var total = MAX_SCORE;
    var stars = calculateStars(score);
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

    var announcementEl = document.createElement('p');
    announcementEl.className = 'results-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');
    var announcementParts = [
      formatTemplate(strings.summaryAnnouncement, {
        score: score,
        total: total,
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
    announcementEl.textContent = announcementParts.join(' ');

    var actions = document.createElement('div');
    actions.className = 'results-screen__actions';

    var playAgainButton = document.createElement('button');
    playAgainButton.type = 'button';
    playAgainButton.className = 'results-screen__play-again-button';
    playAgainButton.textContent = strings.playAgainButton;
    if (typeof options.onPlayAgain === 'function') {
      playAgainButton.addEventListener('click', options.onPlayAgain);
    }
    actions.appendChild(playAgainButton);

    var exitButton = null;
    if (showExitButton) {
      exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'results-screen__exit-button';
      exitButton.textContent = strings.exitButton;
      if (typeof options.onExit === 'function') {
        exitButton.addEventListener('click', options.onExit);
      }
      actions.appendChild(exitButton);
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
        rewardedAdButton.addEventListener('click', options.onWatchRewardedAd);
      }

      adsSection.appendChild(adBanner);
      adsSection.appendChild(rewardedAdButton);
    }

    root.appendChild(heading);
    if (levelEl) {
      root.appendChild(levelEl);
    }
    root.appendChild(scoreEl);
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
      starsEl: starsEl,
      messageEl: messageEl,
      levelOutcomeEl: levelOutcomeEl,
      maxLevelUnlockedEl: maxLevelUnlockedEl,
      funFactsProgressEl: funFactsProgressEl,
      announcementEl: announcementEl,
      playAgainButton: playAgainButton,
      exitButton: exitButton,
      adsSection: adsSection,
      adBanner: adBanner,
      rewardedAdButton: rewardedAdButton,
    };
  }

  var api = {
    MIN_SCORE: MIN_SCORE,
    MAX_SCORE: MAX_SCORE,
    MAX_STARS: MAX_STARS,
    STAR_TIERS: STAR_TIERS,
    BANNED_WORDS: BANNED_WORDS,
    normalizeToWords: normalizeToWords,
    calculateStars: calculateStars,
    validateMotivationalMessages: validateMotivationalMessages,
    selectMotivationalMessage: selectMotivationalMessage,
    resolveLevelOutcomeMessage: resolveLevelOutcomeMessage,
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
