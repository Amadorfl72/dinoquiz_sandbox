import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NewBestScoreToast } from './NewBestScoreToast';

describe('TRIOFSND-45: Display ¡Nueva mejor puntuación! mini-feedback UI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the toast with the correct text when isNewBestScore is true', () => {
    render(<NewBestScoreToast isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not render the toast when isNewBestScore is false', () => {
    render(<NewBestScoreToast isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('disappears after a few seconds (e.g., 3 seconds)', () => {
    render(<NewBestScoreToast isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    // Advance timers by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('is non-blocking (does not trap focus and uses polite aria-live)', () => {
    render(
      <div>
        <button>Next Game</button>
        <NewBestScoreToast isNewBestScore={true} />
      </div>
    );
    
    const toast = screen.getByText('¡Nueva mejor puntuación!');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    
    // Ensure other elements remain interactive / focusable
    const button = screen.getByText('Next Game');
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});