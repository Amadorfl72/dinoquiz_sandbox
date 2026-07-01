import GameSession from './GameSession';

describe('GameSession', () => {
  const mockQuestions = [
    { id: 1, text: 'Question 1', options: ['A', 'B', 'C'], correctAnswer: 'A', fact: 'Fact 1' },
    { id: 2, text: 'Question 2', options: ['A', 'B', 'C'], correctAnswer: 'B', fact: 'Fact 2' },
    { id: 3, text: 'Question 3', options: ['A', 'B', 'C'], correctAnswer: 'C', fact: 'Fact 3' },
    { id: 4, text: 'Question 4', options: ['A', 'B', 'C'], correctAnswer: 'A', fact: 'Fact 4' },
    { id: 5, text: 'Question 5', options: ['A', 'B', 'C'], correctAnswer: 'B', fact: 'Fact 5' },
    { id: 6, text: 'Question 6', options: ['A', 'B', 'C'], correctAnswer: 'C', fact: 'Fact 6' },
    { id: 7, text: 'Question 7', options: ['A', 'B', 'C'], correctAnswer: 'A', fact: 'Fact 7' },
    { id: 8, text: 'Question 8', options: ['A', 'B', 'C'], correctAnswer: 'B', fact: 'Fact 8' },
    { id: 9, text: 'Question 9', options: ['A', 'B', 'C'], correctAnswer: 'C', fact: 'Fact 9' },
    { id: 10, text: 'Question 10', options: ['A', 'B', 'C'], correctAnswer: 'A', fact: 'Fact 10' },
    { id: 11, text: 'Question 11', options: ['A', 'B', 'C'], correctAnswer: 'B', fact: 'Fact 11' },
    { id: 12, text: 'Question 12', options: ['A', 'B', 'C'], correctAnswer: 'C', fact: 'Fact 12' }
  ];

  it('selects 10 random questions', () => {
    const gameSession = new GameSession(mockQuestions);
    expect(gameSession.selectedQuestions.length).toBe(10);
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
});