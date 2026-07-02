import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from '../ResultsScreen';
import { useGame } from '../../../context/GameContext';
import { selectQuestions } from '../../../services/questionService';

jest.mock('../../../context/GameContext');
jest.mock('../../../services/questionService');

const mockedUseGame = useGame as jest.MockedFunction<typeof useGame>;
const mockedSelectQuestions = selectQuestions as jest.MockedFunction<typeof selectQuestions>;

describe('TRIOFSND-39 - ResultsScreen: "Volver a jugar" button', () => {
  const resetGameState = jest.fn();
  const startNewRound = jest.fn();

  const sampleQuestions = [
    { id: 'q1', text: 'Pregunta 1', answers: ['a', 'b', 'c'] },
    { id: 'q2', text: 'Pregunta 2', answers: ['a', 'b', 'c'] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectQuestions.mockReturnValue(sampleQuestions);
    mockedUseGame.mockReturnValue({
      score: 5,
      resetGameState,
      startNewRound,
    });
  });

  it('renders the "Volver a jugar" button on the results screen', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('resets the game state when the button is clicked', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(resetGameState).toHaveBeenCalledTimes(1);
  });

  it('invokes startNewRound which triggers question selection logic when restarting', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(startNewRound).toHaveBeenCalledTimes(1);
  });

  it('calls resetGameState before startNewRound to ensure clean state', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(resetGameState).toHaveBeenCalledBefore(startNewRound);
  });

  it('restarts the round after state reset', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(resetGameState).toHaveBeenCalledTimes(1);
    expect(startNewRound).toHaveBeenCalledTimes(1);
  });
});
