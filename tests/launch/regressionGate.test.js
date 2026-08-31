'use strict';

/**
 * Gate final de regresión y defectos conocidos (TRIOFSND-328).
 *
 * Certifies the "Nuevos Modos de Juego" initiative as complete only when
 * every one of these holds simultaneously:
 *  1. los ocho modos están habilitados (real, per-player availability -- not
 *     the generic placeholder catalog, see `evaluateRealModeAvailability`);
 *  2. the quiz regression suite (src/services/launchGate.js's `regresionQuiz`
 *     gate) gives zero failures;
 *  3. no critical/high defect is open in a PRD risk area
 *     (src/data/knownIssues.js);
 *  4. every PRD product goal is signed off approved
 *     (src/services/productGoals.js).
 *
 * This file never re-derives any of those rules -- it only reads each
 * module's own result and combines them, the same "aggregate, never
 * re-implement" contract src/services/launchGate.js documents for its own
 * ten gates. Missing any single one of the four blocks the whole
 * certification (`evaluateRegressionGate().complete`), matching how
 * `evaluateLaunchGates().pass` already requires every one of its ten gates.
 */

const { GATE_IDS, evaluateLaunchGates } = require('../../src/services/launchGate');
const { GOAL_IDS, GOAL_STATUS, approve, getAllGoals } = require('../../src/services/productGoals');
const { SEVERITY, RISK_AREAS, KNOWN_ISSUES, getBlockingIssuesInAreas } = require('../../src/data/knownIssues');
const modesCatalog = require('../../src/game/modesCatalog');
const { isShadowModeUnlocked, isClassifyModeUnlocked, isSizeOrderModeUnlocked } = require('../../src/data/creatureSheet');

const ALL_RISK_AREAS = Object.values(RISK_AREAS);

function makeStorage() {
  const store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
}

function approveAllGoals(storage) {
  approve(GOAL_IDS.DISTRIBUCION_POR_MODO, 0.5, storage);
  approve(GOAL_IDS.FINALIZACION, 0.6, storage);
  approve(GOAL_IDS.RETENCION_7_DIAS, 0.3, storage);
  return storage;
}

/**
 * The real, per-player availability of each of the eight modes -- mirrors
 * public/scripts/main.js's `evaluateModesWithShadowOverride`, the function
 * actually wired into the shipped mode selector (`renderModeSelector`'s
 * `evaluateModes` option): modesCatalog's generic evaluator still checks
 * Sombra/Clasifica/Ordena por tamaño against
 * `buildCurrentResourceCatalog()`'s placeholder (no real diet/size
 * metadata), so those three verdicts are replaced with the real, verified
 * src/data/creatureSheet.js check, exactly like the shipped app does. Oído
 * Jurásico and Línea del tiempo are deliberately left as-is: the shipped app
 * has no equivalent override for them either (see knownIssues.js's
 * DINOQUIZ-KI-01), so this gate must report what a real player actually
 * sees today, not a hypothetical fixed version.
 */
function evaluateRealModeAvailability() {
  const generic = modesCatalog.evaluateModes(modesCatalog.buildCurrentResourceCatalog());
  return generic.map((verdict) => {
    if (verdict.modeId === modesCatalog.MODE_IDS.SOMBRA) {
      return { ...verdict, available: isShadowModeUnlocked() };
    }
    if (verdict.modeId === modesCatalog.MODE_IDS.CLASIFICA) {
      return { ...verdict, available: isClassifyModeUnlocked() };
    }
    if (verdict.modeId === modesCatalog.MODE_IDS.ORDENA_POR_TAMANO) {
      return { ...verdict, available: isSizeOrderModeUnlocked() };
    }
    return verdict;
  });
}

/**
 * Combines the four certifications into one verdict. Every option overrides
 * one module's real result with a caller-supplied value so tests can prove
 * the "missing any single one blocks it" contract without needing to fake
 * the whole app's state at once.
 */
function evaluateRegressionGate(options = {}) {
  const launchGateResult = options.launchGateResult || evaluateLaunchGates();
  const modeVerdicts = options.modeVerdicts || evaluateRealModeAvailability();
  const blockingIssues = getBlockingIssuesInAreas(ALL_RISK_AREAS, options.knownIssues);
  const goals = getAllGoals(options.goalsStorage);

  const checks = {
    eightModesEnabled: modeVerdicts.length === 8 && modeVerdicts.every((verdict) => verdict.available),
    quizRegressionClean: launchGateResult.gates[GATE_IDS.REGRESION_QUIZ].pass,
    noBlockingKnownIssues: blockingIssues.length === 0,
    goalsApproved: Object.values(GOAL_IDS).every((goalId) => goals[goalId].status === GOAL_STATUS.APROBADO),
  };

  return { complete: Object.values(checks).every(Boolean), checks, modeVerdicts, blockingIssues };
}

describe('eight modes -- real, per-player availability', () => {
  let modeVerdicts;

  beforeAll(() => {
    modeVerdicts = evaluateRealModeAvailability();
  });

  test('evaluates exactly the eight committed modes', () => {
    expect(modeVerdicts).toHaveLength(8);
    expect(modeVerdicts.map((verdict) => verdict.modeId).sort()).toEqual([...Object.values(modesCatalog.MODE_IDS)].sort());
  });

  test('quiz, laberinto, sombra, parejas, clasifica and ordena por tamaño are available today', () => {
    const byId = Object.fromEntries(modeVerdicts.map((verdict) => [verdict.modeId, verdict]));
    expect(byId[modesCatalog.MODE_IDS.QUIZ].available).toBe(true);
    expect(byId[modesCatalog.MODE_IDS.LABERINTO].available).toBe(true);
    expect(byId[modesCatalog.MODE_IDS.SOMBRA].available).toBe(true);
    expect(byId[modesCatalog.MODE_IDS.PAREJAS].available).toBe(true);
    expect(byId[modesCatalog.MODE_IDS.CLASIFICA].available).toBe(true);
    expect(byId[modesCatalog.MODE_IDS.ORDENA_POR_TAMANO].available).toBe(true);
  });

  test('oído jurásico and línea del tiempo are still blocked (DINOQUIZ-KI-01), so not all eight are enabled yet', () => {
    const byId = Object.fromEntries(modeVerdicts.map((verdict) => [verdict.modeId, verdict]));
    expect(byId[modesCatalog.MODE_IDS.OIDO_JURASICO].available).toBe(false);
    expect(byId[modesCatalog.MODE_IDS.LINEA_DEL_TIEMPO].available).toBe(false);
    expect(modeVerdicts.every((verdict) => verdict.available)).toBe(false);
  });
});

describe('quiz regression suite -- zero failures', () => {
  test('launchGate.js\'s regresionQuiz gate passes: the pre-existing quiz still loads and stays available', () => {
    const result = evaluateLaunchGates();
    expect(result.gates[GATE_IDS.REGRESION_QUIZ].pass).toBe(true);
    expect(result.gates[GATE_IDS.REGRESION_QUIZ].loadError).toBeNull();
    expect(result.gates[GATE_IDS.REGRESION_QUIZ].quizAvailability.available).toBe(true);
  });
});

describe('known issues -- no open critical/high defect in a risk area', () => {
  test('RISK_AREAS covers exactly the five PRD risk areas', () => {
    expect(ALL_RISK_AREAS.sort()).toEqual(
      ['datosEducativos', 'bloqueo', 'offline', 'accesibilidad', 'perdidaProgreso'].sort()
    );
  });

  test('the real registry currently has one open high-severity defect (DINOQUIZ-KI-01, área bloqueo)', () => {
    const blocking = getBlockingIssuesInAreas(ALL_RISK_AREAS);
    expect(blocking.map((issue) => issue.id)).toEqual(['DINOQUIZ-KI-01']);
    expect(blocking[0].severity).toBe(SEVERITY.HIGH);
    expect(blocking[0].area).toBe(RISK_AREAS.BLOQUEO);
  });

  test('a medium/low defect never blocks the gate', () => {
    const lowSeverityOnly = [{ id: 'x', severity: SEVERITY.LOW, area: RISK_AREAS.OFFLINE }];
    expect(getBlockingIssuesInAreas(ALL_RISK_AREAS, lowSeverityOnly)).toEqual([]);
  });

  test('a critical/high defect outside the five risk areas does not block this gate', () => {
    const outOfScope = [{ id: 'y', severity: SEVERITY.CRITICAL, area: 'monetizacion' }];
    expect(getBlockingIssuesInAreas(ALL_RISK_AREAS, outOfScope)).toEqual([]);
  });

  test('once fixed (removed from the registry), the gate no longer reports a blocking defect', () => {
    expect(getBlockingIssuesInAreas(ALL_RISK_AREAS, [])).toEqual([]);
  });
});

describe('product goals -- approval sign-off', () => {
  test('an unrecorded/unapproved storage blocks the gate', () => {
    const storage = makeStorage();
    const goals = getAllGoals(storage);
    expect(Object.values(GOAL_IDS).every((goalId) => goals[goalId].status === GOAL_STATUS.APROBADO)).toBe(false);
  });

  test('approving all three PRD goals unblocks it', () => {
    const storage = approveAllGoals(makeStorage());
    const goals = getAllGoals(storage);
    expect(Object.values(GOAL_IDS).every((goalId) => goals[goalId].status === GOAL_STATUS.APROBADO)).toBe(true);
  });
});

describe('evaluateRegressionGate -- certifies the initiative complete only when nothing is missing', () => {
  test('today, with the real code and an unapproved goals store, the initiative is correctly blocked', () => {
    const result = evaluateRegressionGate({ goalsStorage: makeStorage() });

    expect(result.checks.eightModesEnabled).toBe(false);
    expect(result.checks.quizRegressionClean).toBe(true);
    expect(result.checks.noBlockingKnownIssues).toBe(false);
    expect(result.checks.goalsApproved).toBe(false);
    expect(result.complete).toBe(false);
  });

  test('once every one of the four is satisfied, the gate certifies the initiative as complete', () => {
    const eightAvailableModes = modesCatalog.MODES_CATALOG.map((mode) => ({ modeId: mode.id, available: true }));

    const result = evaluateRegressionGate({
      modeVerdicts: eightAvailableModes,
      knownIssues: [],
      goalsStorage: approveAllGoals(makeStorage()),
    });

    expect(result.checks).toEqual({
      eightModesEnabled: true,
      quizRegressionClean: true,
      noBlockingKnownIssues: true,
      goalsApproved: true,
    });
    expect(result.complete).toBe(true);
  });

  test.each([
    ['eightModesEnabled', { modeVerdicts: [{ modeId: 'quiz', available: false }] }],
    ['noBlockingKnownIssues', { knownIssues: [{ id: 'z', severity: SEVERITY.CRITICAL, area: RISK_AREAS.OFFLINE }] }],
    ['goalsApproved', { goalsStorage: makeStorage() }],
  ])('missing only "%s" is enough on its own to keep the initiative blocked', (failingCheck, partialOverride) => {
    const eightAvailableModes = modesCatalog.MODES_CATALOG.map((mode) => ({ modeId: mode.id, available: true }));

    const result = evaluateRegressionGate({
      modeVerdicts: eightAvailableModes,
      knownIssues: [],
      goalsStorage: approveAllGoals(makeStorage()),
      ...partialOverride,
    });

    expect(result.checks[failingCheck]).toBe(false);
    expect(result.complete).toBe(false);
  });
});
