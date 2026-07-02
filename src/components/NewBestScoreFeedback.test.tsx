import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NewBestScoreFeedback } from './NewBestScoreFeedback';

describe('NewBestScoreFeedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the feedback when isNewBestScore is true', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not render the feedback when isNewBestScore is false', () => {
    render(<NewBestScoreFeedback isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('disappears after a few seconds', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('is non-blocking and does not trap focus', () => {
    render(
      <div>
        <button>Next Game</button>
        <NewBestScoreFeedback isNewBestScore={true} />
      </div>
    );
    
    const feedback = screen.getByText('¡Nueva mejor puntuación!');
    expect(feedback).not.toHaveAttribute('role', 'dialog');
    
    const button = screen.getByText('Next Game');
    button.focus();
    expect(button).toHaveFocus();
  });
});