import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import { useGame } from '../context/GameContext';

jest.mock('../context/GameContext');

describe('TRIOFSND-39: Reinicio de partida al pulsar "Volver a jugar"', () => {
  const mockRestartGame = jest.fn();
  const mockSelectQuestions = jest.fn();
  const mockShowFirstQuestion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGame.mockReturnValue({
      restartGame: mockRestartGame,
      selectQuestions: mockSelectQuestions,
      showFirstQuestion: mockShowFirstQuestion,
      gameState: { status: 'results' }
    });
  });

  it('debe reiniciar el estado de la partida al pulsar "Volver a jugar"', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(mockRestartGame).toHaveBeenCalledTimes(1);
  });

  it('debe invocar la lógica de selección de preguntas al pulsar "Volver a jugar"', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(mockSelectQuestions).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar la primera pregunta al pulsar "Volver a jugar"', () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(button);
    expect(mockShowFirstQuestion).toHaveBeenCalledTimes(1);
  });

  it('debe garantizar un tiempo de respuesta < 2s al pulsar "Volver a jugar"', async () => {
    render(<ResultsScreen />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    
    const startTime = performance.now();
    await act(async () => {
      fireEvent.click(button);
    });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
  });
});