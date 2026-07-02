import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen Component', () => {
  const mockOnReplay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the score correctly as "Has acertado X/10"', () => {
    render(<ResultsScreen score={7} onReplay={mockOnReplay} />);
    expect(screen.getByText(/Has acertado 7\/10/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 0-3', () => {
    render(<ResultsScreen score={2} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Sigue intentándolo!/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 4-6', () => {
    render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Buen trabajo!/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 7-8', () => {
    render(<ResultsScreen score={8} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Excelente!/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 9-10', () => {
    render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Increíble!/i)).toBeInTheDocument();
  });

  it('renders the "Volver a jugar" button', () => {
    render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toBeInTheDocument();
  });

  it('ensures the "Volver a jugar" button has a minimum height of 48px (48dp)', () => {
    render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toHaveStyle({ minHeight: '48px' });
  });

  it('triggers the onReplay callback when the button is clicked', () => {
    render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(button);
    expect(mockOnReplay).toHaveBeenCalledTimes(1);
  });
});