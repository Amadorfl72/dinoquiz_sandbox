'use strict';

/**
 * Browser-runnable twin of src/services/modeResourceValidation.js
 * (TRIOFSND-307 rework of TRIOFSND-306's browser bridge).
 *
 * src/services/modeResourceValidation.js's `validateModeResources` builds
 * its manifest via src/data/modeResourceManifest.js's `getModeManifest`,
 * which unconditionally `require()`s src/data/creatureCatalog.js -- itself
 * an unconditional `require('fs')` to read/validate
 * public/data/creatures.json off disk. `require` isn't a global at all in a
 * real, unbundled browser (see public/scripts/mazeGame.js's own doc comment
 * for the identical situation with src/data/creatureSheet.js), so that
 * module can never run there, and nothing was registering
 * `window.DinoQuiz.services.modeResourceValidation` for
 * public/scripts/offlineDiagnosticsPanel.js's browser fallback to find --
 * every mode degraded to "no se pudo comprobar" instead of the real
 * per-mode missing-resource matrix.
 *
 * This file is a second, browser-runnable implementation of the same
 * `validateModeResources(modeId, options)` contract, following the dual
 * CommonJS/`window.DinoQuiz` pattern every other public/scripts module
 * uses. SHARED_SCRIPTS/SHARED_I18N/SHARED_IMAGES/SHARED_AUDIO/
 * MODE_SPECIFIC_SCRIPTS/MODES_WITH_CREATURE_CARTOON_ART/
 * TIMELINE_PERIOD_IMAGES below are a small, static local mirror of
 * src/data/modeResourceManifest.js's own constants of the same name -- the
 * same "local static duplicate, keep both in sync" precedent
 * public/scripts/mazeGame.js already set for its own `DINOSAUR_DIETS`,
 * guarded the same way by tests/pwa/mode-resource-validation-browser.test.js
 * cross-checking every value against the Node source.
 *
 * Unlike that duplicate, the creature-derived image/sound lists (which
 * genuinely change whenever public/data/creatures.json changes) are never
 * duplicated -- `resolveCatalog` below reads that file straight out of
 * Cache Storage (`caches.match('/data/creatures.json')`, the same local,
 * already-precached source this module checks every other resource
 * against), never a network fetch, so the creature-art portion of the
 * matrix stays accurate even as the catalog evolves.
 *
 * Every miss is tallied the same way as the Node implementation, via
 * `logging.js#logModeResourceMissing(modeId, resourceUrl)` -- local-only,
 * never sent anywhere by `sendLogs()`.
 */

(function () {
  var CREATURES_JSON_URL = '/data/creatures.json';
  var IMAGE_BASE_PATH = '/assets/images/';
  var OIDO_JURASICO_SOUND_BASE_PATH = '/assets/sounds/oido-jurasico/';

  // Mirrors src/data/modeResourceManifest.js's TIMELINE_PERIOD_IMAGES exactly
  // -- see the module doc comment above for why this file cannot just
  // `require` it.
  var TIMELINE_PERIOD_IMAGES = Object.freeze([
    IMAGE_BASE_PATH + 'periods/triasico.svg',
    IMAGE_BASE_PATH + 'periods/jurasico.svg',
    IMAGE_BASE_PATH + 'periods/cretacico.svg',
  ]);

  // Mirrors src/data/modeResourceManifest.js's SHARED_SCRIPTS exactly.
  var SHARED_SCRIPTS = Object.freeze([
    '/scripts/scoring.js',
    '/scripts/soundService.js',
    '/scripts/adsService.js',
    '/scripts/gameFlow.js',
    '/scripts/roundContract.js',
    '/scripts/visibilityPauseService.js',
    '/scripts/audio.js',
    '/scripts/feedbackComponent.js',
    '/scripts/network.js',
    '/scripts/logging.js',
    '/scripts/roundDiagnosticsService.js',
    '/scripts/appShell.js',
    '/scripts/homeScreen.js',
    '/scripts/privacyPolicyScreen.js',
    '/scripts/ageGateScreen.js',
    '/scripts/imageStyleService.js',
    '/scripts/resultsScreen.js',
    '/scripts/modesCatalog.js',
    '/scripts/unlockThresholds.js',
    '/scripts/modeStorage.js',
    '/scripts/modeProgressStorage.js',
    '/scripts/modeSelectorScreen.js',
    '/scripts/modeChangeConfirmScreen.js',
    '/scripts/modeBlockedScreen.js',
    '/scripts/main.js',
  ]);

  // Mirrors src/data/modeResourceManifest.js's SHARED_I18N exactly.
  var SHARED_I18N = Object.freeze(['/i18n/es.json']);

  // Mirrors src/data/modeResourceManifest.js's SHARED_IMAGES exactly.
  var SHARED_IMAGES = Object.freeze([
    '/assets/images/mascot.svg',
    '/assets/images/modes/quiz.svg',
    '/assets/images/modes/laberinto.svg',
    '/assets/images/modes/sombra.svg',
    '/assets/images/modes/oidoJurasico.svg',
    '/assets/images/modes/parejas.svg',
    '/assets/images/modes/clasifica.svg',
    '/assets/images/modes/ordenaPorTamano.svg',
    '/assets/images/modes/lineaDelTiempo.svg',
    '/icons/icon.svg',
  ]);

  // Mirrors src/data/modeResourceManifest.js's SHARED_AUDIO exactly.
  var SHARED_AUDIO = Object.freeze([
    '/assets/sounds/correct.wav',
    '/assets/sounds/incorrect.wav',
    '/assets/sounds/fail-neutral.wav',
  ]);

  // Mirrors src/data/modeResourceManifest.js's MODE_SPECIFIC_SCRIPTS exactly
  // (keyed by src/game/modesCatalog.js's MODE_IDS values, not the
  // constants themselves, to avoid a require just for these literals).
  var MODE_SPECIFIC_SCRIPTS = Object.freeze({
    quiz: Object.freeze(['/scripts/questionScreen.js']),
    laberinto: Object.freeze(['/scripts/mazeGenerator.js', '/scripts/mazeGame.js', '/scripts/mazeScreen.js']),
    sombra: Object.freeze(['/scripts/shadowGuessGame.js', '/scripts/shadowGuessScreen.js']),
    oidoJurasico: Object.freeze(['/scripts/oidoJurasicoAudioService.js', '/scripts/oidoJurasicoScreen.js']),
    parejas: Object.freeze(['/scripts/parejasScreen.js']),
    clasifica: Object.freeze(['/scripts/classifyGame.js', '/scripts/classifyTimer.js', '/scripts/classifyScreen.js']),
    ordenaPorTamano: Object.freeze(['/scripts/sizeOrderGame.js', '/scripts/sizeOrderScreen.js']),
    lineaDelTiempo: Object.freeze(['/scripts/timelineScreen.js']),
  });

  // Mirrors src/data/modeResourceManifest.js's MODES_WITH_CREATURE_CARTOON_ART exactly.
  var MODES_WITH_CREATURE_CARTOON_ART = Object.freeze([
    'quiz',
    'sombra',
    'parejas',
    'clasifica',
    'ordenaPorTamano',
    'lineaDelTiempo',
  ]);

  function dedupe(list) {
    return Array.from(new Set(list));
  }

  function creatureImagePaths(catalog, field) {
    return (catalog || [])
      .map(function (creature) {
        return creature && typeof creature[field] === 'string' ? IMAGE_BASE_PATH + creature[field] : null;
      })
      .filter(function (value) {
        return value !== null;
      });
  }

  /** Same declarative shape as src/data/modeResourceManifest.js's getModeManifest, built from the local mirror above plus a resolved catalog/dinosaurs list. */
  function buildManifest(modeId, catalog, dinosaurs) {
    if (!MODE_SPECIFIC_SCRIPTS[modeId]) {
      throw new Error('Unknown mode id "' + modeId + '"');
    }

    var scripts = SHARED_SCRIPTS.concat(MODE_SPECIFIC_SCRIPTS[modeId]);
    var images = SHARED_IMAGES.slice();
    var audio = SHARED_AUDIO.slice();
    var fallback = [];

    if (MODES_WITH_CREATURE_CARTOON_ART.indexOf(modeId) !== -1) {
      images = images.concat(creatureImagePaths(catalog, 'image'));
    }

    if (modeId === 'quiz') {
      images = images.concat(creatureImagePaths(catalog, 'imageRealistic'));
      fallback = dedupe(fallback.concat(creatureImagePaths(catalog, 'imageFallback')));
    }

    if (modeId === 'parejas') {
      images.push(IMAGE_BASE_PATH + 'cards/back.svg');
    }

    if (modeId === 'oidoJurasico') {
      audio = audio.concat(
        (dinosaurs || []).map(function (id) {
          return OIDO_JURASICO_SOUND_BASE_PATH + id + '.wav';
        }),
      );
    }

    if (modeId === 'lineaDelTiempo') {
      images = images.concat(TIMELINE_PERIOD_IMAGES);
    }

    return {
      modeId: modeId,
      scripts: dedupe(scripts),
      i18n: SHARED_I18N.slice(),
      images: dedupe(images),
      audio: dedupe(audio),
      fallback: dedupe(fallback),
    };
  }

  function flattenManifestUrls(manifest) {
    return [].concat(manifest.scripts, manifest.i18n, manifest.images, manifest.audio, manifest.fallback);
  }

  function resolveCachesApi(injected) {
    if (injected) {
      return injected;
    }
    return typeof caches !== 'undefined' ? caches : null;
  }

  /** Resolves a ready-to-use LogService instance, same dual pattern as public/scripts/roundDiagnosticsService.js's own resolveLogService. */
  function resolveLogService(options) {
    if (options.logService) {
      return options.logService;
    }
    var win = typeof window !== 'undefined' ? window : undefined;
    var LogServiceCtor =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.logging && win.DinoQuiz.services.logging.LogService) ||
      (typeof require === 'function' ? require('../../src/services/logging').LogService : undefined);

    if (typeof LogServiceCtor !== 'function') {
      return null;
    }
    try {
      return new LogServiceCtor();
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolves `{ catalog, dinosaurs }` for `modeId`'s manifest: explicit
   * `options.catalog`/`options.dinosaurs` (test injection) win outright;
   * otherwise reads public/data/creatures.json straight out of Cache
   * Storage via `cachesApi.match` -- never a network fetch -- so the
   * creature-derived portion of the manifest stays live without needing
   * Node's `fs`-based src/data/creatureCatalog.js. Resolves to an empty
   * catalog (never throws/rejects) when Cache Storage is unavailable or the
   * file isn't cached yet, same "degrade instead of crash" choice
   * validateModeResources itself makes when `caches` is missing.
   */
  function resolveCatalog(options, cachesApi) {
    if (options.catalog || options.dinosaurs) {
      var injectedCatalog = options.catalog || [];
      return Promise.resolve({
        catalog: injectedCatalog,
        dinosaurs:
          options.dinosaurs ||
          injectedCatalog
            .map(function (creature) {
              return creature && creature.id;
            })
            .filter(Boolean),
      });
    }
    if (!cachesApi || typeof cachesApi.match !== 'function') {
      return Promise.resolve({ catalog: [], dinosaurs: [] });
    }
    return Promise.resolve(cachesApi.match(CREATURES_JSON_URL))
      .then(function (response) {
        if (!response || typeof response.json !== 'function') {
          return { catalog: [], dinosaurs: [] };
        }
        return Promise.resolve(response.json()).then(function (catalog) {
          var list = Array.isArray(catalog) ? catalog : [];
          return {
            catalog: list,
            dinosaurs: list
              .map(function (creature) {
                return creature && creature.id;
              })
              .filter(Boolean),
          };
        });
      })
      .catch(function () {
        return { catalog: [], dinosaurs: [] };
      });
  }

  /**
   * Checks every resource this mirror declares for `modeId` against live
   * Cache Storage and resolves to the URLs `caches.match` could not find.
   * Same contract as src/services/modeResourceValidation.js's
   * `validateModeResources` -- see this file's own doc comment for why the
   * manifest is built differently here.
   */
  function validateModeResources(modeId, options) {
    options = options || {};
    var cachesApi = resolveCachesApi(options.caches);

    var manifestPromise = options.manifest
      ? Promise.resolve(options.manifest)
      : resolveCatalog(options, cachesApi).then(function (resolved) {
          return buildManifest(modeId, resolved.catalog, resolved.dinosaurs);
        });

    return manifestPromise.then(function (manifest) {
      var urls = flattenManifestUrls(manifest);

      if (!cachesApi || typeof cachesApi.match !== 'function') {
        return [];
      }

      return Promise.all(
        urls.map(function (url) {
          return Promise.resolve(cachesApi.match(url)).then(function (cached) {
            return cached ? null : url;
          });
        }),
      ).then(function (results) {
        var missing = results.filter(function (url) {
          return url !== null;
        });

        if (missing.length > 0) {
          var logService = resolveLogService(options);
          if (logService) {
            missing.forEach(function (url) {
              logService.logModeResourceMissing(modeId, url);
            });
          }
        }

        return missing;
      });
    });
  }

  var api = {
    validateModeResources: validateModeResources,
    SHARED_SCRIPTS: SHARED_SCRIPTS,
    SHARED_I18N: SHARED_I18N,
    SHARED_IMAGES: SHARED_IMAGES,
    SHARED_AUDIO: SHARED_AUDIO,
    MODE_SPECIFIC_SCRIPTS: MODE_SPECIFIC_SCRIPTS,
    MODES_WITH_CREATURE_CARTOON_ART: MODES_WITH_CREATURE_CARTOON_ART,
    TIMELINE_PERIOD_IMAGES: TIMELINE_PERIOD_IMAGES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.modeResourceValidation = api;
  }
})();
