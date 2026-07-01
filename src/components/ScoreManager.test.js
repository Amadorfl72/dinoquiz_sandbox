import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeAll(() => {
  global.localStorage = localStorageMock;
});

beforeEach(() => {
  localStorage.clear();
});

describe('TRIOFSND-33: Implement Best Score Persistence and Feedback', () => {
  const STORAGE_KEY = 'bestScore';

  it('reads the best score from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, '8');
    render(<ResultsScreen score={5} />);
    
    expect(screen.getByText(/Mejor puntuación: 8/i)).toBeInTheDocument();
  });

  it('writes the new best score to localStorage when current score is higher', () => {
    localStorage.setItem(STORAGE_KEY, '5');
    render(<ResultsScreen score={8} />);
    
    expect(localStorage.getItem(STORAGE_KEY)).toBe('8');
  });

  it('does not overwrite localStorage when current score is lower', () => {
    localStorage.setItem(STORAGE_KEY, '10');
    render(<ResultsScreen score={8} />);
    
    // The UI will show the stored best score
    setTimeout(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBe('10');
    }, 100);
  });

  it('shows "¡Nueva mejor puntuación!" feedback when current score beats persisted one', () => {
    localStorage.setItem(STORAGE_KEY, '5');
    render(<ResultsScreen score={8} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not show feedback when current score does not beat persisted one', () => {
    localStorage.setItem(STORAGE_KEY, '10');
    render(<ResultsScreen score={8} />);
    
    // Wait for potential feedback to appear
    setTimeout(() => {
      expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
    }, 100);
  });

  it('handles localStorage read failures gracefully without blocking the UI', () => {
    // Mock localStorage failure
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => { throw new Error('Storage unavailable'); });
    
    expect(() => render(<ResultsScreen score={8} />)).not.toThrow();
    expect(screen.getByText(/Mejor puntuación: 0/i)).toBeInTheDocument();
    
    // Restore original function
    localStorage.getItem = originalGetItem;
  });

  it('handles localStorage write failures gracefully without blocking the UI', () => {
    // Mock localStorage failure
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => { throw new Error('Storage unavailable'); });
    
    expect(() => render(<ResultsScreen score={10} />)).not.toThrow();
    // Should still show the feedback even if persistence failed
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    // Restore original function
    localStorage.setItem = originalSetItem;
  });
});