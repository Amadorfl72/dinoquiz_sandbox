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
 * for every question in the 40-question bank instead of a generic label.
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
 */

(function () {
  var OPTION_CLASS = 'question-screen__option';
  var CORRECT_CLASS = 'question-screen__option--correct';
  var NEUTRAL_CLASS = 'question-screen__option--neutral';
  var CELEBRATE_CLASS = 'question-screen__option--celebrate';
  var IMAGE_BASE_PATH = '/assets/images/';
  var IMAGE_SRC_BASE = IMAGE_BASE_PATH;
  var MIN_ADVANCE_DELAY_MS = 4000;

  /** Fills a "{answer}" placeholder, falling back to the raw answer text if no format string is configured. */
  function formatAnswerTemplate(format, answerText) {
    if (typeof format !== 'string') {
      return answerText;
    }
    return format.replace('{answer}', answerText);
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

  function resolveDinosaurNames(options) {
    options = options || {};
    if (options.dinosaurNames) {
      return options.dinosaurNames;
    }
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(options.locale || i18n.DEFAULT_LOCALE).dinosaurNames;
    }
    var bundle = (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.strings) || null;
    return bundle ? bundle.dinosaurNames : null;
  }

  /** "Ilustración de un {dinosaur}" -> "Ilustración de un Tyrannosaurus Rex" (AC-14: descriptive alt-text). */
  function buildImageAlt(strings, dinosaurNames, dinosaur) {
    var format = strings && strings.imageAltFormat;
    if (typeof format !== 'string') {
      return '';
    }
    var name = (dinosaurNames && dinosaurNames[dinosaur]) || dinosaur || '';
    return format.replace('{dinosaur}', name);
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

  function resolveImageAlt(strings, dinosaur) {
    var dinosaurName = (strings.dinosaurNames && strings.dinosaurNames[dinosaur]) || dinosaur;
    return strings.imageAlt.replace('{dinosaur}', dinosaurName);
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
    var dinosaurNames = resolveDinosaurNames(options);
    var scoring = resolveScoring();
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

    var image = document.createElement('img');
    image.className = 'question-screen__image';
    image.src = IMAGE_SRC_BASE + question.image;
    image.alt = buildImageAlt(strings, dinosaurNames, question.dinosaur);
    image.decoding = 'async';

    var prompt = document.createElement('h2');
    prompt.className = 'question-screen__prompt';
    prompt.textContent = question.question;

    var image = document.createElement('img');
    image.className = 'question-screen__image';
    image.src = IMAGE_BASE_PATH + question.image;
    image.alt = resolveImageAlt(strings, question.dinosaur);
    image.decoding = 'async';
    var scoreEl = document.createElement('p');
    scoreEl.className = 'question-screen__score';
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'question-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    var feedback = document.createElement('p');
    feedback.className = 'question-screen__feedback';

    var announcementEl = document.createElement('p');
    announcementEl.className = 'question-screen__announcement sr-only';
    announcementEl.setAttribute('role', 'status');
    announcementEl.setAttribute('aria-live', 'polite');

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

    var announcement = document.createElement('p');
    announcement.className = 'question-screen__announcement sr-only';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');

    var rewardedAdStrings = strings.rewardedAd || {};

    var rewardedAdCta = document.createElement('button');
    rewardedAdCta.type = 'button';
    rewardedAdCta.className = 'question-screen__rewarded-ad-cta';
    rewardedAdCta.textContent = rewardedAdStrings.ctaLabel;
    rewardedAdCta.setAttribute('aria-label', rewardedAdStrings.ctaAriaLabel);
    rewardedAdCta.hidden = true;

    var rewardedAdStatus = document.createElement('p');
    rewardedAdStatus.className = 'question-screen__rewarded-ad-status';
    rewardedAdStatus.setAttribute('aria-live', 'polite');

    var extraFunFactBox = document.createElement('div');
    extraFunFactBox.className = 'question-screen__fun-fact-box question-screen__extra-fun-fact-box';
    extraFunFactBox.hidden = true;

    var extraFunFactHeading = document.createElement('h3');
    extraFunFactHeading.className = 'question-screen__fun-fact-heading';
    extraFunFactHeading.textContent = rewardedAdStrings.extraFactHeading;

    var extraFunFact = document.createElement('p');
    extraFunFact.className = 'question-screen__fun-fact';
    extraFunFact.setAttribute('aria-live', 'polite');

    extraFunFactBox.appendChild(extraFunFactHeading);
    extraFunFactBox.appendChild(extraFunFact);

    rewardedAdCta.addEventListener('click', function () {
      if (rewardedAdCta.disabled) return;
      rewardedAdCta.disabled = true;
      rewardedAdStatus.textContent = rewardedAdStrings.loadingLabel;

      rewardedAdService.request().then(function (result) {
        if (result && result.granted) {
          var extraFact = (rewardedAdStrings.extraFacts && rewardedAdStrings.extraFacts[question.dinosaur]) || '';
          extraFunFact.textContent = extraFact;
          extraFunFactBox.hidden = false;
          rewardedAdStatus.textContent = '';
          rewardedAdCta.hidden = true;
        } else {
          rewardedAdStatus.textContent = rewardedAdStrings.notCompletedMessage;
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
      button.addEventListener('click', function () {
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
          // Descriptive label (TRIOFSND-90, AC-14) so a screen reader announces
          // this as the correct answer even without seeing the green border.
          button.setAttribute('aria-label', formatAnswerTemplate(strings.correctOptionAriaLabelFormat, button.textContent));
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
          // Neutral label (never "wrong"/"incorrect") for the tapped option (AC-7).
          button.setAttribute('aria-label', formatAnswerTemplate(strings.selectedOptionAriaLabelFormat, button.textContent));
        }
      });

      if (correct) {
        feedback.textContent = strings.feedback.correct;
      } else {
        // Spell out the correct answer's text in the aria-live announcement
        // (TRIOFSND-90, AC-7): a TalkBack/VoiceOver user hears this instead of
        // relying on the visual border to know which option was right.
        var correctAnswerText = question.options[question.correctAnswerIndex];
        feedback.textContent =
          strings.feedback.incorrect + ' ' + formatAnswerTemplate(strings.correctAnswerAnnouncementFormat, correctAnswerText);
      }
      scoreEl.textContent = strings.scoreLabel + ': ' + score;

      // Written synchronously, right here, so TalkBack/VoiceOver announce
      // acierto/fallo and the correct option's text immediately after the
      // tap — it never waits on the fun-fact reveal, a sound cue, or a timer.
      announcementEl.textContent = formatTemplate(
        correct ? strings.answerAnnouncement.correct : strings.answerAnnouncement.incorrect,
        { correctAnswer: correctAnswerText }
      );
      funFact.textContent = question.funFact;
      funFactBox.hidden = false;

      announcement.textContent = buildResultAnnouncement(strings, question, correct, score);

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

    nextButton.addEventListener('click', function () {
      if (typeof options.onNext === 'function') {
        options.onNext(score);
      }
    });

    root.appendChild(image);
    root.appendChild(prompt);
    root.appendChild(image);
    root.appendChild(scoreEl);
    root.appendChild(optionsGroup);
    root.appendChild(feedback);
    root.appendChild(announcementEl);
    root.appendChild(funFactBox);
    root.appendChild(announcement);
    root.appendChild(rewardedAdCta);
    root.appendChild(rewardedAdStatus);
    root.appendChild(extraFunFactBox);
    root.appendChild(nextButton);
    container.appendChild(root);

    warmUpFeedbackAnimation();

    return {
      root: root,
      image: image,
      prompt: prompt,
      image: image,
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
