'use strict';

/**
 * Pregunta/Feedback screen: shows the dinosaur illustration, a large
 * centered enunciado (TRIOFSND-72, AC-4: >=20sp) and its options, and, once
 * the child taps an answer, the feedback for that answer.
 *
 * Correctness (TRIOFSND-77 / TRIOFSND-88, AC-7): a wrong pick is never
 * penalized — the score keeps whatever value it already had (+0), via
 * `applyAnswerToScore` in scoring.js. The correct option is always
 * highlighted with the same "acierto" style (`CORRECT_CLASS`, thick green
 * border) whether the child got it right or not; the wrong pick itself only
 * gets a neutral marker (`NEUTRAL_CLASS`) — never a "bad"/red one. A hit
 * additionally gets `CELEBRATE_CLASS` for the happy animation. Both
 * outcomes then reveal the same fun fact and "Siguiente" control, so the
 * flow to the next question is identical whether the answer was right or
 * wrong.
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
 * Performance (AC-5, "<300ms"): all feedback classes are toggled
 * synchronously inside the click handler — no timers, no awaited work — so
 * the browser paints the new state on the very next frame.
 *
 * Browser bridge: DinoQuiz has no bundler, so this screen — which the browser
 * actually runs — lives under `public/` and follows the dual CommonJS/global
 * pattern of public/scripts/homeScreen.js. It resolves its i18n strings from
 * `options.strings` (injected by the app shell after it fetches
 * /i18n/es.json), or `window.DinoQuiz.strings.question` in the browser, or
 * the `src/i18n` loader under Node — never a hardcoded string (AC-15). It
 * registers on `window.DinoQuiz.screens.renderQuestionScreen`; the canonical
 * `src/screens/QuestionScreen.js` re-exports this file.
 */

(function () {
  var OPTION_CLASS = 'question-screen__option';
  var CORRECT_CLASS = 'question-screen__option--correct';
  var NEUTRAL_CLASS = 'question-screen__option--neutral';
  var CELEBRATE_CLASS = 'question-screen__option--celebrate';
  var IMAGE_SRC_BASE = '/assets/images/';

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

  function renderQuestionScreen(container, question, options) {
    options = options || {};
    var strings = resolveStrings(options);
    var dinosaurNames = resolveDinosaurNames(options);
    var scoring = resolveScoring();
    var onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;

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

    var scoreEl = document.createElement('p');
    scoreEl.className = 'question-screen__score';
    scoreEl.setAttribute('aria-live', 'polite');
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'question-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    var feedback = document.createElement('p');
    feedback.className = 'question-screen__feedback';
    feedback.setAttribute('aria-live', 'polite');

    var funFactHeading = document.createElement('h3');
    funFactHeading.className = 'question-screen__fun-fact-heading';
    funFactHeading.textContent = strings.funFactHeading;
    funFactHeading.hidden = true;

    var funFact = document.createElement('p');
    funFact.className = 'question-screen__fun-fact';
    funFact.setAttribute('aria-live', 'polite');
    funFact.hidden = true;

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

      optionButtons.forEach(function (button, index) {
        button.disabled = true;

        if (index === question.correctAnswerIndex) {
          button.classList.add(CORRECT_CLASS);
          if (correct) {
            button.classList.add(CELEBRATE_CLASS);
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

      funFactHeading.hidden = false;
      funFact.textContent = question.funFact;
      funFact.hidden = false;

      nextButton.hidden = false;

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
    root.appendChild(scoreEl);
    root.appendChild(optionsGroup);
    root.appendChild(feedback);
    root.appendChild(funFactHeading);
    root.appendChild(funFact);
    root.appendChild(nextButton);
    container.appendChild(root);

    warmUpFeedbackAnimation();

    return {
      root: root,
      image: image,
      prompt: prompt,
      scoreEl: scoreEl,
      optionButtons: optionButtons,
      feedback: feedback,
      funFact: funFact,
      nextButton: nextButton,
      getScore: function () {
        return score;
      },
      isAnswered: function () {
        return answered;
      },
    };
  }

  var api = { renderQuestionScreen: renderQuestionScreen, warmUpFeedbackAnimation: warmUpFeedbackAnimation };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderQuestionScreen = renderQuestionScreen;
  }
})();
