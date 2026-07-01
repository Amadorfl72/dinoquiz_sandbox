import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnswerOption from './AnswerOption';

jest.useFakeTimers();

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  const mockOnSelect = jest.fn();
  const option = 'Option A';

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should register the answer on a single tap', () => {
    render(<AnswerOption option={option} onSelect={mockOnSelect} />);
    const button = screen.getByText(option);
    
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should only register the first response if the same option is tapped twice quickly', () => {
    render(<AnswerOption option={option} onSelect={mockOnSelect} />);
    const button = screen.getByText(option);
    
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should register the response again if tapped after the debounce period', () => {
    render(<AnswerOption option={option} onSelect={mockOnSelect} />);
    const button = screen.getByText(option);
    
    fireEvent.click(button);
    
    act(() => {
      jest.advanceTimersByTime(600); // Assuming a 500ms debounce window
    });
    
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(2);
  });

  it('should register both responses if different options are tapped quickly', () => {
    render(
      <div>
        <AnswerOption option="Option A" onSelect={mockOnSelect} />
        <AnswerOption option="Option B" onSelect={mockOnSelect} />
      </div>
    );
    
    const buttonA = screen.getByText('Option A');
    const buttonB = screen.getByText('Option B');
    
    fireEvent.click(buttonA);
    fireEvent.click(buttonB);
    
    expect(mockOnSelect).toHaveBeenCalledTimes(2);
  });
});