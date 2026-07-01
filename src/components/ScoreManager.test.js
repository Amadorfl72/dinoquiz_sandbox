import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoreManager from './ScoreManager';

describe('TRIOFSND-33: Implement Best Score Persistence and Feedback', () => {
  const STORAGE_KEY = 'triofsnd_best_score';

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('reads the best score from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, '150');
    render(<ScoreManager currentScore={100} />);
    
    expect(screen.getByText(/Mejor puntuación: 150/i)).toBeInTheDocument();
  });

  it('writes the new best score to localStorage when current score is higher', () => {
    window.localStorage.setItem(STORAGE_KEY, '50');
    render(<ScoreManager currentScore={100} />);
    
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('100');
  });

  it('does not overwrite localStorage when current score is lower', () => {
    window.localStorage.setItem(STORAGE_KEY, '200');
    render(<ScoreManager currentScore={100} />);
    
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('200');
  });

  it('shows "¡Nueva mejor puntuación!" feedback when current score beats persisted one', () => {
    window.localStorage.setItem(STORAGE_KEY, '50');
    render(<ScoreManager currentScore={100} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not show feedback when current score does not beat persisted one', () => {
    window.localStorage.setItem(STORAGE_KEY, '200');
    render(<ScoreManager currentScore={100} />);
    
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('handles localStorage read failures gracefully without blocking the UI', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    
    expect(() => render(<ScoreManager currentScore={100} />)).not.toThrow();
    expect(screen.getByText(/Mejor puntuación: 0/i)).toBeInTheDocument();
  });

  it('handles localStorage write failures gracefully without blocking the UI', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    
    expect(() => render(<ScoreManager currentScore={100} />)).not.toThrow();
    // Should still show the feedback and the new score in UI even if persistence failed
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    expect(screen.getByText(/Mejor puntuación: 100/i)).toBeInTheDocument();
  });
});