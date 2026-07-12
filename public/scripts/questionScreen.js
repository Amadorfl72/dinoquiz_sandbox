'use strict';

/**
 * Pregunta/Feedback screen (TRIOFSND-77 / TRIOFSND-88): shows one question
 * with its options and, once the child taps an answer, the feedback and
 * "dato curioso" for that answer (TRIOFSND-83).
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
 * dependency).
 *
 * Accessibility (AC-14): the dato curioso paragraph is `aria-live="polite"`
 * so TalkBack/VoiceOver announce it as soon as it's revealed, and the
 * dinosaur illustration carries a descriptive `alt` built from the i18n
 * `dinosaurNames` map instead of a generic label.
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
  var IMAGE_BASE_PATH = '/assets/images/';
  var MIN_ADVANCE_DELAY_MS = 4000;

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

  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
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

  function resolveImageAlt(strings, dinosaur) {
    var dinosaurName = (strings.dinosaurNames && strings.dinosaurNames[dinosaur]) || dinosaur;
    return strings.imageAlt.replace('{dinosaur}', dinosaurName);
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
    var scoring = resolveScoring();
    var onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;

    var score = options.score || 0;
    var answered = false;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'question-screen';

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
    scoreEl.setAttribute('aria-live', 'polite');
    scoreEl.textContent = strings.scoreLabel + ': ' + score;

    var optionsGroup = document.createElement('div');
    optionsGroup.className = 'question-screen__options';
    optionsGroup.setAttribute('role', 'group');
    optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

    var feedback = document.createElement('p');
    feedback.className = 'question-screen__feedback';
    feedback.setAttribute('aria-live', 'polite');

    var funFactBox = document.createElement('div');
    funFactBox.className = 'question-screen__fun-fact-box';
    funFactBox.hidden = true;

    var funFactHeading = document.createElement('h3');
    funFactHeading.className = 'question-screen__fun-fact-heading';
    funFactHeading.textContent = strings.funFactHeading;

    var funFact = document.createElement('p');
    funFact.className = 'question-screen__fun-fact';
    funFact.setAttribute('aria-live', 'polite');

    funFactBox.appendChild(funFactHeading);
    funFactBox.appendChild(funFact);

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
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
        }
      });

      feedback.textContent = correct ? strings.feedback.correct : strings.feedback.incorrect;
      scoreEl.textContent = strings.scoreLabel + ': ' + score;

      funFact.textContent = question.funFact;
      funFactBox.hidden = false;

      nextButton.hidden = false;
      nextButton.disabled = true;
      setTimeout(function () {
        nextButton.disabled = false;
      }, MIN_ADVANCE_DELAY_MS);

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

    root.appendChild(prompt);
    root.appendChild(image);
    root.appendChild(scoreEl);
    root.appendChild(optionsGroup);
    root.appendChild(feedback);
    root.appendChild(funFactBox);
    root.appendChild(nextButton);
    container.appendChild(root);

    warmUpFeedbackAnimation();

    return {
      root: root,
      prompt: prompt,
      image: image,
      scoreEl: scoreEl,
      optionButtons: optionButtons,
      feedback: feedback,
      funFactBox: funFactBox,
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

  var api = {
    renderQuestionScreen: renderQuestionScreen,
    warmUpFeedbackAnimation: warmUpFeedbackAnimation,
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
