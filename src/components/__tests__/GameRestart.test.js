import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from '../Game';
import * as questionService from '../../services/questionService';

jest.mock('../../services/questionService');

describe('TRIOFSND-39: Implementar reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    questionService.selectQuestions.mockResolvedValue([
      { id: 1, text: 'Nueva Pregunta 1' },
      { id: 2, text: 'Nueva Pregunta 2' }
    ]);
  });

  it('reinicia el estado de la partida al pulsar el botón', async () => {
    render(<Game initialState={{ isGameOver: true, score: 100 }} />);
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    
    await act(async () => {
      fireEvent.click(playAgainButton);
    });

    expect(screen.queryByText(/score: 100/i)).not.toBeInTheDocument();
    expect(screen.getByText(/score: 0/i)).toBeInTheDocument();
  });

  it('invoca la lógica de selección de preguntas', async () => {
    render(<Game initialState={{ isGameOver: true, score: 100 }} />);
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    
    await act(async () => {
      fireEvent.click(playAgainButton);
    });

    expect(questionService.selectQuestions).toHaveBeenCalledTimes(1);
  });

  it('muestra la primera pregunta', async () => {
    render(<Game initialState={{ isGameOver: true, score: 100 }} />);
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    
    await act(async () => {
      fireEvent.click(playAgainButton);
    });

    expect(screen.getByText('Nueva Pregunta 1')).toBeInTheDocument();
  });

  it('garantiza un tiempo de respuesta < 2s', async () => {
    const startTime = performance.now();
    
    render(<Game initialState={{ isGameOver: true, score: 100 }} />);
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    
    await act(async () => {
      fireEvent.click(playAgainButton);
    });

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });
});