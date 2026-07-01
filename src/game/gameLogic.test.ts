import { resetGame, selectRandomQuestions, GameState } from './gameLogic';

describe('TRIOFSND-34: Volver a jugar Game Reset Logic', () => {
  const questionPool = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, text: `Q${i + 1}` }));

  it('should select exactly 10 questions from the pool', () => {
    const selected = selectRandomQuestions(questionPool, 10);
    expect(selected).toHaveLength(10);
  });

  it('should not repeat questions in the selected set', () => {
    const selected = selectRandomQuestions(questionPool, 10);
    const ids = selected.map(q => q.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('should reset the game state and navigate to the first question', () => {
    const currentState: GameState = {
      status: 'finished',
      currentQuestionIndex: 9,
      score: 5,
      questions: selectRandomQuestions(questionPool, 10),
    };

    const newState = resetGame(currentState, questionPool);

    expect(newState.status).toBe('playing');
    expect(newState.currentQuestionIndex).toBe(0);
    expect(newState.score).toBe(0);
    expect(newState.questions).toHaveLength(10);
  });

  it('should select a new set of questions different from the previous set', () => {
    const currentState: GameState = {
      status: 'finished',
      currentQuestionIndex: 9,
      score: 5,
      questions: selectRandomQuestions(questionPool, 10),
    };

    const newState = resetGame(currentState, questionPool);
    
    // Ensure a new array is generated
    expect(newState.questions).not.toBe(currentState.questions);
    
    // Ensure the new questions are valid and from the pool
    newState.questions.forEach(q => {
      expect(questionPool).toContainEqual(q);
    });
  });
});