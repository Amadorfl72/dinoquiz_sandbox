import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnswerButton } from '../components/AnswerButton';

describe('TRIOFSND-20: Implement Double Tap Debounce - AnswerButton Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should only call onSelect once if the same option is tapped twice quickly', () => {
    const handleSelect = jest.fn();
    render(<AnswerButton optionId="opt_1" onSelect={handleSelect} />);
    
    const button = screen.getByRole('button', { name: /select option opt_1/i });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('opt_1');
  });

  it('should allow selecting the same option again after the debounce period', () => {
    const handleSelect = jest.fn();
    render(<AnswerButton optionId="opt_1" onSelect={handleSelect} />);
    
    const button = screen.getByRole('button', { name: /select option opt_1/i });

    act(() => {
      fireEvent.click(button);
    });

    act(() => {
      jest.advanceTimersByTime(500); // Assuming debounce is 300ms
    });

    act(() => {
      fireEvent.click(button);
    });

    expect(handleSelect).toHaveBeenCalledTimes(2);
  });
});