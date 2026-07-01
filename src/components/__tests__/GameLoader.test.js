import React from 'react';
import { render, screen } from '@testing-library/react';
import GameLoader from '../GameLoader';

describe('TRIOFSND-7: Offline First Load Fallback', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
  });

  it('displays the friendly message when offline and first time load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    
    render(<GameLoader />);
    
    expect(screen.getByText('Conéctate la primera vez para descargar el juego')).toBeInTheDocument();
  });

  it('does not display the offline message when online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    
    render(<GameLoader />);
    
    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });

  it('does not display the offline message when offline but game is already downloaded', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.localStorage.setItem('gameDownloaded', 'true');
    
    render(<GameLoader />);
    
    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });

  it('does not throw technical errors when offline and first time load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<GameLoader />)).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});