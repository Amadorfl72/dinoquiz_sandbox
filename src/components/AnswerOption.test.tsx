import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnswerOption from '../AnswerOption';

describe('AnswerOption Component - Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prevents multiple answers if the same option is tapped twice quickly', () => {
    const handleAnswer = jest.fn();
    render(<AnswerOption option="A" onAnswer={handleAnswer} debounceTime={500} />);

    const button = screen.getByRole('button');

    act(() => {
      fireEvent.click(button);
    });
    
    act(() => {
      fireEvent.click(button);
    });

    expect(handleAnswer).toHaveBeenCalledTimes(1);
    expect(handleAnswer).toHaveBeenCalledWith('A');
  });

  it('allows answering again after the debounce time', () => {
    const handleAnswer = jest.fn();
    render(<AnswerOption option="A" onAnswer={handleAnswer} debounceTime={500} />);

    const button = screen.getByRole('button');

    act(() => {
      fireEvent.click(button);
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      fireEvent.click(button);
    });

    expect(handleAnswer).toHaveBeenCalledTimes(2);
  });
});