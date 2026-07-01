import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('TRIOFSND-45: Display ¡Nueva mejor puntuación! mini-feedback UI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('displays the ¡Nueva mejor puntuación! toast when a new best score is achieved', () => {
    render(<ResultsScreen score={100} bestScore={50} isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  test('does not display the toast when a new best score is not achieved', () => {
    render(<ResultsScreen score={40} bestScore={50} isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  test('toast disappears after a few seconds', async () => {
    render(<ResultsScreen score={100} bestScore={50} isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
    });
  });

  test('toast is non-blocking and allows interaction with other elements', () => {
    const mockPlayAgain = jest.fn();
    render(<ResultsScreen score={100} bestScore={50} isNewBestScore={true} onPlayAgain={mockPlayAgain} />);
    
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    expect(playAgainButton).toBeEnabled();
    
    userEvent.click(playAgainButton);
    
    expect(mockPlayAgain).toHaveBeenCalledTimes(1);
  });
});