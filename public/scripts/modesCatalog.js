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
 * Browser bridge (TRIOFSND-231): the illustrated mode selector
 * (public/scripts/modeSelectorScreen.js) is the first caller that needs this
 * evaluated live in the browser, so — following the same dual CommonJS/
 * `window.DinoQuiz` pattern as public/scripts/homeScreen.js — the
 * implementation now lives here instead of directly under `src/game/`; the
 * canonical `src/game/modesCatalog.js` re-exports this file so Node/Jest keep
 * a single source of truth. `buildCurrentResourceCatalog`'s question/creature
 * defaults are the only browser-specific bit: under Node/Jest they read the
 * full validated question bank (`src/data/questionBank`), while in the
 * no-bundler browser they read the already-fetched, already-prepared bank the
 * app shell stashes on `window.DinoQuiz.questions` (see main.js's
 * `bootstrapBrowserApp`), deriving the shipped creature roster from the
 * distinct `dinosaur` ids referenced there instead of requiring the
 * Node-only validation module.
 */

(function () {
  // Mode ids double as the segment right after `modes.` in every mode's
  // `i18nKeyPrefix` below, e.g. MODE_IDS.SOMBRA -> 'modes.sombra' -> the
  // `modes.sombra.*` keys in public/i18n/es.json.
  var MODE_IDS = Object.freeze({
    QUIZ: 'quiz',
    LABERINTO: 'laberinto',
    SOMBRA: 'sombra',
    OIDO_JURASICO: 'oidoJurasico',
    PAREJAS: 'parejas',
    CLASIFICA: 'clasifica',
    ORDENA_POR_TAMANO: 'ordenaPorTamano',
    LINEA_DEL_TIEMPO: 'lineaDelTiempo',
  });

  var REQUIREMENT_TYPES = Object.freeze({
    MIN_QUESTIONS: 'minQuestions',
    MIN_CREATURES: 'minCreatures',
    MIN_CREATURE_SOUNDS: 'minCreatureSounds',
    MIN_CREATURES_WITH_FIELD: 'minCreaturesWithField',
  });

  // Machine-readable cause codes returned for a blocked mode. The mode
  // selector maps these (plus the requirement's `details`) to i18n copy
  // (public/i18n/es.json's `modeSelector.blockedReasons`); this module never
  // emits user-facing text itself (all visible text must come from
  // public/i18n/, per the product's accessibility/i18n constraint).
  var AVAILABILITY_CAUSES = Object.freeze({
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
  var MODES_CATALOG = Object.freeze([
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
    return MODES_CATALOG.filter(function (mode) {
      return mode.id === modeId;
    })[0];
  }

  function evaluateMinQuestions(requirement, catalog) {
    var have = Number.isInteger(catalog.questionsCount) ? catalog.questionsCount : 0;
    if (have >= requirement.minCount) {
      return null;
    }
    return {
      cause: AVAILABILITY_CAUSES.INSUFFICIENT_QUESTIONS,
      details: { need: requirement.minCount, have: have },
    };
  }

  function evaluateMinCreatures(requirement, catalog) {
    var creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
    var eligible = requirement.requireVisuallyDifferentiable
      ? creatures.filter(function (creature) {
          return creature && creature.visuallyDifferentiable;
        })
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
    var creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
    var withSound = creatures.filter(function (creature) {
      return creature && creature.hasSound;
    });
    if (withSound.length >= requirement.minCount) {
      return null;
    }
    return {
      cause: AVAILABILITY_CAUSES.INSUFFICIENT_CREATURE_SOUNDS,
      details: { need: requirement.minCount, have: withSound.length },
    };
  }

  function evaluateMinCreaturesWithField(requirement, catalog) {
    var creatures = Array.isArray(catalog.creatures) ? catalog.creatures : [];
    var withField = creatures.filter(function (creature) {
      var value = creature ? creature[requirement.field] : undefined;
      return value !== undefined && value !== null && value !== '';
    });

    var missingCategories = Array.isArray(requirement.requireAllCategories)
      ? requirement.requireAllCategories.filter(function (category) {
          return !withField.some(function (creature) {
            return creature[requirement.field] === category;
          });
        })
      : [];

    if (withField.length >= requirement.minCount && missingCategories.length === 0) {
      return null;
    }

    var details = {
      field: requirement.field,
      need: requirement.minCount,
      have: withField.length,
    };
    if (missingCategories.length > 0) {
      details.missingCategories = missingCategories;
    }

    return {
      cause: AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD,
      details: details,
    };
  }

  var REQUIREMENT_EVALUATORS = {};
  REQUIREMENT_EVALUATORS[REQUIREMENT_TYPES.MIN_QUESTIONS] = evaluateMinQuestions;
  REQUIREMENT_EVALUATORS[REQUIREMENT_TYPES.MIN_CREATURES] = evaluateMinCreatures;
  REQUIREMENT_EVALUATORS[REQUIREMENT_TYPES.MIN_CREATURE_SOUNDS] = evaluateMinCreatureSounds;
  REQUIREMENT_EVALUATORS[REQUIREMENT_TYPES.MIN_CREATURES_WITH_FIELD] = evaluateMinCreaturesWithField;

  /**
   * Evaluates a single mode's declared requirements against `catalog`. Pure:
   * reads `mode`/`catalog`, never mutates them, and returns the same verdict
   * for the same inputs. Returns the first unmet requirement's cause/details
   * (a mode is blocked as soon as one requirement fails).
   */
  function evaluateModeAvailability(mode, catalog) {
    for (var i = 0; i < mode.requirements.length; i += 1) {
      var requirement = mode.requirements[i];
      var evaluate = REQUIREMENT_EVALUATORS[requirement.type];
      var failure = evaluate(requirement, catalog);
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
  function evaluateModes(catalog, modes) {
    return (modes || MODES_CATALOG).map(function (mode) {
      return evaluateModeAvailability(mode, catalog);
    });
  }

  function resolveQuestionBankModule() {
    if (typeof require === 'function') {
      return require('../../src/data/questionBank');
    }
    return null;
  }

  /**
   * Derives the currently-shipped question count/creature roster.
   *
   * Under Node/Jest, delegates to the full validated question bank
   * (`src/data/questionBank`). In the real no-bundler browser (no `require`),
   * reads the raw bank the app shell already fetched and stashed on
   * `window.DinoQuiz.questions` (see main.js's `bootstrapBrowserApp`) and
   * derives the distinct `dinosaur` ids referenced there — equivalent to
   * `VALID_DINOSAURS` for the data actually shipped, without re-running
   * Node-only validation in the browser.
   */
  function resolveDefaultQuestionsAndDinosaurs() {
    var questionBank = resolveQuestionBankModule();
    if (questionBank) {
      return { questions: questionBank.loadQuestionBank(), dinosaurs: questionBank.VALID_DINOSAURS };
    }

    var questions =
      (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.questions) || [];
    var seen = {};
    var dinosaurs = [];
    questions.forEach(function (question) {
      var dinosaur = question && question.dinosaur;
      if (dinosaur && !seen[dinosaur]) {
        seen[dinosaur] = true;
        dinosaurs.push(dinosaur);
      }
    });
    return { questions: questions, dinosaurs: dinosaurs };
  }

  /**
   * Builds a resource-catalog snapshot from the data DinoQuiz actually ships
   * today, for callers that just want "what's available right now" without
   * assembling their own catalog. Real per-creature metadata (visual
   * differentiation, sound, diet, size, era) lives in the still-to-come
   * creature sheet (PRD foundation "Ficha única y verificable para todas las
   * criaturas jugables"); until that lands, every shipped dinosaur is treated
   * as visually differentiable (each already has a distinct illustration) and
   * as missing the rest, so modes that need that metadata correctly report as
   * blocked instead of guessing.
   */
  function buildCurrentResourceCatalog(options) {
    options = options || {};
    var defaults = options.questions && options.dinosaurs ? null : resolveDefaultQuestionsAndDinosaurs();
    var questions = options.questions || (defaults && defaults.questions) || [];
    var dinosaurs = options.dinosaurs || (defaults && defaults.dinosaurs) || [];

    return {
      questionsCount: questions.length,
      creatures: dinosaurs.map(function (dinosaur) {
        return {
          id: dinosaur,
          visuallyDifferentiable: true,
          hasSound: false,
          diet: undefined,
          size: undefined,
          era: undefined,
        };
      }),
    };
  }

  var api = {
    MODE_IDS: MODE_IDS,
    REQUIREMENT_TYPES: REQUIREMENT_TYPES,
    AVAILABILITY_CAUSES: AVAILABILITY_CAUSES,
    MODES_CATALOG: MODES_CATALOG,
    getModeById: getModeById,
    evaluateModeAvailability: evaluateModeAvailability,
    evaluateModes: evaluateModes,
    buildCurrentResourceCatalog: buildCurrentResourceCatalog,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.modesCatalog = api;
  }
})();
