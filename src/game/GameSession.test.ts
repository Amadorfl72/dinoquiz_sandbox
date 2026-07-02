import { GameSession } from './GameSession';
import { Question } from './Question';

describe('GameSession', () => {
  const mockQuestions: Question[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    text: `Question ${i}`,
    answers: []
  }));

  it('should initialize with exactly 10 selected questions', () => {
    const session = new GameSession(mockQuestions);
    expect(session.getSelectedQuestions().length).toBe(10);
  });

  it('should start at current question index 0', () => {
    const session = new GameSession(mockQuestions);
    expect(session.getCurrentIndex()).toBe(0);
  });

  it('should return the current question at the current index', () => {
    const session = new GameSession(mockQuestions);
    const selected = session.getSelectedQuestions();
    const current = session.getCurrentQuestion();
    
    expect(current).toBeDefined();
    expect(current.id).toBe(selected[0].id);
  });

  it('should transition to the next question and increment the index', () => {
    const session = new GameSession(mockQuestions);
    const firstQuestion = session.getCurrentQuestion();
    
    session.nextQuestion();
    
    const secondQuestion = session.getCurrentQuestion();
    expect(session.getCurrentIndex()).toBe(1);
    expect(secondQuestion.id).not.toBe(firstQuestion.id);
  });

  it('should not show previous questions again during transitions', () => {
    const session = new GameSession(mockQuestions);
    const seenQuestionIds = new Set<number>();
    
    seenQuestionIds.add(session.getCurrentQuestion().id);
    
    for (let i = 1; i < 10; i++) {
      session.nextQuestion();
      const current = session.getCurrentQuestion();
      expect(seenQuestionIds.has(current.id)).toBe(false);
      seenQuestionIds.add(current.id);
    }
  });

  it('should mark the session as finished after the last question transition', () => {
    const session = new GameSession(mockQuestions);
    
    for (let i = 0; i < 9; i++) {
      session.nextQuestion();
    }
    
    expect(session.getCurrentIndex()).toBe(9);
    expect(session.isFinished()).toBe(false);
    
    session.nextQuestion();
    
    expect(session.isFinished()).toBe(true);
  });

  it('should return undefined for current question when finished', () => {
    const session = new GameSession(mockQuestions);
    
    for (let i = 0; i < 10; i++) {
      session.nextQuestion();
    }
    
    expect(session.isFinished()).toBe(true);
    expect(session.getCurrentQuestion()).toBeUndefined();
  });
});