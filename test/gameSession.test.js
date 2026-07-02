const GameSession = require('../src/gameSession');

describe('GameSession State Management', () => {
  let questions;
  let session;

  beforeEach(() => {
    questions = Array.from({ length: 20 }, (_, i) => ({ id: i, text: `Question ${i}` }));
    session = new GameSession(questions);
  });

  it('should initialize session with exactly 10 selected questions', () => {
    expect(session.selectedQuestions).toHaveLength(10);
  });

  it('should start with current question index at 0', () => {
    expect(session.currentIndex).toBe(0);
  });

  it('should advance current question index on next()', () => {
    const initialIndex = session.currentIndex;
    session.next();
    expect(session.currentIndex).toBe(initialIndex + 1);
  });

  it('should not repeat previously shown questions', () => {
    const shown = new Set();
    shown.add(session.getCurrentQuestion().id);
    
    for (let i = 0; i < 9; i++) {
      session.next();
      const current = session.getCurrentQuestion();
      expect(shown.has(current.id)).toBe(false);
      shown.add(current.id);
    }
  });

  it('should signal session complete after all 10 questions answered', () => {
    expect(session.isComplete()).toBe(false);
    for (let i = 0; i < 9; i++) {
      session.next();
      expect(session.isComplete()).toBe(false);
    }
    session.next();
    expect(session.isComplete()).toBe(true);
  });
});
