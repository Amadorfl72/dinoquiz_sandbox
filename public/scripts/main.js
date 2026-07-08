/**
 * DinoQuiz app shell bootstrap.
 *
 * Registers the service worker so the app shell, images, sounds and
 * question JSON get cached for 100% offline play (see /public/service-worker.js),
 * then renders the Home ("Inicio") screen into #app so the title, mascot
 * illustration and '¡Jugar!' button are actually visible on load (see
 * public/scripts/homeScreen.js, loaded before this file in index.html).
 *
 * Beyond Home, this file is also the app shell's navigator: it drives the
 * closed Inicio -> Quiz -> Resultados -> Volver a jugar/Salir loop described
 * by the PRD (main_workflow steps 6-7). `startNewGame` resets the game state
 * (score/questionIndex/answers, see src/game/gameFlow.js) and walks the
 * player through the selected questions one at a time via
 * src/screens/QuestionScreen.js; once the last question is answered it shows
 * src/screens/ResultsScreen.js, whose 'Volver a jugar' calls back into
 * `startNewGame` (fresh state + a new random subset of questions, AC-9) and
 * whose 'Salir' calls `renderHome` again.
 *
 * `registerServiceWorker`/`loadHomeStrings`/`renderHome` accept explicit
 * overrides so each is unit-testable under Node without touching the
 * global `navigator`/`document`/`fetch`. The screen renderers and the
 * question bank are resolved the same way `homeScreen.js` resolves its
 * default strings: from `window.DinoQuiz` in the browser, or via `require`
 * under Node/Jest — see `resolveScreenRenderers`/`loadQuestions` below.
 */
(function () {
  function resolveScreenRenderers(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var fromWindow = (win && win.DinoQuiz && win.DinoQuiz.screens) || {};

    if (typeof require === 'function') {
      return {
        renderHomeScreen: fromWindow.renderHomeScreen || require('./homeScreen').renderHomeScreen,
        renderQuestionScreen:
          fromWindow.renderQuestionScreen || require('../../src/screens/QuestionScreen').renderQuestionScreen,
        renderResultsScreen:
          fromWindow.renderResultsScreen || require('../../src/screens/ResultsScreen').renderResultsScreen,
      };
    }

    if (fromWindow.renderHomeScreen && fromWindow.renderQuestionScreen && fromWindow.renderResultsScreen) {
      return fromWindow;
    }

    return null;
  }

  function loadQuestions(loaderFn) {
    loaderFn =
      loaderFn ||
      (typeof require === 'function'
        ? function () {
            return require('../../src/data/questionBank').loadQuestionBank();
          }
        : null);

    if (typeof loaderFn !== 'function') {
      return null;
    }

    try {
      return loaderFn();
    } catch (error) {
      console.error('DinoQuiz: failed to load the question bank', error);
      return null;
    }
  }

  function resolveGameFlow() {
    if (typeof require !== 'function') {
      return null;
    }
    return require('../../src/game/gameFlow');
  }

  /** Renders the question at `session.state.questionIndex`, then advances or completes on 'Siguiente'. */
  function renderQuestionAt(container, renderers, session, onGameComplete) {
    var question = session.questions[session.state.questionIndex];

    return renderers.renderQuestionScreen(container, question, {
      score: session.state.score,
      onAnswer: function (result) {
        session.state.score = result.score;
        session.state.answers = session.state.answers.concat([
          {
            questionId: question.id,
            selectedIndex: result.selectedIndex,
            correctIndex: result.correctIndex,
            isCorrect: result.isCorrect,
          },
        ]);
      },
      onNext: function () {
        session.state.questionIndex += 1;

        if (session.state.questionIndex >= session.questions.length) {
          onGameComplete(session.state);
        } else {
          renderQuestionAt(container, renderers, session, onGameComplete);
        }
      },
    });
  }

  /** Renders Resultados for a finished game; 'Volver a jugar' starts a fresh game, 'Salir' goes to Inicio. */
  function renderResultsFor(container, renderers, questions, finalState, doc, fetchFn) {
    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      onPlayAgain: function () {
        startNewGame(container, renderers, questions, doc, fetchFn);
      },
      onExit: function () {
        renderHome(doc, renderers.renderHomeScreen, fetchFn);
      },
    });
  }

  /** Resets game state (score/questionIndex/answers) and navigates to the first question of a new game. */
  function startNewGame(container, renderers, questions, doc, fetchFn, randomFn) {
    var gameFlow = resolveGameFlow();
    if (!gameFlow || !questions || questions.length === 0) {
      return null;
    }

    var session = gameFlow.startNewGame(questions, { randomFn: randomFn });

    renderQuestionAt(container, renderers, session, function (finalState) {
      renderResultsFor(container, renderers, questions, finalState, doc, fetchFn);
    });

    return session;
  }

  function registerServiceWorker(nav, swPath) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
    swPath = swPath || '/service-worker.js';

    if (!nav || !('serviceWorker' in nav)) {
      return Promise.resolve(null);
    }

    return nav.serviceWorker
      .register(swPath)
      .then(function (registration) {
        return registration;
      })
      .catch(function (error) {
        console.error('DinoQuiz: service worker registration failed', error);
        return null;
      });
  }

  function loadHomeStrings(fetchFn, resourcePath) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : undefined);
    resourcePath = resourcePath || '/i18n/es.json';

    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
    }

    return fetchFn(resourcePath)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.home;
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to load the i18n resource', error);
        return null;
      });
  }

  function renderHome(doc, renderHomeScreen, fetchFn) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    renderHomeScreen =
      renderHomeScreen ||
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.screens &&
        window.DinoQuiz.screens.renderHomeScreen);

    if (!doc || typeof renderHomeScreen !== 'function') {
      return Promise.resolve(null);
    }

    var container = doc.getElementById('app');
    if (!container) {
      return Promise.resolve(null);
    }

    return loadHomeStrings(fetchFn).then(function (strings) {
      var homeApi = renderHomeScreen(container, strings ? { strings: strings } : {});

      // Wire '¡Jugar!' to start a game without changing renderHomeScreen's
      // contract/props (it stays a plain, option-less strings renderer);
      // we attach to the button element it hands back instead.
      if (homeApi && homeApi.playButton) {
        homeApi.playButton.addEventListener('click', function () {
          var renderers = resolveScreenRenderers();
          var questions = loadQuestions();
          if (renderers && questions && questions.length > 0) {
            startNewGame(container, renderers, questions, doc, fetchFn);
          }
        });
      }

      return homeApi;
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () {
      registerServiceWorker();
      renderHome();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      registerServiceWorker: registerServiceWorker,
      loadHomeStrings: loadHomeStrings,
      renderHome: renderHome,
      resolveScreenRenderers: resolveScreenRenderers,
      loadQuestions: loadQuestions,
      startNewGame: startNewGame,
      renderQuestionAt: renderQuestionAt,
      renderResultsFor: renderResultsFor,
    };
  }
})();
