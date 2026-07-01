import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnswerButton } from './AnswerButton';

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers the first tap on an option', () => {
    const handleSelect = jest.fn();
    render(<AnswerButton optionId="A" onSelect={handleSelect} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('A');
  });

  it('prevents registering a second tap if done quickly (double tap)', () => {
    const handleSelect = jest.fn();
    render(<AnswerButton optionId="A" onSelect={handleSelect} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('allows registering a tap after the debounce period has passed', () => {
    const handleSelect = jest.fn();
    render(<AnswerButton optionId="A" onSelect={handleSelect} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    fireEvent.click(button);
    
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it('does not prevent registering a different option if tapped quickly', () => {
    const handleSelect = jest.fn();
    render(
      <div>
        <AnswerButton optionId="A" onSelect={handleSelect} />
        <AnswerButton optionId="B" onSelect={handleSelect} />
      </div>
    );
    const buttonA = screen.getByText('A');
    const buttonB = screen.getByText('B');
    
    fireEvent.click(buttonA);
    fireEvent.click(buttonB);
    
    expect(handleSelect).toHaveBeenCalledTimes(2);
    expect(handleSelect).toHaveBeenNthCalledWith(1, 'A');
    expect(handleSelect).toHaveBeenNthCalledWith(2, 'B');
  });
});