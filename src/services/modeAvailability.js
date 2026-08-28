'use strict';

/**
 * Correlates src/data/creatureCatalog.js's `validateCatalog()` failures with
 * a declared per-mode dependency on catalog ids, so a single broken ficha or
 * reference only blocks the mode(s) that actually read that id -- never the
 * rest of the eight modes (PRD foundation "Ficha única y verificable para
 * todas las criaturas jugables").
 *
 * Each mode's dependency declaration is `{ ids: string[] }`, the catalog ids
 * that mode reads. 'quiz' is seeded from questionBank's `VALID_DINOSAURS`
 * (every id `public/data/questions.json`'s `dinosaur` field references) --
 * the only mode wired to real gameplay data today; further modes add their
 * own entry to `MODE_CREATURE_DEPENDENCIES` as they land, each isolated the
 * same way.
 *
 * `evaluateModeAvailability()` reuses `validateCatalog()`'s own cause codes
 * (the `CATALOG_*_CAUSE` constants src/services/logging.js defines) as its
 * blocked-mode cause instead of inventing a parallel set. For a future
 * diagnostic screen (PRD "Diagnóstico y métricas agregadas almacenadas
 * únicamente en el dispositivo"), `countValidCreatures()` and
 * `getRecentCauseCodes()` expose only counts and cause codes -- never a
 * catalog id, a violated rule name or any free text -- mirroring how
 * `LogService#getModeBlockedLogs()` exposes `{ modeId, cause }` only.
 */

const { VALID_DINOSAURS } = require('../data/questionBank');

const MODE_IDS = Object.freeze({
  QUIZ: 'quiz',
});

const MODE_CREATURE_DEPENDENCIES = Object.freeze({
  [MODE_IDS.QUIZ]: Object.freeze({ ids: Object.freeze([...VALID_DINOSAURS]) }),
});

const DEFAULT_RECENT_CAUSES_LIMIT = 50;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeFailures(catalogFailures) {
  return Array.isArray(catalogFailures) ? catalogFailures : [];
}

/**
 * One `{ modeId, available, cause, blockedByIds }` per mode declared in
 * `modeDependencies` (defaults to `MODE_CREATURE_DEPENDENCIES`), evaluated
 * against `catalogFailures` (a `validateCatalog()` result). A mode with no
 * failing dependency is `available: true, cause: null, blockedByIds: []`; a
 * mode is blocked as soon as `catalogFailures` contains an entry whose `id`
 * is one it depends on, and `cause` is that failure's own cause code. A
 * failure for an id no mode depends on -- or a mode with an empty/no
 * declaration -- blocks nothing, so isolated fichas only ever affect their
 * dependents.
 */
function evaluateModeAvailability(catalogFailures, modeDependencies = MODE_CREATURE_DEPENDENCIES) {
  const failures = normalizeFailures(catalogFailures);

  return Object.keys(modeDependencies).map((modeId) => {
    const dependency = modeDependencies[modeId];
    const dependentIds = new Set(Array.isArray(dependency && dependency.ids) ? dependency.ids : []);
    const blockingFailures = failures.filter(
      (failure) => failure && isNonEmptyString(failure.id) && dependentIds.has(failure.id)
    );

    if (blockingFailures.length === 0) {
      return { modeId, available: true, cause: null, blockedByIds: [] };
    }

    return {
      modeId,
      available: false,
      cause: blockingFailures[0].cause,
      blockedByIds: [...new Set(blockingFailures.map((failure) => failure.id))],
    };
  });
}

/** The subset of `modeDependencies`' mode ids that `catalogFailures` blocks. */
function getBlockedModeIds(catalogFailures, modeDependencies) {
  return evaluateModeAvailability(catalogFailures, modeDependencies)
    .filter((verdict) => !verdict.available)
    .map((verdict) => verdict.modeId);
}

/**
 * Count of `creatures` entries with zero `validateCatalog()` violations --
 * for a diagnostic screen to show "how many fichas are usable right now"
 * without exposing which ones failed or why.
 */
function countValidCreatures(creatures, catalogFailures) {
  const total = Array.isArray(creatures) ? creatures.length : 0;
  const failedIds = new Set(
    normalizeFailures(catalogFailures)
      .filter((failure) => failure && isNonEmptyString(failure.id))
      .map((failure) => failure.id)
  );
  return Math.max(0, total - failedIds.size);
}

/**
 * The `cause` code of every entry in `catalogFailures`, most recent last and
 * capped at `limit` -- never the failing id or violated rule, only the
 * stable, machine-readable code already defined in src/services/logging.js.
 */
function getRecentCauseCodes(catalogFailures, limit = DEFAULT_RECENT_CAUSES_LIMIT) {
  return normalizeFailures(catalogFailures)
    .filter((failure) => failure && isNonEmptyString(failure.cause))
    .map((failure) => failure.cause)
    .slice(-limit);
}

module.exports = {
  MODE_IDS,
  MODE_CREATURE_DEPENDENCIES,
  evaluateModeAvailability,
  getBlockedModeIds,
  countValidCreatures,
  getRecentCauseCodes,
};
