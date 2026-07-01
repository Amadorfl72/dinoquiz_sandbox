import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

describe('TRIOFSND-51: Implement First-Open Tooltip Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  test('displays animated tooltip pointing to the "¡Jugar!" button on first open', () => {
    render(<App />);
    
    const playButton = screen.getByRole('button', { name: /¡Jugar!/i });
    const tooltip = screen.getByTestId('first-open-tooltip');
    
    expect(playButton).toBeInTheDocument();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass('animated');
  });

  test('does not display tooltip on subsequent opens', () => {
    localStorage.setItem('hasOpened', 'true');
    
    render(<App />);
    
    expect(screen.getByRole('button', { name: /¡Jugar!/i })).toBeInTheDocument();
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('tooltip disappears upon the first tap on the screen', () => {
    render(<App />);
    
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    fireEvent.touchStart(document.body);
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('tooltip disappears upon tapping the "¡Jugar!" button', () => {
    render(<App />);
    
    const playButton = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(screen.getByTestId('first-open-tooltip')).toBeInTheDocument();
    
    fireEvent.click(playButton);
    
    expect(screen.queryByTestId('first-open-tooltip')).not.toBeInTheDocument();
  });

  test('sets the local storage flag after first open', () => {
    render(<App />);
    
    expect(localStorage.getItem('hasOpened')).toBe('true');
  });
});
