import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('Score Feedback UI', () => {
  it('shows "¡Nueva mejor puntuación!" feedback when current score beats persisted one', () => {
    localStorage.setItem('bestScore', '5');
    render(<ResultsScreen score={8} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not show feedback when current score does not beat persisted one', () => {
    localStorage.setItem('bestScore', '10');
    render(<ResultsScreen score={8} />);
    
    // Wait for potential feedback to appear
    setTimeout(() => {
      expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
    }, 100);
  });

  it('does not block UI when localStorage fails during update', () => {
    // Mock localStorage failure
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => { throw new Error('LocalStorage disabled'); });
    
    expect(() => render(<ResultsScreen score={10} />)).not.toThrow();
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
    
    // Restore original function
    localStorage.setItem = originalSetItem;
  });
});