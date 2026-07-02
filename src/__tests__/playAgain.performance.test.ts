import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Game } from '../Game';
import { selectQuestions } from '../services/questionService';

jest.mock('../services/questionService');

const mockedSelectQuestions = selectQuestions as jest.MockedFunction<typeof selectQuestions>;

const buildQuestions = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    text: `Pregunta ${i}`,
    answers: ['a', 'b', 'c'],
  }));

describe('TRIOFSND-39 - Performance: restart shows first question in < 2s', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectQuestions.mockReturnValue(buildQuestions(50));
  });

  it('displays the first question within 2 seconds after clicking "Volver a jugar"', () => {
    const { container } = render(<Game />);

    // Force the game into the results screen by finishing the round.
    act(() => {
      // Simulate a completed round via the public test hook exposed by <Game />.
      const finishHook = container.querySelector('[data-testid="finish-round-hook"]');
      expect(finishHook).not.toBeNull();
      fireEvent.click(finishHook!);
    });

    const playAgainButton = screen.getByRole('button', { name: /volver a jugar/i });
    expect(playAgainButton).toBeInTheDocument();

    const start = performance.now();

    act(() => {
      fireEvent.click(playAgainButton);
    });

    const firstQuestion = screen.getByTestId('current-question-text');
    const elapsed = performance.now() - start;

    expect(firstQuestion).toHaveTextContent('Pregunta 0');
    expect(elapsed).toBeLessThan(2000);
  });

  it('measures restart latency across multiple consecutive restarts', () => {
    const { container } = render(<Game />);

    const measurements: number[] = [];

    for (let i = 0; i < 5; i++) {
      act(() => {
        const finishHook = container.querySelector('[data-testid="finish-round-hook"]')!;
        fireEvent.click(finishHook);
      });

      const button = screen.getByRole('button', { name: /volver a jugar/i });
      const start = performance.now();

      act(() => {
        fireEvent.click(button);
      });

      const question = screen.getByTestId('current-question-text');
      const elapsed = performance.now() - start;

      expect(question).toBeInTheDocument();
      expect(elapsed).toBeLessThan(2000);
      measurements.push(elapsed);
    }

    const max = Math.max(...measurements);
    expect(max).toBeLessThan(2000);
  });
});
