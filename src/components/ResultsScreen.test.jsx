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
    render(<ResultsScreen isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not render the feedback when isNewBestScore is false', () => {
    render(<ResultsScreen isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('removes the feedback after 3 seconds', () => {
    render(<ResultsScreen isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('is non-blocking (pointer-events: none)', () => {
    render(<ResultsScreen isNewBestScore={true} />);
    const feedback = screen.getByText('¡Nueva mejor puntuación!');
    expect(feedback).toHaveStyle('pointer-events: none');
  });

  it('allows interaction with other elements while feedback is visible', () => {
    const onPlayAgain = jest.fn();
    render(<ResultsScreen isNewBestScore={true} onPlayAgain={onPlayAgain} />);
    
    const playAgainButton = screen.getByRole('button', { name: /play again/i });
    fireEvent.click(playAgainButton);
    
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});