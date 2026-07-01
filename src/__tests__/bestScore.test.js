import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from '../Game';

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('1) Best score persists after close/reopen', () => {
    const { unmount } = render(<Game />);
    
    // Simulate finishing the game with a score of 100
    act(() => {
      fireEvent.click(screen.getByTestId('finish-game-btn'));
      fireEvent.change(screen.getByTestId('score-input'), { target: { value: '100' } });
      fireEvent.click(screen.getByTestId('submit-score-btn'));
    });
    
    expect(screen.getByText(/best score: 100/i)).toBeInTheDocument();
    
    unmount();
    
    // Reopen the game
    render(<Game />);
    
    // Verify best score persisted
    expect(screen.getByText(/best score: 100/i)).toBeInTheDocument();
  });

  it('2) New best updates localStorage and shows message', () => {
    localStorage.setItem('bestScore', '50');
    
    render(<Game />);
    
    act(() => {
      fireEvent.click(screen.getByTestId('finish-game-btn'));
      fireEvent.change(screen.getByTestId('score-input'), { target: { value: '100' } });
      fireEvent.click(screen.getByTestId('submit-score-btn'));
    });
    
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(screen.getByText(/new best score!/i)).toBeInTheDocument();
  });

  it('3) Tie does not update or show message', () => {
    localStorage.setItem('bestScore', '100');
    
    render(<Game />);
    
    act(() => {
      fireEvent.click(screen.getByTestId('finish-game-btn'));
      fireEvent.change(screen.getByTestId('score-input'), { target: { value: '100' } });
      fireEvent.click(screen.getByTestId('submit-score-btn'));
    });
    
    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(screen.queryByText(/new best score!/i)).not.toBeInTheDocument();
  });

  it('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    const errorMock = jest.fn(() => { throw new Error('localStorage disabled'); });
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: errorMock,
        setItem: errorMock,
        removeItem: errorMock,
        clear: errorMock
      },
      writable: true
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Should render without throwing
    expect(() => render(<Game />)).not.toThrow();
    
    // Game should still be playable
    act(() => {
      fireEvent.click(screen.getByTestId('finish-game-btn'));
      fireEvent.change(screen.getByTestId('score-input'), { target: { value: '100' } });
      fireEvent.click(screen.getByTestId('submit-score-btn'));
    });
    
    expect(screen.getByText(/game over/i)).toBeInTheDocument();
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});