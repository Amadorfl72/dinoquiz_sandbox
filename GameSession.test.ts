import { GameSession } from './GameSession';

describe('TRIOFSND-60: Game Session State Management', () => {
  const mockQuestions = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, text: `Question ${i + 1}` }));

  it('should initialize with exactly 10 selected questions', () => {
    const session = new GameSession(mockQuestions);
    expect(session.getSelectedQuestions()).toHaveLength(10);
    expect(session.getSelectedQuestions()).toEqual(mockQuestions);
  });

  it('should initialize with current question index at 0', () => {
    const session = new GameSession(mockQuestions);
    expect(session.getCurrentIndex()).toBe(0);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[0]);
  });

  it('should transition to the next question correctly', () => {
    const session = new GameSession(mockQuestions);
    
    session.nextQuestion();
    expect(session.getCurrentIndex()).toBe(1);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[1]);
  });

  it('should not show the previous question again when transitioning', () => {
    const session = new GameSession(mockQuestions);
    const firstQuestion = session.getCurrentQuestion();
    
    session.nextQuestion();
    const secondQuestion = session.getCurrentQuestion();
    
    expect(secondQuestion).not.toEqual(firstQuestion);
  });

  it('should transition through all 10 questions sequentially', () => {
    const session = new GameSession(mockQuestions);
    
    for (let i = 0; i < 9; i++) {
      session.nextQuestion();
    }
    
    expect(session.getCurrentIndex()).toBe(9);
    expect(session.getCurrentQuestion()).toEqual(mockQuestions[9]);
  });

  it('should mark the session as finished after the last question transition', () => {
    const session = new GameSession(mockQuestions);
    
    for (let i = 0; i < 9; i++) {
      session.nextQuestion();
    }
    expect(session.isFinished()).toBe(false);
    
    session.nextQuestion();
    expect(session.isFinished()).toBe(true);
  });

  it('should throw an error when trying to transition after the session is finished', () => {
    const session = new GameSession(mockQuestions);
    
    for (let i = 0; i < 10; i++) {
      session.nextQuestion();
    }
    
    expect(session.isFinished()).toBe(true);
    expect(() => session.nextQuestion()).toThrow('Game session is already finished');
  });
});