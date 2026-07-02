import { resetGameState, restartGame } from './gameLogic';
import * as questionService from '../services/questionService';

jest.mock('../services/questionService');

const mockedSelectQuestions = questionService.selectQuestions as jest.MockedFunction<typeof questionService.selectQuestions>;

describe('TRIOFSND-39: Lógica de reinicio de partida', () => {
  const sampleQuestions = [
    { id: 'q1', text: 'Pregunta 1', answers: ['a', 'b', 'c'] },
    { id: 'q2', text: 'Pregunta 2', answers: ['a', 'b', 'c'] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectQuestions.mockReturnValue(sampleQuestions);
  });

  it('resetGameState reinicia el estado de la partida a sus valores iniciales', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [{ id: 1, text: 'Old question' }],
      answeredQuestions: [{ questionId: 'q1', answer: 'a', correct: true }],
      screen: 'results',
    };

    const newState = resetGameState(currentState);

    expect(newState.score).toBe(0);
    expect(newState.currentQuestionIndex).toBe(0);
    expect(newState.answeredQuestions).toEqual([]);
    expect(newState.screen).toBe('playing');
  });

  it('restartGame reinicia el estado y establece screen a playing', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [{ id: 1, text: 'Old question' }],
      screen: 'results',
    };

    const newState = restartGame(currentState);

    expect(newState.score).toBe(0);
    expect(newState.currentQuestionIndex).toBe(0);
    expect(newState.screen).toBe('playing');
  });

  it('restartGame invoca la lógica de selección de preguntas al reiniciar', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [],
      screen: 'results',
    };

    const newState = restartGame(currentState);

    expect(mockedSelectQuestions).toHaveBeenCalledTimes(1);
    expect(newState.questions.length).toBeGreaterThan(0);
    expect(newState.questions[0]).toHaveProperty('id');
    expect(newState.questions[0]).toHaveProperty('text');
  });

  it('restartGame establece currentQuestion a la primera pregunta seleccionada', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [],
      screen: 'results',
    };

    const newState = restartGame(currentState);

    expect(newState.currentQuestion).toEqual(sampleQuestions[0]);
    expect(newState.currentQuestion).toHaveProperty('id');
    expect(newState.currentQuestion).toHaveProperty('text');
  });

  it('restartGame no conserva las preguntas respondidas de la ronda anterior', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [{ id: 1, text: 'Old question' }],
      answeredQuestions: [{ questionId: 'q1', answer: 'a', correct: true }],
      screen: 'results',
    };

    const newState = restartGame(currentState);

    expect(newState.answeredQuestions).toEqual([]);
    expect(newState.score).toBe(0);
  });

  it('restartGame completa en menos de 2 segundos', () => {
    const currentState = {
      score: 150,
      currentQuestionIndex: 4,
      questions: [],
      screen: 'results',
    };

    const start = performance.now();
    restartGame(currentState);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });
});
