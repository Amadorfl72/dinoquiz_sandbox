'use strict';

const { MODE_STATE_SCHEMA_VERSION, isValidModeState } = require('./stateSchema');
const { MODE_IDS } = require('../../game/modesCatalog');
const { MIN_LEVEL, MAX_LEVEL } = require('../../game/unlockThresholds');
const { ROUNDS_PER_GAME } = require('../../game/roundContract');

function validState(overrides) {
  return Object.assign(
    {
      schemaVersion: MODE_STATE_SCHEMA_VERSION,
      modeId: MODE_IDS.QUIZ,
      level: MIN_LEVEL,
      currentRound: 0,
      answeredCount: 0,
    },
    overrides
  );
}

describe('isValidModeState (TRIOFSND-297)', () => {
  test('accepts a well-formed snapshot for every known mode', () => {
    Object.values(MODE_IDS).forEach((modeId) => {
      expect(isValidModeState(validState({ modeId }))).toBe(true);
    });
  });

  test('accepts a snapshot mid-game, with rounds reached and answers counted', () => {
    expect(isValidModeState(validState({ level: 3, currentRound: 4, answeredCount: 4 }))).toBe(true);
  });

  test('accepts answeredCount equal to currentRound + 1 (current round already answered)', () => {
    expect(isValidModeState(validState({ currentRound: 2, answeredCount: 3 }))).toBe(true);
  });

  test('rejects null, undefined and non-object values', () => {
    expect(isValidModeState(null)).toBe(false);
    expect(isValidModeState(undefined)).toBe(false);
    expect(isValidModeState('not-an-object')).toBe(false);
    expect(isValidModeState(42)).toBe(false);
  });

  test('rejects a schema version other than MODE_STATE_SCHEMA_VERSION', () => {
    expect(isValidModeState(validState({ schemaVersion: MODE_STATE_SCHEMA_VERSION + 1 }))).toBe(false);
    expect(isValidModeState(validState({ schemaVersion: undefined }))).toBe(false);
  });

  test('rejects an unknown or non-string modeId', () => {
    expect(isValidModeState(validState({ modeId: 'not-a-real-mode' }))).toBe(false);
    expect(isValidModeState(validState({ modeId: 42 }))).toBe(false);
    expect(isValidModeState(validState({ modeId: undefined }))).toBe(false);
  });

  test('rejects a level outside MIN_LEVEL..MAX_LEVEL', () => {
    expect(isValidModeState(validState({ level: MIN_LEVEL - 1 }))).toBe(false);
    expect(isValidModeState(validState({ level: MAX_LEVEL + 1 }))).toBe(false);
    expect(isValidModeState(validState({ level: 1.5 }))).toBe(false);
  });

  test('rejects a currentRound outside 0..ROUNDS_PER_GAME - 1', () => {
    expect(isValidModeState(validState({ currentRound: -1 }))).toBe(false);
    expect(isValidModeState(validState({ currentRound: ROUNDS_PER_GAME }))).toBe(false);
    expect(isValidModeState(validState({ currentRound: 0.5 }))).toBe(false);
  });

  test('rejects a negative or non-integer answeredCount', () => {
    expect(isValidModeState(validState({ answeredCount: -1 }))).toBe(false);
    expect(isValidModeState(validState({ answeredCount: 1.5 }))).toBe(false);
  });

  test('rejects an answeredCount that exceeds ROUNDS_PER_GAME', () => {
    expect(isValidModeState(validState({ currentRound: ROUNDS_PER_GAME - 1, answeredCount: ROUNDS_PER_GAME + 1 }))).toBe(
      false
    );
  });

  test('rejects an answeredCount that claims more counted responses than rounds reached', () => {
    expect(isValidModeState(validState({ currentRound: 1, answeredCount: 5 }))).toBe(false);
  });

  test('is pure: never mutates the input and returns the same verdict for the same input', () => {
    const state = validState({ level: 2, currentRound: 1, answeredCount: 1 });
    const snapshot = JSON.stringify(state);

    expect(isValidModeState(state)).toBe(true);
    expect(isValidModeState(state)).toBe(true);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
