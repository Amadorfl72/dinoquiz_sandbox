'use strict';

/**
 * Launch-gate aggregation service (TRIOFSND-323).
 *
 * Every one of the ten gates below calls straight into a module that already
 * owns and tests the underlying rule -- creature-catalog shape
 * (creatureCatalog.js), per-mode unlock thresholds (creatureSheet.js,
 * modesCatalog.js), round generation (mazeGenerator.js, shadowGuessRound.js,
 * sizeOrderRoundGenerator.js, parejasGame.js), the precache/SW_VERSION
 * declaration (modeResourceManifest.js, public/service-worker.js), PWA
 * capability detection (platformSupport.js), WCAG contrast math
 * (theme/contrast.js) and the existing quiz's own validators
 * (questionBank.js, modeAvailability.js). This module never re-derives any
 * of those rules -- it only invokes each one once, per gate, and normalizes
 * the result into one shared `{ pass, ... }` shape so a caller (a future
 * diagnostics screen, CI, etc.) can read a single aggregated report instead
 * of importing and reconciling every module itself.
 */

const RAW_CREATURES = require('../../public/data/creatures.json');
const { validateCatalog: validateCreatureCatalog } = require('../data/creatureCatalog');
const {
  SHADOW_MODE_MIN_APPROVED,
  SIZE_ORDER_MODE_MIN_CREATURES,
  getApprovedShadowCreatures,
  getCreaturesWithVerifiedLength,
  isShadowModeUnlocked,
  isSizeOrderModeUnlocked,
} = require('../data/creatureSheet');
const questionBank = require('../data/questionBank');
const modeAvailability = require('./modeAvailability');
const { collectAllManifestUrls } = require('../data/modeResourceManifest');
const mazeGenerator = require('../game/mazeGenerator');
const shadowGuessRound = require('../game/shadowGuessRound');
const sizeOrderRoundGenerator = require('../game/sizeOrderRoundGenerator');
const parejasGame = require('../game/parejasGame');
const modesCatalog = require('../game/modesCatalog');
const { contrastRatio, meetsWcagAA } = require('../theme/contrast');
const { QUESTION_SCREEN_COLORS, QUESTION_OPTION_PALETTE } = require('../theme/questionScreenColors');
const { GLOBAL_CONTROLS_COLORS } = require('../theme/globalControlsColors');
const { HOME_SCREEN_COLORS } = require('../theme/homeScreenColors');
const { MUTE_TOGGLE_COLORS } = require('../theme/appShellColors');
const { SW_VERSION, PRECACHE_URLS } = require('../../public/service-worker.js');

const GATE_IDS = Object.freeze({
  FICHAS: 'fichas',
  GENERADORES: 'generadores',
  RESOLUBILIDAD: 'resolubilidad',
  SILUETAS: 'siluetas',
  TAMANOS: 'tamanos',
  REJILLAS: 'rejillas',
  PRECACHE: 'precache',
  OFFLINE: 'offline',
  ACCESIBILIDAD: 'accesibilidad',
  REGRESION_QUIZ: 'regresionQuiz',
});

// A deterministic seed so `evaluateLaunchGates()` never flakes between runs.
const SAMPLE_SEED = 'launch-gate';

function evaluateFichasGate(creatures) {
  const failures = validateCreatureCatalog(creatures);
  return { pass: failures.length === 0, failureCount: failures.length, failures };
}

/** Runs one sample round through each mode's generator, reusing exactly the same entry points the real games call. */
function evaluateGeneradoresGate() {
  const generators = {};

  try {
    const maze = mazeGenerator.generateMaze({ seed: SAMPLE_SEED, level: mazeGenerator.MIN_LEVEL });
    generators.laberinto = maze.error
      ? { pass: false, details: maze }
      : { pass: true, details: { width: maze.width, height: maze.height } };
  } catch (error) {
    generators.laberinto = { pass: false, details: { error: error.message } };
  }

  try {
    const round = shadowGuessRound.generateShadowRound({ roundIndex: 0, level: 1 });
    generators.siluetas = round.error
      ? { pass: false, details: round }
      : { pass: true, details: { correctId: round.correctId } };
  } catch (error) {
    generators.siluetas = { pass: false, details: { error: error.message } };
  }

  try {
    const round = sizeOrderRoundGenerator.generateSizeOrderRound({ seed: SAMPLE_SEED });
    generators.tamanos = round.error
      ? { pass: false, details: round }
      : { pass: true, details: { correctOrder: round.correctOrder } };
  } catch (error) {
    generators.tamanos = { pass: false, details: { error: error.message } };
  }

  try {
    const round = parejasGame.startRound({ roundIndex: 0, level: 1, seed: SAMPLE_SEED });
    generators.rejillas = { pass: round.cards.length > 0, details: { pairCount: round.pairCount, columns: round.columns } };
  } catch (error) {
    generators.rejillas = { pass: false, details: { error: error.message } };
  }

  return { pass: Object.values(generators).every((generator) => generator.pass), generators };
}

/** Re-runs `mazeGenerator`'s own BFS solvability check across a low/mid/high level spread, so the gate isn't limited to a single sample. */
function evaluateResolubilidadGate() {
  const midLevel = Math.round((mazeGenerator.MIN_LEVEL + mazeGenerator.MAX_LEVEL) / 2);
  const checks = [mazeGenerator.MIN_LEVEL, midLevel, mazeGenerator.MAX_LEVEL].map((level) => {
    const maze = mazeGenerator.generateMaze({ seed: `${SAMPLE_SEED}-${level}`, level });
    return { level, solvable: !maze.error && mazeGenerator.isMazeSolvable(maze) };
  });
  return { pass: checks.every((check) => check.solvable), checks };
}

function evaluateSiluetasGate() {
  return {
    pass: isShadowModeUnlocked(),
    threshold: SHADOW_MODE_MIN_APPROVED,
    count: getApprovedShadowCreatures().length,
  };
}

function evaluateTamanosGate() {
  return {
    pass: isSizeOrderModeUnlocked(),
    threshold: SIZE_ORDER_MODE_MIN_CREATURES,
    count: getCreaturesWithVerifiedLength().length,
  };
}

function minCreaturesThreshold(modeId) {
  const mode = modesCatalog.getModeById(modeId);
  const requirement = (mode ? mode.requirements : []).find(
    (candidate) => candidate.type === modesCatalog.REQUIREMENT_TYPES.MIN_CREATURES
  );
  return requirement ? requirement.minCount : undefined;
}

function evaluateRejillasGate() {
  const verdict = parejasGame.validateCatalog();
  return {
    pass: verdict.available,
    threshold: minCreaturesThreshold(modesCatalog.MODE_IDS.PAREJAS),
    count: parejasGame.eligibleCardCreatureIds(questionBank.VALID_DINOSAURS).length,
    cause: verdict.cause,
  };
}

/** SW_VERSION/PRECACHE_URLS structural sanity -- versioned and non-empty (PRD: "cada modificación del precache debe incrementar SW_VERSION"). */
function evaluatePrecacheGate() {
  const hasUrls = Array.isArray(PRECACHE_URLS) && PRECACHE_URLS.length > 0;
  return {
    pass: hasUrls && /^v\d+$/.test(SW_VERSION),
    swVersion: SW_VERSION,
    precacheCount: PRECACHE_URLS.length,
  };
}

/** Every resource the eight modes' manifests declare is actually precached -- the data-level guarantee that the PRD's "funcionar completamente sin conexión" requires. */
function evaluateOfflineGate() {
  const requiredUrls = collectAllManifestUrls();
  const precached = new Set(PRECACHE_URLS);
  const missing = requiredUrls.filter((url) => !precached.has(url));
  return { pass: missing.length === 0, requiredCount: requiredUrls.length, missing };
}

function collectColorPairs() {
  const pairs = [];
  Object.keys(QUESTION_SCREEN_COLORS).forEach((key) => {
    const { background, text } = QUESTION_SCREEN_COLORS[key];
    pairs.push({ source: `questionScreen.${key}`, background, foreground: text });
  });
  QUESTION_OPTION_PALETTE.forEach((entry, index) => {
    pairs.push({ source: `questionScreen.optionPalette[${index}]`, background: entry.background, foreground: entry.text });
  });
  Object.keys(GLOBAL_CONTROLS_COLORS).forEach((key) => {
    const { background, text } = GLOBAL_CONTROLS_COLORS[key];
    pairs.push({ source: `globalControls.${key}`, background, foreground: text });
  });
  Object.keys(HOME_SCREEN_COLORS).forEach((key) => {
    const { background, text } = HOME_SCREEN_COLORS[key];
    pairs.push({ source: `homeScreen.${key}`, background, foreground: text });
  });
  Object.keys(MUTE_TOGGLE_COLORS).forEach((key) => {
    const { background, icon } = MUTE_TOGGLE_COLORS[key];
    pairs.push({ source: `appShell.muteToggle.${key}`, background, foreground: icon });
  });
  return pairs;
}

function evaluateAccesibilidadGate() {
  const evaluated = collectColorPairs().map((pair) => {
    const ratio = contrastRatio(pair.background, pair.foreground);
    return { ...pair, ratio, pass: meetsWcagAA(ratio) };
  });
  return {
    pass: evaluated.every((entry) => entry.pass),
    checkedCount: evaluated.length,
    failures: evaluated.filter((entry) => !entry.pass),
  };
}

function evaluateRegresionQuizGate(catalogFailures) {
  let questionCount = 0;
  let loadError = null;
  try {
    questionCount = questionBank.loadQuestionBank().length;
  } catch (error) {
    loadError = error.message;
  }

  const quizAvailability = modeAvailability
    .evaluateModeAvailability(catalogFailures)
    .find((verdict) => verdict.modeId === modeAvailability.MODE_IDS.QUIZ);

  return {
    pass: loadError === null && Boolean(quizAvailability && quizAvailability.available),
    questionCount,
    loadError,
    quizAvailability,
  };
}

/**
 * Runs every launch gate and returns `{ pass, gates }`, where `gates` has
 * one entry per `GATE_IDS` value and `pass` is `true` only when every gate
 * passes. `options.creatures` overrides the creature catalog fed to the
 * fichas/regresionQuiz gates (defaults to `public/data/creatures.json`).
 */
function evaluateLaunchGates(options = {}) {
  const creatures = options.creatures || RAW_CREATURES;
  const catalogFailures = validateCreatureCatalog(creatures);

  const gates = {
    [GATE_IDS.FICHAS]: evaluateFichasGate(creatures),
    [GATE_IDS.GENERADORES]: evaluateGeneradoresGate(),
    [GATE_IDS.RESOLUBILIDAD]: evaluateResolubilidadGate(),
    [GATE_IDS.SILUETAS]: evaluateSiluetasGate(),
    [GATE_IDS.TAMANOS]: evaluateTamanosGate(),
    [GATE_IDS.REJILLAS]: evaluateRejillasGate(),
    [GATE_IDS.PRECACHE]: evaluatePrecacheGate(),
    [GATE_IDS.OFFLINE]: evaluateOfflineGate(),
    [GATE_IDS.ACCESIBILIDAD]: evaluateAccesibilidadGate(),
    [GATE_IDS.REGRESION_QUIZ]: evaluateRegresionQuizGate(catalogFailures),
  };

  return { pass: Object.values(gates).every((gate) => gate.pass), gates };
}

module.exports = {
  GATE_IDS,
  evaluateLaunchGates,
};
