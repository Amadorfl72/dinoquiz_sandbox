import GameSessionState from './GameSessionState';

describe('GameSessionState', () => {
  let gameSessionState;
  const mockQuestions = [{ id: 1 }, { id: 2 }, { id: 3 }];

  beforeEach(() => {
    gameSessionState = new GameSessionState();
    gameSessionState.initializeSession(mockQuestions);
  });

  test('initializes session correctly', () => {
    expect(gameSessionState.selectedQuestions).toEqual(mockQuestions);
    expect(gameSessionState.currentQuestionIndex).toBe(0);
    expect(gameSessionState.score).toBe(0);
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
});