'use strict';

/**
 * Declares, per game mode, every script/i18n/image/audio/fallback resource it
 * needs to run fully offline (PRD "Nuevos Modos de Juego" constraint: "Todo
 * recurso nuevo debe añadirse a PRECACHE_URLS y cada cambio de caché debe
 * incrementar SW_VERSION").
 *
 * This module is the single declarative source of "what does mode X need" --
 * `public/service-worker.js`'s PRECACHE_URLS is checked against it (see this
 * module's test), one entry per resource ("un recurso, una entrada en
 * PRECACHE_URLS"), instead of PRECACHE_URLS being the only place a new mode's
 * dependencies are ever written down.
 *
 * Creature-derived resources (cartoon/realistic/fallback art, per-creature
 * "imagined" sound) are computed from the same catalogs the modes themselves
 * read at runtime (`./creatureCatalog`, `./questionBank`) instead of a second
 * hardcoded creature list, so this manifest can never drift from what the
 * modes actually ship.
 */

const { loadCreatureCatalog } = require('./creatureCatalog');
const { VALID_DINOSAURS } = require('./questionBank');
const { MODE_IDS } = require('../game/modesCatalog');

const IMAGE_BASE_PATH = '/assets/images/';
const OIDO_JURASICO_SOUND_BASE_PATH = '/assets/sounds/oido-jurasico/';

// Línea del tiempo period-selection illustrations (TRIOFSND-295): decorative
// icons for the three eras the player picks from before each round (see
// public/assets/images/periods/CREDITS.md). Static per-period assets, not
// derived from the creature catalog like MODES_WITH_CREATURE_CARTOON_ART.
const TIMELINE_PERIOD_IMAGES = Object.freeze([
  `${IMAGE_BASE_PATH}periods/triasico.svg`,
  `${IMAGE_BASE_PATH}periods/jurasico.svg`,
  `${IMAGE_BASE_PATH}periods/cretacico.svg`,
]);

// Loaded by every mode via public/index.html's app-shell/common-flow scripts
// (home, age gate, privacy, feedback, scoring, mode selector/progression,
// results, main). A mode-specific screen never duplicates these.
const SHARED_SCRIPTS = Object.freeze([
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

// Every mode's copy (including its own selector illustration and the
// modeSelector's blocked-reason strings) lives in this single locale bundle
// -- v1 ships only 'es' (src/i18n/index.js's SUPPORTED_LOCALES).
const SHARED_I18N = Object.freeze(['/i18n/es.json']);

// Mascot (home screen) + the eight mode-selector illustrations + the app
// icon: shown before a player has even picked a mode, so every mode depends
// on them being precached.
const SHARED_IMAGES = Object.freeze([
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

// Correct/incorrect/neutral-fail feedback sfx (TRIOFSND-78): played by the
// shared feedbackComponent.js after every round in every mode.
const SHARED_AUDIO = Object.freeze([
  '/assets/sounds/correct.wav',
  '/assets/sounds/incorrect.wav',
  '/assets/sounds/fail-neutral.wav',
]);

// public/scripts/<mode-specific screen/game files>.js -- everything NOT
// already covered by SHARED_SCRIPTS above, grouped by the mode that loads it
// (see public/index.html's <script> graph).
const MODE_SPECIFIC_SCRIPTS = Object.freeze({
  [MODE_IDS.QUIZ]: Object.freeze(['/scripts/questionScreen.js']),
  [MODE_IDS.LABERINTO]: Object.freeze([
    '/scripts/mazeGenerator.js',
    '/scripts/mazeGame.js',
    '/scripts/mazeScreen.js',
  ]),
  [MODE_IDS.SOMBRA]: Object.freeze(['/scripts/shadowGuessGame.js', '/scripts/shadowGuessScreen.js']),
  [MODE_IDS.OIDO_JURASICO]: Object.freeze([
    '/scripts/oidoJurasicoAudioService.js',
    '/scripts/oidoJurasicoScreen.js',
  ]),
  [MODE_IDS.PAREJAS]: Object.freeze(['/scripts/parejasScreen.js']),
  [MODE_IDS.CLASIFICA]: Object.freeze([
    '/scripts/classifyGame.js',
    '/scripts/classifyTimer.js',
    '/scripts/classifyScreen.js',
  ]),
  [MODE_IDS.ORDENA_POR_TAMANO]: Object.freeze(['/scripts/sizeOrderGame.js', '/scripts/sizeOrderScreen.js']),
  [MODE_IDS.LINEA_DEL_TIEMPO]: Object.freeze(['/scripts/timelineScreen.js']),
});

// Modes that render a creature's cartoon illustration
// (IMAGE_BASE_PATH + creature.image, e.g. shadowGuessScreen.js:267,
// parejasScreen.js:253, classifyScreen.js:250, sizeOrderScreen.js:486,
// timelineScreen.js:330). Laberinto (text/DOM maze board, no <img>) and Oído
// Jurásico (audio-only) render no creature art at all.
const MODES_WITH_CREATURE_CARTOON_ART = Object.freeze([
  MODE_IDS.QUIZ,
  MODE_IDS.SOMBRA,
  MODE_IDS.PAREJAS,
  MODE_IDS.CLASIFICA,
  MODE_IDS.ORDENA_POR_TAMANO,
  MODE_IDS.LINEA_DEL_TIEMPO,
]);

function dedupe(list) {
  return Array.from(new Set(list));
}

function creatureImagePaths(catalog, field) {
  return catalog
    .map((creature) => (creature && typeof creature[field] === 'string' ? IMAGE_BASE_PATH + creature[field] : null))
    .filter((value) => value !== null);
}

/**
 * Builds the resource manifest for a single mode: SHARED_* plus whatever
 * that mode alone needs (its screen/game scripts, and -- only where the mode
 * actually renders them -- creature art, the realistic/fallback image
 * variants, the Parejas card back, or the Oído Jurásico creature sounds).
 *
 * `options.catalog`/`options.dinosaurs` let callers (e.g. this module's
 * tests) inject a fixture catalog instead of loading/validating the real
 * `public/data/creatures.json` on every call.
 */
function getModeManifest(modeId, options = {}) {
  if (!MODE_SPECIFIC_SCRIPTS[modeId]) {
    throw new Error(`Unknown mode id "${modeId}"`);
  }

  const catalog = options.catalog || loadCreatureCatalog();
  const dinosaurs = options.dinosaurs || VALID_DINOSAURS;

  const scripts = [...SHARED_SCRIPTS, ...MODE_SPECIFIC_SCRIPTS[modeId]];
  const i18n = [...SHARED_I18N];
  const images = [...SHARED_IMAGES];
  const audio = [...SHARED_AUDIO];
  const fallback = [];

  if (MODES_WITH_CREATURE_CARTOON_ART.includes(modeId)) {
    images.push(...creatureImagePaths(catalog, 'image'));
  }

  if (modeId === MODE_IDS.QUIZ) {
    // Only Quiz offers the realistic/cartoon toggle (imageStyleService.js);
    // the realistic variant's local fallback is only ever needed there too.
    images.push(...creatureImagePaths(catalog, 'imageRealistic'));
    fallback.push(...dedupe(creatureImagePaths(catalog, 'imageFallback')));
  }

  if (modeId === MODE_IDS.PAREJAS) {
    images.push(`${IMAGE_BASE_PATH}cards/back.svg`);
  }

  if (modeId === MODE_IDS.OIDO_JURASICO) {
    audio.push(...dinosaurs.map((id) => `${OIDO_JURASICO_SOUND_BASE_PATH}${id}.wav`));
  }

  if (modeId === MODE_IDS.LINEA_DEL_TIEMPO) {
    images.push(...TIMELINE_PERIOD_IMAGES);
  }

  return {
    modeId,
    scripts: dedupe(scripts),
    i18n: dedupe(i18n),
    images: dedupe(images),
    audio: dedupe(audio),
    fallback: dedupe(fallback),
  };
}

/** `getModeManifest()` for every mode in `MODE_IDS`, in catalog order. */
function getAllModeManifests(options = {}) {
  return Object.values(MODE_IDS).map((modeId) => getModeManifest(modeId, options));
}

/**
 * Flattens every mode's manifest into one deduplicated, sorted list of
 * public URLs -- the set `public/service-worker.js`'s PRECACHE_URLS must be
 * a superset of, per the "un recurso, una entrada en PRECACHE_URLS" rule.
 */
function collectAllManifestUrls(options = {}) {
  const urls = getAllModeManifests(options).flatMap((manifest) => [
    ...manifest.scripts,
    ...manifest.i18n,
    ...manifest.images,
    ...manifest.audio,
    ...manifest.fallback,
  ]);
  return dedupe(urls).sort();
}

module.exports = {
  MODE_IDS,
  SHARED_SCRIPTS,
  SHARED_I18N,
  SHARED_IMAGES,
  SHARED_AUDIO,
  MODE_SPECIFIC_SCRIPTS,
  MODES_WITH_CREATURE_CARTOON_ART,
  TIMELINE_PERIOD_IMAGES,
  getModeManifest,
  getAllModeManifests,
  collectAllManifestUrls,
};
