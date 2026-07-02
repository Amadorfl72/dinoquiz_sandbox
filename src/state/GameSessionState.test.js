// DEPRECATED - Tests for this functionality have been moved to src/game/GameSession.test.ts
// This file will be removed in a future update

import GameSessionState from './GameSessionState';

describe('GameSessionState', () => {
  let gameSessionState;
  const mockQuestions = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }];

  beforeEach(() => {
    gameSessionState = new GameSessionState();
    gameSessionState.initializeSession(mockQuestions);
  });

  test('initializes session with exactly 10 questions', () => {
    expect(gameSessionState.selectedQuestions).toEqual(mockQuestions);
    expect(gameSessionState.currentQuestionIndex).toBe(0);
    expect(gameSessionState.score).toBe(0);
  });

  test('throws error if initialized with incorrect number of questions', () => {
    expect(() => gameSessionState.initializeSession([{ id: 1 }])).toThrow('Session must be initialized with exactly 10 questions');
  });

  test('gets current question', () => {
    expect(gameSessionState.getCurrentQuestion()).toEqual(mockQuestions[0]);
  });

  test('moves to next question', () => {
    expect(gameSessionState.moveToNextQuestion()).toBe(true);
    expect(gameSessionState.currentQuestionIndex).toBe(1);
  });

  test('does not move beyond last question', () => {
    gameSessionState.currentQuestionIndex = mockQuestions.length - 1;
    expect(gameSessionState.moveToNextQuestion()).toBe(false);
  });

  test('increments score', () => {
    gameSessionState.incrementScore();
    expect(gameSessionState.getScore()).toBe(1);
  });

  test('signals session complete after all questions answered', () => {
    for (let i = 0; i < mockQuestions.length - 1; i++) {
      gameSessionState.moveToNextQuestion();
      expect(gameSessionState.isSessionComplete()).toBe(false);
    }
    gameSessionState.moveToNextQuestion();
    expect(gameSessionState.isSessionComplete()).toBe(true);
  });
});