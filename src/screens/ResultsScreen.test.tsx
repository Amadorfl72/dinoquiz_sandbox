import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import { GameProvider } from '../context/GameContext';
import * as questionService from '../services/questionService';

describe('TRIOFSND-39: Implementar reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(questionService, 'selectQuestions').mockResolvedValue([
      { id: 1, text: '¿Cuál es la capital de Francia?' }
    ]);
  });

  it('debe renderizar el botón "Volver a jugar" en la pantalla de resultados', () => {
    render(
      <GameProvider initialState={{ isGameOver: true, score: 100 }}>
        <ResultsScreen />
      </GameProvider>
    );
    expect(screen.getByRole('button', { name: /volver a jugar/i })).toBeInTheDocument();
  });

  it('debe reiniciar el estado de la partida, invocar la lógica de selección de preguntas y mostrar la primera pregunta', async () => {
    render(
      <GameProvider initialState={{ isGameOver: true, score: 100, currentQuestionIndex: 5 }}>
        <ResultsScreen />
      </GameProvider>
    );

    const restartButton = screen.getByRole('button', { name: /volver a jugar/i });

    await act(async () => {
      fireEvent.click(restartButton);
    });

    expect(questionService.selectQuestions).toHaveBeenCalledTimes(1);
    
    // Verifica que el estado se reinició (score a 0, no está en game over)
    expect(screen.queryByRole('button', { name: /volver a jugar/i })).not.toBeInTheDocument();
    
    // Verifica que se muestra la primera pregunta
    expect(screen.getByText(/¿cuál es la capital de francia\?/i)).toBeInTheDocument();
  });

  it('debe garantizar un tiempo de respuesta < 2s al pulsar el botón', async () => {
    render(
      <GameProvider initialState={{ isGameOver: true, score: 100 }}>
        <ResultsScreen />
      </GameProvider>
    );

    const restartButton = screen.getByRole('button', { name: /volver a jugar/i });

    const startTime = performance.now();

    await act(async () => {
      fireEvent.click(restartButton);
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
  });
});