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
 * into `startNewGame` (fresh state + a new random subset of questions that
 * avoids repeating the previous game's questions when possible, TRIOFSND-101
 * AC-9) and whose 'Salir' calls `renderHome` again.
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
 * Answer registration (TRIOFSND-80): `renderQuestionAt`'s `onAnswer` handler
 * below is the single write point for the whole feature — questionScreen.js
 * only computes correctness and reports it, it never touches storage, so an
 * answer is never recorded/aggregated twice. On every accepted answer (hit
 * or miss, and thanks to questionScreen.js's own `answered` guard exactly
 * once per question) it calls `storage.recordQuestionAnswered(question.id,
 * result.isCorrect)`, which persists the minimal, non-PII `pregunta_respondida`
 * event and incrementally updates that question's historic accuracy — see
 * `DinoQuizStorage#recordQuestionAnswered` (src/services/storage/StorageClient.js)
 * and its `createBrowserHomeStorage` mirror below for the exact contract.
 *
 * Aggregated question failures (TRIOFSND-92): a separate `analyticsStorage`
 * client is threaded through `startNewGame` -> `renderQuestionAt` ->
 * `renderResultsFor` (replay reuses it too), so the `onAnswer` handler in
 * `renderQuestionAt` also records the aggregated, non-PII `pregunta_respondida`
 * event (AC-18) via `analyticsStorage.recordEvent` on every answered
 * question, and additionally records `pregunta_respondida_fallo` whenever
 * `result.isCorrect` is false. Since the client-only
 * `recordEvent`/`recordEventOnce` API aggregates by event name rather than
 * per-event payloads, the failure count travels as its own counter instead
 * of a field on `pregunta_respondida` -- comparing the two counters is what
 * yields the aggregated "% acierto por pregunta" the PRD's
 * logging_observability calls for, independently of TRIOFSND-80's
 * per-question `recordQuestionAnswered` aggregate above.
 *
 * End of game (TRIOFSND-95): `renderQuestionAt`'s 'Siguiente' handler detects
 * question 10 was just answered, derives the game's racha (longest run of
 * consecutive hits) from `session.state.answers` via
 * `gameFlow.calculateMaxStreak`, and stashes it on `session.state.maxStreak`
 * next to the already-tracked final `score`. `renderResultsFor` then forwards
 * both into `renderResultsScreen`'s options, so the closed Quiz -> Resultados
 * loop always hands off both pieces of end-of-game data together.
 *
 * Functional fallback without Service Worker/manifest support (TRIOFSND-113):
 * DinoQuiz's official support matrix is the last 2 major versions of Chrome,
 * Edge and Safari, but some older tablets or embedded/in-app browsers outside
 * that matrix don't support Service Worker or installable manifests.
 * `resolvePlatformSupport` (mirroring `src/services/platformSupport`'s
 * `detectPwaSupport`) detects that up front and `logPlatformSupportFallback`
 * logs a diagnostic — nothing more, since it must never block or degrade the
 * actual game. That guarantee already falls out of how this file is built:
 * `registerServiceWorker` is feature-detected and fire-and-forget (see the
 * `window.addEventListener('load', ...)` handler below), while
 * `bootstrapBrowserApp` fetches `/i18n/es.json` and `/data/questions.json`
 * with plain `fetch`, independent of whether a service worker is present.
 * So a browser lacking PWA support simply never gets installability or
 * offline caching — it still plays the full Inicio -> Quiz -> Resultados loop
 * over the network exactly like a supported browser (see
 * tests/pwa/pwa-fallback.test.js).
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

  // Laberinto route (TRIOFSND-259): mirrors the privacy-policy hash route
  // below (isPrivacyPolicyRoute/navigateToPrivacyPolicy) -- the app shell's
  // own mode-selection mechanism until a future ticket adds the PRD's
  // illustrated mode selector screen. Navigating here (or loading the app
  // with this hash already set) starts a fresh Laberinto game; every call
  // to renderRoute() while on this route renders from scratch, exactly like
  // Home/Privacy already do.
  var MAZE_HASH = '#/laberinto';
  var MAZE_MODE_ID = 'laberinto'; // mirrors src/game/modesCatalog.js MODE_IDS.LABERINTO
  var QUIZ_MODE_ID = 'quiz'; // mirrors src/game/modesCatalog.js MODE_IDS.QUIZ
  var MAZE_MIN_LEVEL = 1;

  function isMazeRoute(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    return !!loc && loc.hash === MAZE_HASH;
  }

  function navigateToMaze(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = MAZE_HASH;
    }
  }

  // Oído Jurásico route (TRIOFSND-270): mirrors the Laberinto hash route
  // above -- its own fixed 10-round game (no cross-game level chain, same
  // shape as Laberinto's own single-level game) lives behind its own hash so
  // handleModeSelected/renderRoute can navigate to and re-enter it exactly
  // like Laberinto, instead of falling through to the Quiz's level orchestrator.
  var OIDO_JURASICO_HASH = '#/oido-jurasico';
  var OIDO_JURASICO_MODE_ID = 'oidoJurasico'; // mirrors src/game/modesCatalog.js MODE_IDS.OIDO_JURASICO

  function isOidoJurasicoRoute(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    return !!loc && loc.hash === OIDO_JURASICO_HASH;
  }

  function navigateToOidoJurasico(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = OIDO_JURASICO_HASH;
    }
  }

  function resolveScreenRenderers(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var fromWindow = (win && win.DinoQuiz && win.DinoQuiz.screens) || {};

    if (typeof require === 'function') {
      return {
        renderHomeScreen: fromWindow.renderHomeScreen || require('./homeScreen').renderHomeScreen,
        renderAgeGateScreen:
          fromWindow.renderAgeGateScreen || require('../../src/screens/AgeGateScreen').renderAgeGateScreen,
        renderQuestionScreen:
          fromWindow.renderQuestionScreen || require('../../src/screens/QuestionScreen').renderQuestionScreen,
        renderResultsScreen:
          fromWindow.renderResultsScreen || require('../../src/screens/ResultsScreen').renderResultsScreen,
        renderMazeScreen: fromWindow.renderMazeScreen || require('../../src/screens/MazeScreen').renderMazeScreen,
        renderOidoJurasicoIntro:
          fromWindow.renderOidoJurasicoIntro || require('../../src/screens/OidoJurasicoScreen').renderOidoJurasicoIntro,
        renderOidoJurasicoScreen:
          fromWindow.renderOidoJurasicoScreen || require('../../src/screens/OidoJurasicoScreen').renderOidoJurasicoScreen,
        renderModeSelectorScreen:
          fromWindow.renderModeSelectorScreen || require('./modeSelectorScreen').renderModeSelectorScreen,
        renderModeChangeConfirmScreen:
          fromWindow.renderModeChangeConfirmScreen ||
          require('./modeChangeConfirmScreen').renderModeChangeConfirmScreen,
      };
    }

    if (fromWindow.renderHomeScreen && fromWindow.renderQuestionScreen && fromWindow.renderResultsScreen) {
      return fromWindow;
    }

    return null;
  }

  /**
   * Age gate (TRIOFSND-193): rendered right after '¡Jugar!' and before the
   * game is prepared, per the PRD. The two-option choice and its in-memory,
   * session-only selection live entirely in ageGateScreen.js (never
   * persisted, logged or sent anywhere from here); this helper only decides
   * when to move on to `onSelected` once a tap has been made. A missing
   * renderer (e.g. ageGateScreen.js failed to load in some fallback browser)
   * degrades gracefully by skipping straight to `onSelected` — the age gate
   * must never block the game itself, matching the resilience pattern
   * `installLinkGuard`/`registerServiceWorker` already follow.
   */
  function renderAgeGate(container, renderers, ageGateStrings, onSelected) {
    if (!renderers || typeof renderers.renderAgeGateScreen !== 'function') {
      onSelected();
      return null;
    }

    return renderers.renderAgeGateScreen(container, {
      strings: ageGateStrings,
      onSelect: function () {
        onSelected();
      },
    });
  }

  function resolveGameFlow(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('../../src/game/gameFlow');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.game) || null;
  }

  /**
   * Resolves public/scripts/mazeGame.js (TRIOFSND-259), the browser-runnable
   * Laberinto round/game orchestrator -- same require-or-`window.DinoQuiz`
   * pattern as `resolveGameFlow` above. Registered nested under
   * `window.DinoQuiz.game.maze` (not the flat `window.DinoQuiz.game` gameFlow
   * itself owns) so loading it never clobbers gameFlow's own properties.
   */
  function resolveMazeGame(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('./mazeGame');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.game && win.DinoQuiz.game.maze) || null;
  }

  /**
   * Resolves public/scripts/oidoJurasicoScreen.js's non-rendering exports
   * (round generation, the intro-seen flag helpers) -- same require-or-
   * `window.DinoQuiz` pattern as `resolveMazeGame` above, but nested under
   * `window.DinoQuiz.game.oidoJurasico` since that one file's `api` object
   * covers both the screens (flat on `window.DinoQuiz.screens`, see
   * `resolveScreenRenderers`) and the game logic (nested here).
   */
  function resolveOidoJurasicoGame(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('../../src/screens/OidoJurasicoScreen');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.game && win.DinoQuiz.game.oidoJurasico) || null;
  }

  /**
   * Resolves public/scripts/roundContract.js (TRIOFSND-241), the shared
   * "start a game, run exactly ROUNDS_PER_GAME (10) rounds, score/advance
   * once each" contract Oído Jurásico's flat, level-less game drives instead
   * of hand-rolling a fourth start/evaluate/advance loop -- same
   * require-or-`window.DinoQuiz` pattern as `resolveGameFlow` above.
   */
  function resolveRoundContract(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('../../src/game/roundContract');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.game && win.DinoQuiz.game.roundContract) || null;
  }

  /**
   * Resolves public/scripts/modeStorage.js (TRIOFSND-230/234), the
   * last-selected-mode persistence service -- same require-or-`window.DinoQuiz`
   * pattern as `resolveGameFlow`/`resolveMazeGame` above. `startLevelGame`
   * (Quiz) and `startMazeGame` (Laberinto) both call its `setLastMode` the
   * moment their mode actually starts (PRD main_workflow paso 1), so
   * `dinoquiz:lastMode` always reflects whichever mode is currently being
   * played, whether reached through the mode selector or a direct hash
   * navigation/replay that never goes through it.
   */
  function resolveModeStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('./modeStorage');
    }

    return (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.modeStorage) || null;
  }

  /** Persists `modeId` as the last-selected mode via modeStorage.js, tolerating a missing service (never blocks the game from starting). */
  function persistLastMode(modeId, storageObj) {
    var modeStorage = resolveModeStorage();
    if (modeStorage) {
      modeStorage.setLastMode(modeId, storageObj);
    }
  }

  /**
   * Resolves public/scripts/modeProgressStorage.js's `ModeProgressStorage`
   * (TRIOFSND-250, PRD "Progresión independiente por modo"): the per-mode
   * local persistence of a mode's highest unlocked level and its latest
   * finished-game result (score/percentage/stars), keyed by modeId under
   * `dinoquiz:modeProgress:<modeId>` -- unlike `storage`'s (StorageClient's)
   * single, mode-agnostic `maxUnlockedLevel`, this is what `finishLevel`
   * below reads/writes so one mode's progression never reads, overwrites or
   * resets another's (TRIOFSND-253).
   *
   * Same require-or-`window.DinoQuiz` fallback shape as `resolveModeStorage`/
   * `resolveMazeGame` above. Node/Jest resolves the canonical
   * `src/services/storage` module's own shared `modeProgressStorage`
   * singleton; the real, bundler-less browser instantiates its own singleton
   * from the `<script>`-loaded constructor once and caches it in
   * `browserModeProgressStorage` below, so every level completed in the same
   * session shares the same resolved backend adapter instead of re-probing
   * IndexedDB/localStorage availability on every call.
   */
  var browserModeProgressStorage = null;

  function resolveModeProgressStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);

    if (typeof require === 'function') {
      return require('../../src/services/storage').modeProgressStorage;
    }

    var ModeProgressStorageCtor =
      win &&
      win.DinoQuiz &&
      win.DinoQuiz.services &&
      win.DinoQuiz.services.modeProgressStorage &&
      win.DinoQuiz.services.modeProgressStorage.ModeProgressStorage;
    if (typeof ModeProgressStorageCtor !== 'function') {
      return null;
    }
    if (!browserModeProgressStorage) {
      browserModeProgressStorage = new ModeProgressStorageCtor();
    }
    return browserModeProgressStorage;
  }

  /**
   * Resolves src/services/gameSessionStorage.js's mode-scoped facade
   * (`hasIncompleteGame`/`discardTransientState`, TRIOFSND-238/239) that
   * `handleModeSelected` below drives to condition "cambiar de modo" on
   * whether the mode being left still has an incomplete, resumable round.
   * Same require-or-`window.DinoQuiz` fallback shape as `resolveModeStorage`/
   * `resolveLogger` above -- unlike those, this service has no browser-global
   * registration yet (its IndexedDB-backed adapters are Node/Jest-only for
   * now), so it resolves to null in the real, bundler-less browser and the
   * mode-change confirmation simply never triggers there, the same fail-open
   * shape every other optional resolver in this file already follows (e.g.
   * `resolveMazeGame` when its script fails to load).
   */
  function resolveGameSessionStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    if (typeof require === 'function') {
      return require('../../src/services/gameSessionStorage');
    }
    return (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.gameSessionStorage) || null;
  }

  /**
   * Renders modeChangeConfirmScreen.js (TRIOFSND-237) with the `modeChange`
   * i18n strings already resolved into `resources` (see `loadHomeResources`).
   * Returns null (renders nothing) when the renderer failed to load, mirroring
   * `renderAgeGate`'s degrade-gracefully shape -- but here the caller
   * (`handleModeSelected`) only reaches this after already deciding
   * confirmation is required, so a missing renderer must never silently
   * discard the in-progress round; see that function's own fallback.
   */
  function renderModeChangeConfirm(container, renderers, resources, options) {
    if (!renderers || typeof renderers.renderModeChangeConfirmScreen !== 'function') {
      return null;
    }

    return renderers.renderModeChangeConfirmScreen(container, {
      strings: resources && resources.modeChange,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }

  /**
   * Cambiar de modo fuera de una ronda (TRIOFSND-239, PRD "Contrato técnico
   * ... común para los modos"): the handler behind every mode card tap on
   * the illustrated selector (`renderModeSelector`'s `onSelectMode` below).
   * The selector itself only ever renders between games -- never mid-round
   * -- so this is exactly the "fuera de una ronda" mode-change gesture the
   * PRD describes.
   *
   * If the mode the player was last playing (`dinoquiz:lastMode`, via
   * modeStorage.js) still has an incomplete, resumable round saved
   * (`gameSessionStorage.hasIncompleteGame`) and it isn't the very mode they
   * just tapped, switching would silently lose that progress -- so this asks
   * for confirmation first (modeChangeConfirmScreen.js) instead of starting
   * the new mode straight away:
   *
   *   - Confirming ("Sí, cambiar de juego") discards exactly that abandoned
   *     round (`discardTransientState`, never touching a different mode's
   *     session or any durable per-mode key), tallies the aggregated,
   *     local-only "partidas abandonadas por modo" counter (logging.js) and
   *     lands back on the mode selector -- the tapped mode is not started
   *     automatically, so the player picks again with nothing left to lose.
   *   - Cancelling ("No, seguir jugando") leaves the saved round completely
   *     untouched -- it stays parked on the same round it was on -- and
   *     simply returns to the selector as well, without starting anything.
   *
   * When there is no previous mode, it's the same mode being tapped again,
   * or gameSessionStorage isn't available (see `resolveGameSessionStorage`),
   * the new mode starts immediately, exactly like before this feature
   * existed.
   *
   * `currentModeId` must be resolved by the caller *before* the tap that
   * triggers this handler, never re-read in here: modeSelectorScreen.js's
   * own click handler already calls `modeStorage.setLastMode(modeId)` (the
   * mode just tapped) before it ever invokes `onSelectMode` -- reading
   * `dinoquiz:lastMode` at that point would always see the *new* mode, not
   * the one being left, and this whole confirmation would never trigger.
   * `renderModeSelector` below resolves it once, right before rendering the
   * selector, exactly for this reason.
   */
  function handleModeSelected(container, renderers, questions, doc, fetchFn, resources, ctx, modeId, currentModeId) {
    function startMode() {
      if (modeId === MAZE_MODE_ID) {
        navigateToMaze();
        return;
      }
      if (modeId === OIDO_JURASICO_MODE_ID) {
        navigateToOidoJurasico();
        return;
      }
      // Every other mode (Quiz included) still routes through the existing
      // multi-level orchestrator until its own game engine ships -- `modeId`
      // (TRIOFSND-253) is what keeps each mode's level-unlock progression and
      // finished-game result independent (see startLevelGame/finishLevel).
      startLevelGame(container, renderers, questions, doc, fetchFn, Object.assign({}, ctx, { modeId: modeId }));
    }

    var gameSessionStorage = resolveGameSessionStorage();

    if (!gameSessionStorage || !currentModeId || currentModeId === modeId) {
      startMode();
      return;
    }

    Promise.resolve(gameSessionStorage.hasIncompleteGame(currentModeId)).then(function (hasIncomplete) {
      if (!hasIncomplete) {
        startMode();
        return;
      }

      renderModeChangeConfirm(container, renderers, resources, {
        onConfirm: function () {
          Promise.resolve(gameSessionStorage.discardTransientState(currentModeId)).then(function () {
            var logger = resolveLogger();
            if (logger && typeof logger.logGameAbandonedByMode === 'function') {
              logger.logGameAbandonedByMode(currentModeId);
            }
            renderModeSelector(container, renderers, questions, doc, fetchFn, resources, ctx);
          });
        },
        onCancel: function () {
          renderModeSelector(container, renderers, questions, doc, fetchFn, resources, ctx);
        },
      });
    });
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
    return rawQuestions.map(function (question) {
      var prepared = {};
      for (var key in question) {
        if (Object.prototype.hasOwnProperty.call(question, key)) {
          prepared[key] = question[key];
        }
      }
      // `dato_curioso` is a dotted key like "funFacts.trex-01", so it must be
      // resolved against the full strings bundle, not `strings.funFacts`
      // (which would look up the "funFacts" segment twice and always miss).
      prepared.funFact = resolveFunFact(strings, question.dato_curioso);
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
   * per question, whichever trigger fires first. `analyticsStorage` records
   * the aggregated `pregunta_respondida`/`pregunta_respondida_fallo` event
   * counters (TRIOFSND-92); `storage` is the TRIOFSND-80 per-question client
   * whose `recordQuestionAnswered` call updates that question's historic
   * accuracy aggregate.
   */
  function renderQuestionAt(container, renderers, session, onGameComplete, storageObj, analyticsStorage, storage, levelContext) {
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
        renderQuestionAt(container, renderers, session, onGameComplete, storageObj, analyticsStorage, storage, levelContext);
      }
    }

    var minAdvanceDelayMs =
      (typeof renderers.renderQuestionScreen.MIN_ADVANCE_DELAY_MS === 'number' &&
        renderers.renderQuestionScreen.MIN_ADVANCE_DELAY_MS) ||
      0;

    var questionOptions = {
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

        // TRIOFSND-92: the aggregated acierto/fallo tally keys off the
        // stable bank id (never the visible text or index); an invalid or
        // missing id is skipped rather than recorded/aggregated under an
        // anonymous key.
        if (
          storage &&
          typeof storage.recordQuestionAnswered === 'function' &&
          typeof question.id === 'string' &&
          question.id.length > 0
        ) {
          storage.recordQuestionAnswered(question.id, result.isCorrect);
        }

        if (analyticsStorage && typeof analyticsStorage.recordEvent === 'function') {
          analyticsStorage.recordEvent('pregunta_respondida');

          if (!result.isCorrect) {
            analyticsStorage.recordEvent('pregunta_respondida_fallo');
          }
        }

        // TRIOFSND-129: the fun fact reveals right after every answer,
        // hit or miss alike (see questionScreen.js's handleSelect), so it
        // is registered as "seen" here unconditionally -- keyed off the
        // same stable bank id as recordQuestionAnswered above, never the
        // visible text.
        if (
          storage &&
          typeof storage.markFunFactDiscovered === 'function' &&
          typeof question.id === 'string' &&
          question.id.length > 0
        ) {
          storage.markFunFactDiscovered(question.id);
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
    };

    // TRIOFSND-207: `levelContext` is only set by the multi-level orchestrator
    // (startLevelGame/playLevel below) -- the older flat, level-agnostic game
    // (startNewGame) never passes it, so it keeps rendering with no progress
    // row at all, exactly as before this feature existed.
    if (levelContext && typeof levelContext.level === 'number') {
      questionOptions.level = levelContext.level;
      questionOptions.questionNumber = session.state.questionIndex + 1;
      questionOptions.totalQuestions = session.questions.length;
    }

    return renderers.renderQuestionScreen(container, question, questionOptions);
  }

  /**
   * Resolves the count of distinct "datos curiosos" discovered on this
   * device so far (TRIOFSND-129), synchronously -- `renderResultsFor` below
   * renders Resultados the instant a game ends, with no promise to await.
   * Prefers the real `DinoQuizStorage`'s `snapshot()` (its in-memory cache
   * is already current by the time a game ends, since every write updates
   * it synchronously -- see StorageClient.js's `set()`), falling back to
   * `createBrowserHomeStorage`'s `getDiscoveredFunFactsCountSync()` in a
   * real, unbundled browser. Returns `undefined` for any other storage
   * shape (e.g. a test double), so the caller renders nothing extra.
   */
  function resolveDiscoveredFunFactsCount(storage) {
    if (!storage) {
      return undefined;
    }
    if (typeof storage.snapshot === 'function') {
      var snapshot = storage.snapshot();
      return Array.isArray(snapshot.discoveredFunFacts) ? snapshot.discoveredFunFacts.length : undefined;
    }
    if (typeof storage.getDiscoveredFunFactsCountSync === 'function') {
      return storage.getDiscoveredFunFactsCountSync();
    }
    return undefined;
  }

  /**
   * Reads a persisted numeric value (`bestScore`/`maxStreak`) synchronously,
   * before this game's write below has landed -- prefers the real
   * `DinoQuizStorage`'s `snapshot()`, falling back to
   * `createBrowserHomeStorage`'s `get*Sync()` mirrors, same duck-typing
   * `resolveDiscoveredFunFactsCount` above uses.
   */
  function resolvePersistedNumber(storage, snapshotKey, syncGetterName) {
    if (!storage) {
      return undefined;
    }
    if (typeof storage.snapshot === 'function') {
      var snapshot = storage.snapshot();
      return typeof snapshot[snapshotKey] === 'number' ? snapshot[snapshotKey] : undefined;
    }
    if (typeof storage[syncGetterName] === 'function') {
      return storage[syncGetterName]();
    }
    return undefined;
  }

  function combineWithCurrent(previous, current) {
    if (typeof current !== 'number') {
      return typeof previous === 'number' ? previous : undefined;
    }
    return typeof previous === 'number' ? Math.max(previous, current) : current;
  }

  /**
   * Persists the just-finished game's score/racha (TRIOFSND-128/96, PRD
   * "Persistencia exclusivamente local de mejor puntuación, racha máxima"),
   * mirroring the fire-and-forget pattern `onAnswer` already uses for
   * `recordQuestionAnswered`/`markFunFactDiscovered` above: StorageClient's
   * `set()` updates its in-memory cache synchronously, so nothing here needs
   * to await the write settling. Duck-typed so a storage double missing
   * these methods (or no storage at all) is skipped rather than throwing.
   * `DinoQuizStorage#recordScore`/`#recordStreak`
   * (src/services/storage/StorageClient.js) only overwrite the persisted
   * bestScore/maxStreak when the new value is strictly higher, so this is
   * safe to call after every game, win or lose.
   *
   * Also resolves the values Resultados should *display* right now
   * (TRIOFSND-96): since the write above is fire-and-forget, its effect on
   * `storage`'s cache is not observable synchronously (confirmed by
   * `tests/pwa/game-flow.test.js`'s TRIOFSND-128 suite, which has to flush
   * pending microtasks before reading storage back) -- so instead of racing
   * that write, this reads the previously-persisted best synchronously
   * (before the write above can have landed) and combines it with this
   * game's own score/racha locally, which is exactly what the write above
   * will eventually persist anyway.
   */
  function persistBestScoreAndStreak(storage, finalState) {
    if (!storage || !finalState) {
      return { bestScore: undefined, bestStreak: undefined };
    }

    var bestScore = combineWithCurrent(
      resolvePersistedNumber(storage, 'bestScore', 'getBestScoreSync'),
      finalState.score
    );
    var bestStreak = combineWithCurrent(
      resolvePersistedNumber(storage, 'maxStreak', 'getMaxStreakSync'),
      finalState.maxStreak
    );

    if (typeof storage.recordScore === 'function' && typeof finalState.score === 'number') {
      storage.recordScore(finalState.score);
    }
    if (typeof storage.recordStreak === 'function' && typeof finalState.maxStreak === 'number') {
      storage.recordStreak(finalState.maxStreak);
    }

    return { bestScore: bestScore, bestStreak: bestStreak };
  }

  /** Renders Resultados for a finished game; 'Volver a jugar' starts a fresh game, 'Salir' goes to Inicio. */
  function renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, storageObj, playedQuestionIds, analyticsStorage, storage) {
    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      maxStreak: finalState.maxStreak,
      // TRIOFSND-96: the best score/longest racha achieved on this device so
      // far (including this just-finished game), stashed on `finalState` by
      // `persistBestScoreAndStreak` right before this function is called.
      bestScore: finalState.bestScore,
      bestStreak: finalState.bestStreak,
      // AC-20/AC-21: the banner/rewarded ad only render while this is false.
      adsRemoved: loadAdsRemovedState(storageObj),
      // TRIOFSND-129: how many distinct fun facts have been seen on this
      // device so far, out of the total available in the loaded bank.
      discoveredFunFactsCount: resolveDiscoveredFunFactsCount(storage),
      totalFunFacts: Array.isArray(questions) ? questions.length : undefined,
      onPlayAgain: function () {
        startNewGame(container, renderers, questions, doc, fetchFn, undefined, storageObj, playedQuestionIds, analyticsStorage, storage);
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

  /**
   * Resets game state (score/questionIndex/answers) and navigates to the
   * first question of a new game. `previousQuestionIds` (TRIOFSND-101, AC-9)
   * is the id list of the immediately previous game, if any — passed through
   * to the selection engine (public/scripts/gameFlow.js) so a replay avoids
   * repeating them when the bank has enough fresh candidates. Passed by
   * `renderResultsFor` on 'Volver a jugar'; omitted for a first game from
   * Inicio. `analyticsStorage` and `storage` (TRIOFSND-80's per-question
   * accuracy client) are forwarded through to renderQuestionAt/renderResultsFor
   * unchanged.
   */
  function startNewGame(container, renderers, questions, doc, fetchFn, randomFn, storageObj, previousQuestionIds, analyticsStorage, storage) {
    // The 8th slot has had two owners: TRIOFSND-80/92 callers passed their
    // per-question / analytics storage here, then TRIOFSND-101 inserted
    // `previousQuestionIds` in that position and silently shifted them one to
    // the right. An object with storage methods cannot be a list of ids, so
    // honour the older callers instead of dropping their analytics on the
    // floor (the audit's signature-drift finding, fixed at the seam).
    if (previousQuestionIds && !Array.isArray(previousQuestionIds)) {
      if (!storage && typeof previousQuestionIds.recordQuestionAnswered === 'function') {
        storage = previousQuestionIds;
      }
      if (
        !analyticsStorage &&
        (typeof previousQuestionIds.recordEvent === 'function' ||
          typeof previousQuestionIds.recordGameCompleted === 'function')
      ) {
        analyticsStorage = previousQuestionIds;
      }
      previousQuestionIds = undefined;
    }
    var gameFlow = resolveGameFlow();
    if (!gameFlow || !questions || questions.length === 0) {
      return null;
    }

    var session = gameFlow.startNewGame(questions, { randomFn: randomFn, previousQuestionIds: previousQuestionIds });

    renderQuestionAt(
      container,
      renderers,
      session,
      function (finalState) {
        var playedQuestionIds = session.questions.map(function (question) {
          return question.id;
        });
        var bestScoreAndStreak = persistBestScoreAndStreak(storage, finalState);
        finalState.bestScore = bestScoreAndStreak.bestScore;
        finalState.bestStreak = bestScoreAndStreak.bestStreak;
        // TRIOFSND-98: landing on Resultados is "the game finished" -- record
        // the aggregated, non-PII partida_completada event and fold the final
        // score into the on-device average-score aggregate (client-only, no
        // backend) right here, once per game, before Resultados renders.
        if (analyticsStorage && typeof analyticsStorage.recordGameCompleted === 'function') {
          analyticsStorage.recordGameCompleted(finalState.score);
        }
        renderResultsFor(container, renderers, questions, finalState, doc, fetchFn, storageObj, playedQuestionIds, analyticsStorage, storage);
      },
      storageObj,
      analyticsStorage,
      storage
    );

    return session;
  }

  /**
   * Multi-level orchestration (TRIOFSND-207): the real '¡Jugar!' entry point
   * (see `finishRender`'s click handler below) plays through gameFlow.js's
   * `startLevel`/`completeLevel`/`resolveLevelOutcome` (TRIOFSND-203) instead
   * of the flat, single-level `startNewGame` above, chaining levels 1-10 as
   * each level's outcome dictates: continue automatically isn't offered here
   * -- a level always ends on Resultados first (with an always-positive
   * message about what happened, TRIOFSND-206) and 'Volver a jugar' is what
   * actually moves on, either into the just-unlocked next level or into a
   * fresh level 1 once the game is over (age-restricted after level 1,
   * insufficient score, or MAX_LEVEL completed).
   */

  /** Resolves ageGateScreen.js the same require-or-window way as resolveScreenRenderers/resolveGameFlow. */
  function resolveAgeGateApi(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var fromWindow = (win && win.DinoQuiz && win.DinoQuiz.screens && win.DinoQuiz.screens.ageGate) || null;
    if (fromWindow) {
      return fromWindow;
    }
    return typeof require === 'function' ? require('../../src/screens/AgeGateScreen') : null;
  }

  /**
   * Reads the child's already-selected age band (TRIOFSND-193/204) once,
   * right before a level starts, so the whole level chain that follows
   * decides continue/unlock/end from that single, frozen value rather than
   * re-reading ageGateScreen's in-memory selection (which stays session-only
   * and is never persisted or logged, per that screen's own privacy-by-design
   * doc comment) at every level boundary.
   */
  function resolveCurrentAgeBand(win) {
    var ageGate = resolveAgeGateApi(win);
    return ageGate && typeof ageGate.getSelectedAgeBand === 'function' ? ageGate.getSelectedAgeBand() : null;
  }

  /**
   * A `getQuestionsByLevel`-shaped resolver (see gameFlow.js's
   * `getLevelQuestionPool`) over an already-loaded flat question array --
   * either the real bank (`loadQuestions()`, level-tagged 1-10 in
   * /data/questions.json) or a test fixture. Passed explicitly so
   * `startLevel`/`completeLevel` never fall back to `src/data/questionBank`'s
   * own `require`/`fs`-based resolution, which only works under Node/Jest;
   * this one-line filter works identically there and in the real, bundler-less
   * browser.
   */
  function buildGetQuestionsByLevel(questions) {
    return function (level) {
      return Array.isArray(questions)
        ? questions.filter(function (question) {
            return question && question.level === level;
          })
        : [];
    };
  }

  /**
   * Safe exit (TRIOFSND-207): when gameFlow can't generate a level's
   * questions (fewer than QUESTIONS_PER_GAME valid entries for that level --
   * `startLevel`'s own `level_generation_failed`, already logged with only
   * the level and the count found, no personal data), the game cannot safely
   * continue. The only sane recovery is the same destination "Salir" already
   * uses -- Inicio -- so a single broken level never leaves the child stuck
   * on a crashed or empty screen. The diagnostic below mirrors that: level
   * and count only, never the child's age band or any answer.
   */
  function exitToHomeSafely(container, renderers, doc, fetchFn, failure) {
    console.error(
      'DinoQuiz: level generation failed (level=' +
        (failure && failure.level) +
        ', validQuestionCount=' +
        (failure && failure.validQuestionCount) +
        '), exiting safely to Inicio'
    );

    var homeStorage = resolveHomeStorage();
    return renderHome(
      doc,
      renderers.renderHomeScreen,
      fetchFn,
      homeStorage,
      function () {
        navigateToPrivacyPolicy();
      },
      homeStorage
    );
  }

  /**
   * Same safe-exit rationale as `exitToHomeSafely` above (a broken
   * maze/round can never be recovered from where it failed, so the only
   * sane destination is Inicio), but for Laberinto's own failure shape
   * (`{ error, level, seed, roundIndex }`, see public/scripts/mazeGame.js)
   * instead of gameFlow's `{ level, validQuestionCount }`.
   */
  function exitMazeToHomeSafely(container, renderers, doc, fetchFn, failure) {
    console.error(
      'DinoQuiz: maze generation failed (level=' +
        (failure && failure.level) +
        ', roundIndex=' +
        (failure && failure.roundIndex) +
        '), exiting safely to Inicio'
    );

    var homeStorage = resolveHomeStorage();
    return renderHome(
      doc,
      renderers.renderHomeScreen,
      fetchFn,
      homeStorage,
      function () {
        navigateToPrivacyPolicy();
      },
      homeStorage
    );
  }

  /**
   * Plays one already-started level (`levelGame`, as returned by
   * `gameFlow.startLevel`/attached as `completeLevel`'s `nextLevelGame`) end
   * to end, then resolves what happens next via `gameFlow.completeLevel` and
   * hands off to `finishLevel`. `ctx` carries everything that must survive
   * across the whole level chain: `ageBand` (resolved once, see
   * `resolveCurrentAgeBand`), `randomFn`, `getQuestionsByLevel`, and the
   * mute/ads (`storageObj`), analytics and per-question (`analyticsStorage`/
   * `storage`) backends already threaded through the flat flow above.
   */
  function playLevel(container, renderers, questions, doc, fetchFn, levelGame, ctx) {
    var gameFlow = resolveGameFlow();

    return renderQuestionAt(
      container,
      renderers,
      levelGame,
      function (finalState) {
        finalState.maxStreak = gameFlow.calculateMaxStreak(finalState.answers);
        var bestScoreAndStreak = persistBestScoreAndStreak(ctx.storage, finalState);
        finalState.bestScore = bestScoreAndStreak.bestScore;
        finalState.bestStreak = bestScoreAndStreak.bestStreak;

        var outcome = gameFlow.completeLevel({
          level: levelGame.level,
          answers: finalState.answers,
          ageBand: ctx.ageBand,
          // TRIOFSND-253: scopes the unlock threshold looked up (and thus
          // whether the next level unlocks) strictly to this mode -- see
          // gameFlow.js's own doc comment on resolveLevelOutcome/completeLevel.
          modeId: ctx.modeId,
          getQuestionsByLevel: ctx.getQuestionsByLevel,
          randomFn: ctx.randomFn,
        });

        // The level just played is always resolved (gameOver/reason are
        // final either way); only a next level that gameFlow tried and
        // failed to generate needs the safe exit -- showing Resultados first
        // would promise a level-up that can't actually be delivered.
        if (outcome.nextLevelGame && outcome.nextLevelGame.error) {
          exitToHomeSafely(container, renderers, doc, fetchFn, outcome.nextLevelGame);
          return;
        }

        finishLevel(container, renderers, questions, doc, fetchFn, levelGame.level, finalState, outcome, ctx);
      },
      ctx.storageObj,
      ctx.analyticsStorage,
      ctx.storage,
      { level: levelGame.level }
    );
  }

  /**
   * Renders Resultados for the level just finished, persisting a newly
   * unlocked level (TRIOFSND-205) before reading back the device's highest
   * unlocked level so Resultados can show it (TRIOFSND-206). 'Volver a
   * jugar' either continues into the already-generated `outcome.nextLevelGame`
   * (level-up) or starts a brand new game at level 1 (game over, whatever the
   * reason); 'Salir' goes to Inicio, exactly like the flat flow's Resultados.
   */
  function finishLevel(container, renderers, questions, doc, fetchFn, level, finalState, outcome, ctx) {
    var gameFlow = resolveGameFlow();
    var modeProgressStorage = ctx.modeProgressStorage;
    var modeId = ctx.modeId;

    // TRIOFSND-253: writes this mode's own level-unlock/result progress via
    // modeProgressStorage.js, fire-and-forget -- mirrors persistBestScoreAndStreak's
    // own recordScore/recordStreak calls (in playLevel, above) not being
    // awaited before Resultados renders either. Awaiting a fresh read/write
    // round trip here would queue behind the *other*, already-busy
    // per-question storage client (recordQuestionAnswered/markFunFactDiscovered,
    // fired once per answered question) on the same underlying IndexedDB
    // database, adding real, user-visible latency right when Resultados is
    // about to render -- exactly the moment a child is waiting to see their
    // score. `ModeProgressStorage`'s own writes degrade to an in-memory
    // adapter rather than rejecting (see its `_write`), so this never needs
    // a `.catch()`. The two writes are chained (never fired concurrently):
    // both are read-modify-write calls against the same stored record, so
    // racing them would let whichever lands second silently clobber the
    // other's field with its own stale read of the record (e.g.
    // `recordResult`'s snapshot of `maxUnlockedLevel` taken before
    // `recordLevelUnlocked`'s write had landed).
    var writesSettled = Promise.resolve();
    if (!outcome.gameOver && modeProgressStorage && typeof modeProgressStorage.recordLevelUnlocked === 'function') {
      writesSettled = writesSettled.then(function () {
        return modeProgressStorage.recordLevelUnlocked(modeId, outcome.nextLevel);
      });
    }
    if (modeProgressStorage && typeof modeProgressStorage.recordResult === 'function') {
      writesSettled = writesSettled.then(function () {
        return modeProgressStorage.recordResult(modeId, {
          score: finalState.score,
          maxScore: gameFlow.QUESTIONS_PER_GAME,
          level: level,
        });
      });
    }

    // TRIOFSND-253: the value to *display* right now, resolved the same way
    // persistBestScoreAndStreak resolves bestScore/maxStreak above -- never
    // awaiting the fire-and-forget writes just above (their effect isn't
    // observable synchronously), but combining this level's own outcome with
    // the value already read once, before any per-question write could
    // contend with it (`ctx.maxUnlockedLevelPromise`, kicked off in
    // startLevelGame). Advancing it in place (rather than replacing it) is
    // what lets a later level in the same chain ("Volver a jugar" continuing
    // into the next level, so finishLevel runs again against the same `ctx`)
    // see this level's own unlock too, without a second storage read.
    // Undefined (never a resolved promise) when no modeProgressStorage was
    // ever configured for this chain, so `maxLevelUnlocked` stays unset
    // exactly like every other caller-supplied-storage-gated option here
    // (`bestScore`/`bestStreak`/`adsRemoved`).
    if (ctx.maxUnlockedLevelPromise) {
      ctx.maxUnlockedLevelPromise = ctx.maxUnlockedLevelPromise.then(function (previousMax) {
        if (outcome.gameOver) {
          return previousMax;
        }
        return typeof previousMax === 'number' ? Math.max(previousMax, outcome.nextLevel) : outcome.nextLevel;
      });
    }

    return Promise.resolve(ctx.maxUnlockedLevelPromise)
      .then(function (maxLevelUnlocked) {
        return renderers.renderResultsScreen(container, {
          score: finalState.score,
          // TRIOFSND-253: generalizes the score scale this mode's level is
          // played against -- QUESTIONS_PER_GAME (10) for every mode using
          // this shared orchestrator today, same value resultsScreen.js
          // already defaults to, made explicit here since it now also drives
          // `modeProgressStorage.recordResult`'s maxScore above.
          maxScore: gameFlow.QUESTIONS_PER_GAME,
          maxStreak: finalState.maxStreak,
          // TRIOFSND-96: the best score/longest racha achieved on this
          // device so far, resolved in playLevel right before this function
          // was called.
          bestScore: finalState.bestScore,
          bestStreak: finalState.bestStreak,
          level: level,
          levelOutcome: outcome,
          maxLevelUnlocked: typeof maxLevelUnlocked === 'number' ? maxLevelUnlocked : undefined,
          // AC-20/AC-21: the banner/rewarded ad only render while this is false.
          adsRemoved: loadAdsRemovedState(ctx.storageObj),
          onPlayAgain: function () {
            // TRIOFSND-209: record the aggregated, non-PII replay_pulsado
            // event every time "Volver a jugar" is tapped, whether it
            // continues into an already-unlocked next level or restarts a
            // fresh level 1 -- both are the same "replay" gesture.
            if (ctx.analyticsStorage && typeof ctx.analyticsStorage.recordEvent === 'function') {
              ctx.analyticsStorage.recordEvent('replay_pulsado');
            }
            if (!outcome.gameOver && outcome.nextLevelGame) {
              playLevel(container, renderers, questions, doc, fetchFn, outcome.nextLevelGame, ctx);
            } else {
              startLevelGame(container, renderers, questions, doc, fetchFn, ctx);
            }
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
      });
  }

  /**
   * Starts (or restarts) the multi-level game at `ctx.level` (level 1 by
   * default) -- the real '¡Jugar!' entry point uses this once the age gate
   * resolves. `ctx.ageBand`, when omitted, is resolved here via
   * `resolveCurrentAgeBand()` so a first call from Inicio always captures the
   * age just selected; every subsequent level in the same game chain reuses
   * that same frozen value (see `playLevel`/`finishLevel` above), never
   * re-reading it. Persists the last-selected mode (TRIOFSND-235
   * `dinoquiz:lastMode`, mirrors `startMazeGame`'s own call) every time it
   * runs, whether that's a fresh Quiz game or a same-mode replay/next level.
   */
  function startLevelGame(container, renderers, questions, doc, fetchFn, ctx) {
    ctx = ctx || {};
    var gameFlow = resolveGameFlow();
    if (!gameFlow || !Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    var getQuestionsByLevel = ctx.getQuestionsByLevel || buildGetQuestionsByLevel(questions);
    // TRIOFSND-253: which mode's progression this game chain reads/writes
    // through modeProgressStorage.js -- defaults to gameFlow's own default
    // mode (quiz) so every pre-existing caller that never set ctx.modeId
    // (this orchestrator predates the mode selector) keeps behaving exactly
    // as before.
    var modeId = ctx.modeId || gameFlow.DEFAULT_MODE_ID || QUIZ_MODE_ID;
    var resolvedCtx = {
      ageBand: ctx.ageBand !== undefined ? ctx.ageBand : resolveCurrentAgeBand(),
      randomFn: ctx.randomFn,
      storageObj: ctx.storageObj,
      analyticsStorage: ctx.analyticsStorage,
      storage: ctx.storage,
      modeProgressStorage: ctx.modeProgressStorage,
      modeId: modeId,
      // TRIOFSND-253: this mode's highest-unlocked-level, read exactly once
      // here -- before this fresh game's first question renders and long
      // before any per-question storage write could contend with it (see
      // finishLevel's own doc comment) -- so Resultados can display it with
      // no I/O left to do once the 10th question is answered. finishLevel
      // advances this same promise in place as the chain progresses through
      // further levels.
      maxUnlockedLevelPromise:
        ctx.modeProgressStorage && typeof ctx.modeProgressStorage.getMaxUnlockedLevel === 'function'
          ? Promise.resolve(ctx.modeProgressStorage.getMaxUnlockedLevel(modeId))
          : undefined,
      getQuestionsByLevel: getQuestionsByLevel,
    };

    persistLastMode(modeId, ctx.storageObj);

    var levelGame = gameFlow.startLevel(ctx.level || gameFlow.MIN_LEVEL, {
      getQuestionsByLevel: getQuestionsByLevel,
      randomFn: ctx.randomFn,
    });

    if (levelGame && levelGame.error) {
      return exitToHomeSafely(container, renderers, doc, fetchFn, levelGame);
    }

    return playLevel(container, renderers, questions, doc, fetchFn, levelGame, resolvedCtx);
  }

  /**
   * Laberinto mode integration (TRIOFSND-259): a Laberinto game is a single,
   * fixed ROUNDS_PER_GAME-round "partida" at one difficulty level (no
   * cross-game level-unlock chain like the Quiz's startLevelGame/playLevel/
   * finishLevel above) -- so its own start/round/finish loop is simpler,
   * mirroring the *shape* of that Quiz loop (renderQuestionAt's `advance`,
   * playLevel/finishLevel) but driving public/scripts/mazeGame.js's
   * startGame/completeRound instead of gameFlow.js's startLevel/completeLevel.
   *
   * `activeMazeGame` tracks whether a game is currently in progress (and at
   * which level) so `renderRoute` below can tell an in-progress game apart
   * from a finished one when the player navigates away, and log the
   * aggregated, local-only `partida abandonada` counter (TRIOFSND-259
   * logging.js) exactly once per abandoned game.
   */
  var activeMazeGame = null;

  /** Renders `round` and drives it to completion (or the next round, or Resultados once the game is over). */
  function playMazeRound(container, renderers, doc, fetchFn, mazeGameApi, roundState, ctx) {
    var totalRounds = mazeGameApi.ROUNDS_PER_GAME;
    // mazeScreen.js tracks the creature's position/moves/reached-goal status
    // in its own internal closure and never hands the updated round back --
    // it only reports each attempted move via `onMove` and the final score
    // via onNext/onGameOver. `currentRound` mirrors that same state here (via
    // the identical `mazeGameApi.applyMove`) so it is at `status:
    // 'reached_goal'` by the time `advance()` calls `completeRound`, exactly
    // in sync with what the player just saw on screen.
    var currentRound = roundState.round;

    function advance() {
      var result = mazeGameApi.completeRound({
        round: currentRound,
        gameState: roundState.state,
        level: ctx.level,
        seed: ctx.seed,
        dinosaurPool: ctx.dinosaurPool,
        randomFn: ctx.randomFn,
        logService: ctx.logService,
      });

      if (result.nextRound && result.nextRound.error) {
        activeMazeGame = null;
        if (ctx.logger) {
          ctx.logger.logMazeResolvabilityFailure();
        }
        exitMazeToHomeSafely(container, renderers, doc, fetchFn, result.nextRound);
        return;
      }

      if (result.gameOver) {
        activeMazeGame = null;
        if (ctx.logger) {
          ctx.logger.logMazeGameCompleted(ctx.level);
        }
        finishMazeGame(container, renderers, doc, fetchFn, result.state, ctx);
      } else {
        playMazeRound(container, renderers, doc, fetchFn, mazeGameApi, { round: result.nextRound, state: result.state }, ctx);
      }
    }

    return renderers.renderMazeScreen(container, roundState.round, {
      score: roundState.state.score,
      roundNumber: roundState.round.roundIndex + 1,
      totalRounds: totalRounds,
      onMove: function (moveResult) {
        if (!moveResult.blocked) {
          currentRound = mazeGameApi.applyMove(currentRound, moveResult.direction);
        }
      },
      onNext: function () {
        advance();
      },
      onGameOver: function () {
        advance();
      },
    });
  }

  /** Renders Resultados for a finished Laberinto game; 'Volver a jugar' starts a fresh one at the same level, 'Salir' goes to Inicio. */
  function finishMazeGame(container, renderers, doc, fetchFn, finalState, ctx) {
    var gameFlow = resolveGameFlow();
    finalState.maxStreak = gameFlow ? gameFlow.calculateMaxStreak(finalState.answers) : undefined;
    var bestScoreAndStreak = persistBestScoreAndStreak(ctx.storage, finalState);
    finalState.bestScore = bestScoreAndStreak.bestScore;
    finalState.bestStreak = bestScoreAndStreak.bestStreak;

    if (ctx.analyticsStorage && typeof ctx.analyticsStorage.recordGameCompleted === 'function') {
      ctx.analyticsStorage.recordGameCompleted(finalState.score);
    }

    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      maxStreak: finalState.maxStreak,
      bestScore: finalState.bestScore,
      bestStreak: finalState.bestStreak,
      adsRemoved: loadAdsRemovedState(ctx.storageObj),
      onPlayAgain: function () {
        startMazeGame(container, renderers, doc, fetchFn, ctx);
      },
      onExit: function () {
        navigateHome();
      },
    });
  }

  /**
   * Starts a fresh Laberinto game at `ctx.level` (defaults to
   * MAZE_MIN_LEVEL). Persists the last-selected mode (TRIOFSND-230/259
   * `dinoquiz:lastMode`) and tallies the aggregated, local-only
   * `partida_iniciada` counter for Laberinto before the first round renders.
   */
  function startMazeGame(container, renderers, doc, fetchFn, ctx) {
    ctx = ctx || {};
    var mazeGameApi = resolveMazeGame();
    if (!mazeGameApi || !renderers || typeof renderers.renderMazeScreen !== 'function') {
      return null;
    }

    var level = ctx.level || MAZE_MIN_LEVEL;
    var resolvedCtx = {
      level: level,
      seed: ctx.seed,
      randomFn: ctx.randomFn,
      dinosaurPool: ctx.dinosaurPool,
      storageObj: ctx.storageObj,
      analyticsStorage: ctx.analyticsStorage,
      storage: ctx.storage,
      logger: ctx.logger,
      logService: ctx.logger,
    };

    persistLastMode(MAZE_MODE_ID, ctx.storageObj);
    if (ctx.logger) {
      ctx.logger.logMazeGameStarted(level);
    }

    var game = mazeGameApi.startGame({
      level: level,
      seed: ctx.seed,
      randomFn: ctx.randomFn,
      dinosaurPool: ctx.dinosaurPool,
      logService: ctx.logger,
    });

    if (game.round && game.round.error) {
      if (ctx.logger) {
        ctx.logger.logMazeResolvabilityFailure();
      }
      return exitMazeToHomeSafely(container, renderers, doc, fetchFn, game.round);
    }

    activeMazeGame = { level: level };
    return playMazeRound(container, renderers, doc, fetchFn, mazeGameApi, { round: game.round, state: game.state }, resolvedCtx);
  }

  /** Renders the Laberinto route (#/laberinto): starts a fresh game every time it's entered, mirroring Home/Privacy's full re-render. */
  function renderMazeRoute(doc, fetchFn) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    if (!doc) {
      return null;
    }

    var container = doc.getElementById('app');
    var renderers = resolveScreenRenderers();
    if (!container || !renderers) {
      return null;
    }

    var homeStorage = resolveHomeStorage(doc.defaultView);
    return startMazeGame(container, renderers, doc, fetchFn, {
      storageObj: homeStorage,
      analyticsStorage: homeStorage,
      storage: homeStorage,
      logger: resolveLogger(),
    });
  }

  /**
   * Oído Jurásico mode integration (TRIOFSND-270): a fixed, level-less
   * ROUNDS_PER_GAME-round "partida" (mirrors Laberinto's own flat game
   * shape, `startMazeGame`/`playMazeRound`/`finishMazeGame` above), but
   * driven by public/scripts/roundContract.js's shared start/evaluate/
   * advance contract instead of a bespoke per-mode game module -- Oído
   * Jurásico's own round generation
   * (oidoJurasicoScreen.js's `generateOidoJurasicoRound`) is exactly the one
   * piece that contract asks a mode to supply.
   */

  /**
   * Renders `session.round` and drives it to completion (answer -> feedback
   * -> "Siguiente"), then either the next round or Resultados, exactly
   * mirroring `playMazeRound`'s shape. `roundContractApi.evaluateAnswer`
   * rejects a second answer for the same round (AC: "selección de respuesta
   * sin doble conteo") independently of the screen's own `answered` guard;
   * `advanceRound` is the single place that decides the game is over once
   * the round just answered was the 10th (AC: "bucle de exactamente 10
   * rondas") -- this function never counts rounds itself.
   */
  function playOidoJurasicoRound(container, renderers, doc, fetchFn, roundContractApi, session, ctx) {
    return renderers.renderOidoJurasicoScreen(container, session.round, {
      score: session.state.score,
      roundNumber: session.roundIndex + 1,
      totalRounds: session.roundCount,
      storageObj: ctx.storageObj,
      onAnswer: function (result) {
        var evaluated = roundContractApi.evaluateAnswer(session, {
          isCorrect: result.isCorrect,
          selectedId: result.selectedId,
          correctId: result.correctId,
        });
        if (evaluated.accepted) {
          session = evaluated.session;
        }
      },
      onNext: function () {
        var advanced = roundContractApi.advanceRound(session);
        if (!advanced.accepted) {
          return;
        }
        session = advanced.session;

        if (advanced.gameOver) {
          finishOidoJurasicoGame(container, renderers, doc, fetchFn, session.state, ctx);
        } else {
          playOidoJurasicoRound(container, renderers, doc, fetchFn, roundContractApi, session, ctx);
        }
      },
      // AC: "bloqueo controlado y accesible con vuelta al selector si falta
      // un recurso" / "aviso de dinoquiz:muted con opciones de ... volver".
      onBack: function () {
        returnToModeSelectorFromOidoJurasico(doc, fetchFn);
      },
      // Keeps the shared #mute-toggle button (outside #app) in sync after
      // "Activar sonido" writes the mute flag directly via appShell.js.
      onUnmute: function () {
        renderMuteToggle(doc);
      },
    });
  }

  /** Renders Resultados for a finished Oído Jurásico game; 'Volver a jugar' starts a fresh one, 'Salir' goes to Inicio. Mirrors `finishMazeGame`. */
  function finishOidoJurasicoGame(container, renderers, doc, fetchFn, finalState, ctx) {
    var gameFlow = resolveGameFlow();
    finalState.maxStreak = gameFlow ? gameFlow.calculateMaxStreak(finalState.answers) : undefined;
    var bestScoreAndStreak = persistBestScoreAndStreak(ctx.storage, finalState);
    finalState.bestScore = bestScoreAndStreak.bestScore;
    finalState.bestStreak = bestScoreAndStreak.bestStreak;

    if (ctx.analyticsStorage && typeof ctx.analyticsStorage.recordGameCompleted === 'function') {
      ctx.analyticsStorage.recordGameCompleted(finalState.score);
    }

    // TRIOFSND-253: this mode's own result, scoped by modeId so it never
    // reads/overwrites a different mode's progression (see finishLevel's own
    // doc comment on the same modeProgressStorage).
    if (ctx.modeProgressStorage && typeof ctx.modeProgressStorage.recordResult === 'function') {
      var roundContractApi = resolveRoundContract();
      ctx.modeProgressStorage.recordResult(OIDO_JURASICO_MODE_ID, {
        score: finalState.score,
        maxScore: roundContractApi ? roundContractApi.ROUNDS_PER_GAME : 10,
      });
    }

    return renderers.renderResultsScreen(container, {
      score: finalState.score,
      maxStreak: finalState.maxStreak,
      bestScore: finalState.bestScore,
      bestStreak: finalState.bestStreak,
      adsRemoved: loadAdsRemovedState(ctx.storageObj),
      onPlayAgain: function () {
        startOidoJurasicoGame(container, renderers, doc, fetchFn, ctx);
      },
      onExit: function () {
        navigateHome();
      },
    });
  }

  /** Starts a fresh Oído Jurásico game: builds the round context/session via roundContract.js and renders its first round. Persists the last-selected mode (TRIOFSND-230/270), mirrors `startMazeGame`. */
  function startOidoJurasicoGame(container, renderers, doc, fetchFn, ctx) {
    ctx = ctx || {};
    var roundContractApi = resolveRoundContract();
    var oidoJurasicoGame = resolveOidoJurasicoGame();
    if (!roundContractApi || !oidoJurasicoGame || !renderers || typeof renderers.renderOidoJurasicoScreen !== 'function') {
      return null;
    }

    persistLastMode(OIDO_JURASICO_MODE_ID, ctx.storageObj);

    var context = oidoJurasicoGame.buildOidoJurasicoRoundContext({ randomFn: ctx.randomFn });
    var session = roundContractApi.startGame({
      generateRound: oidoJurasicoGame.generateOidoJurasicoRound,
      context: context,
    });

    return playOidoJurasicoRound(container, renderers, doc, fetchFn, roundContractApi, session, ctx);
  }

  /**
   * "Volver al selector de juegos" (AC, from the blocked/muted/playback-error
   * panels): the mode selector has no hash route of its own (it only ever
   * renders as a step between the age gate and a chosen mode, see
   * `renderModeSelector`), so this re-fetches the same i18n resources that
   * step normally already has in hand and renders it directly into `#app`,
   * clearing the Oído Jurásico hash first so a later refresh/back doesn't
   * re-enter the game that was just left.
   */
  function returnToModeSelectorFromOidoJurasico(doc, fetchFn) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    if (!doc) {
      return null;
    }

    var container = doc.getElementById('app');
    var renderers = resolveScreenRenderers();
    if (!container || !renderers) {
      navigateHome();
      return null;
    }

    navigateHome();

    var homeStorage = resolveHomeStorage(doc.defaultView);
    var ctx = {
      storageObj: homeStorage,
      analyticsStorage: homeStorage,
      storage: homeStorage,
      modeProgressStorage: resolveModeProgressStorage(),
      logger: resolveLogger(),
    };

    return loadHomeResources(fetchFn).then(function (resources) {
      return renderModeSelector(container, renderers, loadQuestions(), doc, fetchFn, resources, ctx);
    });
  }

  /**
   * Renders the Oído Jurásico route (#/oido-jurasico): shows the localized
   * pre-game explanation once, ever, before this device's first game (AC:
   * "explicación previa localizada antes de la primera partida",
   * `hasSeenIntro`/`markIntroSeen`), then starts a fresh game every time --
   * mirrors `renderMazeRoute`'s full re-render on every entry.
   */
  function renderOidoJurasicoRoute(doc, fetchFn) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    if (!doc) {
      return null;
    }

    var container = doc.getElementById('app');
    var renderers = resolveScreenRenderers();
    if (!container || !renderers) {
      return null;
    }

    var homeStorage = resolveHomeStorage(doc.defaultView);
    var ctx = {
      storageObj: homeStorage,
      analyticsStorage: homeStorage,
      storage: homeStorage,
      modeProgressStorage: resolveModeProgressStorage(),
      logger: resolveLogger(),
    };

    var oidoJurasicoGame = resolveOidoJurasicoGame();
    var alreadySeenIntro =
      oidoJurasicoGame && typeof oidoJurasicoGame.hasSeenIntro === 'function' && oidoJurasicoGame.hasSeenIntro(homeStorage);

    if (alreadySeenIntro || typeof renderers.renderOidoJurasicoIntro !== 'function') {
      return startOidoJurasicoGame(container, renderers, doc, fetchFn, ctx);
    }

    return renderers.renderOidoJurasicoIntro(container, {
      onContinue: function () {
        if (oidoJurasicoGame && typeof oidoJurasicoGame.markIntroSeen === 'function') {
          oidoJurasicoGame.markIntroSeen(homeStorage);
        }
        startOidoJurasicoGame(container, renderers, doc, fetchFn, ctx);
      },
    });
  }

  /**
   * Mode selector (TRIOFSND-232, PRD "Selector ilustrado de modos"): rendered
   * right after the age gate resolves and before any game starts, so the
   * player always picks a mode instead of always landing on Quiz. Selecting
   * an available mode is handled by `handleModeSelected` (TRIOFSND-239),
   * which routes straight into that mode's own level selection/orchestrator
   * unless doing so would abandon an incomplete round in a different mode --
   * see that function's own doc comment. A blocked mode never reaches
   * `onSelectMode` at all -- public/scripts/modeSelectorScreen.js withholds
   * it and only logs a local diagnostic instead (see that file's own doc
   * comment). `resources` reuses the single i18n fetch `loadHomeResources`
   * already made for Home, so opening the selector needs no extra network
   * round trip. A missing renderer (e.g. modeSelectorScreen.js failed to load
   * in some fallback browser) falls straight through to Quiz -- the only
   * mode that existed before this selector did -- so a broken/missing script
   * never blocks play.
   *
   * Laberinto (TRIOFSND-259) already has its own hash route (`MAZE_HASH`):
   * selecting it here only updates `location.hash`, the same way
   * `onOpenPrivacyPolicy` does for the privacy policy elsewhere in this file
   * -- the `hashchange` listener wired at bootstrap is what actually renders
   * it (via `renderRoute` -> `renderMazeRoute`), so this never double-renders
   * by also calling it directly.
   */
  function renderModeSelector(container, renderers, questions, doc, fetchFn, resources, ctx) {
    if (!renderers || typeof renderers.renderModeSelectorScreen !== 'function') {
      return startLevelGame(container, renderers, questions, doc, fetchFn, ctx);
    }

    // Resolved once, right here, before any card is tapped (TRIOFSND-239):
    // modeSelectorScreen.js's own click handler overwrites `dinoquiz:lastMode`
    // with the *newly* tapped mode before it calls `onSelectMode`, so reading
    // it from inside that callback would always see the new mode instead of
    // the one being left. See `handleModeSelected`'s own doc comment.
    var modeStorage = resolveModeStorage();
    var currentModeId =
      modeStorage && typeof modeStorage.getLastMode === 'function'
        ? modeStorage.getLastMode(ctx && ctx.storageObj)
        : null;

    return renderers.renderModeSelectorScreen(container, {
      strings: resources && resources.modeSelector,
      modesStrings: resources && resources.modes,
      onSelectMode: function (modeId) {
        handleModeSelected(container, renderers, questions, doc, fetchFn, resources, ctx, modeId, currentModeId);
      },
      onBack: function () {
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

    // TRIOFSND-113: `register` can reject asynchronously (handled by the
    // `.catch` below) but can also throw synchronously on some embedded/
    // in-app browsers before it ever returns a promise. Both are treated as
    // a recoverable, non-blocking fallback -- neither should reach the
    // `window.addEventListener('load', ...)` bootstrap handler as an
    // unhandled exception/rejection.
    try {
      return nav.serviceWorker
        .register(swPath)
        .then(function (registration) {
          return registration;
        })
        .catch(function (error) {
          console.error('DinoQuiz: service worker registration failed', error);
          return null;
        });
    } catch (error) {
      console.error('DinoQuiz: service worker registration failed', error);
      return Promise.resolve(null);
    }
  }

  /**
   * TRIOFSND-113: capability snapshot used to log a diagnostic when a tablet
   * or embedded browser falls outside the official support matrix (last 2
   * major versions of Chrome/Edge/Safari) and therefore lacks full
   * service-worker/manifest support. Mirrors `src/services/platformSupport`'s
   * `detectPwaSupport` -- required directly under Node/Jest, duplicated
   * inline for the real, bundler-less browser where `require` doesn't exist,
   * same dual pattern as `loadDinoQuizStorage`/`createBrowserHomeStorage`
   * above. Never throws and never gates the game itself: `bootstrapBrowserApp`
   * fetches i18n/question JSON over plain `fetch` regardless of what this
   * reports, so "modo navegador normal" (no install, no advanced cache) keeps
   * the game fully playable either way.
   */
  function resolvePlatformSupport(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var nav = (win && win.navigator) || (typeof navigator !== 'undefined' ? navigator : undefined);
    var doc = (win && win.document) || (typeof document !== 'undefined' ? document : undefined);

    if (typeof require === 'function') {
      return require('../../src/services/platformSupport').detectPwaSupport(nav, doc);
    }

    var serviceWorker = !!nav && 'serviceWorker' in nav;
    var manifest = false;
    if (doc && typeof doc.createElement === 'function') {
      try {
        var link = doc.createElement('link');
        manifest = !!(
          link.relList &&
          typeof link.relList.supports === 'function' &&
          link.relList.supports('manifest')
        );
      } catch (error) {
        manifest = false;
      }
    }

    return { serviceWorker: serviceWorker, manifest: manifest, isFullySupported: serviceWorker && manifest };
  }

  /** Logs a non-blocking diagnostic (no analytics event, no PII) when running in the functional fallback mode. */
  function logPlatformSupportFallback(support) {
    if (!support || support.isFullySupported) {
      return;
    }

    console.info(
      'DinoQuiz: PWA install/offline-cache features are unavailable in this browser ' +
        '(serviceWorker=' +
        support.serviceWorker +
        ', manifest=' +
        support.manifest +
        '). Falling back to normal browser mode: no install, no advanced cache, the game itself still works.'
    );
  }

  /**
   * Resolves the logging service, following the same dual CommonJS/global
   * pattern as resolveScreenRenderers. The browser-based app loads logging.js
   * as a plain <script> and exposes it on window.DinoQuiz.services.logging;
   * Node/Jest tests require it directly. Returns a LogService instance ready
   * for logging access and PWA installation events.
   */
  function resolveLogger(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var LogService =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.logging && win.DinoQuiz.services.logging.LogService) ||
      (typeof require === 'function' ? require('../../src/services/logging').LogService : undefined);

    if (typeof LogService !== 'function') {
      return null;
    }

    return new LogService();
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
   * Fetches the whole i18n resource once and hands back the sections the
   * Home screen (and what it kicks off) needs: home/privacy/purchase
   * (TRIOFSND-66) plus ageGate (TRIOFSND-193, resolved up front here so the
   * '¡Jugar!' click handler below can render the age gate synchronously,
   * with no extra fetch on the click itself) — all without a `require()` for
   * `src/i18n`. Also resolves `modeSelector`/`modes` (TRIOFSND-232) and
   * `modeChange` (TRIOFSND-239), so the mode selector rendered right after
   * the age gate (see `renderModeSelector` below) and the confirmation
   * dialog `handleModeSelected` shows on top of it both reuse this same
   * fetch instead of triggering a second one.
   */
  function loadHomeResources(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data
        ? {
            home: data.home,
            privacy: data.privacy,
            purchase: data.purchase,
            ageGate: data.ageGate,
            modeSelector: data.modeSelector,
            modes: data.modes,
            modeChange: data.modeChange,
          }
        : null;
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
  // On-device average-score aggregate (TRIOFSND-98): mirrors the shape
  // src/services/storage's DinoQuizStorage#recordGameCompleted persists under
  // its own `dinoquiz:scoreMetrics` namespaced key, so this no-bundler browser
  // path and a future bundler-backed one agree on the same value.
  var SCORE_METRICS_KEY = 'dinoquiz:scoreMetrics';
  var EMPTY_SCORE_METRICS = { gamesCompleted: 0, totalScore: 0, averageScore: 0 };
  var QUESTION_STATS_KEY = 'dinoquiz:questionStats';
  var QUESTION_ANSWERED_EVENTS_KEY = 'dinoquiz:questionAnsweredEvents';
  // TRIOFSND-205/207: same namespaced key `src/services/storage`'s
  // StorageClient itself writes (`maxUnlockedLevel`), so both backends agree
  // on the highest level unlocked on this device once a bundler wires the
  // real service in. Level 1 is always accessible, hence the default of 1
  // (mirrors src/services/storage/types.js's DEFAULT_STATE).
  var MAX_UNLOCKED_LEVEL_KEY = 'dinoquiz:maxUnlockedLevel';
  var DEFAULT_MAX_UNLOCKED_LEVEL = 1;
  var DISCOVERED_FUN_FACTS_KEY = 'dinoquiz:discoveredFunFacts';
  // TRIOFSND-96: same namespaced keys `src/services/storage`'s StorageClient
  // itself writes (`bestScore`/`maxStreak`), so both backends agree on the
  // best score/longest racha achieved on this device once a bundler wires
  // the real service in.
  var BEST_SCORE_KEY = 'dinoquiz:bestScore';
  var MAX_STREAK_KEY = 'dinoquiz:maxStreak';
  var DEFAULT_BEST_SCORE = 0;
  var DEFAULT_MAX_STREAK = 0;

  function createBrowserHomeStorage(win) {
    win = win || (typeof window !== 'undefined' ? window : undefined);
    var backend = win && win.localStorage;
    var memory = {};
    memory[HOME_TOOLTIP_SEEN_KEY] = false;
    memory[ANALYTICS_EVENT_COUNTS_KEY] = {};
    memory[SCORE_METRICS_KEY] = EMPTY_SCORE_METRICS;
    memory[QUESTION_STATS_KEY] = {};
    memory[QUESTION_ANSWERED_EVENTS_KEY] = [];
    memory[MAX_UNLOCKED_LEVEL_KEY] = DEFAULT_MAX_UNLOCKED_LEVEL;
    memory[DISCOVERED_FUN_FACTS_KEY] = [];
    memory[BEST_SCORE_KEY] = DEFAULT_BEST_SCORE;
    memory[MAX_STREAK_KEY] = DEFAULT_MAX_STREAK;

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
      // TRIOFSND-98: records the aggregated, non-PII partida_completada event
      // (via the same recordEvent counter above) and folds the final score
      // into the on-device average-score aggregate, reusable for a future
      // completion-rate metric.
      recordGameCompleted: function (score) {
        var counts = readJSON(ANALYTICS_EVENT_COUNTS_KEY) || {};
        counts.partida_completada = (counts.partida_completada || 0) + 1;
        writeJSON(ANALYTICS_EVENT_COUNTS_KEY, counts);

        var metrics = readJSON(SCORE_METRICS_KEY) || EMPTY_SCORE_METRICS;
        var gamesCompleted = metrics.gamesCompleted + 1;
        var totalScore = metrics.totalScore + score;
        var updated = { gamesCompleted: gamesCompleted, totalScore: totalScore, averageScore: totalScore / gamesCompleted };
        writeJSON(SCORE_METRICS_KEY, updated);
        return Promise.resolve(updated);
      },
      // TRIOFSND-80: single write point (called from onAnswer in the
      // bootstrap below, never from questionScreen.js). Persists the
      // minimal, non-PII event { tipo: 'pregunta_respondida', id_pregunta,
      // acierto } -- no name/age/email/ad-or-install id/free text/IP/device
      // data -- and incrementally updates that question's total_respuestas/
      // total_aciertos counters (raw, never rounded) for the historic %
      // de acierto.
      recordQuestionAnswered: function (questionId, isCorrect) {
        var acierto = Boolean(isCorrect);

        var events = readJSON(QUESTION_ANSWERED_EVENTS_KEY) || [];
        events = events.concat([{ tipo: 'pregunta_respondida', id_pregunta: questionId, acierto: acierto }]);
        writeJSON(QUESTION_ANSWERED_EVENTS_KEY, events);

        var counts = readJSON(ANALYTICS_EVENT_COUNTS_KEY) || {};
        counts.pregunta_respondida = (counts.pregunta_respondida || 0) + 1;
        writeJSON(ANALYTICS_EVENT_COUNTS_KEY, counts);

        var stats = readJSON(QUESTION_STATS_KEY) || {};
        var current = stats[questionId] || { total_respuestas: 0, total_aciertos: 0 };
        stats[questionId] = {
          total_respuestas: current.total_respuestas + 1,
          total_aciertos: current.total_aciertos + (acierto ? 1 : 0),
        };
        writeJSON(QUESTION_STATS_KEY, stats);
        return Promise.resolve(stats[questionId]);
      },
      // Historic per-question aggregate: raw counters plus porcentaje_acierto
      // computed at full precision (0 -- never NaN/Infinity -- when the
      // question has no answers yet).
      getQuestionStats: function (questionId) {
        var stats = readJSON(QUESTION_STATS_KEY) || {};
        var current = stats[questionId] || { total_respuestas: 0, total_aciertos: 0 };
        var porcentaje = current.total_respuestas > 0 ? (current.total_aciertos / current.total_respuestas) * 100 : 0;
        return Promise.resolve({
          total_respuestas: current.total_respuestas,
          total_aciertos: current.total_aciertos,
          porcentaje_acierto: porcentaje,
        });
      },
      // TRIOFSND-205: highest level (1-based) the child has unlocked on this
      // device -- only this single number, never per-level answers or age.
      getMaxUnlockedLevel: function () {
        var level = readJSON(MAX_UNLOCKED_LEVEL_KEY);
        return Promise.resolve(typeof level === 'number' ? level : DEFAULT_MAX_UNLOCKED_LEVEL);
      },
      // Monotonically increasing, mirroring StorageClient#setMaxUnlockedLevel:
      // ignores any `level` that isn't a bigger integer than what's already
      // unlocked.
      setMaxUnlockedLevel: function (level) {
        var current = readJSON(MAX_UNLOCKED_LEVEL_KEY);
        current = typeof current === 'number' ? current : DEFAULT_MAX_UNLOCKED_LEVEL;
        if (!Number.isInteger(level) || level <= current) {
          return Promise.resolve(current);
        }
        writeJSON(MAX_UNLOCKED_LEVEL_KEY, level);
        return Promise.resolve(level);
      },
      // TRIOFSND-129: registers a "dato curioso" as seen on this device,
      // once per distinct funFactId (never a duplicate entry) -- mirrors
      // DinoQuizStorage#markFunFactDiscovered (src/services/storage/StorageClient.js).
      markFunFactDiscovered: function (funFactId) {
        var discovered = readJSON(DISCOVERED_FUN_FACTS_KEY) || [];
        if (discovered.indexOf(funFactId) === -1) {
          writeJSON(DISCOVERED_FUN_FACTS_KEY, discovered.concat([funFactId]));
        }
        return Promise.resolve();
      },
      getDiscoveredFunFactsCount: function () {
        return Promise.resolve((readJSON(DISCOVERED_FUN_FACTS_KEY) || []).length);
      },
      // Synchronous counterpart used where a result must be available
      // without awaiting a promise (renderResultsFor renders Resultados
      // synchronously right when a game ends, see public/scripts/main.js).
      getDiscoveredFunFactsCountSync: function () {
        return (readJSON(DISCOVERED_FUN_FACTS_KEY) || []).length;
      },
      // TRIOFSND-96: monotonically increasing, mirroring
      // StorageClient#recordScore/#recordStreak -- only overwrites the
      // persisted bestScore/maxStreak when the new value is strictly higher,
      // so this is safe to call after every game, win or lose.
      recordScore: function (score) {
        var current = readJSON(BEST_SCORE_KEY);
        current = typeof current === 'number' ? current : DEFAULT_BEST_SCORE;
        if (typeof score !== 'number' || score <= current) {
          return Promise.resolve(current);
        }
        writeJSON(BEST_SCORE_KEY, score);
        return Promise.resolve(score);
      },
      recordStreak: function (streak) {
        var current = readJSON(MAX_STREAK_KEY);
        current = typeof current === 'number' ? current : DEFAULT_MAX_STREAK;
        if (typeof streak !== 'number' || streak <= current) {
          return Promise.resolve(current);
        }
        writeJSON(MAX_STREAK_KEY, streak);
        return Promise.resolve(streak);
      },
      getBestScore: function () {
        var value = readJSON(BEST_SCORE_KEY);
        return Promise.resolve(typeof value === 'number' ? value : DEFAULT_BEST_SCORE);
      },
      getMaxStreak: function () {
        var value = readJSON(MAX_STREAK_KEY);
        return Promise.resolve(typeof value === 'number' ? value : DEFAULT_MAX_STREAK);
      },
      // Synchronous counterparts (same rationale as getDiscoveredFunFactsCountSync
      // above): renderResultsFor computes the best score/racha to *display*
      // synchronously, right when a game ends, without awaiting the
      // fire-and-forget recordScore/recordStreak write above.
      getBestScoreSync: function () {
        var value = readJSON(BEST_SCORE_KEY);
        return typeof value === 'number' ? value : DEFAULT_BEST_SCORE;
      },
      getMaxStreakSync: function () {
        var value = readJSON(MAX_STREAK_KEY);
        return typeof value === 'number' ? value : DEFAULT_MAX_STREAK;
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

    var merged = {
      hasSeenHomeTooltip: function () {
        return tooltipBackend.hasSeenHomeTooltip();
      },
      markHomeTooltipSeen: function () {
        return tooltipBackend.markHomeTooltipSeen();
      },
      recordEventOnce: function (eventName) {
        return tooltipBackend.recordEventOnce(eventName);
      },
      // TRIOFSND-92/TRIOFSND-98: forwards the repeatable, aggregated event
      // counter (partida_iniciada, pregunta_respondida...) and the
      // game-completion helper (partida_completada + average-score
      // aggregate) so the real app-shell flow, not just tests that pass an
      // explicit storage double, actually records them.
      recordEvent: function (eventName) {
        return tooltipBackend.recordEvent(eventName);
      },
      recordGameCompleted: function (score) {
        return tooltipBackend.recordGameCompleted(score);
      },
      // TRIOFSND-205/207: forwarded the same way as the tooltip methods above
      // so `startLevelGame`/`finishLevel` can persist/read the highest
      // unlocked level through this one resolved backend too.
      getMaxUnlockedLevel: function () {
        return typeof tooltipBackend.getMaxUnlockedLevel === 'function'
          ? tooltipBackend.getMaxUnlockedLevel()
          : Promise.resolve(DEFAULT_MAX_UNLOCKED_LEVEL);
      },
      setMaxUnlockedLevel: function (level) {
        return typeof tooltipBackend.setMaxUnlockedLevel === 'function'
          ? tooltipBackend.setMaxUnlockedLevel(level)
          : Promise.resolve(DEFAULT_MAX_UNLOCKED_LEVEL);
      },
      // TRIOFSND-129: forwards fun-fact discovery tracking so both
      // `renderQuestionAt`'s onAnswer handler (recording) and the Home/
      // Resultados progress display (reading) share the same backend as
      // the tooltip/analytics half above.
      markFunFactDiscovered: function (funFactId) {
        return tooltipBackend.markFunFactDiscovered(funFactId);
      },
      getDiscoveredFunFactsCount: function () {
        return tooltipBackend.getDiscoveredFunFactsCount();
      },
      // TRIOFSND-96: forwards the best-score/longest-racha persistence so
      // both `persistBestScoreAndStreak` (recording) and Home/Resultados'
      // progress display (reading) share the same resolved backend as the
      // tooltip/analytics half above.
      recordScore: function (score) {
        return typeof tooltipBackend.recordScore === 'function'
          ? tooltipBackend.recordScore(score)
          : Promise.resolve(undefined);
      },
      recordStreak: function (streak) {
        return typeof tooltipBackend.recordStreak === 'function'
          ? tooltipBackend.recordStreak(streak)
          : Promise.resolve(undefined);
      },
      getBestScore: function () {
        return typeof tooltipBackend.getBestScore === 'function'
          ? tooltipBackend.getBestScore()
          : Promise.resolve(undefined);
      },
      getMaxStreak: function () {
        return typeof tooltipBackend.getMaxStreak === 'function'
          ? tooltipBackend.getMaxStreak()
          : Promise.resolve(undefined);
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

    // Whichever synchronous accessor `tooltipBackend` exposes (the real
    // DinoQuizStorage's `snapshot()`, or createBrowserHomeStorage's
    // `getDiscoveredFunFactsCountSync()`) is forwarded as-is, so a
    // synchronous caller (renderResultsFor) can read it without awaiting a
    // promise.
    if (typeof tooltipBackend.snapshot === 'function') {
      merged.snapshot = function () {
        return tooltipBackend.snapshot();
      };
    }
    if (typeof tooltipBackend.getDiscoveredFunFactsCountSync === 'function') {
      merged.getDiscoveredFunFactsCountSync = function () {
        return tooltipBackend.getDiscoveredFunFactsCountSync();
      };
    }
    if (typeof tooltipBackend.getBestScoreSync === 'function') {
      merged.getBestScoreSync = function () {
        return tooltipBackend.getBestScoreSync();
      };
    }
    if (typeof tooltipBackend.getMaxStreakSync === 'function') {
      merged.getMaxStreakSync = function () {
        return tooltipBackend.getMaxStreakSync();
      };
    }

    return merged;
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

    // Positional-drift seam (audit finding): TRIOFSND-92 callers pass their
    // tooltip/analytics storage where onOpenPrivacyPolicy now lives — the
    // privacy-policy PR inserted its callback at position 5 and shifted them.
    // A storage-shaped object cannot be a callback; honour the older contract.
    if (onOpenPrivacyPolicy && typeof onOpenPrivacyPolicy !== 'function') {
      if (
        !storage &&
        (typeof onOpenPrivacyPolicy.recordEvent === 'function' ||
          typeof onOpenPrivacyPolicy.hasSeenHomeTooltip === 'function')
      ) {
        storage = onOpenPrivacyPolicy;
      }
      onOpenPrivacyPolicy = undefined;
    }

    // Remember what the CALLER handed us before the ambient fallback kicks
    // in: an explicitly-passed backend must win over window.localStorage for
    // every write this function wires (mute already honours this; the
    // purchase flag must too, or a test/native caller's purchase silently
    // lands in a storage nobody reads).
    var explicitStorage = storage;
    storage = storage || resolveHomeStorage(doc.defaultView);

    var tooltipStorage =
      storage && typeof storage.hasSeenHomeTooltip === 'function'
        ? storage
        : loadDinoQuizStorage() || createBrowserHomeStorage();

    // The ads-removed flag's backend, shared by the purchase write below and
    // the game the play button starts: an explicitly-passed raw backend wins
    // over the ambient localStorage wrapper (see explicitStorage above).
    var adsStorage =
      explicitStorage && typeof explicitStorage.setItem === 'function'
        ? explicitStorage
        : muteStorageObj && typeof muteStorageObj.setItem === 'function'
          ? muteStorageObj
          : storage;

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
          // TRIOFSND-209: record the aggregated, non-PII mute_toggled event
          // every time this button is tapped, the same way partida_iniciada
          // is recorded above via the resolved storage backend.
          if (tooltipStorage && typeof tooltipStorage.recordEvent === 'function') {
            tooltipStorage.recordEvent('mute_toggled');
          }
        };
      }
      // TRIOFSND-97: the single remove-ads purchase has no real payment SDK
      // in this offline-first PWA (see CONVENTIONS.md: "Sin backend"), so
      // confirming it locally marks the purchase as done -- from here on
      // Resultados stops rendering the banner/rewarded ad (AC-21).
      renderOptions.onPurchase = function () {
        // Resolve the write target the same way the mute preference does:
        // prefer `storage` when it is a raw getItem/setItem backend, else the
        // resolved mute storage. A caller that only passes `muteStorageObj`
        // (the TRIOFSND-97 contract test does) must still see the purchase
        // persist — losing a purchase to argument plumbing is the one failure
        // mode this flag cannot afford.
        persistAdsRemovedState(true, adsStorage);
      };

      // TRIOFSND-129: how many distinct fun facts have been seen on this
      // device so far, out of the total available in the loaded bank —
      // `loadQuestions()` reads the already-loaded bank synchronously (see
      // its own doc comment), same source `startNewGame` uses below.
      var totalFunFacts = (function () {
        var questions = loadQuestions();
        return Array.isArray(questions) ? questions.length : undefined;
      })();
      var discoveredFunFactsCountPromise =
        tooltipStorage && typeof tooltipStorage.getDiscoveredFunFactsCount === 'function'
          ? tooltipStorage.getDiscoveredFunFactsCount()
          : Promise.resolve(undefined);

      // TRIOFSND-96: the best score/longest racha achieved on this device so
      // far, shown next to the fun-facts progress above so reopening the app
      // shows what was achieved (PRD "Persistencia exclusivamente local de
      // mejor puntuación, racha máxima").
      var bestScorePromise =
        tooltipStorage && typeof tooltipStorage.getBestScore === 'function'
          ? tooltipStorage.getBestScore()
          : Promise.resolve(undefined);
      var bestStreakPromise =
        tooltipStorage && typeof tooltipStorage.getMaxStreak === 'function'
          ? tooltipStorage.getMaxStreak()
          : Promise.resolve(undefined);

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
              // TRIOFSND-193/207: the age gate is shown right here -- after
              // '¡Jugar!', before the game is prepared. TRIOFSND-232: once it
              // resolves, the illustrated mode selector is shown next instead
              // of starting Quiz straight away -- selecting a mode there is
              // what actually starts its game, retrieving the age band
              // (`resolveCurrentAgeBand`) for Quiz's multi-level orchestrator.
              //
              // The mute/ads-removed flags (TRIOFSND-66/TRIOFSND-97) are read
              // and written through `resolvedMuteStorage` above (onToggleMute/
              // onPurchase) -- startLevelGame's `storageObj` must read from that
              // same backend, or a purchase confirmed here would still show
              // ads on this very game's Resultados screen.
              renderAgeGate(container, renderers, resources && resources.ageGate, function () {
                renderModeSelector(container, renderers, questions, doc, fetchFn, resources, {
                  storageObj: resolvedMuteStorage,
                  analyticsStorage: storage,
                  storage: storage,
                  // TRIOFSND-253: resolved once here so every mode reachable
                  // from the selector reads/writes its own level progress and
                  // finished-game result through the same modeProgressStorage
                  // instance (see startLevelGame/finishLevel).
                  modeProgressStorage: resolveModeProgressStorage(),
                });
              });
            }
          });
        }

        return homeApi;
      }

      if (!tooltipStorage) {
        return Promise.all([discoveredFunFactsCountPromise, bestScorePromise, bestStreakPromise]).then(function (
          results
        ) {
          renderOptions.discoveredFunFactsCount = results[0];
          renderOptions.totalFunFacts = totalFunFacts;
          renderOptions.bestScore = results[1];
          renderOptions.bestStreak = results[2];
          return finishRender();
        });
      }

      return Promise.all([
        tooltipStorage.hasSeenHomeTooltip(),
        discoveredFunFactsCountPromise,
        bestScorePromise,
        bestStreakPromise,
      ]).then(function (results) {
        var seen = results[0];
        var discoveredFunFactsCount = results[1];
        renderOptions.showTooltip = !seen;
        renderOptions.onTooltipDismiss = function () {
          tooltipStorage.markHomeTooltipSeen();
        };
        renderOptions.onPlayButtonClick = function () {
          tooltipStorage.recordEventOnce('first_tap_jugar');
        };
        renderOptions.discoveredFunFactsCount = discoveredFunFactsCount;
        renderOptions.totalFunFacts = totalFunFacts;
        renderOptions.bestScore = results[2];
        renderOptions.bestStreak = results[3];
        return finishRender();
      });
    });
  }

  function renderMuteToggle(doc, renderMuteToggleButton, fetchFn, analyticsStorage) {
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

    // TRIOFSND-209: this app-shell control (mounted outside #app, stays
    // across every screen -- see the doc comment at the top of this file)
    // is the other real place a player toggles mute, so it records the same
    // aggregated, non-PII mute_toggled event as renderHome's own mute
    // button, falling back to the same ambient storage `renderRoute` uses
    // when no explicit backend is passed (the real, unbundled browser path).
    var resolvedAnalyticsStorage = analyticsStorage || resolveHomeStorage(doc.defaultView);

    return fetchI18nResource(fetchFn).then(function (data) {
      var strings = data && data.muteButton;
      var options = strings ? { strings: strings } : {};
      options.onToggle = function () {
        if (resolvedAnalyticsStorage && typeof resolvedAnalyticsStorage.recordEvent === 'function') {
          resolvedAnalyticsStorage.recordEvent('mute_toggled');
        }
      };
      return renderMuteToggleButton(container, options);
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
    // TRIOFSND-259: navigating away from an in-progress Laberinto game
    // (whichever route this render is actually for) means it was left
    // unfinished -- tally the aggregated, local-only "abandonada" counter
    // for that level exactly once, before it's cleared, and before deciding
    // what to render below.
    if (activeMazeGame && !isMazeRoute(loc)) {
      var logger = resolveLogger();
      if (logger) {
        logger.logMazeGameAbandoned(activeMazeGame.level);
      }
      activeMazeGame = null;
    }

    if (isMazeRoute(loc)) {
      return renderMazeRoute(doc, fetchFn);
    }

    if (isOidoJurasicoRoute(loc)) {
      return renderOidoJurasicoRoute(doc, fetchFn);
    }

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
    window.addEventListener('load', function () {
      logPlatformSupportFallback(resolvePlatformSupport());
      installLinkGuard();

      var logger = resolveLogger();
      if (logger) {
        logger.logAppAccess({ locale: 'es' });
      }

      registerServiceWorker().then(function (registration) {
        if (logger && registration) {
          logger.logServiceWorkerInstall({ scope: registration.scope });
        }
      });

      bootstrapBrowserApp().then(function () {
        if (logger) {
          logger.logManifestLoad({ success: true });
        }
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
      resolvePlatformSupport: resolvePlatformSupport,
      logPlatformSupportFallback: logPlatformSupportFallback,
      resolveLogger: resolveLogger,
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
      renderAgeGate: renderAgeGate,
      resolveScreenRenderers: resolveScreenRenderers,
      resolveGameFlow: resolveGameFlow,
      loadQuestions: loadQuestions,
      prepareBrowserQuestions: prepareBrowserQuestions,
      startNewGame: startNewGame,
      resolveAgeGateApi: resolveAgeGateApi,
      resolveCurrentAgeBand: resolveCurrentAgeBand,
      buildGetQuestionsByLevel: buildGetQuestionsByLevel,
      exitToHomeSafely: exitToHomeSafely,
      playLevel: playLevel,
      finishLevel: finishLevel,
      startLevelGame: startLevelGame,
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
      MAX_UNLOCKED_LEVEL_KEY: MAX_UNLOCKED_LEVEL_KEY,
      renderMuteToggle: renderMuteToggle,
      resolveMazeGame: resolveMazeGame,
      resolveModeStorage: resolveModeStorage,
      resolveModeProgressStorage: resolveModeProgressStorage,
      persistLastMode: persistLastMode,
      MAZE_HASH: MAZE_HASH,
      isMazeRoute: isMazeRoute,
      navigateToMaze: navigateToMaze,
      startMazeGame: startMazeGame,
      playMazeRound: playMazeRound,
      finishMazeGame: finishMazeGame,
      exitMazeToHomeSafely: exitMazeToHomeSafely,
      renderMazeRoute: renderMazeRoute,
      renderModeSelector: renderModeSelector,
      QUIZ_MODE_ID: QUIZ_MODE_ID,
      MAZE_MODE_ID: MAZE_MODE_ID,
      resolveGameSessionStorage: resolveGameSessionStorage,
      renderModeChangeConfirm: renderModeChangeConfirm,
      handleModeSelected: handleModeSelected,
      resolveOidoJurasicoGame: resolveOidoJurasicoGame,
      resolveRoundContract: resolveRoundContract,
      OIDO_JURASICO_HASH: OIDO_JURASICO_HASH,
      OIDO_JURASICO_MODE_ID: OIDO_JURASICO_MODE_ID,
      isOidoJurasicoRoute: isOidoJurasicoRoute,
      navigateToOidoJurasico: navigateToOidoJurasico,
      startOidoJurasicoGame: startOidoJurasicoGame,
      playOidoJurasicoRound: playOidoJurasicoRound,
      finishOidoJurasicoGame: finishOidoJurasicoGame,
      returnToModeSelectorFromOidoJurasico: returnToModeSelectorFromOidoJurasico,
      renderOidoJurasicoRoute: renderOidoJurasicoRoute,
    };
  }
})();
