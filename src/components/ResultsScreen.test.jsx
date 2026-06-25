import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import * as gameService from '../services/gameService';

describe('TRIOFSND-39: Reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(gameService, 'selectQuestions').mockResolvedValue([
      { id: 1, text: '¿Cuál es la capital de Francia?' },
      { id: 2, text: '¿Cuál es la capital de España?' }
    ]);
    jest.spyOn(gameService, 'resetGameState').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('muestra el botón "Volver a jugar" en la pantalla de resultados', () => {
    render(<ResultsScreen />);
    expect(screen.getByRole('button', { name: /volver a jugar/i })).toBeInTheDocument();
  });

  it('reinicia el estado de la partida al pulsar "Volver a jugar"', async () => {
    const resetSpy = jest.spyOn(gameService, 'resetGameState');
    render(<ResultsScreen />);
    
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('invoca la lógica de selección de preguntas al pulsar "Volver a jugar"', async () => {
    const selectSpy = jest.spyOn(gameService, 'selectQuestions');
    render(<ResultsScreen />);
    
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it('muestra la primera pregunta tras pulsar "Volver a jugar"', async () => {
    render(<ResultsScreen />);
    
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText('¿Cuál es la capital de Francia?')).toBeInTheDocument();
    });
  });

  it('garantiza un tiempo de respuesta < 2s', async () => {
    const startTime = performance.now();
    
    render(<ResultsScreen />);
    
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText('¿Cuál es la capital de Francia?')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(2000);
  });
});