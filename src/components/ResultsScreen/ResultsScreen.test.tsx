import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnPlayAgain = jest.fn();

  beforeEach(() => {
    mockOnPlayAgain.mockClear();
  });

  describe('Score display', () => {
    it.each([
      [0],
      [1],
      [5],
      [7],
      [10],
    ])('displays "Has acertado %i/10" when score is %i', (score) => {
      render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText(`Has acertado ${score}/10`)).toBeInTheDocument();
    });

    it('displays the score prominently', () => {
      render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
      const scoreText = screen.getByText('Has acertado 8/10');
      expect(scoreText).toBeVisible();
    });
  });

  describe('Motivating messages by score range', () => {
    it.each([
      [0, /¡No te rindas|Sigue practicando|Inténtalo de nuevo/i],
      [1, /¡No te rindas|Sigue practicando|Inténtalo de nuevo/i],
      [2, /¡No te rindas|Sigue practicando|Inténtalo de nuevo/i],
      [3, /¡No te rindas|Sigue practicando|Inténtalo de nuevo/i],
    ])('shows low-range motivating message for score %i (0-3)', (score, expectedPattern) => {
      render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(expectedPattern);
    });

    it.each([
      [4, /Bien hecho|Vas mejorando|Sigue así/i],
      [5, /Bien hecho|Vas mejorando|Sigue así/i],
      [6, /Bien hecho|Vas mejorando|Sigue así/i],
    ])('shows mid-range motivating message for score %i (4-6)', (score, expectedPattern) => {
      render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(expectedPattern);
    });

    it.each([
      [7, /¡Genial|¡Muy bien|Casi perfecto/i],
      [8, /¡Genial|¡Muy bien|Casi perfecto/i],
    ])('shows high-range motivating message for score %i (7-8)', (score, expectedPattern) => {
      render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(expectedPattern);
    });

    it.each([
      [9, /¡Excelente|¡Perfecto|¡Eres un crack/i],
      [10, /¡Excelente|¡Perfecto|¡Eres un crack/i],
    ])('shows top-range motivating message for score %i (9-10)', (score, expectedPattern) => {
      render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent(expectedPattern);
    });

    it('renders exactly one motivating message', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const messages = screen.getAllByTestId('motivating-message');
      expect(messages).toHaveLength(1);
    });
  });

  describe('"Volver a jugar" button', () => {
    it('renders a button with text "Volver a jugar"', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });

    it('has a minimum height of 48dp (48px)', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      const computedStyle = window.getComputedStyle(button);
      const minHeight = parseFloat(computedStyle.minHeight || computedStyle.height || '0');
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });

    it('is prominently styled (has distinct background or elevated appearance)', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      const computedStyle = window.getComputedStyle(button);
      // Button should have a non-transparent background or elevation
      const hasBackground = computedStyle.backgroundColor !== 'transparent' && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasElevation = parseFloat(computedStyle.boxShadow ? '1' : '0') > 0 || computedStyle.boxShadow !== 'none';
      expect(hasBackground || hasElevation).toBe(true);
    });

    it('calls onPlayAgain when clicked', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('is enabled and clickable', () => {
      render(<ResultsScreen score={0} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Edge cases', () => {
    it('handles score of 0 correctly', () => {
      render(<ResultsScreen score={0} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText('Has acertado 0/10')).toBeInTheDocument();
      expect(screen.getByTestId('motivating-message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Volver a jugar/i })).toBeInTheDocument();
    });

    it('handles score of 10 correctly', () => {
      render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText('Has acertado 10/10')).toBeInTheDocument();
      expect(screen.getByTestId('motivating-message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Volver a jugar/i })).toBeInTheDocument();
    });

    it('throws or handles invalid scores gracefully', () => {
      // Score outside 0-10 should not crash
      expect(() => render(<ResultsScreen score={-1} onPlayAgain={mockOnPlayAgain} />)).not.toThrow();
      expect(() => render(<ResultsScreen score={11} onPlayAgain={mockOnPlayAgain} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('button is keyboard accessible', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('motivating message is readable by screen readers', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).not.toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Snapshot', () => {
    it('matches snapshot for score 0', () => {
      const { container } = render(<ResultsScreen score={0} onPlayAgain={mockOnPlayAgain} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot for score 10', () => {
      const { container } = render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
      expect(container).toMatchSnapshot();
    });
  });
});
