import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameProvider, useGame } from '../context/GameContext';
import ResultsScreen from './ResultsScreen';
import { selectQuestions } from '../services/questionService';

jest.mock('../services/questionService');

describe('TRIOFSND-39: Reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (selectQuestions as jest.Mock).mockImplementation(() => {
      return [
        { id: 1, text: '¿Cuál es la capital de Francia?' },
        { id: 2, text: '¿Cuál es la capital de España?' }
      ];
    });
  });

  const TestWrapper = () => {
    const { currentScreen, currentQuestion } = useGame();
    if (currentScreen === 'results') {
      return <ResultsScreen score={5} />;
    }
    return <div data-testid="question-screen">{currentQuestion?.text}</div>;
  };

  it('reinicia el estado de la partida, invoca la lógica de selección y muestra la primera pregunta', async () => {
    render(
      <GameProvider initialScreen="results">
        <TestWrapper />
      </GameProvider>
    );

    expect(screen.getByRole('button', { name: /Volver a jugar/i })).toBeInTheDocument();

    const playAgainButton = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(playAgainButton);

    await waitFor(() => {
      expect(selectQuestions).toHaveBeenCalledTimes(1);
      const questionScreen = screen.getByTestId('question-screen');
      expect(questionScreen).toHaveTextContent('¿Cuál es la capital de Francia?');
    });
  });

  it('garantiza un tiempo de respuesta < 2s para mostrar la primera pregunta', async () => {
    render(
      <GameProvider initialScreen="results">
        <TestWrapper />
      </GameProvider>
    );

    const playAgainButton = screen.getByRole('button', { name: /Volver a jugar/i });
    
    const startTime = performance.now();
    fireEvent.click(playAgainButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(2000);
  });
});
