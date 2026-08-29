'use strict';

/**
 * Pregunta/Feedback screen (TRIOFSND-72 / TRIOFSND-77 / TRIOFSND-88): shows
 * the dinosaur illustration, a large centered enunciado (TRIOFSND-72, AC-4:
 * >=20sp) and its options, and, once the child taps an answer, the feedback
 * and "dato curioso" for that answer (TRIOFSND-83).
 *
 * Correctness (TRIOFSND-77 / TRIOFSND-88, AC-7): a wrong pick is never
 * penalized — the score keeps whatever value it already had (+0), via
 * `applyAnswerToScore` in scoring.js. The correct option is always
 * highlighted with the same "acierto" style (`CORRECT_CLASS`, thick green
 * border) whether the child got it right or not; the wrong pick itself only
 * gets a neutral marker (`NEUTRAL_CLASS`) — never a "bad"/red one. A hit
 * additionally gets `CELEBRATE_CLASS` for the happy animation. Both
 * outcomes then reveal the same fun fact (in a yellow "dato curioso" box)
 * and "Siguiente" control, so the flow to the next question is identical
 * whether the answer was right or wrong.
 *
 * Screen-reader accessibility on a miss (TRIOFSND-90, AC-7/AC-14): the
 * `feedback` paragraph (`aria-live="polite"`, neutral tone) spells out the
 * correct option's text, not just "la respuesta correcta es esta" — a
 * TalkBack/VoiceOver user relying on the announcement rather than the
 * visual border needs the answer in words. The correct button also gets a
 * descriptive `aria-label` ("Respuesta correcta: …") so it reads
 * unambiguously if the user swipes onto it afterwards, and the (wrong)
 * option that was tapped gets a neutral "Tu respuesta: …" label instead of
 * a "wrong"/"incorrect" one. The dinosaur illustration's `alt` text is set
 * once from the question data and is never cleared or replaced on answer,
 * so it stays descriptive in the failure state exactly as it was before
 * answering.
 *
 * Screen-reader accessibility on a miss (TRIOFSND-90, AC-7/AC-14): the green
 * "correct" border and the tapped option's neutral marker are purely visual
 * cues, so a TalkBack/VoiceOver user who can't see them still needs to know
 * which option was right. The `feedback` announcement (already
 * `aria-live="polite"`) spells out the correct answer's text instead of just
 * "la respuesta correcta es esta", and the correct button additionally gets
 * a descriptive `aria-label` ("Respuesta correcta: …") so it reads
 * unambiguously if the user swipes onto it afterwards. The tapped (wrong)
 * option gets a neutral "Tu respuesta: …" label — never a "wrong"/
 * "incorrect" one, matching AC-7's no-penalty tone.
 *
 * Performance (AC-5, "<300ms"): all feedback classes are toggled
 * synchronously inside the click handler — no timers, no awaited work — so
 * the browser paints the new state on the very next frame. The only
 * animation used is the CSS keyframe in main.css (transform/opacity only,
 * compositor-driven, no layout thrashing). `warmUpFeedbackAnimation` forces
 * the browser to resolve that keyframe's styles once, off-screen, right
 * after the question mounts, so the child's first tap doesn't pay a
 * first-run style-recalculation cost.
 *
 * Advance timer (AC-6): "Siguiente" appears disabled as soon as the answer
 * is revealed and only becomes clickable after `MIN_ADVANCE_DELAY_MS`
 * (4s), guaranteeing the dato curioso stays on screen long enough to read.
 * The delay is a plain `setTimeout` — a wall-clock timer, never gated on an
 * audio cue — so the flow works identically with sound muted (no audio
 * dependency). It is exposed on the exported `renderQuestionScreen` function
 * (and in the CommonJS/window API below) so the app-shell flow controller
 * (public/scripts/main.js, TRIOFSND-84) can derive its own auto-advance
 * delay from the same single source of truth instead of duplicating 4000.
 *
 * Accessibility (AC-14, TRIOFSND-79): the dato curioso paragraph and the
 * visible `feedback` paragraph are both `aria-live="polite"`, and the
 * dinosaur illustration carries a descriptive `alt` built from the i18n
 * `dinosaurNames` map instead of a generic label. But neither states
 * *which* option was correct in words — a sighted child sees the green
 * highlight, a screen reader user would not. `announcementEl`
 * (`role="status"`, `aria-live="polite"`, visually hidden via `.sr-only`)
 * closes that gap: it is written synchronously in the same click handler
 * that applies the visual/score feedback (no timers, no dependency on the
 * fun-fact reveal or the mute state), so TalkBack/VoiceOver announce
 * acierto/fallo *and* the correct option's text immediately after the tap,
 * exactly like the summary announcement in public/scripts/resultsScreen.js.
 *
 * Fail sound (TRIOFSND-89): a wrong pick additionally plays a soft, neutral
 * effect via public/scripts/audio.js's `playFailSound` — never a harsh/error
 * sound, matching AC-7's "no penalization, no negative language". It's
 * muted-aware: `options.muted` (the global mute preference from
 * public/scripts/main.js, TRIOFSND-66) is forwarded straight through, so in
 * silent mode the miss is communicated only visually, exactly like the
 * existing feedback styling. `options.playFailSound` lets callers override
 * the resolved audio module (used by tests).
 *
 * Advance timer (AC-6): "Siguiente" appears disabled as soon as the answer
 * is revealed and only becomes clickable after `MIN_ADVANCE_DELAY_MS`
 * (4s), guaranteeing the dato curioso stays on screen long enough to read.
 * The delay is a plain `setTimeout` — a wall-clock timer, never gated on an
 * audio cue — so the flow works identically with sound muted (no audio
 * dependency).
 *
 * Accessibility (AC-4/AC-14): the dinosaur illustration carries a
 * descriptive `alt` built from the i18n `dinosaurNames` map instead of a
 * generic label, and the dato curioso is `aria-live="polite"` so
 * TalkBack/VoiceOver announce it as soon as it's revealed.
 *
 * Feedback sound effects (TRIOFSND-78, AC-5/AC-11): `resolveSoundService`'s
 * `preload()` runs right after mount, alongside `warmUpFeedbackAnimation`, so
 * the first tap doesn't pay any decode/allocation cost. `handleSelect` then
 * calls `playCorrect`/`playIncorrect` synchronously, in the same tick as the
 * visual feedback classes — the service itself reads the persisted mute flag
 * (localStorage, see soundService.js) before every play and simply skips the
 * audio when muted, so the visual feedback is identical either way.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen — which the browser
 * actually runs — lives under `public/` and follows the dual CommonJS/global
 * pattern of public/scripts/homeScreen.js. It resolves its i18n strings from
 * `options.strings` (injected by the app shell after it fetches
 * /i18n/es.json), or `window.DinoQuiz.strings.question` in the browser, or
 * the `src/i18n` loader under Node — never a hardcoded string (AC-15). It
 * registers on `window.DinoQuiz.screens.renderQuestionScreen`; the canonical
 * `src/screens/QuestionScreen.js` re-exports this file.
 *
 * Dinosaur image alt-text (TRIOFSND-135, AC-14): the illustration's `alt` is
 * built from the question bank data — the dinosaur's display name (i18n
 * `dinosaurNames` map) plus the resolved `question.funFact` (the same
 * "dato curioso" already shown in the fun-fact box) — via `imageAlt`/
 * `imageAltFunFact`, so screen readers announce a descriptive name + fact
 * for every question in the bank instead of a generic label.
 *
 * Accessible result announcement (TRIOFSND-79, AC-14): answering used to
 * mark `feedback`, `scoreEl` and `funFact` as independent `aria-live`
 * regions that all changed in the same synchronous click handler — screen
 * readers receive simultaneous live-region updates in an unpredictable
 * order, so a wrong answer's "la respuesta correcta es esta" pointed at a
 * highlighted button with no accessible link to its text. Those three nodes
 * are now plain (non-live) visual elements, and a single `announcement`
 * node (`role="status"`, `aria-live="polite"`, visually hidden via
 * `.sr-only`, same pattern as `resultsScreen.js`'s `announcementEl`) states
 * the outcome, the correct answer's text and the updated score as one
 * coherent sentence.
 *
 * Rewarded-ad CTA (TRIOFSND-86): an optional, clearly-labeled "watch an ad
 * for an extra dato curioso" button appears once the answer is revealed,
 * but only when the rewarded-ad service (resolved the same
 * `require`-else-`window.DinoQuiz` way as scoring above) reports an ad is
 * actually available. In the browser that resolves to
 * `window.DinoQuiz.ads.rewardedAdService`, registered by
 * public/scripts/adsService.js (loaded before this file in index.html);
 * under Node/Jest it resolves via `require('../../src/services/ads/
 * rewardedAdService')`, which re-exports that same browser module. v1 ships
 * without a real ad network, so that service's default provider always
 * reports the ad as unavailable and the CTA stays hidden until a future ad
 * adapter is plugged into it. Whatever the ad service resolves with, the
 * CTA never touches `nextButton` or its advance timer — the game always
 * continues.
 *
 * Image style by age (TRIOFSND-194): the dinosaur illustration's variant
 * ('dibujo' | 'realista') is resolved from the age band selected in the age
 * gate (TRIOFSND-193) via `src/services/imageStyleService`, resolved the
 * same `require`-else-`window.DinoQuiz` way as the other services above.
 * `options.ageBand` lets callers/tests inject the band directly; otherwise
 * it falls back to `ageGateScreen`'s in-memory, session-only selection. If
 * the resolved style's image fails to load, the `<img>`'s `onerror` swaps
 * it to the service's `fallbackUrl` (`question.imageFallback`) exactly once,
 * so a missing/broken style variant never blocks the game.
 * The `alt` text (`resolveImageAlt`) stays built from the dinosaur/fun-fact
 * data regardless of which style image is showing, since it describes the
 * dinosaur, not the illustration style.
 *
 * Level progress UI (TRIOFSND-206): when the caller passes `options.level`
 * and `options.questionNumber`, a progress row shows the active level next
 * to the "N de 10" progress within this level -- never the child's age band
 * (never read here) nor an aggregated score from other levels (`score`
 * already reflects only the level being played, since `gameFlow.js`'s
 * `startLevel` resets it per level). Omitting `options.questionNumber`
 * renders no progress row at all, so existing callers that don't pass level
 * data see no change.
 */

(function () {
  var OPTION_CLASS = 'question-screen__option';
  var CORRECT_CLASS = 'question-screen__option--correct';
  var NEUTRAL_CLASS = 'question-screen__option--neutral';
  var CELEBRATE_CLASS = 'question-screen__option--celebrate';
  var IMAGE_BASE_PATH = '/assets/images/';
  var MIN_ADVANCE_DELAY_MS = 4000;
  var DEFAULT_TOTAL_QUESTIONS = 10;

  /** Fills a "{answer}" placeholder, falling back to the raw answer text if no format string is configured. */
  function formatAnswerTemplate(format, answerText) {
    if (typeof format !== 'string') {
      return answerText;
    }
    return format.replace('{answer}', answerText);
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

  function resolveImageAlt(strings, dinosaur, funFact) {
    var dinosaurName = (strings.dinosaurNames && strings.dinosaurNames[dinosaur]) || dinosaur;
    var alt = strings.imageAlt.replace('{dinosaur}', dinosaurName);

    if (typeof funFact === 'string' && funFact.trim() !== '') {
      alt += ' ' + strings.imageAltFunFact.replace('{funFact}', funFact);
    }

    return alt;
  }

  function resolveStrings(options) {
    options = options || {};
    if (options.strings) {
      return options.strings;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).question;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.question : null;
  }

  // Content-guide audit (TRIOFSND-91, AC-7): the wrong-answer feedback must
  // never contain negative/discouraging language. Shares its banned-word
  // list with the motivational messages guarded in
  // public/scripts/resultsScreen.js via src/i18n/contentGuide.js.
  function resolveContentGuide() {
    return typeof require === 'function' ? require('../../src/i18n/contentGuide') : null;
  }

  /** Audits the incorrect-answer feedback copy; returns an error string, or null if it is clean. */
  function validateFailureCopy(strings) {
    var contentGuide = resolveContentGuide();
    if (!contentGuide || !strings || !strings.feedback) {
      return null;
    }
    return contentGuide.validateCopy(strings.feedback.incorrect, 'question.feedback.incorrect');
  }
  /** Fills a "{answer}" placeholder, falling back to the raw answer text if no format string is configured. */
  function formatAnswerTemplate(format, answerText) {
    if (typeof format !== 'string') {
      return answerText;
    }
    return format.replace('{answer}', answerText);
  }
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  function resolveSoundService(options) {
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

  // TRIOFSND-311: a single reusable aria-live region for every spoken
  // announcement this screen makes (round change, feedback + score,
  // rewarded-ad status), instead of the several independent `aria-live`
  // nodes this screen used to juggle -- see a11yAnnouncer.js for why that
  // could make a screen reader announce things out of order or overlapping.
  // A fresh instance per render mirrors `announcementEl` being a fresh node
  // per render before this change; `options.a11yAnnouncer` lets tests inject
  // one directly.
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

  function formatTemplate(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }
  // TRIOFSND-91 content-guide audit: the "incorrect" feedback and the dato
  // curioso heading are the copy a child sees right after a miss, so they are
  // held to the same no-reproach standard as ResultsScreen's motivational
  // messages — reusing that same banned-word list rather than a second one.
  // Only invoked by the audit tests under Node/Jest, never during rendering,
  // so it resolves `resultsScreen` lazily instead of at module load (the
  // browser never calls it, so it never needs `require` to exist there).
  function validateFeedbackCopy(strings) {
    if (typeof require !== 'function') {
      return ['validateFeedbackCopy requires a CommonJS `require` (Node/Jest only)'];
    }
    var resultsScreen = require('./resultsScreen');
    var errors = [];
    var fieldsToCheck = [
      ['feedback.correct', strings && strings.feedback && strings.feedback.correct],
      ['feedback.incorrect', strings && strings.feedback && strings.feedback.incorrect],
      ['funFactHeading', strings && strings.funFactHeading],
      ['nextButton', strings && strings.nextButton],
    ];

    fieldsToCheck.forEach(function (field) {
      var name = field[0];
      var value = field[1];

      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(name + ' must be a non-empty string');
        return;
      }

      var bannedWordsFound = resultsScreen.normalizeToWords(value).filter(function (word) {
        return resultsScreen.BANNED_WORDS.has(word);
      });
      if (bannedWordsFound.length > 0) {
        errors.push(name + ' ("' + value + '") contains negative language: ' + bannedWordsFound.join(', '));
      }
    });

    return errors;
  }

  function resolveAudio() {
    if (typeof require === 'function') {
      return require('./audio');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.audio) || null;
  }

  function resolveImageStyleService(options) {
    if (options && options.imageStyleService) {
      return options.imageStyleService;
    }
    if (typeof require === 'function') {
      try {
        return require('../../src/services/imageStyleService');
      } catch (error) {
        return null;
      }
    }
    return (
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.imageStyleService) ||
      null
    );
  }

  function resolveAgeGateScreen() {
    if (typeof require === 'function') {
      try {
        return require('../../src/screens/AgeGateScreen');
      } catch (error) {
        return null;
      }
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.screens && window.DinoQuiz.screens.ageGate) || null;
  }

  /** `options.ageBand` lets callers/tests inject it directly; otherwise falls back to ageGateScreen's in-memory session selection. */
  function resolveAgeBand(options) {
    if (options && typeof options.ageBand === 'string') {
      return options.ageBand;
    }
    var ageGateScreen = resolveAgeGateScreen();
    return ageGateScreen && typeof ageGateScreen.getSelectedAgeBand === 'function' ? ageGateScreen.getSelectedAgeBand() : null;
  }

  /** Resolves the style/URL/fallback for a question's illustration; degrades to the raw image path if the service is unavailable. */
  function resolveQuestionImage(question, options) {
    var imageStyleService = resolveImageStyleService(options);
    if (!imageStyleService || typeof imageStyleService.resolveQuestionImage !== 'function') {
      return { style: null, url: question.image, fallbackUrl: question.image };
    }
    return imageStyleService.resolveQuestionImage(question, resolveAgeBand(options));
  }

  function resolveRewardedAdService(options) {
    if (options && options.rewardedAdService) {
      return options.rewardedAdService;
    }
    if (typeof require === 'function') {
      try {
        return require('../../src/services/ads/rewardedAdService').rewardedAdService;
      } catch (error) {
        return null;
      }
    }
    // public/scripts/adsService.js registers the shared instance here; its
    // default provider reports the ad as unavailable until a real ad
    // adapter is plugged in, so the CTA stays hidden in v1.
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.ads && window.DinoQuiz.ads.rewardedAdService) || null;
  }
  function warmUpFeedbackAnimation() {
    if (typeof document === 'undefined') return;

    var probe = document.createElement('div');
    probe.className = OPTION_CLASS + ' ' + CORRECT_CLASS + ' ' + CELEBRATE_CLASS;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    // Reading layout forces style resolution now instead of on the child's tap.
    void probe.getBoundingClientRect();
    probe.remove();
  }

  function buildResultAnnouncement(strings, question, correct, score) {
    var parts = [correct ? strings.feedback.correct : strings.feedback.incorrect];

    parts.push(
      strings.correctAnswerAnnouncement.replace(
        '{correctAnswer}',
        question.options[question.correctAnswerIndex]
      )
    );

    if (typeof question.funFact === 'string' && question.funFact.trim() !== '') {
      parts.push(strings.imageAltFunFact.replace('{funFact}', question.funFact));
    }

    parts.push(strings.scoreLabel + ': ' + score);

    return parts.join(' ');
  }

  function renderQuestionScreen(container, question, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var scoring = resolveScoring();
    var soundService = resolveSoundService(options);
    var a11yAnnouncer = resolveA11yAnnouncer(options);
    var audio = resolveAudio();
    var playFailSound =
      typeof options.playFailSound === 'function'
        ? options.playFailSound
        : audio && typeof audio.playFailSound === 'function'
        ? audio.playFailSound
        : null;
    var onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;
    var rewardedAdService = resolveRewardedAdService(options);

    var score = options.score || 0;
    var answered = false;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'question-screen';

    var resolvedImage = resolveQuestionImage(question, options);

    var image = document.createElement('img');
    image.className = 'question-screen__image';
    image.src = IMAGE_BASE_PATH + resolvedImage.url;
    // Alt text describes the dinosaur, not the illustration style, so it
    // stays the same whichever style image ends up loading (TRIOFSND-194).
    image.alt = resolveImageAlt(strings, question.dinosaur, question.funFact);
    image.decoding = 'async';

    if (resolvedImage.url !== resolvedImage.fallbackUrl) {
      // Sin bloquear la partida (TRIOFSND-194): a broken/missing style
      // variant swaps to the guaranteed-to-exist fallback exactly once,
      // instead of leaving a broken image or retrying forever.
      image.onerror = function () {
        image.onerror = null;
        image.src = IMAGE_BASE_PATH + resolvedImage.fallbackUrl;
      };
    }

    var prompt = document.createElement('h2');
    prompt.className = 'question-screen__prompt';
    prompt.textContent = question.question;

    // Level/progress row (TRIOFSND-206): shows the active level next to the
    // "N de 10" progress, never the child's age band or a cross-level
    // running tally -- `score`/`scoreEl` below already only ever reflects
    // the level currently being played (see gameFlow.js's per-level state).
    var progressRow = null;
    var levelEl = null;
    var progressEl = null;
    if (typeof options.questionNumber === 'number') {
      progressRow = document.createElement('div');
      progressRow.className = 'question-screen__progress-row';

      if (typeof options.level === 'number') {
        levelEl = document.createElement('p');
        levelEl.className = 'question-screen__level';
        levelEl.textContent = formatTemplate(strings.levelFormat, { level: options.level });
        progressRow.appendChild(levelEl);
      }

      progressEl = document.createElement('p');
      progressEl.className = 'question-screen__progress';
      progressEl.textContent = formatTemplate(strings.progressFormat, {
        current: options.questionNumber,
        total: options.totalQuestions || DEFAULT_TOTAL_QUESTIONS,
      });
      progressRow.appendChild(progressEl);

      // TRIOFSND-311: "avance de ronda" -- a screen reader user gets no
      // visual cue that a new round started, so this announces it through
      // the shared queue the moment the round mounts (queued behind any
      // announcement still in flight, never overlapping it).
      if (a11yAnnouncer && strings.roundAnnouncementFormat) {
        a11yAnnouncer.announce(
          formatTemplate(strings.roundAnnouncementFormat, {
            current: options.questionNumber,
            total: options.totalQuestions || DEFAULT_TOTAL_QUESTIONS,
          })
        );
      }
    }

    var scoreEl = document.createElement('p');
    scoreEl.className = 'question-screen__score';
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'question-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    // `feedback` is now a plain visual paragraph -- the spoken announcement
    // for the same content goes through `a11yAnnouncer` below instead
    // (TRIOFSND-311), so this text is never independently `aria-live`.
    var feedback = document.createElement('p');
    feedback.className = 'question-screen__feedback';

    // Single accessible result announcement (TRIOFSND-79/TRIOFSND-311, AC-14):
    // `announcementEl` and `announcement` are two names for the SAME node
    // (the return object below exposes both) -- it is the ONE reusable
    // `role="status"` region a11yAnnouncer owns, so every announcement this
    // screen makes (round change, feedback + score, rewarded-ad status) goes
    // through it instead of a screen reader juggling several independent
    // `aria-live` nodes.
    var announcementEl = a11yAnnouncer ? a11yAnnouncer.getRegion() : document.createElement('p');
    announcementEl.classList.add('question-screen__announcement', 'sr-only');
    if (!announcementEl.getAttribute('role')) {
      announcementEl.setAttribute('role', 'status');
    }
    if (!announcementEl.getAttribute('aria-live')) {
      announcementEl.setAttribute('aria-live', 'polite');
    }
    var announcement = announcementEl;

    var funFactBox = document.createElement('div');
    funFactBox.className = 'question-screen__fun-fact-box';
    funFactBox.hidden = true;
    var funFactHeading = document.createElement('h3');
    funFactHeading.className = 'question-screen__fun-fact-heading';
    funFactHeading.textContent = strings.funFactHeading;

    var funFact = document.createElement('p');
    funFact.className = 'question-screen__fun-fact';

    funFactBox.appendChild(funFactHeading);
    funFactBox.appendChild(funFact);

    var rewardedAdStrings = strings.rewardedAd || {};

    var rewardedAdCta = document.createElement('button');
    rewardedAdCta.type = 'button';
    rewardedAdCta.className = 'question-screen__rewarded-ad-cta';
    rewardedAdCta.textContent = rewardedAdStrings.ctaLabel;
    rewardedAdCta.setAttribute('aria-label', rewardedAdStrings.ctaAriaLabel);
    rewardedAdCta.hidden = true;

    // Plain visual status paragraph -- its spoken equivalent is announced
    // through the shared `a11yAnnouncer` region instead (TRIOFSND-311).
    var rewardedAdStatus = document.createElement('p');
    rewardedAdStatus.className = 'question-screen__rewarded-ad-status';
    rewardedAdStatus.hidden = true;

    var extraFunFactBox = document.createElement('div');
    extraFunFactBox.className = 'question-screen__fun-fact-box question-screen__extra-fun-fact-box';
    extraFunFactBox.hidden = true;

    var extraFunFactHeading = document.createElement('h3');
    extraFunFactHeading.className = 'question-screen__fun-fact-heading';
    extraFunFactHeading.textContent = rewardedAdStrings.extraFactHeading;

    // Plain visual paragraph -- its spoken equivalent is announced through
    // the shared `a11yAnnouncer` region instead (TRIOFSND-311).
    var extraFunFact = document.createElement('p');
    extraFunFact.className = 'question-screen__fun-fact';

    extraFunFactBox.appendChild(extraFunFactHeading);
    extraFunFactBox.appendChild(extraFunFact);

    bindActivation(rewardedAdCta, function () {
      if (rewardedAdCta.disabled) return;
      rewardedAdCta.disabled = true;
      rewardedAdStatus.textContent = rewardedAdStrings.loadingLabel;
      rewardedAdStatus.hidden = false;
      if (a11yAnnouncer) {
        a11yAnnouncer.announce(rewardedAdStrings.loadingLabel);
      }

      rewardedAdService.request().then(function (result) {
        if (result && result.granted) {
          var extraFact = (rewardedAdStrings.extraFacts && rewardedAdStrings.extraFacts[question.dinosaur]) || '';
          extraFunFact.textContent = extraFact;
          extraFunFactBox.hidden = false;
          rewardedAdStatus.textContent = '';
          rewardedAdStatus.hidden = true;
          rewardedAdCta.hidden = true;
          if (a11yAnnouncer) {
            a11yAnnouncer.announce((rewardedAdStrings.extraFactHeading || '') + ' ' + extraFact);
          }
        } else {
          rewardedAdStatus.textContent = rewardedAdStrings.notCompletedMessage;
          if (a11yAnnouncer) {
            a11yAnnouncer.announce(rewardedAdStrings.notCompletedMessage);
          }
        }
      });
    });
    var nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'question-screen__next-button';
    nextButton.textContent = strings.nextButton;
    nextButton.hidden = true;

    var optionButtons = question.options.map(function (optionText, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = OPTION_CLASS;
      button.textContent = optionText;
      bindActivation(button, function () {
        handleSelect(index);
      });
      optionsGroup.appendChild(button);
      return button;
    });

    function handleSelect(selectedIndex) {
      if (answered) return;
      answered = true;

      var correct = scoring.isAnswerCorrect(question, selectedIndex);
      var previousScore = score;
      score = scoring.applyAnswerToScore(score, correct);
      var correctAnswerText = question.options[question.correctAnswerIndex];

      if (soundService) {
        if (correct) {
          soundService.playCorrect();
        } else {
          soundService.playIncorrect();
        }
      }

      optionButtons.forEach(function (button, index) {
        button.disabled = true;

        if (index === question.correctAnswerIndex) {
          button.classList.add(CORRECT_CLASS);
          if (correct) {
            button.classList.add(CELEBRATE_CLASS);
          } else {
            // Descriptive label (TRIOFSND-90, AC-14), only needed on a miss:
            // a screen reader announces this as the correct answer even
            // without seeing the green border. On a hit the tapped/correct
            // option are the same button, already covered by the "¡Genial,
            // acertaste!" feedback below, so no extra label is added.
            button.setAttribute('aria-label', formatAnswerTemplate(strings.correctOptionAriaLabel, button.textContent));
          }
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
          // Neutral label (never "wrong"/"incorrect") for the tapped option (AC-7).
          button.setAttribute('aria-label', formatAnswerTemplate(strings.selectedOptionAriaLabelFormat, button.textContent));
        }
      });

      var correctAnswerText = question.options[question.correctAnswerIndex];
      if (correct) {
        feedback.textContent = strings.feedback.correct;
      } else {
        // Spell out the correct answer's text in the aria-live announcement
        // (TRIOFSND-90, AC-7): a TalkBack/VoiceOver user hears this instead of
        // relying on the visual border to know which option was right.
        feedback.textContent =
          strings.feedback.incorrect + ' ' + formatAnswerTemplate(strings.correctAnswerAnnouncementFormat, correctAnswerText);
      }
      scoreEl.textContent = strings.scoreLabel + ': ' + score;

      funFact.textContent = question.funFact;
      funFactBox.hidden = false;

      // Queued synchronously, right here, so TalkBack/VoiceOver announce
      // acierto/fallo, the correct option's text, the dato curioso and the
      // updated score as one coherent sentence — it never waits on the
      // fun-fact reveal, a sound cue, or a timer (TRIOFSND-79/TRIOFSND-90/
      // TRIOFSND-311, AC-14). Queued rather than written directly so it never
      // overlaps a still-in-flight round-change announcement from this same
      // screen's mount.
      if (a11yAnnouncer) {
        a11yAnnouncer.announce(buildResultAnnouncement(strings, question, correct, score));
      }
      if (rewardedAdService && typeof rewardedAdService.isAvailable === 'function' && rewardedAdService.isAvailable()) {
        rewardedAdCta.hidden = false;
      }
      nextButton.hidden = false;
      nextButton.disabled = true;
      setTimeout(function () {
        nextButton.disabled = false;
      }, MIN_ADVANCE_DELAY_MS);

      if (!correct && playFailSound) {
        playFailSound({ muted: !!options.muted });
      }

      if (onAnswer) {
        onAnswer({
          isCorrect: correct,
          scoreDelta: score - previousScore,
          score: score,
          selectedIndex: selectedIndex,
          correctIndex: question.correctAnswerIndex,
        });
      }
    }

    bindActivation(nextButton, function () {
      if (typeof options.onNext === 'function') {
        options.onNext(score);
      }
    });

    root.appendChild(image);
    root.appendChild(prompt);
    if (progressRow) {
      root.appendChild(progressRow);
    }
    root.appendChild(scoreEl);
    root.appendChild(optionsGroup);
    root.appendChild(feedback);
    root.appendChild(announcementEl);
    root.appendChild(funFactBox);
    root.appendChild(rewardedAdCta);
    root.appendChild(rewardedAdStatus);
    root.appendChild(extraFunFactBox);
    root.appendChild(nextButton);
    container.appendChild(root);

    warmUpFeedbackAnimation();
    if (soundService) {
      soundService.preload();
    }

    return {
      root: root,
      image: image,
      imageStyle: resolvedImage.style,
      prompt: prompt,
      progressRow: progressRow,
      levelEl: levelEl,
      progressEl: progressEl,
      scoreEl: scoreEl,
      optionButtons: optionButtons,
      feedback: feedback,
      announcementEl: announcementEl,
      funFactBox: funFactBox,
      funFact: funFact,
      announcement: announcement,
      rewardedAdCta: rewardedAdCta,
      rewardedAdStatus: rewardedAdStatus,
      extraFunFactBox: extraFunFactBox,
      extraFunFact: extraFunFact,
      nextButton: nextButton,
      getScore: function () {
        return score;
      },
      isAnswered: function () {
        return answered;
      },
    };
  }

  // Exposed on the function itself (not just the module's `api` below) so
  // the app-shell flow controller (public/scripts/main.js, TRIOFSND-84) can
  // derive its auto-advance delay from `renderers.renderQuestionScreen`
  // without a second require of this module.
  renderQuestionScreen.MIN_ADVANCE_DELAY_MS = MIN_ADVANCE_DELAY_MS;

  var api = {
    renderQuestionScreen: renderQuestionScreen,
    warmUpFeedbackAnimation: warmUpFeedbackAnimation,
    buildResultAnnouncement: buildResultAnnouncement,
    validateFailureCopy: validateFailureCopy,
    validateFeedbackCopy: validateFeedbackCopy,
    MIN_ADVANCE_DELAY_MS: MIN_ADVANCE_DELAY_MS,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderQuestionScreen = renderQuestionScreen;
  }
})();
