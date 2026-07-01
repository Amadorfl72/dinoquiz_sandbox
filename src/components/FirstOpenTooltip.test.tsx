import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FirstOpenTooltip from './FirstOpenTooltip';

describe('TRIOFSND-51: Implement First-Open Tooltip Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('displays the animated tooltip pointing to the ¡Jugar! button on first app open', () => {
    localStorage.setItem('hasOpenedApp', 'false');
    render(
      <FirstOpenTooltip>
        <button>¡Jugar!</button>
      </FirstOpenTooltip>
    );
    
    const tooltip = screen.getByTestId('first-open-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('animated');
    expect(screen.getByRole('button', { name: /¡Jugar!/i })).toBeInTheDocument();
  });

  test('does not display the tooltip if it is not the first app open', () => {
    localStorage.setItem('hasOpenedApp', 'true');
    render(
      <FirstOpenTooltip>
        <button>¡Jugar!</button>
      </FirstOpenTooltip>
    );
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('disappears upon the first tap on the screen', () => {
    localStorage.setItem('hasOpenedApp', 'false');
    render(
      <FirstOpenTooltip>
        <button>¡Jugar!</button>
      </FirstOpenTooltip>
    );
    
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('disappears upon tapping the ¡Jugar! button', () => {
    localStorage.setItem('hasOpenedApp', 'false');
    render(
      <FirstOpenTooltip>
        <button>¡Jugar!</button>
      </FirstOpenTooltip>
    );
    
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /¡Jugar!/i }));
    });
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('updates local storage flag after first open', () => {
    localStorage.setItem('hasOpenedApp', 'false');
    render(
      <FirstOpenTooltip>
        <button>¡Jugar!</button>
      </FirstOpenTooltip>
    );
    
    expect(localStorage.getItem('hasOpenedApp')).toBe('true');
  });
});