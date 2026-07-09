/**
 * DinoQuiz app shell bootstrap.
 *
 * Registers the service worker so the app shell, images, sounds and
 * question JSON get cached for 100% offline play (see /public/service-worker.js),
 * then renders the Home ("Inicio") screen into #app so the title, mascot
 * illustration and '¡Jugar!' button are actually visible on load (see
 * public/scripts/homeScreen.js, loaded before this file in index.html).
 *
 * `registerServiceWorker`/`loadHomeStrings`/`loadHomeResources`/`renderHome`/
 * `renderRoute` accept explicit overrides so each is unit-testable under Node
 * without touching the global `navigator`/`document`/`fetch`/`location`.
 *
 * A minimal hash router (no bundler, no server-side rewrites needed — works
 * offline behind the service worker) switches #app between Home and the
 * Privacy policy screen (public/scripts/privacyPolicyScreen.js, TRIOFSND-116):
 * the Home privacy icon sets `location.hash` to `PRIVACY_POLICY_HASH`, the
 * policy screen's back button clears it, and a single `hashchange` listener
 * re-renders the matching screen either way — so opening the policy from
 * Home is exactly one tap, and coming back is exactly one tap.
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
 *
 * Mute persistence (TRIOFSND-66): `src/services/storage` already models a
 * `muted` key with IndexedDB/localStorage/memory fallback, but it's a
 * CommonJS module graph (`require`d internally) that this no-bundler app
 * shell can't load as a plain `<script>`. `MUTE_STORAGE_KEY` below matches
 * the exact namespaced key that service writes (`dinoquiz:muted`, JSON-
 * encoded) so a future bundler-backed wiring of the real service reads back
 * the same value with no migration. Until then, this reads/writes
 * `localStorage` directly -- sufficient for a single boolean preference --
 * degrading to an in-memory default (unmuted) if `localStorage` throws
 * (e.g. Safari private mode).
 *
 * i18n sections for the global controls (TRIOFSND-66): `homeScreen.js`'s
 * `resolveDefaultStrings`/`resolveDefaultLocaleStrings` fall back to
 * `require('../../src/i18n')`, but that CommonJS path only exists under
 * Jest -- browsers loading this as a plain `<script>` have no `require`.
 * So `loadHomeResources` below fetches the whole `/i18n/es.json` document
 * once and `renderHome` forwards its `home`, `privacy` and `purchase`
 * sections as `options.strings`/`options.privacyStrings`/
 * `options.purchaseStrings`, giving the browser path the same pre-resolved
 * strings the Node/Jest path gets via `require`.
 *
 * `renderHome`'s optional `storage` argument wires the first-run '¡Jugar!'
 * tooltip (TRIOFSND-65) to a storage backend: when given, it resolves
 * whether the tooltip was already dismissed on this device and passes the
 * persistence/analytics callbacks through to `renderHomeScreen`.
 *
 * Two backends can fill that argument. `loadDinoQuizStorage` requires the
 * CommonJS `src/services/storage` module — this only resolves under
 * Node/Jest (or a future bundler); a real unbundled browser has no
 * `require`, so it always returns `null` there. For that case,
 * `createBrowserHomeStorage` implements the same three-method interface
 * directly against `window.localStorage` (namespaced the same way as
 * `src/services/storage`, degrading to an in-memory object if localStorage
 * throws/is unavailable), the same way `loadHomeStrings` above fetches the
 * i18n resource natively instead of going through `src/i18n`'s loader. The
 * bootstrap below tries the CommonJS path first and falls back to the
 * native browser one, so the tooltip, its persisted "seen" flag and the
 * `first_tap_jugar` counter all work in the real, bundler-less PWA.
 */
(function () {
  var MUTE_STORAGE_KEY = 'dinoquiz:muted';

  function loadMutedState(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }

    try {
      var raw = storageObj.getItem(MUTE_STORAGE_KEY);
      return raw !== null ? JSON.parse(raw) === true : false;
    } catch (error) {
      return false;
    }
  }

  function persistMutedState(muted, storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }

    try {
      storageObj.setItem(MUTE_STORAGE_KEY, JSON.stringify(muted));
    } catch (error) {
      console.error('DinoQuiz: failed to persist the mute preference', error);
    }
  }

  var PRIVACY_POLICY_HASH = '#/privacidad';

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

  /**
   * Resolves the analytics storage backend, preferring an explicit override
   * (tests) and otherwise following the same CommonJS-first, browser-native
   * fallback chain as `renderHome`'s tooltip/`first_tap_jugar` wiring.
   */
  function resolveAnalyticsStorage(storage) {
    return storage || loadDinoQuizStorage() || createBrowserHomeStorage();
  }

  /** Renders the question at `session.state.questionIndex`, then advances or completes on 'Siguiente'. */
  function renderQuestionAt(container, renderers, session, onGameComplete, storage) {
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

        // 'pregunta_respondida' (TRIOFSND-92): an aggregated, non-PII
        // attempts/failures counter per question id, so the % de fallo por
        // pregunta can be computed later -- never a per-child answer log.
        if (storage && typeof storage.recordQuestionAnswered === 'function') {
          storage.recordQuestionAnswered(question.id, result.isCorrect);
        }
      },
      onNext: function () {
        session.state.questionIndex += 1;

        if (session.state.questionIndex >= session.questions.length) {
          onGameComplete(session.state);
        } else {
          renderQuestionAt(container, renderers, session, onGameComplete, storage);
        }
      },
    });
  }

  /** Renders Resultados for a finished game; 'Volver a jugar' starts a fresh game, 'Salir' goes to Inicio. */
  function renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, storage) {
    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      onPlayAgain: function () {
        startNewGame(container, renderers, questions, doc, fetchFn, undefined, storage);
      },
      onExit: function () {
        renderHome(doc, renderers.renderHomeScreen, fetchFn);
      },
    });
  }

  /** Resets game state (score/questionIndex/answers) and navigates to the first question of a new game. */
  function startNewGame(container, renderers, questions, doc, fetchFn, randomFn, storage) {
    var gameFlow = resolveGameFlow();
    if (!gameFlow || !questions || questions.length === 0) {
      return null;
    }

    var session = gameFlow.startNewGame(questions, { randomFn: randomFn });
    var analyticsStorage = resolveAnalyticsStorage(storage);

    renderQuestionAt(
      container,
      renderers,
      session,
      function (finalState) {
        renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, analyticsStorage);
      },
      analyticsStorage
    );

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

  function fetchI18nResource(fetchFn, resourcePath) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : undefined);
    resourcePath = resourcePath || '/i18n/es.json';

    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
    }

    return fetchJson(fetchFn, resourcePath)
      .catch(function (error) {
        console.error('DinoQuiz: failed to load the i18n resource', error);
        return null;
      });
  }

  function loadHomeStrings(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data && data.home;
    });
  }

  /** Fetches the i18n resource once and returns Home's `home`, `privacy` and `purchase` sections together. */
  function loadHomeResources(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data && { home: data.home, privacy: data.privacy, purchase: data.purchase };
    });
  }

  function loadPrivacyPolicyStrings(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data && data.privacyPolicy;
    });
  }

  function navigateToPrivacyPolicy(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = PRIVACY_POLICY_HASH;
    }
  }

  function navigateHome(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = '';
    }
  }

  function isPrivacyPolicyRoute(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    return !!loc && loc.hash === PRIVACY_POLICY_HASH;
  }

  function loadDinoQuizStorage(requireFn) {
    requireFn = requireFn || (typeof require === 'function' ? require : undefined);

    if (typeof requireFn !== 'function') {
      return null;
    }

    try {
      return requireFn('../../src/services/storage').dinoQuizStorage;
    } catch (error) {
      return null;
    }
  }

  var HOME_TOOLTIP_SEEN_KEY = 'dinoquiz:homeTooltipSeen';
  var ANALYTICS_EVENT_COUNTS_KEY = 'dinoquiz:analyticsEventCounts';
  var QUESTION_STATS_KEY = 'dinoquiz:questionStats';

  function createBrowserHomeStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var backend = win && win.localStorage;
    var memory = {};
    memory[HOME_TOOLTIP_SEEN_KEY] = false;
    memory[ANALYTICS_EVENT_COUNTS_KEY] = {};
    memory[QUESTION_STATS_KEY] = {};

    function readJSON(key) {
      if (backend) {
        try {
          var raw = backend.getItem(key);
          if (raw !== null) {
            return JSON.parse(raw);
          }
        } catch (error) {
          // Fall through to the in-memory value below.
        }
      }
      return memory[key];
    }

    function writeJSON(key, value) {
      memory[key] = value;
      if (backend) {
        try {
          backend.setItem(key, JSON.stringify(value));
        } catch (error) {
          // Quota exceeded or unavailable (e.g. Safari private mode): the
          // write still lands in `memory` above so the app stays correct
          // for the rest of this session, it just won't persist past it.
        }
      }
    }

    return {
      hasSeenHomeTooltip: function () {
        return Promise.resolve(Boolean(readJSON(HOME_TOOLTIP_SEEN_KEY)));
      },
      markHomeTooltipSeen: function () {
        writeJSON(HOME_TOOLTIP_SEEN_KEY, true);
        return Promise.resolve();
      },
      recordEventOnce: function (eventName) {
        var counts = readJSON(ANALYTICS_EVENT_COUNTS_KEY) || {};
        if (!counts[eventName]) {
          counts[eventName] = 1;
          writeJSON(ANALYTICS_EVENT_COUNTS_KEY, counts);
        }
        return Promise.resolve(counts[eventName]);
      },
      // Aggregated, non-PII 'pregunta_respondida' counter: attempts/failures
      // per question id only, never a per-answer log (see StorageClient's
      // recordQuestionAnswered, which this mirrors for the no-require browser
      // path).
      recordQuestionAnswered: function (questionId, isCorrect) {
        var stats = readJSON(QUESTION_STATS_KEY) || {};
        var current = stats[questionId] || { attempts: 0, failures: 0 };
        var next = {
          attempts: current.attempts + 1,
          failures: isCorrect ? current.failures : current.failures + 1,
        };
        stats[questionId] = next;
        writeJSON(QUESTION_STATS_KEY, stats);
        return Promise.resolve(next);
      },
    };
  }

  function renderHome(doc, renderHomeScreen, fetchFn, onOpenPrivacyPolicy, storage, storageObj) {
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

    return loadHomeResources(fetchFn).then(function (resources) {
      storage = storage || loadDinoQuizStorage() || createBrowserHomeStorage();

      var renderOptions = resources
        ? { strings: resources.home, privacyStrings: resources.privacy, purchaseStrings: resources.purchase }
        : {};
      if (typeof onOpenPrivacyPolicy === 'function') {
        renderOptions.onOpenPrivacyPolicy = onOpenPrivacyPolicy;
      }
      renderOptions.muted = loadMutedState(storageObj);
      renderOptions.onToggleMute = function (muted) {
        persistMutedState(muted, storageObj);
      };

      function finishRender() {
        var homeApi = renderHomeScreen(container, renderOptions);

        // Wire '¡Jugar!' to start a game without changing renderHomeScreen's
        // contract/props beyond the strings/tooltip/privacy-policy options
        // above; we attach to the button element it hands back instead.
        if (homeApi && homeApi.playButton) {
          homeApi.playButton.addEventListener('click', function () {
            var renderers = resolveScreenRenderers();
            var questions = loadQuestions();
            if (renderers && questions && questions.length > 0) {
              startNewGame(container, renderers, questions, doc, fetchFn, undefined, storage);
            }
          });
        }

        return homeApi;
      }

      return storage.hasSeenHomeTooltip().then(function (seen) {
        renderOptions.showTooltip = !seen;
        renderOptions.onTooltipDismiss = function () {
          storage.markHomeTooltipSeen();
        };
        renderOptions.onPlayButtonClick = function () {
          storage.recordEventOnce('first_tap_jugar');
        };
        return finishRender();
      });
    });
  }

  function renderPrivacyPolicy(doc, renderPrivacyPolicyScreen, fetchFn, onBack) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    renderPrivacyPolicyScreen =
      renderPrivacyPolicyScreen ||
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.screens &&
        window.DinoQuiz.screens.renderPrivacyPolicyScreen);

    if (!doc || typeof renderPrivacyPolicyScreen !== 'function') {
      return Promise.resolve(null);
    }

    var container = doc.getElementById('app');
    if (!container) {
      return Promise.resolve(null);
    }

    return loadPrivacyPolicyStrings(fetchFn).then(function (strings) {
      var options = strings ? { strings: strings } : {};
      if (typeof onBack === 'function') {
        options.onBack = onBack;
      }
      return renderPrivacyPolicyScreen(container, options);
    });
  }

  function renderRoute(doc, fetchFn, loc) {
    if (isPrivacyPolicyRoute(loc)) {
      return renderPrivacyPolicy(doc, undefined, fetchFn, function () {
        navigateHome(loc);
      });
    }

    return renderHome(doc, undefined, fetchFn, function () {
      navigateToPrivacyPolicy(loc);
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
      bootstrapBrowserApp().then(function () {
        renderRoute();
      });
    });
    window.addEventListener('hashchange', function () {
      renderRoute();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      PRIVACY_POLICY_HASH: PRIVACY_POLICY_HASH,
      registerServiceWorker: registerServiceWorker,
      loadHomeResources: loadHomeResources,
      loadHomeStrings: loadHomeStrings,
      loadDinoQuizStorage: loadDinoQuizStorage,
      createBrowserHomeStorage: createBrowserHomeStorage,
      loadPrivacyPolicyStrings: loadPrivacyPolicyStrings,
      navigateToPrivacyPolicy: navigateToPrivacyPolicy,
      navigateHome: navigateHome,
      isPrivacyPolicyRoute: isPrivacyPolicyRoute,
      renderHome: renderHome,
      renderPrivacyPolicy: renderPrivacyPolicy,
      renderRoute: renderRoute,
      resolveScreenRenderers: resolveScreenRenderers,
      resolveGameFlow: resolveGameFlow,
      loadQuestions: loadQuestions,
      prepareBrowserQuestions: prepareBrowserQuestions,
      startNewGame: startNewGame,
      renderQuestionAt: renderQuestionAt,
      renderResultsFor: renderResultsFor,
      resolveAnalyticsStorage: resolveAnalyticsStorage,
      loadMutedState: loadMutedState,
      persistMutedState: persistMutedState,
      MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
    };
  }
})();
