import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Game from '../Game';
import * as questionService from '../../services/questionService';

jest.mock('../../services/questionService');

describe('TRIOFSND-39: Implementar reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the question selection logic to return a predefined set of questions
    questionService.selectQuestions.mockImplementation(() => {
      return [
        { id: 1, text: '¿Cuál es la capital de Francia?' },
        { id: 2, text: '¿Cuál es la capital de España?' }
      ];
    });
  });

  it('debería reiniciar el estado, invocar la selección de preguntas y mostrar la primera pregunta en <2s', async () => {
    const startTime = performance.now();

    // Render the game in a finished state to show the results screen
    render(<Game initialStatus="results" />);

    // Ensure the results screen is displayed
    expect(screen.getByText(/Resultados/i)).toBeInTheDocument();

    // Find and click the 'Volver a jugar' button
    const restartButton = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(restartButton);

    // Verify that the question selection logic was invoked
    await waitFor(() => {
      expect(questionService.selectQuestions).toHaveBeenCalledTimes(1);
    });

    // Verify that the first question is displayed
    await waitFor(() => {
      expect(screen.getByText('¿Cuál es la capital de Francia?')).toBeInTheDocument();
    });

    // Verify that the results screen is no longer visible (state reset)
    expect(screen.queryByText(/Resultados/i)).not.toBeInTheDocument();

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify the response time is less than 2 seconds (2000 ms)
    expect(duration).toBeLessThan(2000);
  });
});