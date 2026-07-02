import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from './GameScreen';

describe('TRIOFSND-51: First-Open Tooltip Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('displays the animated tooltip on first open', () => {
    render(<GameScreen />);
    const tooltip = screen.getByTestId('first-open-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('animate');
  });

  it('does not display the tooltip if already opened before', () => {
    localStorage.setItem('triofsnd_first_open', 'true');
    render(<GameScreen />);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('saves the first open state to local storage', () => {
    render(<GameScreen />);
    expect(localStorage.getItem('triofsnd_first_open')).toBe('true');
  });

  it('hides the tooltip upon tapping the ¡Jugar! button', () => {
    render(<GameScreen />);
    const playButton = screen.getByRole('button', { name: '¡Jugar!' });
    fireEvent.click(playButton);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('hides the tooltip upon tapping anywhere on the screen', () => {
    render(<GameScreen />);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('does not re-display the tooltip after dismissal on subsequent renders', () => {
    const { rerender } = render(<GameScreen />);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
    
    rerender(<GameScreen />);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });
});
