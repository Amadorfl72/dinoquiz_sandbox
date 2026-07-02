import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from '../ResultsScreen';
import { useGameState } from '../../../hooks/useGameState';
import { selectQuestions } from '../../../services/questionService';

jest.mock('../../../hooks/useGameState');
jest.mock('../../../services/questionService');

const mockedUseGameState = useGameState as jest.MockedFunction<typeof useGameState>;
const mockedSelectQuestions = selectQuestions as jest.MockedFunction<typeof selectQuestions>;

describe('TRIOFSND-39 - ResultsScreen: "Volver a jugar" button', () => {
  const resetGameState = jest.fn();
  const startNewRound = jest.fn();
  const setCurrentQuestion = jest.fn();

  const sampleQuestions = [
    { id: 'q1', text: 'Pregunta 1', answers: ['a', 'b', 'c'] },
    { id: 'q2', text: 'Pregunta 2', answers: ['a', 'b', 'c'] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectQuestions.mockReturnValue(sampleQuestions);
    mockedUseGameState.mockReturnValue({
      score: 5,
      currentQuestionIndex: 0,
      resetGameState,
      startNewRound,
      setCurrentQuestion,
      questions: sampleQuestions,
    });
  });

  it('renders the "Volver a jugar" button on the results screen', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('resets the game state when the button is clicked', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(resetGameState).toHaveBeenCalledTimes(1);
  });

  it('invokes the question selection logic when restarting', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(mockedSelectQuestions).toHaveBeenCalledTimes(1);
  });

  it('sets the current question to the first selected question after restart', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(setCurrentQuestion).toHaveBeenCalledWith(sampleQuestions[0]);
  });

  it('restarts the round after state reset and question selection', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(resetGameState).toHaveBeenCalledBefore(mockedSelectQuestions);
    expect(mockedSelectQuestions).toHaveBeenCalledBefore(startNewRound);
    expect(startNewRound).toHaveBeenCalledTimes(1);
  });
});
