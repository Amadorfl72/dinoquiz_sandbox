import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import * as gameCompletedLogger from '../logging';
import {
  assertButtonMinHeight,
  assertButtonMinWidth,
} from './ResultsScreen/__mocks__/styleMock';

describe('ResultsScreen', () => {
  const mockOnReplay = jest.fn();

  beforeEach(() => {
    mockOnReplay.mockClear();
  });

  describe('Score Display', () => {
    it('renders the score text with the provided score', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 5\/10/i)).toBeInTheDocument();
    });

    it('renders the score text for score 0', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 0\/10/i)).toBeInTheDocument();
    });

    it('renders the score text for score 10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 10\/10/i)).toBeInTheDocument();
    });

    it('renders the score text for every valid score 0-10', () => {
      for (let s = 0; s <= 10; s++) {
        const { unmount } = render(<ResultsScreen score={s} onReplay={mockOnReplay} />);
        expect(screen.getByText(`Has acertado ${s}/10`)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Motivating Messages based on Score Ranges', () => {
    it('renders the correct message for score range 0-3', () => {
      render(<ResultsScreen score={2} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡No te rindas!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 0 (boundary)', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡No te rindas! ¡Sigue intentándolo!')).toBeInTheDocument();
    });

    it('renders the correct message for score 3 (boundary)', () => {
      render(<ResultsScreen score={3} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡No te rindas! ¡Sigue intentándolo!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 4-6', () => {
      render(<ResultsScreen score={6} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Buen trabajo!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 4 (boundary)', () => {
      render(<ResultsScreen score={4} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Buen trabajo! ¡Puedes mejorar!')).toBeInTheDocument();
    });

    it('renders the correct message for score 6 (boundary)', () => {
      render(<ResultsScreen score={6} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Buen trabajo! ¡Puedes mejorar!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 7-8', () => {
      render(<ResultsScreen score={8} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Muy bien!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 7 (boundary)', () => {
      render(<ResultsScreen score={7} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Muy bien! ¡Casi lo logras!')).toBeInTheDocument();
    });

    it('renders the correct message for score 8 (boundary)', () => {
      render(<ResultsScreen score={8} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Muy bien! ¡Casi lo logras!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 9-10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Excelente!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 9 (boundary)', () => {
      render(<ResultsScreen score={9} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Excelente! ¡Eres un genio!')).toBeInTheDocument();
    });

    it('renders the correct message for score 10 (boundary)', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Excelente! ¡Eres un genio!')).toBeInTheDocument();
    });

    it('renders the motivating message with testID "motivating-message"', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeInTheDocument();
      expect(message.textContent).toBe('¡Buen trabajo! ¡Puedes mejorar!');
    });
  });

  describe('Volver a jugar Button', () => {
    it('renders a prominent "Volver a jugar" button', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onReplay when the button is clicked', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(mockOnReplay).toHaveBeenCalledTimes(1);
    });

    it('does not call onReplay on render', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(mockOnReplay).not.toHaveBeenCalled();
    });

    it('renders the button for every score range', () => {
      [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
        const { unmount } = render(<ResultsScreen score={score} onReplay={mockOnReplay} />);
        const button = screen.getByRole('button', { name: /Volver a jugar/i });
        expect(button).toBeInTheDocument();
        unmount();
      });
    });

    it('calls onReplay each time the button is clicked', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(mockOnReplay).toHaveBeenCalledTimes(3);
    });
  });

  describe('Button Sizing (TRIOFSND-32: >=48dp)', () => {
    const getReplayButtonContainerStyle = () => {
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      const container = button.parentElement;
      const computed = window.getComputedStyle(container);
      return {
        minHeight: parseInt(computed.minHeight || '0', 10) || 0,
        minWidth: parseInt(computed.minWidth || '0', 10) || 0,
      };
    };

    it('button container meets minimum height requirement of 48dp', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const style = getReplayButtonContainerStyle();
      expect(assertButtonMinHeight(style)).toBe(true);
    });

    it('button container meets minimum width requirement of 48dp', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const style = getReplayButtonContainerStyle();
      expect(assertButtonMinWidth(style)).toBe(true);
    });

    it('button container minHeight is at least 48', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      const style = getReplayButtonContainerStyle();
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
    });

    it('button container minWidth is at least 48', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      const style = getReplayButtonContainerStyle();
      expect(style.minWidth).toBeGreaterThanOrEqual(48);
    });

    it('button container meets sizing requirements for score 10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      const style = getReplayButtonContainerStyle();
      expect(assertButtonMinHeight(style)).toBe(true);
      expect(assertButtonMinWidth(style)).toBe(true);
    });

    it('button container meets sizing requirements across all score ranges', () => {
      [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
        const { unmount } = render(<ResultsScreen score={score} onReplay={mockOnReplay} />);
        const style = getReplayButtonContainerStyle();
        expect(assertButtonMinHeight(style)).toBe(true);
        expect(assertButtonMinWidth(style)).toBe(true);
        unmount();
      });
    });
  });

  describe('Component Rendering', () => {
    it('renders without crashing for score 0', () => {
      expect(() => render(<ResultsScreen score={0} onReplay={mockOnReplay} />)).not.toThrow();
    });

    it('renders without crashing for score 10', () => {
      expect(() => render(<ResultsScreen score={10} onReplay={mockOnReplay} />)).not.toThrow();
    });

    it('renders all three key elements: score, message, and button', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 5\/10/i)).toBeInTheDocument();
      expect(screen.getByTestId('motivating-message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Volver a jugar/i })).toBeInTheDocument();
    });
  });

  describe('TRIOFSND-36: ResultsScreen Logging', () => {
    it('logs game_completed event upon reaching the results screen', () => {
      const logSpy = jest
        .spyOn(gameCompletedLogger, 'logGameCompleted')
        .mockResolvedValue(undefined);

      const gameData = {
        score: 2000,
        durationMs: 180000,
        appVersion: '1.2.3',
      };

      render(
        <ResultsScreen
          score={gameData.score}
          durationMs={gameData.durationMs}
          appVersion={gameData.appVersion}
          onReplay={mockOnReplay}
        />
      );

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        gameData.score,
        gameData.durationMs,
        gameData.appVersion
      );

      logSpy.mockRestore();
    });

    it('does not block rendering if logging fails', () => {
      jest
        .spyOn(gameCompletedLogger, 'logGameCompleted')
        .mockRejectedValue(new Error('fail'));

      const { getByText } = render(
        <ResultsScreen score={100} durationMs={5000} appVersion="1.0.0" onReplay={mockOnReplay} />
      );

      expect(getByText(/Has acertado 100\/10/i)).toBeInTheDocument();
    });

    it('re-logs when props change', () => {
      const logSpy = jest
        .spyOn(gameCompletedLogger, 'logGameCompleted')
        .mockResolvedValue(undefined);

      const { rerender } = render(
        <ResultsScreen score={100} durationMs={5000} appVersion="1.0.0" onReplay={mockOnReplay} />
      );

      expect(logSpy).toHaveBeenCalledTimes(1);

      rerender(
        <ResultsScreen score={200} durationMs={5000} appVersion="1.0.0" onReplay={mockOnReplay} />
      );

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenLastCalledWith(200, 5000, '1.0.0');

      logSpy.mockRestore();
    });
  });
});