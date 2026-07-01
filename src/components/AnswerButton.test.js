import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnswerButton from './AnswerButton';

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers the first tap on an option', () => {
    const handleAnswer = jest.fn();
    render(<AnswerButton answer="A" onAnswer={handleAnswer} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    expect(handleAnswer).toHaveBeenCalledTimes(1);
    expect(handleAnswer).toHaveBeenCalledWith('A');
  });

  it('prevents registering a second tap if done quickly (double tap)', () => {
    const handleAnswer = jest.fn();
    render(<AnswerButton answer="A" onAnswer={handleAnswer} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(handleAnswer).toHaveBeenCalledTimes(1);
  });

  it('allows registering a tap after the debounce period has passed', () => {
    const handleAnswer = jest.fn();
    render(<AnswerButton answer="A" onAnswer={handleAnswer} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    fireEvent.click(button);
    
    expect(handleAnswer).toHaveBeenCalledTimes(2);
  });

  it('does not prevent registering a different option if tapped quickly', () => {
    const handleAnswer = jest.fn();
    render(
      <div>
        <AnswerButton answer="A" onAnswer={handleAnswer} />
        <AnswerButton answer="B" onAnswer={handleAnswer} />
      </div>
    );
    const buttonA = screen.getByText('A');
    const buttonB = screen.getByText('B');
    
    fireEvent.click(buttonA);
    fireEvent.click(buttonB);
    
    expect(handleAnswer).toHaveBeenCalledTimes(2);
    expect(handleAnswer).toHaveBeenNthCalledWith(1, 'A');
    expect(handleAnswer).toHaveBeenNthCalledWith(2, 'B');
  });
});