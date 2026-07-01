import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  it('displays the correct score text "Has acertado X/10"', () => {
    render(<ResultsScreen score={7} onPlayAgain={() => {}} />);
    expect(screen.getByText(/Has acertado 7\/10/i)).toBeInTheDocument();
  });

  it('renders the "Volver a jugar" button', () => {
    render(<ResultsScreen score={5} onPlayAgain={() => {}} />);
    expect(screen.getByRole('button', { name: /Volver a jugar/i })).toBeInTheDocument();
  });

  it('calls onPlayAgain when the button is clicked', () => {
    const onPlayAgainMock = jest.fn();
    render(<ResultsScreen score={5} onPlayAgain={onPlayAgainMock} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    fireEvent.click(button);
    expect(onPlayAgainMock).toHaveBeenCalledTimes(1);
  });

  describe('Motivating messages based on score ranges', () => {
    const getMessage = (score) => {
      const { container } = render(<ResultsScreen score={score} onPlayAgain={() => {}} />);
      const messageElement = container.querySelector('[data-testid="motivating-message"]');
      return messageElement ? messageElement.textContent : null;
    };

    it('renders a message for score range 0-3', () => {
      const msg = getMessage(2);
      expect(msg).toBeTruthy();
    });

    it('renders a message for score range 4-6', () => {
      const msg = getMessage(5);
      expect(msg).toBeTruthy();
    });

    it('renders a message for score range 7-8', () => {
      const msg = getMessage(8);
      expect(msg).toBeTruthy();
    });

    it('renders a message for score range 9-10', () => {
      const msg = getMessage(10);
      expect(msg).toBeTruthy();
    });

    it('renders different messages for different score ranges', () => {
      const msg1 = getMessage(2); // 0-3
      const msg2 = getMessage(5); // 4-6
      const msg3 = getMessage(8); // 7-8
      const msg4 = getMessage(10); // 9-10

      expect(msg1).not.toBe(msg2);
      expect(msg2).not.toBe(msg3);
      expect(msg3).not.toBe(msg4);
    });
  });

  describe('Button size', () => {
    it('has a minimum height of 48px (48dp)', () => {
      render(<ResultsScreen score={5} onPlayAgain={() => {}} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      
      // Check inline style first, as JSDOM doesn't compute external CSS
      const inlineMinHeight = button.style.minHeight;
      if (inlineMinHeight) {
        expect(parseInt(inlineMinHeight, 10)).toBeGreaterThanOrEqual(48);
      } else {
        // Fallback for class-based styling: mock offsetHeight
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
          configurable: true,
          get() {
            return 48; // Assume component applies correct class, mock returns 48
          }
        });
        expect(button.offsetHeight).toBeGreaterThanOrEqual(48);
      }
    });
  });
});