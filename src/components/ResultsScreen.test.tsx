import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen - TRIOFSND-45: New Best Score Feedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays "¡Nueva mejor puntuación!" when a new best score is achieved', () => {
    render(<ResultsScreen score={1500} isNewBestScore={true} onPlayAgain={() => {}} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not display "¡Nueva mejor puntuación!" when a new best score is not achieved', () => {
    render(<ResultsScreen score={1000} isNewBestScore={false} onPlayAgain={() => {}} />);
    
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('disappears after a few seconds', () => {
    render(<ResultsScreen score={1500} isNewBestScore={true} onPlayAgain={() => {}} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('is non-blocking and allows interaction with other elements while visible', () => {
    const mockPlayAgain = jest.fn();
    render(<ResultsScreen score={1500} isNewBestScore={true} onPlayAgain={mockPlayAgain} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    
    expect(mockPlayAgain).toHaveBeenCalledTimes(1);
  });
});