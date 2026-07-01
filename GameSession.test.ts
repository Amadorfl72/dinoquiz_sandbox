import { GameSession } from './GameSession';

describe('TRIOFSND-60: Game Session State Management', () => {
  const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    text: `Question ${i + 1}`,
  }));

  it('should initialize with 10 selected questions and current index at 0', () => {
    const session = new GameSession(mockQuestions);
    expect(session.getQuestions()).toHaveLength(10);
    expect(session.getCurrentIndex()).toBe(0);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[0]);
  });

  it('should throw an error if initialized with less than 10 questions', () => {
    const invalidQuestions = mockQuestions.slice(0, 9);
    expect(() => new GameSession(invalidQuestions)).toThrow(
      'A game session requires exactly 10 questions.'
    );
  });

  it('should move to the next question and increment the index', () => {
    const session = new GameSession(mockQuestions);
    session.nextQuestion();
    expect(session.getCurrentIndex()).toBe(1);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[1]);
  });

  it('should not show previous questions again when moving forward', () => {
    const session = new GameSession(mockQuestions);
    session.nextQuestion();
    session.nextQuestion();
    
    expect(session.getCurrentIndex()).toBe(2);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[2]);
    expect(session.getCurrentQuestion()).not.toEqual(mockQuestions[0]);
    expect(session.getCurrentQuestion()).not.toEqual(mockQuestions[1]);
  });

  it('should handle transitions until the last question', () => {
    const session = new GameSession(mockQuestions);
    for (let i = 0; i < 9; i++) {
      session.nextQuestion();
    }
    expect(session.getCurrentIndex()).toBe(9);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[9]);
    expect(session.isFinished()).toBe(false);
  });

  it('should indicate when the game session is completed after all questions are answered', () => {
    const session = new GameSession(mockQuestions);
    for (let i = 0; i < 10; i++) {
      session.nextQuestion();
    }
    expect(session.isFinished()).toBe(true);
    expect(session.getCurrentQuestion()).toBeNull();
  });
});