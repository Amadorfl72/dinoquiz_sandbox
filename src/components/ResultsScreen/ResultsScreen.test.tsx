import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen', () => {
  describe('Score display', () => {
    it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
      'renders the score text "Has acertado X/10" for score %d',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        expect(screen.getByText(`Has acertado ${score}/10`)).toBeInTheDocument();
      }
    );

    it('renders the score prominently', () => {
      render(<ResultsScreen score={7} onPlayAgain={jest.fn()} />);
      const scoreElement = screen.getByText('Has acertado 7/10');
      expect(scoreElement).toBeVisible();
    });
  });

  describe('Motivating message based on score ranges', () => {
    it.each([0, 1, 2, 3])(
      'renders the low-range motivating message for score %d (0-3)',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        const message = screen.getByTestId('motivating-message');
        expect(message).toBeInTheDocument();
        expect(message.textContent).not.toBe('');
        expect(message.textContent?.length).toBeGreaterThan(0);
      }
    );

    it.each([4, 5, 6])(
      'renders the mid-range motivating message for score %d (4-6)',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        const message = screen.getByTestId('motivating-message');
        expect(message).toBeInTheDocument();
        expect(message.textContent).not.toBe('');
        expect(message.textContent?.length).toBeGreaterThan(0);
      }
    );

    it.each([7, 8])(
      'renders the high-range motivating message for score %d (7-8)',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        const message = screen.getByTestId('motivating-message');
        expect(message).toBeInTheDocument();
        expect(message.textContent).not.toBe('');
        expect(message.textContent?.length).toBeGreaterThan(0);
      }
    );

    it.each([9, 10])(
      'renders the top-range motivating message for score %d (9-10)',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        const message = screen.getByTestId('motivating-message');
        expect(message).toBeInTheDocument();
        expect(message.textContent).not.toBe('');
        expect(message.textContent?.length).toBeGreaterThan(0);
      }
    );

    it('renders different messages for different score ranges', () => {
      const { rerender } = render(<ResultsScreen score={2} onPlayAgain={jest.fn()} />);
      const lowMessage = screen.getByTestId('motivating-message').textContent;

      rerender(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const midMessage = screen.getByTestId('motivating-message').textContent;

      rerender(<ResultsScreen score={8} onPlayAgain={jest.fn()} />);
      const highMessage = screen.getByTestId('motivating-message').textContent;

      rerender(<ResultsScreen score={10} onPlayAgain={jest.fn()} />);
      const topMessage = screen.getByTestId('motivating-message').textContent;

      const messages = [lowMessage, midMessage, highMessage, topMessage];
      const uniqueMessages = new Set(messages);
      expect(uniqueMessages.size).toBe(4);
    });

    it('uses the same message within the same range', () => {
      const { rerender } = render(<ResultsScreen score={4} onPlayAgain={jest.fn()} />);
      const message4 = screen.getByTestId('motivating-message').textContent;

      rerender(<ResultsScreen score={6} onPlayAgain={jest.fn()} />);
      const message6 = screen.getByTestId('motivating-message').textContent;

      expect(message4).toBe(message6);
    });
  });

  describe('"Volver a jugar" button', () => {
    it('renders the "Volver a jugar" button', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('renders the button with accessible name "Volver a jugar"', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: 'Volver a jugar' });
      expect(button).toBeVisible();
    });

    it('calls onPlayAgain when the button is clicked', () => {
      const onPlayAgain = jest.fn();
      render(<ResultsScreen score={5} onPlayAgain={onPlayAgain} />);
      const button = screen.getByRole('button', { name: /volver a jugar/i });
      fireEvent.click(button);
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('has a minimum height of 48dp (48px)', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /volver a jugar/i });
      const styles = window.getComputedStyle(button);
      const height = parseFloat(styles.height || styles.minHeight || '0');
      expect(height).toBeGreaterThanOrEqual(48);
    });

    it('has a minimum width of 48dp (48px) for touch target', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /volver a jugar/i });
      const styles = window.getComputedStyle(button);
      const width = parseFloat(styles.width || styles.minWidth || '0');
      expect(width).toBeGreaterThanOrEqual(48);
    });

    it('is prominently displayed (visible and not disabled)', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /volver a jugar/i });
      expect(button).not.toBeDisabled();
      expect(button).toBeVisible();
    });
  });

  describe('Edge cases and validation', () => {
    it('throws or handles gracefully when score is out of range (negative)', () => {
      expect(() => render(<ResultsScreen score={-1} onPlayAgain={jest.fn()} />)).not.toThrow();
    });

    it('throws or handles gracefully when score is above 10', () => {
      expect(() => render(<ResultsScreen score={11} onPlayAgain={jest.fn()} />)).not.toThrow();
    });

    it('renders without crashing for all valid scores', () => {
      for (let score = 0; score <= 10; score++) {
        const { unmount } = render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        expect(screen.getByText(`Has acertado ${score}/10`)).toBeInTheDocument();
        unmount();
      }
    });
  });
});
