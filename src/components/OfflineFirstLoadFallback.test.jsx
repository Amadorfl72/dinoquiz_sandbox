import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineFirstLoadFallback from './OfflineFirstLoadFallback';

describe('OfflineFirstLoadFallback - TRIOFSND-7', () => {
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    // Reset localStorage to simulate first-time load
    localStorage.clear();
    // Reset any uncaught errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('displays the friendly message when offline and it is the first time load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.removeItem('gameDownloaded');

    render(<OfflineFirstLoadFallback />);

    expect(screen.getByText('Conéctate la primera vez para descargar el juego')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not display the message when online and it is the first time load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    localStorage.removeItem('gameDownloaded');

    render(<OfflineFirstLoadFallback />);

    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });

  it('does not display the message when offline but the game is already downloaded', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.setItem('gameDownloaded', 'true');

    render(<OfflineFirstLoadFallback />);

    expect(screen.queryByText('Conéctate la primera vez para descargar el juego')).not.toBeInTheDocument();
  });

  it('does not throw technical errors when offline on first load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.removeItem('gameDownloaded');

    expect(() => render(<OfflineFirstLoadFallback />)).not.toThrow();
  });
});