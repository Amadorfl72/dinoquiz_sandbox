'use strict';

const {
  MODE_IDS,
  REQUIREMENT_TYPES,
  AVAILABILITY_CAUSES,
  MODES_CATALOG,
  getModeById,
  evaluateModeAvailability,
  evaluateModes,
  buildCurrentResourceCatalog,
} = require('./modesCatalog');
const { getStrings } = require('../i18n');

function resolveI18nKey(strings, key) {
  return key
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), strings);
}

describe('MODES_CATALOG', () => {
  test('declares exactly the eight committed modes, each with a unique id', () => {
    expect(MODES_CATALOG).toHaveLength(8);
    const ids = MODES_CATALOG.map((mode) => mode.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual(Object.values(MODE_IDS));
  });

  test('every mode declares an i18n key prefix and at least one requirement', () => {
    MODES_CATALOG.forEach((mode) => {
      expect(typeof mode.i18nKeyPrefix).toBe('string');
      expect(mode.i18nKeyPrefix.length).toBeGreaterThan(0);
      expect(Array.isArray(mode.requirements)).toBe(true);
      expect(mode.requirements.length).toBeGreaterThan(0);
      mode.requirements.forEach((requirement) => {
        expect(Object.values(REQUIREMENT_TYPES)).toContain(requirement.type);
      });
    });
  });

  test('every mode i18nKeyPrefix resolves to a translated name and description', () => {
    const strings = getStrings('es');
    MODES_CATALOG.forEach((mode) => {
      const entry = resolveI18nKey(strings, mode.i18nKeyPrefix);
      expect(typeof entry).toBe('object');
      expect(typeof entry.name).toBe('string');
      expect(entry.name.trim()).not.toBe('');
      expect(typeof entry.description).toBe('string');
      expect(entry.description.trim()).not.toBe('');
    });
  });

  test('catalog entries are frozen so modes cannot be mutated at runtime', () => {
    expect(Object.isFrozen(MODES_CATALOG)).toBe(true);
    expect(Object.isFrozen(MODES_CATALOG[0])).toBe(true);
    expect(Object.isFrozen(MODES_CATALOG[0].requirements)).toBe(true);
  });

  test('getModeById finds a declared mode and returns undefined for an unknown id', () => {
    expect(getModeById(MODE_IDS.SOMBRA).id).toBe(MODE_IDS.SOMBRA);
    expect(getModeById('not-a-mode')).toBeUndefined();
  });
});

describe('evaluateModeAvailability', () => {
  test('a mode is available when every requirement is met', () => {
    const mode = getModeById(MODE_IDS.PAREJAS);
    const catalog = { questionsCount: 0, creatures: Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` })) };
    expect(evaluateModeAvailability(mode, catalog)).toEqual({
      modeId: MODE_IDS.PAREJAS,
      available: true,
      cause: null,
      details: null,
    });
  });

  test('minCreatures blocks with insufficient_creatures when the count falls short', () => {
    const mode = getModeById(MODE_IDS.PAREJAS);
    const catalog = { questionsCount: 0, creatures: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}` })) };
    const result = evaluateModeAvailability(mode, catalog);
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 8, have: 7 });
  });

  test('minCreatures with requireVisuallyDifferentiable only counts flagged creatures (Sombras)', () => {
    const mode = getModeById(MODE_IDS.SOMBRA);
    const creatures = [
      ...Array.from({ length: 12 }, (_, i) => ({ id: `visible-${i}`, visuallyDifferentiable: true })),
      { id: 'not-differentiable', visuallyDifferentiable: false },
    ];
    expect(evaluateModeAvailability(mode, { creatures }).available).toBe(true);

    const tooFew = creatures.filter((creature) => creature.visuallyDifferentiable).slice(0, 11);
    const result = evaluateModeAvailability(mode, { creatures: tooFew });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(result.details).toEqual({ need: 12, have: 11 });
  });

  test('minCreatureSounds blocks with insufficient_creature_sounds (Oído Jurásico)', () => {
    const mode = getModeById(MODE_IDS.OIDO_JURASICO);
    const creatures = [
      { id: 'a', hasSound: true },
      { id: 'b', hasSound: false },
    ];
    const result = evaluateModeAvailability(mode, { creatures });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURE_SOUNDS);
    expect(result.details).toEqual({ need: 8, have: 1 });
  });

  test('minCreaturesWithField blocks with missing_creature_field when count is short (Ordena por tamaño)', () => {
    const mode = getModeById(MODE_IDS.ORDENA_POR_TAMANO);
    const creatures = [{ id: 'a', size: 'grande' }, { id: 'b', size: 'pequeno' }];
    const result = evaluateModeAvailability(mode, { creatures });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD);
    expect(result.details).toEqual({ field: 'size', need: 4, have: 2 });
  });

  test('minCreaturesWithField also blocks when a required category is entirely missing (Clasifica)', () => {
    const mode = getModeById(MODE_IDS.CLASIFICA);
    const creatures = [
      { id: 'a', diet: 'carnivoro' },
      { id: 'b', diet: 'carnivoro' },
      { id: 'c', diet: 'herbivoro' },
      { id: 'd', diet: 'herbivoro' },
      { id: 'e', diet: 'herbivoro' },
      { id: 'f', diet: 'herbivoro' },
    ];
    const result = evaluateModeAvailability(mode, { creatures });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.MISSING_CREATURE_FIELD);
    expect(result.details.missingCategories).toEqual(['omnivoro']);
  });

  test('minQuestions blocks with insufficient_questions (Quiz)', () => {
    const mode = getModeById(MODE_IDS.QUIZ);
    const result = evaluateModeAvailability(mode, { questionsCount: 3, creatures: [] });
    expect(result.available).toBe(false);
    expect(result.cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_QUESTIONS);
    expect(result.details).toEqual({ need: 10, have: 3 });
  });

  test('is pure: never mutates the mode definition or the catalog it is given', () => {
    const mode = getModeById(MODE_IDS.PAREJAS);
    const catalog = { questionsCount: 0, creatures: [{ id: 'a' }] };
    const modeSnapshot = JSON.parse(JSON.stringify(mode));
    const catalogSnapshot = JSON.parse(JSON.stringify(catalog));

    evaluateModeAvailability(mode, catalog);

    expect(JSON.parse(JSON.stringify(mode))).toEqual(modeSnapshot);
    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalogSnapshot);
  });
});

describe('evaluateModes', () => {
  test('a resource missing for one mode only isolates that mode — every other mode keeps its own verdict', () => {
    // Enough creatures for Laberinto (6) and Parejas (8), not enough for
    // Sombras (12); no sound/diet/size/era data at all; plenty of questions.
    const catalog = {
      questionsCount: 150,
      creatures: Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, visuallyDifferentiable: true })),
    };

    const results = evaluateModes(catalog);
    const byId = Object.fromEntries(results.map((result) => [result.modeId, result]));

    expect(byId[MODE_IDS.QUIZ].available).toBe(true);
    expect(byId[MODE_IDS.LABERINTO].available).toBe(true);
    expect(byId[MODE_IDS.PAREJAS].available).toBe(true);

    expect(byId[MODE_IDS.SOMBRA].available).toBe(false);
    expect(byId[MODE_IDS.SOMBRA].cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES);
    expect(byId[MODE_IDS.OIDO_JURASICO].available).toBe(false);
    expect(byId[MODE_IDS.OIDO_JURASICO].cause).toBe(AVAILABILITY_CAUSES.INSUFFICIENT_CREATURE_SOUNDS);
    expect(byId[MODE_IDS.CLASIFICA].available).toBe(false);
    expect(byId[MODE_IDS.ORDENA_POR_TAMANO].available).toBe(false);
    expect(byId[MODE_IDS.LINEA_DEL_TIEMPO].available).toBe(false);

    expect(results).toHaveLength(8);
  });

  test('accepts a custom subset of modes without touching the full catalog', () => {
    const quiz = getModeById(MODE_IDS.QUIZ);
    const results = evaluateModes({ questionsCount: 20, creatures: [] }, [quiz]);
    expect(results).toEqual([{ modeId: MODE_IDS.QUIZ, available: true, cause: null, details: null }]);
  });
});

describe('buildCurrentResourceCatalog', () => {
  test('derives questionsCount and the creature roster from the real question bank by default', () => {
    const catalog = buildCurrentResourceCatalog();
    expect(catalog.questionsCount).toBeGreaterThan(0);
    expect(Array.isArray(catalog.creatures)).toBe(true);
    expect(catalog.creatures.length).toBeGreaterThan(0);
    catalog.creatures.forEach((creature) => {
      expect(typeof creature.id).toBe('string');
      expect(creature.visuallyDifferentiable).toBe(true);
      expect(creature.hasSound).toBe(false);
    });
  });

  test('accepts injected questions/dinosaurs so tests do not depend on the shipped bank size', () => {
    const catalog = buildCurrentResourceCatalog({
      questions: [{ id: 'q1' }, { id: 'q2' }],
      dinosaurs: ['trex', 'triceratops'],
    });
    expect(catalog.questionsCount).toBe(2);
    expect(catalog.creatures.map((creature) => creature.id)).toEqual(['trex', 'triceratops']);
  });

  test('feeding the current catalog through evaluateModes only unlocks modes with metadata that already exists', () => {
    const results = evaluateModes(buildCurrentResourceCatalog());
    const byId = Object.fromEntries(results.map((result) => [result.modeId, result]));

    // Quiz has 150 questions and Laberinto only needs 6 creatures: both available today.
    expect(byId[MODE_IDS.QUIZ].available).toBe(true);
    expect(byId[MODE_IDS.LABERINTO].available).toBe(true);

    // No creature has sound/diet/size/era metadata yet, so these stay blocked
    // without affecting Quiz/Laberinto above.
    expect(byId[MODE_IDS.OIDO_JURASICO].available).toBe(false);
    expect(byId[MODE_IDS.CLASIFICA].available).toBe(false);
    expect(byId[MODE_IDS.ORDENA_POR_TAMANO].available).toBe(false);
    expect(byId[MODE_IDS.LINEA_DEL_TIEMPO].available).toBe(false);
  });
});
