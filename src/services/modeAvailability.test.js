'use strict';

const {
  MODE_IDS,
  MODE_CREATURE_DEPENDENCIES,
  evaluateModeAvailability,
  getBlockedModeIds,
  countValidCreatures,
  getRecentCauseCodes,
} = require('./modeAvailability');
const { VALID_DINOSAURS } = require('../data/questionBank');
const {
  CATALOG_FIELD_INVALID_CAUSE,
  CATALOG_REFERENCE_BROKEN_CAUSE,
  CATALOG_DUPLICATE_ID_CAUSE,
} = require('./logging');

describe('MODE_CREATURE_DEPENDENCIES', () => {
  test('quiz depends on every id used by questionBank', () => {
    expect(MODE_CREATURE_DEPENDENCIES[MODE_IDS.QUIZ].ids).toEqual(VALID_DINOSAURS);
  });
});

describe('evaluateModeAvailability', () => {
  test('every mode is available when there are no catalog failures', () => {
    const verdicts = evaluateModeAvailability([]);

    expect(verdicts).toEqual([{ modeId: MODE_IDS.QUIZ, available: true, cause: null, blockedByIds: [] }]);
  });

  test('a failure on an id a mode depends on blocks only that mode', () => {
    const otherMode = { ids: ['not-a-quiz-dependency'] };
    const modeDependencies = { [MODE_IDS.QUIZ]: MODE_CREATURE_DEPENDENCIES[MODE_IDS.QUIZ], otherMode };
    const failures = [{ id: 'trex', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE }];

    const verdicts = evaluateModeAvailability(failures, modeDependencies);

    expect(verdicts).toEqual([
      {
        modeId: MODE_IDS.QUIZ,
        available: false,
        cause: CATALOG_FIELD_INVALID_CAUSE,
        blockedByIds: ['trex'],
      },
      { modeId: 'otherMode', available: true, cause: null, blockedByIds: [] },
    ]);
  });

  test('a failure on an id no declared mode depends on blocks nothing', () => {
    const failures = [{ id: 'not-referenced-anywhere', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE }];

    const verdicts = evaluateModeAvailability(failures);

    expect(verdicts).toEqual([{ modeId: MODE_IDS.QUIZ, available: true, cause: null, blockedByIds: [] }]);
  });

  test('reports the reference-broken cause when that is the failing rule', () => {
    const failures = [{ id: 'triceratops', rule: 'nameKey', cause: CATALOG_REFERENCE_BROKEN_CAUSE }];

    const [quizVerdict] = evaluateModeAvailability(failures);

    expect(quizVerdict.available).toBe(false);
    expect(quizVerdict.cause).toBe(CATALOG_REFERENCE_BROKEN_CAUSE);
  });

  test('reports the duplicate-id cause when that is the failing rule', () => {
    const failures = [{ id: 'velociraptor', rule: 'id', cause: CATALOG_DUPLICATE_ID_CAUSE }];

    const [quizVerdict] = evaluateModeAvailability(failures);

    expect(quizVerdict.available).toBe(false);
    expect(quizVerdict.cause).toBe(CATALOG_DUPLICATE_ID_CAUSE);
  });

  test('aggregates every dependent id blocking a mode, not just the first', () => {
    const failures = [
      { id: 'trex', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE },
      { id: 'triceratops', rule: 'nameKey', cause: CATALOG_REFERENCE_BROKEN_CAUSE },
    ];

    const [quizVerdict] = evaluateModeAvailability(failures);

    expect(quizVerdict.available).toBe(false);
    expect(quizVerdict.blockedByIds.sort()).toEqual(['trex', 'triceratops'].sort());
  });

  test('non-array catalog failures are treated as no failures', () => {
    expect(evaluateModeAvailability(undefined)).toEqual([
      { modeId: MODE_IDS.QUIZ, available: true, cause: null, blockedByIds: [] },
    ]);
    expect(evaluateModeAvailability(null)).toEqual([
      { modeId: MODE_IDS.QUIZ, available: true, cause: null, blockedByIds: [] },
    ]);
  });
});

describe('getBlockedModeIds', () => {
  test('returns only the blocked mode ids, leaving unaffected modes out entirely', () => {
    const modeDependencies = {
      [MODE_IDS.QUIZ]: MODE_CREATURE_DEPENDENCIES[MODE_IDS.QUIZ],
      laberinto: { ids: ['pteranodon'] },
    };
    const failures = [{ id: 'trex', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE }];

    expect(getBlockedModeIds(failures, modeDependencies)).toEqual([MODE_IDS.QUIZ]);
  });

  test('returns an empty list when nothing is blocked', () => {
    expect(getBlockedModeIds([])).toEqual([]);
  });
});

describe('countValidCreatures', () => {
  test('counts every creature with zero violations', () => {
    const creatures = [{ id: 'trex' }, { id: 'triceratops' }, { id: 'velociraptor' }];
    const failures = [{ id: 'triceratops', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE }];

    expect(countValidCreatures(creatures, failures)).toBe(2);
  });

  test('does not double-discount a creature with more than one violation', () => {
    const creatures = [{ id: 'trex' }, { id: 'triceratops' }];
    const failures = [
      { id: 'triceratops', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE },
      { id: 'triceratops', rule: 'nameKey', cause: CATALOG_REFERENCE_BROKEN_CAUSE },
    ];

    expect(countValidCreatures(creatures, failures)).toBe(1);
  });

  test('returns the full count when there are no failures', () => {
    expect(countValidCreatures([{ id: 'trex' }, { id: 'triceratops' }], [])).toBe(2);
  });
});

describe('getRecentCauseCodes', () => {
  test('returns only cause codes, never ids or rule names', () => {
    const failures = [
      { id: 'trex', rule: 'habitat', cause: CATALOG_FIELD_INVALID_CAUSE },
      { id: 'triceratops', rule: 'nameKey', cause: CATALOG_REFERENCE_BROKEN_CAUSE },
    ];

    expect(getRecentCauseCodes(failures)).toEqual([CATALOG_FIELD_INVALID_CAUSE, CATALOG_REFERENCE_BROKEN_CAUSE]);
  });

  test('caps the result at the given limit, keeping the most recent last', () => {
    const failures = [
      { id: 'a', rule: 'x', cause: CATALOG_FIELD_INVALID_CAUSE },
      { id: 'b', rule: 'x', cause: CATALOG_REFERENCE_BROKEN_CAUSE },
      { id: 'c', rule: 'x', cause: CATALOG_DUPLICATE_ID_CAUSE },
    ];

    expect(getRecentCauseCodes(failures, 2)).toEqual([CATALOG_REFERENCE_BROKEN_CAUSE, CATALOG_DUPLICATE_ID_CAUSE]);
  });

  test('returns an empty list when there are no failures', () => {
    expect(getRecentCauseCodes([])).toEqual([]);
  });
});
