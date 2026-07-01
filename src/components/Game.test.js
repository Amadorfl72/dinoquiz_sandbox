import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  // 1) Best score persists after close/reopen.
  it('persists best score after close/reopen', () => {
    localStorage.setItem('bestScore', '100');
    render(<Game />);
    expect(screen.getByText(/Best Score: 100/i)).toBeInTheDocument();
  });

  // 2) New best updates localStorage and shows message.
  it('updates localStorage and shows message on new best score', () => {
    localStorage.setItem('bestScore', '50');
    render(<Game />);
    
    act(() => {
      fireEvent.click(screen.getByText(/Add Score/i));
    });

    expect(screen.getByText(/New Best Score!/i)).toBeInTheDocument();
    expect(localStorage.getItem('bestScore')).toBe('60');
  });

  // 3) Tie does not update or show message.
  it('does not update or show message on tie', () => {
    localStorage.setItem('bestScore', '50');
    render(<Game />);
    
    act(() => {
      fireEvent.click(screen.getByText(/Set Score to 50/i));
    });

    expect(screen.queryByText(/New Best Score!/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('bestScore')).toBe('50');
  });

  // 4) Disabled localStorage doesn't block game and shows no error.
  it('does not block game or show error when localStorage is disabled', () => {
    // Simulate localStorage being disabled
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      configurable: true
    });
    
    // Should not throw during render
    expect(() => render(<Game />)).not.toThrow();
    
    act(() => {
      fireEvent.click(screen.getByText(/Add Score/i));
    });
    
    expect(screen.queryByText(/New Best Score!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
  });
});