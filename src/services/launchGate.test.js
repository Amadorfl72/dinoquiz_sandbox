'use strict';

const { GATE_IDS, evaluateLaunchGates } = require('./launchGate');
const { SHADOW_MODE_MIN_APPROVED, SIZE_ORDER_MODE_MIN_CREATURES } = require('../data/creatureSheet');

describe('GATE_IDS', () => {
  test('declares exactly the ten gates the launch-gate contract commits to', () => {
    expect(Object.values(GATE_IDS).sort()).toEqual(
      [
        'accesibilidad',
        'fichas',
        'generadores',
        'offline',
        'precache',
        'regresionQuiz',
        'rejillas',
        'resolubilidad',
        'siluetas',
        'tamanos',
      ].sort()
    );
  });
});

describe('evaluateLaunchGates against the real, shipped data', () => {
  let result;

  beforeAll(() => {
    result = evaluateLaunchGates();
  });

  test('returns one gate result per GATE_IDS entry', () => {
    expect(Object.keys(result.gates).sort()).toEqual(Object.values(GATE_IDS).sort());
  });

  test('every gate passes on the real catalog (the launch-ready baseline)', () => {
    Object.entries(result.gates).forEach(([gateId, gate]) => {
      expect(gate.pass).toBe(true);
      // eslint-disable-next-line no-unused-expressions
      void gateId;
    });
    expect(result.pass).toBe(true);
  });

  test('siluetas reports the PRD catalog threshold (Sombras >= 12)', () => {
    expect(result.gates.siluetas.threshold).toBe(SHADOW_MODE_MIN_APPROVED);
    expect(result.gates.siluetas.threshold).toBe(12);
    expect(result.gates.siluetas.count).toBeGreaterThanOrEqual(result.gates.siluetas.threshold);
  });

  test('rejillas reports the PRD catalog threshold (Parejas >= 8)', () => {
    expect(result.gates.rejillas.threshold).toBe(8);
    expect(result.gates.rejillas.count).toBeGreaterThanOrEqual(result.gates.rejillas.threshold);
  });

  test('tamanos reports its own verified-length threshold', () => {
    expect(result.gates.tamanos.threshold).toBe(SIZE_ORDER_MODE_MIN_CREATURES);
    expect(result.gates.tamanos.count).toBeGreaterThanOrEqual(result.gates.tamanos.threshold);
  });

  test('generadores ran one sample round through all four mode generators', () => {
    expect(Object.keys(result.gates.generadores.generators).sort()).toEqual(
      ['laberinto', 'rejillas', 'siluetas', 'tamanos'].sort()
    );
  });

  test('resolubilidad checks a low/mid/high level spread, all solvable', () => {
    expect(result.gates.resolubilidad.checks.length).toBe(3);
    result.gates.resolubilidad.checks.forEach((check) => expect(check.solvable).toBe(true));
  });

  test('precache and offline agree the current PRECACHE_URLS covers every mode manifest', () => {
    expect(result.gates.precache.precacheCount).toBeGreaterThan(0);
    expect(result.gates.offline.missing).toEqual([]);
  });

  test('regresionQuiz confirms the pre-existing quiz still loads and stays available', () => {
    expect(result.gates.regresionQuiz.loadError).toBeNull();
    expect(result.gates.regresionQuiz.quizAvailability.available).toBe(true);
    expect(result.gates.regresionQuiz.questionCount).toBeGreaterThan(0);
  });
});

describe('evaluateLaunchGates orchestrates -- it never re-derives a validation rule itself', () => {
  test('a broken creature catalog fails both fichas and regresionQuiz, without touching independent gates', () => {
    // "trex" is a real quiz dependency (modeAvailability.js's
    // MODE_CREATURE_DEPENDENCIES): an incomplete entry for it is what
    // actually blocks the quiz -- an id no mode depends on would not.
    const brokenCreatures = [{ id: 'trex' }];

    const result = evaluateLaunchGates({ creatures: brokenCreatures });

    expect(result.pass).toBe(false);
    expect(result.gates.fichas.pass).toBe(false);
    expect(result.gates.fichas.failureCount).toBeGreaterThan(0);
    expect(result.gates.regresionQuiz.pass).toBe(false);
    expect(result.gates.regresionQuiz.quizAvailability.available).toBe(false);

    // Gates that never read the injected catalog stay on the real, valid data.
    expect(result.gates.siluetas.pass).toBe(true);
    expect(result.gates.resolubilidad.pass).toBe(true);
    expect(result.gates.accesibilidad.pass).toBe(true);
  });
});
