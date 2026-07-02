import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextButton } from './NextButton';

describe('NextButton - TRIOFSND-29: Add debounce to Next button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call onNext only once if clicked multiple times within the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    // Click multiple times rapidly
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('should disable the button immediately after click to prevent accidental skipping', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });

  it('should re-enable the button after the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);
    expect(nextButton).toBeDisabled();

    // Fast-forward time by 500ms (assuming debounce is 500ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(nextButton).toBeEnabled();
  });

  it('should allow clicking again after the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);
    expect(mockOnNext).toHaveBeenCalledTimes(2);
  });
});