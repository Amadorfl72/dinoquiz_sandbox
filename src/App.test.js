import { render, screen } from '@testing-library/react';
import App from './App';

describe('TRIOFSND-7: Offline First Load Fallback', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
  });

  it('displays friendly message when offline on first load', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<App />);
    
    expect(screen.getByText('Conéctate la primera vez para descargar el juego')).toBeInTheDocument();
  });

  it('does not display friendly message when online on first load', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    render(<App />);
    
    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });

  it('does not display friendly message when offline but game is already downloaded', () => {
    localStorage.setItem('gameDownloaded', 'true');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<App />);
    
    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });
});