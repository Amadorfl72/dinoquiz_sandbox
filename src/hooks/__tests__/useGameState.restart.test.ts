import { renderHook, act } from '@testing-library/react-hooks';
import { useGameState } from '../useGameState';
import { selectQuestions } from '../../services/questionService';

jest.mock('../../services/questionService');

const mockedSelectQuestions = selectQuestions as jest.MockedFunction<typeof selectQuestions>;

describe('TRIOFSND-39 - useGameState restart flow', () => {
  const sampleQuestions = [
    { id: 'q1', text: 'Pregunta 1', answers: ['a', 'b', 'c'] },
    { id: 'q2', text: 'Pregunta 2', answers: ['a', 'b', 'c'] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectQuestions.mockReturnValue(sampleQuestions);
  });

  it('resetGameState clears score, current index and answered questions', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.answerQuestion('q1', 'a', true);
      result.current.answerQuestion('q2', 'b', false);
    });

    expect(result.current.score).toBeGreaterThan(0);
    expect(result.current.answeredQuestions.length).toBeGreaterThan(0);

    act(() => {
      result.current.resetGameState();
    });

    expect(result.current.score).toBe(0);
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.answeredQuestions).toEqual([]);
  });

  it('startNewRound selects a fresh set of questions and shows the first one', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startNewRound();
    });

    expect(mockedSelectQuestions).toHaveBeenCalledTimes(1);
    expect(result.current.questions).toEqual(sampleQuestions);
    expect(result.current.currentQuestion).toEqual(sampleQuestions[0]);
    expect(result.current.currentQuestionIndex).toBe(0);
  });

  it('does not carry over answered questions from the previous round', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.answerQuestion('q1', 'a', true);
    });

    expect(result.current.answeredQuestions).toHaveLength(1);

    act(() => {
      result.current.resetGameState();
      result.current.startNewRound();
    });

    expect(result.current.answeredQuestions).toEqual([]);
    expect(result.current.score).toBe(0);
  });

  it('restart flow (resetGameState + startNewRound) completes in under 2 seconds', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.answerQuestion('q1', 'a', true);
      result.current.answerQuestion('q2', 'b', true);
    });

    const start = performance.now();

    act(() => {
      result.current.resetGameState();
      result.current.startNewRound();
    });

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
    expect(result.current.score).toBe(0);
    expect(result.current.currentQuestion).toEqual(sampleQuestions[0]);
  });

  it('startNewRound can be called multiple times without state leakage', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startNewRound();
    });

    const firstQuestions = result.current.questions;

    act(() => {
      result.current.answerQuestion('q1', 'a', true);
      result.current.resetGameState();
      result.current.startNewRound();
    });

    expect(mockedSelectQuestions).toHaveBeenCalledTimes(2);
    expect(result.current.score).toBe(0);
    expect(result.current.answeredQuestions).toEqual([]);
    expect(result.current.currentQuestionIndex).toBe(0);
  });
});
