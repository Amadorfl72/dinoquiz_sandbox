'use strict';

/**
 * Canonical catalog of the eight DinoQuiz game modes (TRIOFSND-228) and a
 * pure evaluator for which of them are currently playable.
 *
 * Each mode declares the resources it needs from the creature/asset catalog
 * (e.g. Sombras needs >=12 visually-differentiable creatures, Parejas needs
 * >=8) instead of hard-coding a boolean "enabled" flag. `evaluateModes()`
 * checks those declared requirements against a snapshot of the current data
 * and returns, per mode, available/blocked plus a machine-readable cause
 * code — evaluation is per-mode and side-effect-free, so a resource that is
 * missing for one mode (e.g. no diet metadata for Clasifica) never affects
 * the verdict for any other mode (e.g. Quiz stays available).
 *
 * The illustrated mode selector that will render this (PRD scope: "Selector
 * ilustrado de modos") is a separate, later piece of work; this module only
 * owns the catalog data and the availability logic behind it.
 */

const { VALID_DINOSAURS, loadQuestionBank } = require('../data/questionBank');

// Mode ids double as the segment right after `modes.` in every mode's
// `i18nKeyPrefix` below, e.g. MODE_IDS.SOMBRA -> 'modes.sombra' -> the
// `modes.sombra.*` keys in public/i18n/es.json.
const MODE_IDS = Object.freeze({
  QUIZ: 'quiz',
  LABERINTO: 'laberinto',
  SOMBRA: 'sombra',
  OIDO_JURASICO: 'oidoJurasico',
  PAREJAS: 'parejas',
  CLASIFICA: 'clasifica',
  ORDENA_POR_TAMANO: 'ordenaPorTamano',
  LINEA_DEL_TIEMPO: 'lineaDelTiempo',
});

const REQUIREMENT_TYPES = Object.freeze({
  MIN_QUESTIONS: 'minQuestions',
  MIN_CREATURES: 'minCreatures',
  MIN_CREATURE_SOUNDS: 'minCreatureSounds',
  MIN_CREATURES_WITH_FIELD: 'minCreaturesWithField',
});

// Machine-readable cause codes returned for a blocked mode. A future UI maps
// these (plus the requirement's `details`) to i18n copy; this module never
// emits user-facing text itself (all visible text must come from
// public/i18n/, per the product's accessibility/i18n constraint).
const AVAILABILITY_CAUSES = Object.freeze({
  INSUFFICIENT_QUESTIONS: 'insufficient_questions',
  INSUFFICIENT_CREATURES: 'insufficient_creatures',
  INSUFFICIENT_CREATURE_SOUNDS: 'insufficient_creature_sounds',
  MISSING_CREATURE_FIELD: 'missing_creature_field',
});

/**
 * The eight modes committed in the "Nuevos Modos de Juego" PRD, in the order
 * they should be offered. `requirements` is an array of declarative resource
 * checks (see REQUIREMENT_TYPES); a mode with no requirements is always
 * available. Requirements only ever *read* the resource catalog passed to
 * `evaluateModes()` — they never mutate it or depend on another mode.
 */
const MODES_CATALOG = Object.freeze([
  Object.freeze({
    id: MODE_IDS.QUIZ,
    i18nKeyPrefix: 'modes.quiz',
    requirements: Object.freeze([
      // The existing quiz: a game is 10 rounds, so at least 10 questions
      // must exist somewhere in the bank.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_QUESTIONS, minCount: 10 }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.LABERINTO,
    i18nKeyPrefix: 'modes.laberinto',
    requirements: Object.freeze([
      // No reading required (G3); needs enough distinct creatures that the
      // 10 rounds of a game don't repeat the same one back to back.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_CREATURES, minCount: 6 }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.SOMBRA,
    i18nKeyPrefix: 'modes.sombra',
    requirements: Object.freeze([
      // PRD example: Sombras needs >=12 visually-differentiable creatures
      // so silhouettes aren't ambiguous between two similar-shaped species.
      Object.freeze({
        type: REQUIREMENT_TYPES.MIN_CREATURES,
        minCount: 12,
        requireVisuallyDifferentiable: true,
      }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.OIDO_JURASICO,
    i18nKeyPrefix: 'modes.oidoJurasico',
    requirements: Object.freeze([
      // Sounds are explicitly presented as imagined (G4); needs enough
      // distinct creature sounds to fill a 10-round game without repeats.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_CREATURE_SOUNDS, minCount: 8 }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.PAREJAS,
    i18nKeyPrefix: 'modes.parejas',
    requirements: Object.freeze([
      // PRD example: Parejas needs >=8 creatures to build a memory board.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_CREATURES, minCount: 8 }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.CLASIFICA,
    i18nKeyPrefix: 'modes.clasifica',
    requirements: Object.freeze([
      // Needs verified diet metadata covering all three categories
      // (carnivoro/herbivoro/omnivoro) so a round is never unsolvable.
      Object.freeze({
        type: REQUIREMENT_TYPES.MIN_CREATURES_WITH_FIELD,
        field: 'diet',
        minCount: 6,
        requireAllCategories: Object.freeze(['carnivoro', 'herbivoro', 'omnivoro']),
      }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.ORDENA_POR_TAMANO,
    i18nKeyPrefix: 'modes.ordenaPorTamano',
    requirements: Object.freeze([
      // Needs verified size metadata for enough creatures to build a
      // meaningful ordering.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_CREATURES_WITH_FIELD, field: 'size', minCount: 4 }),
    ]),
  }),
  Object.freeze({
    id: MODE_IDS.LINEA_DEL_TIEMPO,
    i18nKeyPrefix: 'modes.lineaDelTiempo',
    requirements: Object.freeze([
      // Needs verified era/period metadata for enough creatures to build a
      // meaningful timeline.
      Object.freeze({ type: REQUIREMENT_TYPES.MIN_CREATURES_WITH_FIELD, field: 'era', minCount: 4 }),
    ]),
  }),
]);

function getModeById(modeId) {
  return MODES_CATALOG.find((mode) => mode.id === modeId);
}

function evaluateMinQuestions(requirement, catalog) {
  const have = Number.isInteger(catalog.questionsCount) ? catalog.questionsCount : 0;
  if (have >= requirement.minCount) {
    return null;
  }
  return {
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_QUESTIONS,
    details: { need: requirement.minCount, have },
  };
}

function evaluateMinCreatures(requirement, catalog) {
  const creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
  const eligible = requirement.requireVisuallyDifferentiable
    ? creatures.filter((creature) => creature && creature.visuallyDifferentiable)
    : creatures;
  if (eligible.length >= requirement.minCount) {
    return null;
  }
  return {
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES,
    details: { need: requirement.minCount, have: eligible.length },
  };
}

function evaluateMinCreatureSounds(requirement, catalog) {
  const creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
  const withSound = creatures.filter((creature) => creature && creature.hasSound);
  if (withSound.length >= requirement.minCount) {
    return null;
  }
  return {
    cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURE_SOUNDS,
    details: { need: requirement.minCount, have: withSound.length },
  };
}

function evaluateMinCreaturesWithField(requirement, catalog) {
  const creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
  const withField = creatures.filter((creature) => {
    const value = creature ? creature[requirement.field] : undefined;
    return value !== undefined && value !== null && value !== '';
  });

  const missingCategories = Array.isArray(requirement.requireAllCategories)
    ? requirement.requireAllCategories.filter(
        (category) => !withField.some((creature) => creature[requirement.field] === category)
      )
    : [];

  if (withField.length >= requirement.minCount && missingCategories.length === 0) {
    return null;
  }

  return {
    cause: AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD,
    details: {
      field: requirement.field,
      need: requirement.minCount,
      have: withField.length,
      ...(missingCategories.length > 0 ? { missingCategories } : {}),
    },
  };
}

const REQUIREMENT_EVALUATORS = Object.freeze({
  [REQUIREMENT_TYPES.MIN_QUESTIONS]: evaluateMinQuestions,
  [REQUIREMENT_TYPES.MIN_CREATURES]: evaluateMinCreatures,
  [REQUIREMENT_TYPES.MIN_CREATURE_SOUNDS]: evaluateMinCreatureSounds,
  [REQUIREMENT_TYPES.MIN_CREATURES_WITH_FIELD]: evaluateMinCreaturesWithField,
});

/**
 * Evaluates a single mode's declared requirements against `catalog`. Pure:
 * reads `mode`/`catalog`, never mutates them, and returns the same verdict
 * for the same inputs. Returns the first unmet requirement's cause/details
 * (a mode is blocked as soon as one requirement fails).
 */
function evaluateModeAvailability(mode, catalog) {
  for (const requirement of mode.requirements) {
    const evaluate = REQUIREMENT_EVALUATORS[requirement.type];
    const failure = evaluate(requirement, catalog);
    if (failure) {
      return { modeId: mode.id, available: false, cause: failure.cause, details: failure.details };
    }
  }
  return { modeId: mode.id, available: true, cause: null, details: null };
}

/**
 * Evaluates every mode in `modes` (defaults to the full MODES_CATALOG)
 * against `catalog` independently, so one mode missing a resource only
 * isolates that mode — every other mode is evaluated against the same
 * snapshot without being affected by a sibling's verdict.
 */
function evaluateModes(catalog, modes = MODES_CATALOG) {
  return modes.map((mode) => evaluateModeAvailability(mode, catalog));
}

/**
 * Builds a resource-catalog snapshot from the data DinoQuiz actually ships
 * today (the question bank's dinosaur roster), for callers that just want
 * "what's available right now" without assembling their own catalog. Real
 * per-creature metadata (visual differentiation, sound, diet, size, era)
 * lives in the still-to-come creature sheet (PRD foundation "Ficha única y
 * verificable para todas las criaturas jugables"); until that lands, every
 * shipped dinosaur is treated as visually differentiable (each already has
 * a distinct illustration) and as missing the rest, so modes that need that
 * metadata correctly report as blocked instead of guessing.
 */
function buildCurrentResourceCatalog(options = {}) {
  const questions = options.questions || loadQuestionBank();
  const dinosaurs = options.dinosaurs || VALID_DINOSAURS;

  return {
    questionsCount: questions.length,
    creatures: dinosaurs.map((dinosaur) => ({
      id: dinosaur,
      visuallyDifferentiable: true,
      hasSound: false,
      diet: undefined,
      size: undefined,
      era: undefined,
    })),
  };
}

module.exports = {
  MODE_IDS,
  REQUIREMENT_TYPES,
  AVAILABILITY_CAUSES,
  MODES_CATALOG,
  getModeById,
  evaluateModeAvailability,
  evaluateModes,
  buildCurrentResourceCatalog,
};
