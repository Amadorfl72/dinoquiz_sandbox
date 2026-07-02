import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen', () => {
  describe('score display', () => {
    it('renders the score in the format "Has acertado X/10"', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      expect(screen.getByText(/Has acertado 5\/10/i)).toBeInTheDocument();
    });

    it('renders score 0 correctly', () => {
      render(<ResultsScreen score={0} onPlayAgain={jest.fn()} />);
      expect(screen.getByText(/Has acertado 0\/10/i)).toBeInTheDocument();
    });

    it('renders score 10 correctly', () => {
      render(<ResultsScreen score={10} onPlayAgain={jest.fn()} />);
      expect(screen.getByText(/Has acertado 10\/10/i)).toBeInTheDocument();
    });
  });

  describe('motivating messages based on score ranges', () => {
    const rangeCases: Array<[number, string]> = [
      [0, '0-3'],
      [1, '0-3'],
      [2, '0-3'],
      [3, '0-3'],
      [4, '4-6'],
      [5, '4-6'],
      [6, '4-6'],
      [7, '7-8'],
      [8, '7-8'],
      [9, '9-10'],
      [10, '9-10'],
    ];

    it.each(rangeCases)(
      'renders a motivating message for score %i (range %s)',
      (score) => {
        render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        const message = screen.getByTestId('motivating-message');
        expect(message).toBeInTheDocument();
        expect(message.textContent).not.toBe('');
      }
    );

    it('renders the same message for all scores in the 0-3 range', () => {
      const { unmount: u0 } = render(<ResultsScreen score={0} onPlayAgain={jest.fn()} />);
      const m0 = screen.getByTestId('motivating-message').textContent;
      u0();
      const { unmount: u3 } = render(<ResultsScreen score={3} onPlayAgain={jest.fn()} />);
      const m3 = screen.getByTestId('motivating-message').textContent;
      expect(m0).toBe(m3);
      u3();
    });

    it('renders the same message for all scores in the 4-6 range', () => {
      const { unmount: u4 } = render(<ResultsScreen score={4} onPlayAgain={jest.fn()} />);
      const m4 = screen.getByTestId('motivating-message').textContent;
      u4();
      const { unmount: u6 } = render(<ResultsScreen score={6} onPlayAgain={jest.fn()} />);
      const m6 = screen.getByTestId('motivating-message').textContent;
      expect(m4).toBe(m6);
      u6();
    });

    it('renders the same message for all scores in the 7-8 range', () => {
      const { unmount: u7 } = render(<ResultsScreen score={7} onPlayAgain={jest.fn()} />);
      const m7 = screen.getByTestId('motivating-message').textContent;
      u7();
      const { unmount: u8 } = render(<ResultsScreen score={8} onPlayAgain={jest.fn()} />);
      const m8 = screen.getByTestId('motivating-message').textContent;
      expect(m7).toBe(m8);
      u8();
    });

    it('renders the same message for all scores in the 9-10 range', () => {
      const { unmount: u9 } = render(<ResultsScreen score={9} onPlayAgain={jest.fn()} />);
      const m9 = screen.getByTestId('motivating-message').textContent;
      u9();
      const { unmount: u10 } = render(<ResultsScreen score={10} onPlayAgain={jest.fn()} />);
      const m10 = screen.getByTestId('motivating-message').textContent;
      expect(m9).toBe(m10);
      u10();
    });

    it('renders different messages across different ranges', () => {
      const messages = new Set<string>();
      [0, 4, 7, 9].forEach((score) => {
        const { unmount } = render(<ResultsScreen score={score} onPlayAgain={jest.fn()} />);
        messages.add(screen.getByTestId('motivating-message').textContent);
        unmount();
      });
      expect(messages.size).toBe(4);
    });
  });

  describe('"Volver a jugar" button', () => {
    it('renders a button with the text "Volver a jugar"', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('has a minimum height of 48dp (48px)', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      const height = parseFloat(getComputedStyle(button).height);
      expect(height).toBeGreaterThanOrEqual(48);
    });

    it('has a minimum min-height of 48px to ensure touch target', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      const minHeight = parseFloat(getComputedStyle(button).minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });

    it('calls onPlayAgain when clicked', () => {
      const onPlayAgain = jest.fn();
      render(<ResultsScreen score={5} onPlayAgain={onPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('is enabled and interactive', () => {
      render(<ResultsScreen score={5} onPlayAgain={jest.fn()} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('clamps negative scores to the 0-3 range message', () => {
      render(<ResultsScreen score={-1} onPlayAgain={jest.fn()} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
    });

    it('clamps scores above 10 to the 9-10 range message', () => {
      render(<ResultsScreen score={11} onPlayAgain={jest.fn()} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
    });
  });
});
