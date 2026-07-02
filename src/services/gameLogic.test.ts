import { restartGame, selectQuestions } from './gameLogic';

describe('TRIOFSND-39: Lógica de reinicio de partida', () => {
  it('debe reiniciar el estado de la partida a sus valores iniciales', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [{ id: 1, text: 'Old question' }],
      screen: 'results'
    };

    const newState = restartGame(currentState);

    expect(newState.score).toBe(0);
    expect(newState.currentQuestionIndex).toBe(0);
    expect(newState.screen).toBe('playing');
  });

  it('debe invocar la lógica de selección de preguntas al reiniciar', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [],
      screen: 'results'
    };

    jest.spyOn(selectQuestions, 'selectQuestions');
    const newState = restartGame(currentState);

    expect(selectQuestions).toHaveBeenCalledTimes(1);
    expect(newState.questions.length).toBeGreaterThan(0);
    expect(newState.questions[0]).toHaveProperty('id');
    expect(newState.questions[0]).toHaveProperty('text');
  });
});