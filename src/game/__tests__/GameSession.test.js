import GameSession from '../GameSession';

describe('GameSession', () => {
  const mockQuestions = Array(40).fill().map((_, i) => ({
    id: i,
    text: `Question ${i}`,
    options: ['A', 'B', 'C'],
    correctAnswer: 'A',
    dinosaur: 'T-Rex',
    funFact: 'Fun fact about T-Rex'
  }));

  test('should initialize with 10 unique questions', () => {
    const session = new GameSession(mockQuestions);
    expect(session.questions).toHaveLength(10);

    // Check for uniqueness
    const questionIds = session.questions.map(q => q.id);
    const uniqueIds = new Set(questionIds);
    expect(uniqueIds.size).toBe(10);
  });

  test('should start with current question index at 0', () => {
    const session = new GameSession(mockQuestions);
    expect(session.currentQuestionIndex).toBe(0);
    expect(session.getCurrentQuestion().id).toBe(session.questions[0].id);
  });

  test('should advance current question index on next()', () => {
    const session = new GameSession(mockQuestions);
    const firstQuestionId = session.getCurrentQuestion().id;

    session.next();
    expect(session.currentQuestionIndex).toBe(1);
    expect(session.getCurrentQuestion().id).not.toBe(firstQuestionId);
  });

  test('should not repeat previously shown questions', () => {
    const session = new GameSession(mockQuestions);
    const seenQuestions = new Set();

    for (let i = 0; i < 10; i++) {
      const question = session.getCurrentQuestion();
      expect(seenQuestions.has(question.id)).toBe(false);
      seenQuestions.add(question.id);
      session.next();
    }
  });

  test('should signal session complete after all 10 questions answered', () => {
    const session = new GameSession(mockQuestions);

    for (let i = 0; i < 9; i++) {
      expect(session.isComplete()).toBe(false);
      session.next();
    }

    // 10th next() should complete
    expect(session.next()).toBe(false);
    expect(session.isComplete()).toBe(true);
  });
});
