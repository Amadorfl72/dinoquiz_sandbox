import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen Component', () => {
  const mockOnPlayAgain = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the score correctly as "Has acertado X/10"', () => {
    render(<ResultsScreen score={7} onPlayAgain={mockOnPlayAgain} />);
    expect(screen.getByText(/Has acertado 7\/10/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 0-3', () => {
    render(<ResultsScreen score={2} onPlayAgain={mockOnPlayAgain} />);
    // Assuming the message for 0-3 contains words like 'rindas' or 'practica'
    expect(screen.getByText(/No te rindas|practica más/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 4-6', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    // Assuming the message for 4-6 contains words like 'buen trabajo' or 'mejorar'
    expect(screen.getByText(/Buen trabajo|puedes mejorar/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 7-8', () => {
    render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
    // Assuming the message for 7-8 contains words like 'muy bien' or 'genial'
    expect(screen.getByText(/Muy bien hecho|genial/i)).toBeInTheDocument();
  });

  it('renders a motivating message for score range 9-10', () => {
    render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
    // Assuming the message for 9-10 contains words like 'excelente' or 'experto'
    expect(screen.getByText(/Excelente|experto/i)).toBeInTheDocument();
  });

  it('renders the "Volver a jugar" button', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toBeInTheDocument();
  });

  it('ensures the "Volver a jugar" button has a minimum height of 48px (48dp)', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toHaveStyle({ minHeight: '48px' });
  });

  it('triggers the onPlayAgain callback when the button is clicked', () => {
    render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(button);
    expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
  });
});