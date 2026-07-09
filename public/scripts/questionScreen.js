'use strict';

/**
 * Pregunta/Feedback screen: shows one question with its options and, once
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
 * Performance (AC-5, "<300ms"): all feedback classes are toggled
 * synchronously inside the click handler — no timers, no awaited work — so
 * the browser paints the new state on the very next frame.
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
 */

(function () {
  var OPTION_CLASS = 'question-screen__option';
  var CORRECT_CLASS = 'question-screen__option--correct';
  var NEUTRAL_CLASS = 'question-screen__option--neutral';
  var CELEBRATE_CLASS = 'question-screen__option--celebrate';

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
    var soundService = resolveSoundService(options);
    var onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;

    var score = options.score || 0;
    var answered = false;

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'question-screen';

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
          }
        } else if (index === selectedIndex) {
          button.classList.add(NEUTRAL_CLASS);
        }
      });

      feedback.textContent = correct ? strings.feedback.correct : strings.feedback.incorrect;
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

    root.appendChild(prompt);
    root.appendChild(scoreEl);
    root.appendChild(optionsGroup);
    root.appendChild(feedback);
    root.appendChild(funFactHeading);
    root.appendChild(funFact);
    root.appendChild(nextButton);
    container.appendChild(root);

    warmUpFeedbackAnimation();
    if (soundService) {
      soundService.preload();
    }

    return {
      root: root,
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
