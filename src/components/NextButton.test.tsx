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

  it('should call onClick only once if clicked multiple times within the debounce period', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    // Click multiple times rapidly
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should disable the button immediately after click to prevent accidental skipping', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });

  it('should re-enable the button after the debounce period', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);
    expect(nextButton).toBeDisabled();

    // Fast-forward time by 1000ms (debounce is 1000ms)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(nextButton).toBeEnabled();
  });

  it('should allow clicking again after the debounce period', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextButton);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });
});