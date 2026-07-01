import GameSession from './GameSession';

describe('GameSession', () => {
  const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    options: ['A', 'B', 'C'],
    correctAnswer: 'A',
    fact: `Fact ${i + 1}`
  }));

  it('requires exactly 10 questions', () => {
    expect(() => new GameSession([])).toThrow(/10 questions/);
    expect(() => new GameSession(mockQuestions.slice(0, 9))).toThrow(/10 questions/);
    expect(() => new GameSession([...mockQuestions, mockQuestions[0]])).toThrow(/10 questions/);
  });

  it('rejects duplicate question IDs', () => {
    const badQuestions = [...mockQuestions];
    badQuestions[5] = { ...badQuestions[5], id: badQuestions[0].id };
    expect(() => new GameSession(badQuestions)).toThrow(/duplicate/);
  });

  it('tracks current question index', () => {
    const gameSession = new GameSession(mockQuestions);
    expect(gameSession.currentQuestionIndex).toBe(0);
    gameSession.nextQuestion();
    expect(gameSession.currentQuestionIndex).toBe(1);
  });

  it('updates score and streak on correct answer', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    expect(gameSession.score).toBe(1);
    expect(gameSession.streak).toBe(1);
    expect(gameSession.maxStreak).toBe(1);
  });

  it('resets streak on incorrect answer', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    gameSession.answerQuestion(false);
    expect(gameSession.streak).toBe(0);
    expect(gameSession.maxStreak).toBe(1);
  });

  it('tracks seen facts', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    expect(gameSession.seenFacts.size).toBe(1);
  });

  it('prevents answering the same question twice', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    expect(() => gameSession.answerQuestion(true)).toThrow(/already answered/);
  });

  it('determines game over state', () => {
    const gameSession = new GameSession(mockQuestions);
    for (let i = 0; i < 9; i++) {
      gameSession.nextQuestion();
    }
    expect(gameSession.isGameOver()).toBe(true);
  });

  it('calculates results with stars', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    gameSession.answerQuestion(true);
    gameSession.answerQuestion(true);
    gameSession.answerQuestion(false);
    const results = gameSession.getResults();
    expect(results.score).toBe(3);
    expect(results.stars).toBe(1);
    expect(results.maxStreak).toBe(3);
    expect(results.seenFacts).toBe(4);
  });

  it('tracks shown question IDs', () => {
    const gameSession = new GameSession(mockQuestions);
    gameSession.answerQuestion(true);
    gameSession.nextQuestion();
    gameSession.answerQuestion(false);
    expect(gameSession.getShownQuestionIds()).toEqual([mockQuestions[0].id, mockQuestions[1].id]);
  });
});