import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from './Tooltip';

describe('TRIOFSND-51: First-Open Tooltip Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('displays the animated tooltip on first open', () => {
    render(<Tooltip targetId="jugar-button" />);
    const tooltip = screen.getByTestId('first-open-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('tooltip');
  });

  it('does not display the tooltip if already opened before', () => {
    localStorage.setItem('triofsnd_first_open', 'true');
    render(<Tooltip targetId="jugar-button" />);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('saves the first open state to local storage', () => {
    render(<Tooltip targetId="jugar-button" />);
    expect(localStorage.getItem('triofsnd_first_open')).toBe('true');
  });

  it('hides the tooltip upon tapping the ¡Jugar! button', () => {
    render(
      <div>
        <button id="jugar-button">¡Jugar!</button>
        <Tooltip targetId="jugar-button" />
      </div>
    );
    const playButton = screen.getByText('¡Jugar!');
    fireEvent.click(playButton);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('hides the tooltip upon tapping anywhere on the screen', () => {
    render(<Tooltip targetId="jugar-button" />);
    fireEvent.click(document.body);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('does not re-display the tooltip after dismissal on subsequent renders', () => {
    const { rerender } = render(<Tooltip targetId="jugar-button" />);
    fireEvent.click(document.body);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
    
    rerender(<Tooltip targetId="jugar-button" />);
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });
});
