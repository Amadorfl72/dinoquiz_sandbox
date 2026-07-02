import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuizQuestion from '../src/components/QuizQuestion';

const renderQuestion = (overrides: Record<string, any> = {}) => {
  const defaultProps = {
    question: 'What is the capital of France?',
    options: ['Paris', 'London', 'Berlin'],
    correctAnswer: 'Paris',
    onAnswer: jest.fn(),
  };
  return render(React.createElement(QuizQuestion, { ...defaultProps, ...overrides }));
};

describe('TRIOFSND-17: Implement Option Shuffling', () => {
  afterEach(() => {
    cleanup();
  });

  const originalOptions = ['Option A', 'Option B', 'Option C'];

  it('should render an option button for each option provided', () => {
    renderQuestion({ options: originalOptions });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(originalOptions.length);
  });

  it('should contain all the same elements as the original options', () => {
    renderQuestion({ options: originalOptions });
    originalOptions.forEach((option) => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
  });

  it('should not mutate the original options array', () => {
    const originalCopy = [...originalOptions];
    renderQuestion({ options: originalOptions });
    expect(originalOptions).toEqual(originalCopy);
  });

  it('should produce different orders over multiple renders (randomization)', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      cleanup();
      const { container } = renderQuestion({ options: originalOptions });
      const buttons = container.querySelectorAll('button');
      const order = Array.from(buttons).map((b) => b.textContent).join(',');
      results.add(order);
    }
    // With 3 options, there are 6 possible permutations.
    // Over 100 renders, we should expect to see more than 1 permutation.
    expect(results.size).toBeGreaterThan(1);
  });

  it('should handle an empty array', () => {
    const { container } = renderQuestion({ options: [] });
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('should handle an array with one option', () => {
    renderQuestion({ options: ['Only Option'] });
    expect(screen.getByText('Only Option')).toBeInTheDocument();
  });

  it('should call onAnswer with a boolean when an option is clicked', () => {
    const onAnswer = jest.fn();
    renderQuestion({ options: originalOptions, onAnswer });
    fireEvent.click(screen.getByText('Option A'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(typeof onAnswer.mock.calls[0][0]).toBe('boolean');
  });

  it('should render the question text', () => {
    renderQuestion({ question: 'Test Question?' });
    expect(screen.getByText('Test Question?')).toBeInTheDocument();
  });
});
