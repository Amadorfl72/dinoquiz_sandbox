import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FirstOpenTooltip from './FirstOpenTooltip';

describe('TRIOFSND-51: Implement First-Open Tooltip Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('displays the animated tooltip pointing to the ¡Jugar! button on first open', () => {
    render(<FirstOpenTooltip />);
    
    const tooltip = screen.getByTestId('first-open-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('animate-tooltip');
    expect(tooltip).toHaveAttribute('data-target', 'play-button');
  });

  it('does not display the tooltip if the app has been opened before (local storage flag set)', () => {
    localStorage.setItem('triofsnd_first_open', 'true');
    
    render(<FirstOpenTooltip />);
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  it('hides the tooltip and sets local storage upon the first tap on the screen', () => {
    render(<FirstOpenTooltip />);
    
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    act(() => {
      fireEvent.touchStart(document.body);
    });
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
    expect(localStorage.getItem('triofsnd_first_open')).toBe('true');
  });

  it('hides the tooltip and sets local storage upon the first tap on the ¡Jugar! button', () => {
    render(<FirstOpenTooltip />);
    
    const playButton = screen.getByTestId('play-button');
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(playButton);
    });
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
    expect(localStorage.getItem('triofsnd_first_open')).toBe('true');
  });
});