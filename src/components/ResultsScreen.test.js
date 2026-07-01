import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  // Assuming the motivating messages are as follows based on score ranges
  const messages = {
    low: '¡Sigue practicando!',
    medium: '¡Buen trabajo!',
    high: '¡Muy bien hecho!',
    top: '¡Excelente!'
  };

  it('displays "Has acertado X/10" with the correct score', () => {
    render(<ResultsScreen score={7} />);
    expect(screen.getByText('Has acertado 7/10')).toBeInTheDocument();
  });

  it('displays the correct motivating message for score range 0-3', () => {
    render(<ResultsScreen score={2} />);
    expect(screen.getByText(messages.low)).toBeInTheDocument();
  });

  it('displays the correct motivating message for score range 4-6', () => {
    render(<ResultsScreen score={5} />);
    expect(screen.getByText(messages.medium)).toBeInTheDocument();
  });

  it('displays the correct motivating message for score range 7-8', () => {
    render(<ResultsScreen score={8} />);
    expect(screen.getByText(messages.high)).toBeInTheDocument();
  });

  it('displays the correct motivating message for score range 9-10', () => {
    render(<ResultsScreen score={10} />);
    expect(screen.getByText(messages.top)).toBeInTheDocument();
  });

  it('displays a prominent "Volver a jugar" button with height >= 48px', () => {
    render(<ResultsScreen score={5} />);
    const button = screen.getByRole('button', { name: /volver a jugar/i });
    expect(button).toBeInTheDocument();
    
    // Check that the button meets the minimum height requirement (48dp ~ 48px in web)
    expect(button).toHaveStyle({ minHeight: '48px' });
  });
});
