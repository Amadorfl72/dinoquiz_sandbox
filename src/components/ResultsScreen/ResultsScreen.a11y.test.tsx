import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from '../ResultsScreen';
import {
  assertButtonMinHeight,
  assertButtonMinWidth,
} from './__mocks__/styleMock';

describe('ResultsScreen Accessibility', () => {
  it('displays the score text which is readable by screen readers', () => {
    render(<ResultsScreen score={7} onReplay={jest.fn()} />);
    expect(screen.getByText(/Has acertado 7\/10/i)).toBeInTheDocument();
  });

  it('button has an accessible name', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName();
    expect(button.textContent).toMatch(/volver a jugar/i);
  });

  it('button accessible name is "Volver a jugar"', () => {
    render(<ResultsScreen score={0} onReplay={jest.fn()} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toBeInTheDocument();
  });

  it('button has accessibilityLabel set to "Volver a jugar"', () => {
    render(<ResultsScreen score={3} onReplay={jest.fn()} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName(/Volver a jugar/i);
  });

  it('motivating message is present and readable by screen readers', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const message = screen.getByTestId('motivating-message');
    expect(message).toBeVisible();
  });

  it('motivating message has text content', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const message = screen.getByTestId('motivating-message');
    expect(message.textContent).toBeTruthy();
    expect(message.textContent).toBe('¡Buen trabajo! ¡Puedes mejorar!');
  });

  it('score text is present for screen reader users', () => {
    render(<ResultsScreen score={10} onReplay={jest.fn()} />);
    const scoreText = screen.getByText('Has acertado 10/10');
    expect(scoreText).toBeInTheDocument();
    expect(scoreText).toBeVisible();
  });

  it('all four motivational messages are accessible across score ranges', () => {
    const scoresAndMessages = [
      { score: 2, message: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 5, message: '¡Buen trabajo! ¡Puedes mejorar!' },
      { score: 8, message: '¡Muy bien! ¡Casi lo logras!' },
      { score: 10, message: '¡Excelente! ¡Eres un genio!' },
    ];

    scoresAndMessages.forEach(({ score, message }) => {
      const { unmount } = render(<ResultsScreen score={score} onReplay={jest.fn()} />);
      const msgElement = screen.getByTestId('motivating-message');
      expect(msgElement).toBeVisible();
      expect(msgElement.textContent).toBe(message);
      unmount();
    });
  });

  it('button is large enough for touch targets (>=48dp height)', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    const container = button.parentElement;
    const computed = window.getComputedStyle(container);
    const style = {
      minHeight: parseInt(computed.minHeight || '0', 10) || 0,
      minWidth: parseInt(computed.minWidth || '0', 10) || 0,
    };
    expect(assertButtonMinHeight(style)).toBe(true);
  });

  it('button is large enough for touch targets (>=48dp width)', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const button = screen.getByRole('button', { name: /Volver a jugar/i });
    const container = button.parentElement;
    const computed = window.getComputedStyle(container);
    const style = {
      minHeight: parseInt(computed.minHeight || '0', 10) || 0,
      minWidth: parseInt(computed.minWidth || '0', 10) || 0,
    };
    expect(assertButtonMinWidth(style)).toBe(true);
  });

  it('score text is visible and readable for all score ranges', () => {
    [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
      const { unmount } = render(<ResultsScreen score={score} onReplay={jest.fn()} />);
      const scoreText = screen.getByText(new RegExp(`Has acertado ${score}/10`, 'i'));
      expect(scoreText).toBeInTheDocument();
      expect(scoreText).toBeVisible();
      unmount();
    });
  });

  it('motivating message is visible for all score ranges', () => {
    [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
      const { unmount } = render(<ResultsScreen score={score} onReplay={jest.fn()} />);
      const message = screen.getByTestId('motivating-message');
      expect(message).toBeVisible();
      expect(message.textContent).toBeTruthy();
      unmount();
    });
  });

  it('button is visible and accessible for all score ranges', () => {
    [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
      const { unmount } = render(<ResultsScreen score={score} onReplay={jest.fn()} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
      expect(button).toHaveAccessibleName();
      unmount();
    });
  });
});
