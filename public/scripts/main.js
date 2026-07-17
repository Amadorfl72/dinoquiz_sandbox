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
 * `renderRoute`/`renderMuteToggle` accept explicit overrides so each is
 * unit-testable under Node without touching the global
 * `navigator`/`document`/`fetch`/`location`.
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
 * Global mute toggle (TRIOFSND-105, AC-11): it also mounts the mute/unmute
 * button into `#mute-toggle`, a container that lives outside `#app` in the
 * shared app shell (see public/index.html and public/scripts/appShell.js) so
 * it stays mounted across every screen instead of being wiped on each screen
 * render.
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
 * (e.g. Safari private mode). `renderQuestionAt` reads this same state via
 * `loadMutedState` and forwards it as `options.muted` to
 * `renderQuestionScreen`, which is how the neutral fail sound (TRIOFSND-89)
 * respects "modo silencio" without questionScreen.js touching storage. The
 * `renderMuteToggle` button reads/writes the same state via `loadMutedState`/
 * `persistMutedState`, so toggling it from any screen and answering a
 * question afterwards stay in sync.
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
 * `renderHome`'s optional `storage` argument is a single object, duck-typed
 * against two independent interfaces so callers can opt into either or both:
 *   - `getItem`/`setItem` (a plain `localStorage`-shaped backend) wires the
 *     mute toggle (TRIOFSND-66): `MUTE_STORAGE_KEY` matches the namespaced
 *     key `src/services/storage` itself writes (`dinoquiz:muted`,
 *     JSON-encoded), so any backend sharing that key round-trips with it.
 *   - `hasSeenHomeTooltip`/`markHomeTooltipSeen`/`recordEventOnce` wires the
 *     first-run '¡Jugar!' tooltip (TRIOFSND-65): when present, `renderHome`
 *     resolves whether the tooltip was already dismissed on this device and
 *     passes the persistence/analytics callbacks through to
 *     `renderHomeScreen`. Neither interface is required -- omitting
 *     `storage` entirely (as direct callers of `renderHome` may for tests)
 *     skips both; passing neither argument at all renders Home with plain
 *     strings only (no surprise mute/tooltip side effects) -- useful for
 *     bare unit renders.
 *
 * `resolveHomeStorage` builds the real, combined backend used by the actual
 * app-shell entry points (`renderRoute`, "Salir" from Resultados). Two
 * sources can fill it. `loadDinoQuizStorage` requires the CommonJS
 * `src/services/storage` module — this only resolves under Node/Jest (or a
 * future bundler); a real unbundled browser has no `require`, so it always
 * returns `null` there. For that case, `createBrowserHomeStorage`
 * implements both interfaces directly against `window.localStorage`
 * (namespaced the same way as `src/services/storage`, degrading to an
 * in-memory object if localStorage throws/is unavailable), the same way
 * `loadHomeStrings` above fetches the i18n resource natively instead of
 * going through `src/i18n`'s loader. `resolveHomeStorage` tries the
 * CommonJS path first and falls back to the native browser one, so mute,
 * the tooltip, its persisted "seen" flag, the analytics counters and the
 * `first_tap_jugar` counter all work in the real, bundler-less PWA.
 *
 * Starting a game (TRIOFSND-67): the '¡Jugar!' click handler wired below
 * records the aggregated, non-PII `partida_iniciada` event (via
 * `storage.recordEvent`, which increments on every call — unlike the
 * once-only `first_tap_jugar` counter above) before calling `startNewGame`,
 * so every game start is counted even on replay-free single sessions. Both
 * this handler and `homeScreen.js`'s own click listener (which dismisses the
 * tooltip and fires `first_tap_jugar`) run synchronously off the same click
 * event, so the tooltip closes and the first question renders in the same
 * tick — no perceptible delay after the tap.
 *
 * Aggregated question failures (TRIOFSND-92): that same analytics `storage`
 * is threaded through `startNewGame` -> `renderQuestionAt` ->
 * `renderResultsFor` (replay reuses it too) as `analyticsStorage`, so the
 * `onAnswer` handler in `renderQuestionAt` records the canonical, non-PII
 * `pregunta_respondida` event (AC-18) via `storage.recordEvent` on every
 * answered question, and additionally records `pregunta_respondida_fallo`
 * whenever `result.isCorrect` is false. Since the client-only
 * `recordEvent`/`recordEventOnce` API aggregates by event name rather than
 * per-event payloads, the failure count travels as its own counter instead
 * of a field on `pregunta_respondida` -- comparing the two counters is what
 * yields the aggregated "% acierto por pregunta" the PRD's
 * logging_observability calls for.
 *
 * End of game (TRIOFSND-95): `renderQuestionAt`'s 'Siguiente' handler detects
 * question 10 was just answered, derives the game's racha (longest run of
 * consecutive hits) from `session.state.answers` via
 * `gameFlow.calculateMaxStreak`, and stashes it on `session.state.maxStreak`
 * next to the already-tracked final `score`. `renderResultsFor` then forwards
 * both into `renderResultsScreen`'s options, so the closed Quiz -> Resultados
 * loop always hands off both pieces of end-of-game data together.
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

  // Ads-removal purchase flag (TRIOFSND-97, AC-20/AC-21): same rationale and
  // namespaced-key convention as MUTE_STORAGE_KEY above -- src/services/storage
  // models `adsRemoved` too (see StorageClient#hasRemovedAds/#setAdsRemoved),
  // but this no-bundler browser path reads/writes localStorage directly under
  // the same `dinoquiz:adsRemoved` key so both paths agree once a bundler
  // wires the real service in. Results gates its banner/rewarded ad on this
  // flag; the home purchase confirm button (see homeScreen.js's
  // `options.onPurchase`) sets it to `true`, once and for good, on this device.
  var ADS_REMOVED_STORAGE_KEY = 'dinoquiz:adsRemoved';

  function loadAdsRemovedState(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }

    try {
      var raw = storageObj.getItem(ADS_REMOVED_STORAGE_KEY);
      return raw !== null ? JSON.parse(raw) === true : false;
    } catch (error) {
      return false;
    }
  }

  function persistAdsRemovedState(adsRemoved, storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }

    try {
      storageObj.setItem(ADS_REMOVED_STORAGE_KEY, JSON.stringify(adsRemoved));
    } catch (error) {
      console.error('DinoQuiz: failed to persist the ads-removed preference', error);
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

  // Extra wall-clock time (TRIOFSND-84) the flow controller waits, on top of
  // the question screen's own MIN_ADVANCE_DELAY_MS gate on "Siguiente"
  // (public/scripts/questionScreen.js, AC-6), before auto-advancing a child
  // who never taps the button themselves. Giving that grace period after the
  // button becomes clickable means the automatic advance never races the
  // moment the button first becomes tappable.
  var AUTO_ADVANCE_GRACE_MS = 4000;

  /**
   * Renders the question at `session.state.questionIndex`, then advances to
   * the next one (or completes the game) either when the child taps
   * "Siguiente" or, if they don't, automatically once
   * `MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS` has elapsed since the
   * answer was revealed (PRD main_workflow step 5: "botón 'Siguiente' (o
   * avance automático) lleva a la siguiente pregunta"). Both paths funnel
   * through the same `advance()` so a game is only ever walked forward once
   * per question, whichever trigger fires first.
   */
  function renderQuestionAt(container, renderers, session, onGameComplete, storageObj, analyticsStorage) {
    var question = session.questions[session.state.questionIndex];
    var advanced = false;
    var autoAdvanceTimer = null;

    function advance() {
      if (advanced) return;
      advanced = true;

      if (autoAdvanceTimer !== null) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }

      session.state.questionIndex += 1;

      if (session.state.questionIndex >= session.questions.length) {
        onGameComplete(session.state);
      } else {
        renderQuestionAt(container, renderers, session, onGameComplete, storageObj);
      }
    }

    var minAdvanceDelayMs =
      (typeof renderers.renderQuestionScreen.MIN_ADVANCE_DELAY_MS === 'number' &&
        renderers.renderQuestionScreen.MIN_ADVANCE_DELAY_MS) ||
      0;

    return renderers.renderQuestionScreen(container, question, {
      score: session.state.score,
      muted: loadMutedState(storageObj),
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

        if (analyticsStorage && typeof analyticsStorage.recordEvent === 'function') {
          analyticsStorage.recordEvent('pregunta_respondida');

          if (!result.isCorrect) {
            analyticsStorage.recordEvent('pregunta_respondida_fallo');
          }
        }

        autoAdvanceTimer = setTimeout(advance, minAdvanceDelayMs + AUTO_ADVANCE_GRACE_MS);
      },
      onNext: function () {
        if (session.state.questionIndex + 1 >= session.questions.length) {
          // TRIOFSND-95: question 10 was just answered — the final score is
          // already tracked incrementally on session.state.score, but the
          // racha (longest run of consecutive hits) only makes sense once
          // every answer of the game is known, so it's derived here, right
          // before handing the finished game off to Resultados.
          session.state.maxStreak = resolveGameFlow().calculateMaxStreak(session.state.answers);
        }
        advance();
      },
    });
  }

  /** Renders Resultados for a finished game; 'Volver a jugar' starts a fresh game, 'Salir' goes to Inicio. */
  function renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, storageObj, analyticsStorage) {
    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      maxStreak: finalState.maxStreak,
      // AC-20/AC-21: the banner/rewarded ad only render while this is false.
      adsRemoved: loadAdsRemovedState(storageObj),
      onPlayAgain: function () {
        startNewGame(container, renderers, questions, doc, fetchFn, undefined, storageObj, analyticsStorage);
      },
      onExit: function () {
        var homeStorage = resolveHomeStorage();
        renderHome(
          doc,
          renderers.renderHomeScreen,
          fetchFn,
          homeStorage,
          function () {
            navigateToPrivacyPolicy();
          },
          homeStorage
        );
      },
    });
  }

  /** Resets game state (score/questionIndex/answers) and navigates to the first question of a new game. */
  function startNewGame(container, renderers, questions, doc, fetchFn, randomFn, storageObj, analyticsStorage) {
    var gameFlow = resolveGameFlow();
    if (!gameFlow || !questions || questions.length === 0) {
      return null;
    }

    var session = gameFlow.startNewGame(questions, { randomFn: randomFn });

    renderQuestionAt(
      container,
      renderers,
      session,
      function (finalState) {
        renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, storageObj, analyticsStorage);
      },
      storageObj,
      analyticsStorage
    );

    return session;
  }

  /**
   * Resolves and installs `appShell.js`'s `installExternalLinkGuard`
   * (TRIOFSND-121), the same way `resolveScreenRenderers`/`resolveGameFlow`
   * resolve their browser-global vs. `require`d counterparts. A missing
   * resolver (e.g. appShell.js failed to load) just means no guard installs
   * -- it never blocks the rest of the bootstrap.
   */
  function installLinkGuard(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var installer =
      (win && win.DinoQuiz && win.DinoQuiz.appShell && win.DinoQuiz.appShell.installExternalLinkGuard) ||
      (typeof require === 'function' ? require('./appShell').installExternalLinkGuard : undefined);

    if (typeof installer !== 'function') {
      return null;
    }

    return installer(win && win.document, win);
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

  /**
   * Fetches the whole i18n resource once and hands back the three sections
   * the Home screen needs (home/privacy/purchase, TRIOFSND-66) so the
   * browser can render the global controls without a `require()` for
   * `src/i18n`.
   */
  function loadHomeResources(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data ? { home: data.home, privacy: data.privacy, purchase: data.purchase } : null;
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

  /**
   * Resolves the device compatibility + crash logging module (TRIOFSND-143):
   * prefers the browser global public/scripts/deviceCompat.js registers
   * itself on (`window.DinoQuiz.services.deviceCompat`), falling back to the
   * CommonJS `src/services/deviceCompat` re-export under Node/Jest (same
   * require-then-fall-back shape as loadDinoQuizStorage below).
   */
  function resolveDeviceCompat(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var fromWindow = win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.deviceCompat;
    if (fromWindow) {
      return fromWindow;
    }

    if (typeof require === 'function') {
      try {
        return require('../../src/services/deviceCompat');
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Device compatibility + anonymous crash logging bootstrap (TRIOFSND-143):
   * takes one aggregated, non-PII device snapshot per load and installs the
   * window 'error'/'unhandledrejection' listeners so a crash during play is
   * captured locally (localStorage, capped log, no server) -- see
   * public/scripts/deviceCompat.js. Called synchronously as soon as this
   * script evaluates (see the self-bootstrap block below), not deferred to
   * the 'load' event, so the listeners are attached before the player can
   * interact with anything.
   */
  function installDeviceCompat(win, deviceCompat) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    deviceCompat = deviceCompat || resolveDeviceCompat(win);

    if (!win || !deviceCompat) {
      return null;
    }

    var storageObj = win.localStorage;
    deviceCompat.persistDeviceInfo(deviceCompat.collectDeviceInfo(win.navigator, win.screen, win), storageObj);

    return deviceCompat.installCrashLogger({
      window: win,
      onCrash: function (crashEvent) {
        deviceCompat.persistCrashEvent(crashEvent, storageObj);
      },
    });
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

  function createBrowserHomeStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var backend = win && win.localStorage;
    var memory = {};
    memory[HOME_TOOLTIP_SEEN_KEY] = false;
    memory[ANALYTICS_EVENT_COUNTS_KEY] = {};

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
      // Plain, synchronous localStorage-shaped surface (TRIOFSND-66) so the
      // same object also satisfies renderHome's mute duck-type — real users
      // get mute persistence and the tooltip/analytics counters from one
      // resolved backend (see resolveHomeStorage below).
      getItem: function (key) {
        if (backend) {
          try {
            return backend.getItem(key);
          } catch (error) {
            // Fall through to the in-memory value below.
          }
        }
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      },
      setItem: function (key, value) {
        memory[key] = value;
        if (backend) {
          try {
            backend.setItem(key, value);
          } catch (error) {
            // Quota exceeded or unavailable: the write still lands in
            // `memory` above so the app stays correct for the rest of this
            // session, it just won't persist past it.
          }
        }
      },
      recordEvent: function (eventName) {
        var counts = readJSON(ANALYTICS_EVENT_COUNTS_KEY) || {};
        counts[eventName] = (counts[eventName] || 0) + 1;
        writeJSON(ANALYTICS_EVENT_COUNTS_KEY, counts);
        return Promise.resolve(counts[eventName]);
      },
    };
  }

  /**
   * Resolves the real, production storage backend for `renderHome`: the
   * tooltip/analytics half (`loadDinoQuizStorage()`, falling back to
   * `createBrowserHomeStorage()` in a real unbundled browser) merged with a
   * `getItem`/`setItem` pass-through to `window.localStorage` for the mute
   * preference, so both halves of `renderHome`'s duck-typed `storage`
   * argument resolve from the one object the bootstrap passes in.
   */
  function resolveHomeStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var tooltipBackend = loadDinoQuizStorage() || createBrowserHomeStorage(win);
    var localStorageBackend = win && win.localStorage;

    return {
      hasSeenHomeTooltip: function () {
        return tooltipBackend.hasSeenHomeTooltip();
      },
      markHomeTooltipSeen: function () {
        return tooltipBackend.markHomeTooltipSeen();
      },
      recordEventOnce: function (eventName) {
        return tooltipBackend.recordEventOnce(eventName);
      },
      getItem: function (key) {
        return localStorageBackend ? localStorageBackend.getItem(key) : null;
      },
      setItem: function (key, value) {
        if (localStorageBackend) {
          localStorageBackend.setItem(key, value);
        }
      },
    };
  }

  /**
   * `storage` (5th arg) and `muteStorageObj` (6th arg) are two independent
   * optional backends. `storage` (matching `src/services/storage`'s
   * `dinoQuizStorage` or `createBrowserHomeStorage`, TRIOFSND-65) drives the
   * first-run tooltip; when omitted it falls back to
   * `loadDinoQuizStorage()`/`createBrowserHomeStorage()` so the tooltip
   * still works for real, unbundled-browser callers that don't pass one
   * explicitly. `muteStorageObj` is a raw `getItem`/`setItem` object
   * (matching `localStorage`, TRIOFSND-66) that persists the mute
   * preference; when omitted it falls back to `storage` itself if that also
   * exposes `getItem`/`setItem` (as `resolveHomeStorage()` does), so a
   * single combined backend still wires both concerns for production
   * callers. Either can be passed as an explicit falsy-shaped stand-in to
   * opt out (e.g. a bare unit render with a `renderHomeScreen` mock that
   * only cares about the fetched strings).
   */
  function renderHome(doc, renderHomeScreen, fetchFn, storage, onOpenPrivacyPolicy, muteStorageObj) {
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

    storage = storage || resolveHomeStorage(doc.defaultView);

    var tooltipStorage =
      storage && typeof storage.hasSeenHomeTooltip === 'function'
        ? storage
        : loadDinoQuizStorage() || createBrowserHomeStorage();

    var resolvedMuteStorage =
      muteStorageObj && typeof muteStorageObj.getItem === 'function'
        ? muteStorageObj
        : storage && typeof storage.getItem === 'function'
        ? storage
        : null;

    return loadHomeResources(fetchFn).then(function (resources) {
      var renderOptions = resources
        ? { strings: resources.home, privacyStrings: resources.privacy, purchaseStrings: resources.purchase }
        : {};

      if (onOpenPrivacyPolicy) {
        renderOptions.onOpenPrivacyPolicy = onOpenPrivacyPolicy;
      }

      if (resolvedMuteStorage) {
        renderOptions.muted = loadMutedState(resolvedMuteStorage);
        renderOptions.onToggleMute = function (muted) {
          persistMutedState(muted, resolvedMuteStorage);
        };
      }
      // TRIOFSND-97: the single remove-ads purchase has no real payment SDK
      // in this offline-first PWA (see CONVENTIONS.md: "Sin backend"), so
      // confirming it locally marks the purchase as done -- from here on
      // Resultados stops rendering the banner/rewarded ad (AC-21).
      renderOptions.onPurchase = function () {
        persistAdsRemovedState(true, storage);
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
              if (tooltipStorage && typeof tooltipStorage.recordEvent === 'function') {
                tooltipStorage.recordEvent('partida_iniciada');
              }
              startNewGame(container, renderers, questions, doc, fetchFn, undefined, storage, storage);
            }
          });
        }

        return homeApi;
      }

      if (!tooltipStorage) {
        return finishRender();
      }

      return tooltipStorage.hasSeenHomeTooltip().then(function (seen) {
        renderOptions.showTooltip = !seen;
        renderOptions.onTooltipDismiss = function () {
          tooltipStorage.markHomeTooltipSeen();
        };
        renderOptions.onPlayButtonClick = function () {
          tooltipStorage.recordEventOnce('first_tap_jugar');
        };
        return finishRender();
      });
    });
  }

  function renderMuteToggle(doc, renderMuteToggleButton, fetchFn) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    renderMuteToggleButton =
      renderMuteToggleButton ||
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.appShell &&
        window.DinoQuiz.appShell.renderMuteToggleButton);

    if (!doc || typeof renderMuteToggleButton !== 'function') {
      return Promise.resolve(null);
    }

    var container = doc.getElementById('mute-toggle');
    if (!container) {
      return Promise.resolve(null);
    }

    return fetchI18nResource(fetchFn).then(function (data) {
      var strings = data && data.muteButton;
      return renderMuteToggleButton(container, strings ? { strings: strings } : {});
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

    var homeStorage = resolveHomeStorage();
    return renderHome(
      doc,
      undefined,
      fetchFn,
      homeStorage,
      function () {
        navigateToPrivacyPolicy(loc);
      },
      homeStorage
    );
  }

  /**
   * Browser-only startup: fetch the i18n strings and the question bank once
   * and stash the play-ready data on `window.DinoQuiz` so `loadQuestions()`
   * and the screens can read it synchronously. Runs after the screen/game
   * `<script>`s have registered themselves on `window.DinoQuiz`; the actual
   * first paint is left to the `renderRoute()` call that follows it in the
   * `load` listener below, so the route (Home vs. the privacy policy hash)
   * is only ever rendered once.
   */
  function bootstrapBrowserApp() {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    window.DinoQuiz = window.DinoQuiz || {};

    var fetchFn = typeof fetch === 'function' ? fetch : undefined;
    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
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
      });
  }

  // Only self-bootstrap in a real, unbundled browser: under Node/Jest,
  // `require` always exists and the test files drive `startNewGame`/
  // `renderHome`/`renderRoute` explicitly against their own `#app` container,
  // so attaching this would race a jsdom-dispatched `load` event against
  // whatever container the test currently has mounted.
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function' &&
    typeof require !== 'function'
  ) {
    installDeviceCompat(window);
    window.addEventListener('load', function () {
      installLinkGuard();
      registerServiceWorker();
      bootstrapBrowserApp().then(function () {
        renderRoute();
        renderMuteToggle();
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
      installLinkGuard: installLinkGuard,
      loadHomeResources: loadHomeResources,
      loadHomeStrings: loadHomeStrings,
      loadDinoQuizStorage: loadDinoQuizStorage,
      createBrowserHomeStorage: createBrowserHomeStorage,
      resolveHomeStorage: resolveHomeStorage,
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
      AUTO_ADVANCE_GRACE_MS: AUTO_ADVANCE_GRACE_MS,
      renderQuestionAt: renderQuestionAt,
      renderResultsFor: renderResultsFor,
      loadMutedState: loadMutedState,
      persistMutedState: persistMutedState,
      MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
      AUTO_ADVANCE_GRACE_MS: AUTO_ADVANCE_GRACE_MS,
      loadAdsRemovedState: loadAdsRemovedState,
      persistAdsRemovedState: persistAdsRemovedState,
      ADS_REMOVED_STORAGE_KEY: ADS_REMOVED_STORAGE_KEY,
      renderMuteToggle: renderMuteToggle,
      resolveDeviceCompat: resolveDeviceCompat,
      installDeviceCompat: installDeviceCompat,
    };
  }
})();
