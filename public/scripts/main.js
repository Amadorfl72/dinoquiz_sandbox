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
 * (score/questionIndex/answers, see public/scripts/gameFlow.js) and walks the
 * player through the selected questions one at a time via
 * public/scripts/questionScreen.js; once the last question is answered it
 * shows public/scripts/resultsScreen.js, whose 'Volver a jugar' calls back
 * into `startNewGame` (fresh state + a new random subset of questions, AC-9)
 * and whose 'Salir' calls `renderHome` again.
 *
 * No-bundler runtime: DinoQuiz ships without a build step, so `require` does
 * not exist in the browser. Every screen and the game logic are loaded as
 * plain `<script>`s (see public/index.html) that register themselves on
 * `window.DinoQuiz` (screens, game, scoring); the question bank and i18n
 * strings are fetched from /data/questions.json and /i18n/es.json at startup
 * and stashed on `window.DinoQuiz` too. `resolveScreenRenderers`,
 * `resolveGameFlow` and `loadQuestions` therefore read from `window.DinoQuiz`
 * in the browser and fall back to `require` under Node/Jest, so the whole
 * flow runs identically in the real PWA and in the unit tests.
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

  function resolveGameFlow(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('../../src/game/gameFlow');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.game) || null;
  }

  /**
   * Resolves the funny fact text for a question from the i18n strings. In the
   * bank each question carries a `dato_curioso` i18n key (e.g.
   * "funFacts.trex-01"); the question screen renders the resolved text as
   * `question.funFact`.
   */
  function resolveFunFact(strings, key) {
    if (!strings || typeof key !== 'string') {
      return '';
    }
    var text = key.split('.').reduce(function (value, segment) {
      return value && typeof value === 'object' ? value[segment] : undefined;
    }, strings);
    return typeof text === 'string' ? text : '';
  }

  /**
   * Turns the raw bank (as stored in /data/questions.json, with i18n keys) into
   * the play-ready shape the question screen expects, resolving each question's
   * `dato_curioso` key into a `funFact` string via the fetched i18n resource.
   */
  function prepareBrowserQuestions(rawQuestions, strings) {
    if (!Array.isArray(rawQuestions)) {
      return [];
    }
    var funFacts = strings ? strings.funFacts : null;
    return rawQuestions.map(function (question) {
      var prepared = {};
      for (var key in question) {
        if (Object.prototype.hasOwnProperty.call(question, key)) {
          prepared[key] = question[key];
        }
      }
      prepared.funFact = resolveFunFact(funFacts, question.dato_curioso);
      return prepared;
    });
  }

  function loadQuestions(loaderFn) {
    if (typeof loaderFn === 'function') {
      try {
        return loaderFn();
      } catch (error) {
        console.error('DinoQuiz: failed to load the question bank', error);
        return null;
      }
    }

    if (typeof require === 'function') {
      try {
        return require('../../src/data/questionBank').loadQuestionBank();
      } catch (error) {
        console.error('DinoQuiz: failed to load the question bank', error);
        return null;
      }
    }

    // Browser: the bank was fetched and prepared at startup (see bootstrap).
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.questions) || null;
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

  function fetchJson(fetchFn, resourcePath) {
    return fetchFn(resourcePath).then(function (response) {
      return response.json();
    });
  }

  function loadHomeStrings(fetchFn, resourcePath) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : undefined);
    resourcePath = resourcePath || '/i18n/es.json';

    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
    }

    return fetchJson(fetchFn, resourcePath)
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

  /**
   * Browser-only startup: fetch the i18n strings and the question bank once,
   * stash the play-ready data on `window.DinoQuiz` so `loadQuestions()` and
   * the screens can read it synchronously, then render Home. Runs after the
   * screen/game `<script>`s have registered themselves on `window.DinoQuiz`.
   */
  function bootstrapBrowserApp() {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    window.DinoQuiz = window.DinoQuiz || {};

    var fetchFn = typeof fetch === 'function' ? fetch : undefined;
    if (typeof fetchFn !== 'function') {
      return renderHome();
    }

    return fetchJson(fetchFn, '/i18n/es.json')
      .then(function (strings) {
        window.DinoQuiz.strings = strings;
        return fetchJson(fetchFn, '/data/questions.json');
      })
      .then(function (rawQuestions) {
        window.DinoQuiz.questions = prepareBrowserQuestions(rawQuestions, window.DinoQuiz.strings);
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to prepare the game data', error);
      })
      .then(function () {
        return renderHome();
      });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () {
      registerServiceWorker();
      bootstrapBrowserApp();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      registerServiceWorker: registerServiceWorker,
      loadHomeStrings: loadHomeStrings,
      renderHome: renderHome,
      resolveScreenRenderers: resolveScreenRenderers,
      resolveGameFlow: resolveGameFlow,
      loadQuestions: loadQuestions,
      prepareBrowserQuestions: prepareBrowserQuestions,
      startNewGame: startNewGame,
      renderQuestionAt: renderQuestionAt,
      renderResultsFor: renderResultsFor,
    };
  }
})();
