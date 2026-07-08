'use strict';

const { getGameState, resetGameState, recordAnswer } = require('./gameState');

describe('gameState', () => {
  beforeEach(() => {
    resetGameState();
  });

  test('starts at score 0, question index 0 and no answers', () => {
    expect(getGameState()).toEqual({ score: 0, questionIndex: 0, answers: [] });
  });

  test('recordAnswer(true) increments score, advances the question index and logs the answer', () => {
    recordAnswer(true);

    expect(getGameState()).toEqual({
      score: 1,
      questionIndex: 1,
      answers: [{ correct: true }],
    });
  });

  test('recordAnswer(false) advances the question index and logs the answer without scoring', () => {
    recordAnswer(false);

    expect(getGameState()).toEqual({
      score: 0,
      questionIndex: 1,
      answers: [{ correct: false }],
    });
  });

  test('resetGameState clears score, question index and answers back to the initial state', () => {
    recordAnswer(true);
    recordAnswer(true);

    resetGameState();

    expect(getGameState()).toEqual({ score: 0, questionIndex: 0, answers: [] });
  });

  test('getGameState returns a defensive copy — mutating it does not affect internal state', () => {
    const state = getGameState();
    state.score = 99;
    state.answers.push({ correct: true });

    expect(getGameState()).toEqual({ score: 0, questionIndex: 0, answers: [] });
  });
});
