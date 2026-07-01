import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe("TRIOFSND-45: Display '¡Nueva mejor puntuación!' mini-feedback UI", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the feedback when isNewBestScore is true', () => {
    render(<ResultsScreen score={10} bestScore={5} isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not render the feedback when isNewBestScore is false', () => {
    render(<ResultsScreen score={3} bestScore={5} isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('removes the feedback after 3 seconds', () => {
    render(<ResultsScreen score={10} bestScore={5} isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('is non-blocking and allows interaction with other elements while feedback is visible', () => {
    const onPlayAgain = jest.fn();
    render(<ResultsScreen score={10} bestScore={5} isNewBestScore={true} onPlayAgain={onPlayAgain} />);
    
    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    fireEvent.click(playAgainButton);
    
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});