import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnPlayAgain = jest.fn();

  beforeEach(() => {
    mockOnPlayAgain.mockClear();
  });

  it('displays the correct score text', () => {
    render(<ResultsScreen score={7} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/Has acertado 7\/10/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 0-3', () => {
    render(<ResultsScreen score={2} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/No te rindas/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 4-6', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/Buen trabajo/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 7-8', () => {
    render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/Excelente/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 9-10', () => {
    render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/Perfecto/i)).toBeInTheDocument();
  });

  it('renders a "Volver a jugar" button with minimum height of 48px', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toBeInTheDocument();
    expect(button.style.minHeight).toBe('48px');
  });

  it('calls onPlayAgain when the "Volver a jugar" button is clicked', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(button);
    expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
  });
});